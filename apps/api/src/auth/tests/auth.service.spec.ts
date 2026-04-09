import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  session: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  passwordResetToken: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue('mock-jwt-token'),
  verify: jest.fn(),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  describe('validateUser', () => {
    it('should return null when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const result = await service.validateUser('test@example.com', 'password');
      expect(result).toBeNull();
    });

    it('should return null on wrong password and increment failedLogins', async () => {
      const hash = await bcrypt.hash('correct-password', 10);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: hash,
        failedLogins: 0,
        lockedUntil: null,
        role: 'DOCTOR',
        tenantId: null,
        mfaEnabled: false,
        firstName: 'Test',
        lastName: 'User',
      });
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.validateUser('test@example.com', 'wrong-password');
      expect(result).toBeNull();
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ failedLogins: 1 }) }),
      );
    });

    it('should return user on valid credentials', async () => {
      const hash = await bcrypt.hash('correct-password', 10);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: hash,
        failedLogins: 0,
        lockedUntil: null,
        role: 'DOCTOR',
        tenantId: 'tenant-1',
        mfaEnabled: false,
        firstName: 'Test',
        lastName: 'User',
      });

      const result = await service.validateUser('test@example.com', 'correct-password');
      expect(result).not.toBeNull();
      expect(result?.email).toBe('test@example.com');
    });

    it('should throw ForbiddenException when account is locked', async () => {
      const futureDate = new Date(Date.now() + 60000);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: 'hash',
        failedLogins: 5,
        lockedUntil: futureDate,
        role: 'DOCTOR',
        tenantId: null,
        mfaEnabled: false,
        firstName: 'Test',
        lastName: 'User',
      });

      await expect(service.validateUser('test@example.com', 'any')).rejects.toThrow(ForbiddenException);
    });

    it('should lock account after 5 failed attempts', async () => {
      const hash = await bcrypt.hash('correct', 10);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: hash,
        failedLogins: 4,
        lockedUntil: null,
        role: 'DOCTOR',
        tenantId: null,
        mfaEnabled: false,
        firstName: 'Test',
        lastName: 'User',
      });
      mockPrisma.user.update.mockResolvedValue({});

      await service.validateUser('test@example.com', 'wrong');
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ failedLogins: 5, lockedUntil: expect.any(Date) }),
        }),
      );
    });
  });

  describe('register', () => {
    it('should throw ConflictException if email already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing' });
      await expect(
        service.register({
          email: 'existing@example.com',
          password: 'Password@123',
          firstName: 'Test',
          lastName: 'User',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should create user and return tokens on success', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'new-user',
        email: 'new@example.com',
        firstName: 'New',
        lastName: 'User',
        role: 'DOCTOR',
        tenantId: null,
        mfaEnabled: false,
      });
      mockPrisma.session.create.mockResolvedValue({ id: 'session-1' });

      const result = await service.register({
        email: 'new@example.com',
        password: 'Password@123',
        firstName: 'New',
        lastName: 'User',
      });

      expect(result.access_token).toBe('mock-jwt-token');
      expect(result.refresh_token).toBeDefined();
    });
  });

  describe('refreshAccessToken', () => {
    it('should throw UnauthorizedException for invalid refresh token', async () => {
      mockPrisma.session.findUnique.mockResolvedValue(null);
      await expect(service.refreshAccessToken('invalid-token')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for revoked session', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({
        id: 'session-1',
        isRevoked: true,
        expiresAt: new Date(Date.now() + 86400000),
        user: { id: 'user-1', email: 'test@example.com', role: 'DOCTOR', tenantId: null },
      });
      await expect(service.refreshAccessToken('revoked-token')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('requestPasswordReset', () => {
    it('should return success message even if email not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const result = await service.requestPasswordReset({ email: 'nonexistent@example.com' });
      expect(result.message).toContain('reset link');
    });

    it('should create a reset token for valid user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
      mockPrisma.passwordResetToken.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.passwordResetToken.create.mockResolvedValue({ id: 'token-1' });

      const result = await service.requestPasswordReset({ email: 'user@example.com' });
      expect(mockPrisma.passwordResetToken.create).toHaveBeenCalled();
      expect(result.message).toBeDefined();
    });
  });
});
