import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SubscriptionsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.subscription.findMany({
      include: { tenant: { select: { id: true, name: true, slug: true } } },
    });
  }

  async findOne(id: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id },
      include: { tenant: true },
    });
    if (!subscription) throw new NotFoundException(`Subscription ${id} not found`);
    return subscription;
  }

  async findByTenant(tenantId: string) {
    return this.prisma.subscription.findUnique({
      where: { tenantId },
      include: { tenant: { select: { id: true, name: true, plan: true } } },
    });
  }

  async create(data: any) {
    return this.prisma.subscription.create({
      data,
      include: { tenant: { select: { id: true, name: true } } },
    });
  }

  async update(id: string, data: any) {
    await this.findOne(id);
    return this.prisma.subscription.update({ where: { id }, data });
  }

  async upgradePlan(tenantId: string, newPlan: string) {
    const subscription = await this.findByTenant(tenantId);
    if (!subscription) throw new NotFoundException('No active subscription for this tenant');
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { plan: newPlan as any },
    });
    return this.prisma.subscription.update({
      where: { tenantId },
      data: { plan: newPlan as any },
    });
  }
}
