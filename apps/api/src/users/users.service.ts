import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role, Prisma } from '@prisma/client';

export interface UserSummary {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  tenantId: string | null;
  isActive: boolean;
  createdAt: Date;
}

export interface UserDetail extends UserSummary {
  mfaEnabled: boolean;
  updatedAt: Date;
}

export interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  role?: Role;
  isActive?: boolean;
  mfaEnabled?: boolean;
}

const USER_SUMMARY_SELECT: Prisma.UserSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  tenantId: true,
  isActive: true,
  createdAt: true,
};

const USER_DETAIL_SELECT: Prisma.UserSelect = {
  ...USER_SUMMARY_SELECT,
  mfaEnabled: true,
  updatedAt: true,
};

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId?: string): Promise<UserSummary[]> {
    return this.prisma.user.findMany({
      where: tenantId ? { tenantId } : {},
      select: USER_SUMMARY_SELECT,
      orderBy: { createdAt: 'desc' },
    }) as Promise<UserSummary[]>;
  }

  async findOne(id: string): Promise<UserDetail> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: USER_DETAIL_SELECT,
    });
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    return user as UserDetail;
  }

  async findByEmail(email: string): Promise<UserDetail | null> {
    return this.prisma.user.findUnique({
      where: { email },
      select: USER_DETAIL_SELECT,
    }) as Promise<UserDetail | null>;
  }

  async update(id: string, data: UpdateUserDto): Promise<UserSummary> {
    await this.findOne(id);
    return this.prisma.user.update({
      where: { id },
      data: {
        ...(data.firstName && { firstName: data.firstName }),
        ...(data.lastName && { lastName: data.lastName }),
        ...(data.role && { role: data.role }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.mfaEnabled !== undefined && { mfaEnabled: data.mfaEnabled }),
      },
      select: USER_SUMMARY_SELECT,
    }) as Promise<UserSummary>;
  }

  async remove(id: string): Promise<UserSummary> {
    await this.findOne(id);
    return this.prisma.user.delete({
      where: { id },
      select: USER_SUMMARY_SELECT,
    }) as Promise<UserSummary>;
  }
}
