import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Tenant, TenantStatus, Prisma } from '@prisma/client';

export interface CreateTenantDto {
  name: string;
  slug: string;
  plan?: Prisma.TenantCreateInput['plan'];
  status?: TenantStatus;
  settings?: Prisma.InputJsonValue;
}

export interface UpdateTenantDto extends Partial<CreateTenantDto> {}

@Injectable()
export class TenantsService {
  constructor(private prisma: PrismaService) {}

  async findAll(): Promise<Tenant[]> {
    return this.prisma.tenant.findMany({
      include: { _count: { select: { users: true, patients: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string): Promise<Tenant> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: { subscription: true, _count: { select: { users: true, patients: true } } },
    });
    if (!tenant) {
      throw new NotFoundException(`Tenant ${id} not found`);
    }
    return tenant;
  }

  async findBySlug(slug: string): Promise<Tenant> {
    const tenant = await this.prisma.tenant.findUnique({ where: { slug } });
    if (!tenant) {
      throw new NotFoundException(`Tenant with slug '${slug}' not found`);
    }
    return tenant;
  }

  async create(data: CreateTenantDto): Promise<Tenant> {
    const existing = await this.prisma.tenant.findUnique({ where: { slug: data.slug } });
    if (existing) {
      throw new ConflictException(`Tenant slug '${data.slug}' already taken`);
    }
    return this.prisma.tenant.create({
      data: {
        name: data.name,
        slug: data.slug,
        ...(data.plan && { plan: data.plan }),
        ...(data.status && { status: data.status }),
        ...(data.settings !== undefined && { settings: data.settings }),
      },
    });
  }

  async update(id: string, data: UpdateTenantDto): Promise<Tenant> {
    await this.findOne(id);
    return this.prisma.tenant.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.slug && { slug: data.slug }),
        ...(data.plan && { plan: data.plan }),
        ...(data.status && { status: data.status }),
        ...(data.settings !== undefined && { settings: data.settings }),
      },
    });
  }

  async remove(id: string): Promise<Tenant> {
    await this.findOne(id);
    return this.prisma.tenant.delete({ where: { id } });
  }
}
