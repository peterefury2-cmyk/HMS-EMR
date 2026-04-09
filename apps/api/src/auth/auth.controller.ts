import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { MfaVerifyDto } from './dto/mfa-verify.dto';
import { PasswordResetRequestDto } from './dto/password-reset-request.dto';
import { PasswordResetDto } from './dto/password-reset.dto';
import { LocalAuthGuard } from './local-auth.guard';
import { JwtAuthGuard } from './jwt-auth.guard';

interface RequestWithUser {
  user: {
    userId: string;
    id?: string;
    email: string;
    role: string;
    tenantId: string | null;
    mfaEnabled?: boolean;
    firstName?: string;
    lastName?: string;
  };
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  async register(@Body() dto: RegisterDto): Promise<unknown> {
    return this.authService.register(dto);
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  async login(@Request() req: RequestWithUser, @Body() _dto: LoginDto): Promise<unknown> {
    const ip = req.ip;
    const userAgent = req.headers['user-agent'] as string | undefined;
    return this.authService.login(req.user as Parameters<typeof this.authService.login>[0], ip, userAgent);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  async refresh(@Body() dto: RefreshTokenDto): Promise<unknown> {
    return this.authService.refreshAccessToken(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout and revoke refresh token' })
  async logout(@Body() dto: RefreshTokenDto): Promise<unknown> {
    return this.authService.logout(dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Post('mfa/setup')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Setup MFA for current user' })
  async setupMfa(@Request() req: RequestWithUser): Promise<unknown> {
    return this.authService.setupMfa(req.user.userId);
  }

  @Post('mfa/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify MFA token and get JWT' })
  async verifyMfa(
    @Body() dto: MfaVerifyDto & { userId: string },
  ): Promise<unknown> {
    return this.authService.verifyMfa(dto.userId, dto.token);
  }

  @Post('password-reset/request')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset email' })
  async requestPasswordReset(@Body() dto: PasswordResetRequestDto): Promise<unknown> {
    return this.authService.requestPasswordReset(dto);
  }

  @Post('password-reset/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token' })
  async resetPassword(@Body() dto: PasswordResetDto): Promise<unknown> {
    return this.authService.resetPassword(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  async getMe(@Request() req: RequestWithUser): Promise<unknown> {
    return this.authService.getMe(req.user.userId);
  }
}
