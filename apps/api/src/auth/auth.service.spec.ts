import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  session: {
    create: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue('mock-token'),
  verify: jest.fn(),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();
    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user and return tokens', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'DOCTOR',
        tenantId: null,
        isActive: true,
        createdAt: new Date(),
      });
      mockPrismaService.session.create.mockResolvedValue({ id: 'session-1' });

      const result = await service.register({
        email: 'test@test.com',
        password: 'Password@123',
        firstName: 'Test',
        lastName: 'User',
      });

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
      expect(result.user.email).toBe('test@test.com');
    });

    it('should throw ConflictException if email already exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'existing' });
      await expect(
        service.register({ email: 'dupe@test.com', password: 'pass', firstName: 'A', lastName: 'B' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('validateUser', () => {
    it('should return user without password for correct credentials', async () => {
      const hash = await bcrypt.hash('correct-pass', 10);
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'a@b.com',
        passwordHash: hash,
        failedLoginCount: 0,
        lockedUntil: null,
        isActive: true,
      });
      mockPrismaService.user.update.mockResolvedValue({});

      const result = await service.validateUser('a@b.com', 'correct-pass');
      expect(result).not.toBeNull();
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('should return null for wrong password', async () => {
      const hash = await bcrypt.hash('correct-pass', 10);
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'a@b.com',
        passwordHash: hash,
        failedLoginCount: 0,
        lockedUntil: null,
      });
      mockPrismaService.user.update.mockResolvedValue({});

      const result = await service.validateUser('a@b.com', 'wrong-pass');
      expect(result).toBeNull();
    });

    it('should throw UnauthorizedException for locked account', async () => {
      const futureDate = new Date(Date.now() + 10 * 60 * 1000);
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'a@b.com',
        passwordHash: 'hash',
        failedLoginCount: 5,
        lockedUntil: futureDate,
      });

      await expect(service.validateUser('a@b.com', 'any')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getMe', () => {
    it('should return user profile', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'a@b.com',
        firstName: 'A',
        lastName: 'B',
        role: 'DOCTOR',
        tenantId: null,
        isActive: true,
        createdAt: new Date(),
      });
      const result = await service.getMe('u1');
      expect(result?.email).toBe('a@b.com');
    });
  });
});
