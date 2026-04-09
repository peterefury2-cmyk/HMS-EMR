import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantPlan } from '@prisma/client';

interface CreateSubscriptionData {
  tenantId: string;
  plan: TenantPlan;
  status?: string;
  trialEndsAt?: Date;
  currentPeriodEnd?: Date;
}

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

  async create(data: CreateSubscriptionData) {
    return this.prisma.subscription.create({
      data,
      include: { tenant: { select: { id: true, name: true } } },
    });
  }

  async update(id: string, data: Partial<CreateSubscriptionData>) {
    await this.findOne(id);
    return this.prisma.subscription.update({ where: { id }, data });
  }

  async upgradePlan(tenantId: string, newPlan: TenantPlan) {
    const subscription = await this.findByTenant(tenantId);
    if (!subscription) throw new NotFoundException('No active subscription for this tenant');

    await this.prisma.tenant.update({ where: { id: tenantId }, data: { plan: newPlan } });
    return this.prisma.subscription.update({
      where: { tenantId },
      data: { plan: newPlan },
    });
  }

  async checkFeatureAccess(tenantId: string, feature: string): Promise<boolean> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) return false;

    const flag = await this.prisma.featureFlag.findUnique({
      where: { plan_feature: { plan: tenant.plan, feature } },
    });

    return flag?.enabled ?? false;
  }

  async assertFeatureAccess(tenantId: string, feature: string): Promise<void> {
    const allowed = await this.checkFeatureAccess(tenantId, feature);
    if (!allowed) {
      throw new ForbiddenException(`Feature '${feature}' is not available on your current plan`);
    }
  }

  async recordUsage(tenantId: string, metric: string, quantity: number) {
    return this.prisma.usageRecord.create({
      data: { tenantId, metric, quantity },
    });
  }

  async getUsageSummary(tenantId: string, metric: string, from: Date, to: Date) {
    const records = await this.prisma.usageRecord.findMany({
      where: { tenantId, metric, recordedAt: { gte: from, lte: to } },
    });
    const total = records.reduce((sum, r) => sum + r.quantity, 0);
    return { metric, total, count: records.length, from, to };
  }
}
