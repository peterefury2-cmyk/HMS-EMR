import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { PasswordResetRequestDto } from './dto/password-reset-request.dto';
import { PasswordResetDto } from './dto/password-reset.dto';
import * as bcrypt from 'bcryptjs';
import { randomBytes, createHmac } from 'crypto';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  tenantId: string | null;
}

interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  tenantId: string | null;
  mfaEnabled: boolean;
}

interface LoginResult {
  access_token: string;
  refresh_token: string;
  requiresMfa?: boolean;
  user: AuthUser;
}

interface MfaSetupResult {
  secret: string;
  otpAuthUrl: string;
}

// Stub TOTP implementation (production should use otplib)
function generateTotpSecret(): string {
  return randomBytes(20).toString('hex').toUpperCase();
}

function generateTotpToken(secret: string): string {
  const counter = Math.floor(Date.now() / 30000);
  const hmac = createHmac('sha1', Buffer.from(secret, 'hex'));
  hmac.update(Buffer.alloc(8));
  const buf = Buffer.allocUnsafe(8);
  buf.writeBigUInt64BE(BigInt(counter));
  hmac.update(buf);
  const digest = hmac.digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const code = (digest.readUInt32BE(offset) & 0x7fffffff) % 1000000;
  return code.toString().padStart(6, '0');
}

function verifyTotpToken(secret: string, token: string): boolean {
  // Allow 1 step window (30s) drift for stub implementation
  for (let delta = -1; delta <= 1; delta++) {
    const counter = Math.floor(Date.now() / 30000) + delta;
    const hmac = createHmac('sha1', Buffer.from(secret, 'hex'));
    const buf = Buffer.allocUnsafe(8);
    buf.writeBigUInt64BE(BigInt(counter));
    hmac.update(buf);
    const digest = hmac.digest();
    const offset = digest[digest.length - 1] & 0x0f;
    const code = (digest.readUInt32BE(offset) & 0x7fffffff) % 1000000;
    if (code.toString().padStart(6, '0') === token) return true;
  }
  return false;
}

@Injectable()
export class AuthService {
  private readonly MAX_FAILED_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION_MINUTES = 15;
  private readonly REFRESH_TOKEN_TTL_DAYS = 7;
  private readonly RESET_TOKEN_TTL_HOURS = 1;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<AuthUser | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return null;

    // Check account lockout
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new ForbiddenException(
        `Account locked until ${user.lockedUntil.toISOString()}. Too many failed attempts.`,
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      const failedLogins = user.failedLogins + 1;
      const updateData: { failedLogins: number; lockedUntil?: Date } = { failedLogins };
      if (failedLogins >= this.MAX_FAILED_ATTEMPTS) {
        const lockedUntil = new Date();
        lockedUntil.setMinutes(lockedUntil.getMinutes() + this.LOCKOUT_DURATION_MINUTES);
        updateData.lockedUntil = lockedUntil;
      }
      await this.prisma.user.update({ where: { id: user.id }, data: updateData });
      return null;
    }

    // Reset failed logins on success
    if (user.failedLogins > 0 || user.lockedUntil) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLogins: 0, lockedUntil: null },
      });
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      tenantId: user.tenantId,
      mfaEnabled: user.mfaEnabled,
    };
  }

  async login(user: AuthUser, ipAddress?: string, userAgent?: string): Promise<LoginResult> {
    if (user.mfaEnabled) {
      return {
        access_token: '',
        refresh_token: '',
        requiresMfa: true,
        user,
      };
    }
    return this.issueTokens(user, ipAddress, userAgent);
  }

  private async issueTokens(
    user: AuthUser,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<LoginResult> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    };

    const access_token = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshToken = randomBytes(64).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.REFRESH_TOKEN_TTL_DAYS);

    await this.prisma.session.create({
      data: {
        userId: user.id,
        refreshToken,
        expiresAt,
        ipAddress,
        userAgent,
      },
    });

    return { access_token, refresh_token: refreshToken, user };
  }

  async refreshAccessToken(
    refreshToken: string,
  ): Promise<{ access_token: string; refresh_token: string }> {
    const session = await this.prisma.session.findUnique({
      where: { refreshToken },
      include: { user: true },
    });

    if (!session || session.isRevoked || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Token rotation: revoke old, issue new
    await this.prisma.session.update({ where: { id: session.id }, data: { isRevoked: true } });

    const user = session.user;
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    };

    const access_token = this.jwtService.sign(payload, { expiresIn: '15m' });
    const newRefreshToken = randomBytes(64).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.REFRESH_TOKEN_TTL_DAYS);

    await this.prisma.session.create({
      data: {
        userId: user.id,
        refreshToken: newRefreshToken,
        expiresAt,
        ipAddress: session.ipAddress ?? undefined,
        userAgent: session.userAgent ?? undefined,
      },
    });

    return { access_token, refresh_token: newRefreshToken };
  }

  async logout(refreshToken: string): Promise<void> {
    const session = await this.prisma.session.findUnique({ where: { refreshToken } });
    if (session) {
      await this.prisma.session.update({ where: { id: session.id }, data: { isRevoked: true } });
    }
  }

  async setupMfa(userId: string): Promise<MfaSetupResult> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const secret = generateTotpSecret();
    await this.prisma.user.update({ where: { id: userId }, data: { mfaSecret: secret } });

    return {
      secret,
      otpAuthUrl: `otpauth://totp/HMS-EMR:${user.email}?secret=${secret}&issuer=HMS-EMR`,
    };
  }

  async verifyMfa(userId: string, token: string): Promise<LoginResult> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.mfaSecret) throw new BadRequestException('MFA not configured');

    if (!verifyTotpToken(user.mfaSecret, token)) {
      throw new UnauthorizedException('Invalid MFA token');
    }

    if (!user.mfaEnabled) {
      await this.prisma.user.update({ where: { id: userId }, data: { mfaEnabled: true } });
    }

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      tenantId: user.tenantId,
      mfaEnabled: true,
    };

    return this.issueTokens(authUser);
  }

  async register(dto: RegisterDto): Promise<LoginResult> {
    const existingUser = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existingUser) throw new ConflictException('Email already in use');

    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
    const passwordHash = await bcrypt.hash(dto.password, saltRounds);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: dto.role || 'DOCTOR',
        tenantId: dto.tenantId || null,
      },
    });

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      tenantId: user.tenantId,
      mfaEnabled: user.mfaEnabled,
    };

    return this.issueTokens(authUser);
  }

  async requestPasswordReset(dto: PasswordResetRequestDto): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    // Always return success to prevent email enumeration
    if (!user) return { message: 'If the email exists, a reset link has been sent.' };

    // Invalidate old tokens
    await this.prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + this.RESET_TOKEN_TTL_HOURS);

    await this.prisma.passwordResetToken.create({
      data: { userId: user.id, token, expiresAt },
    });

    // In production: send email with reset link
    return { message: 'If the email exists, a reset link has been sent.' };
  }

  async resetPassword(dto: PasswordResetDto): Promise<{ message: string }> {
    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { token: dto.token },
    });

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
    const passwordHash = await bcrypt.hash(dto.newPassword, saltRounds);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash, failedLogins: 0, lockedUntil: null },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
      // Revoke all sessions
      this.prisma.session.updateMany({
        where: { userId: resetToken.userId },
        data: { isRevoked: true },
      }),
    ]);

    return { message: 'Password reset successfully.' };
  }

  async getMe(userId: string): Promise<AuthUser | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        tenantId: true,
        isActive: true,
        mfaEnabled: true,
        createdAt: true,
      },
    }) as Promise<AuthUser | null>;
  }
}
