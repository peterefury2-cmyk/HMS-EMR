import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  Subscription,
  TenantPlan,
  SubscriptionStatus,
  Prisma,
} from '@prisma/client';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';

const PLAN_FEATURE_MAP: Record<string, TenantPlan[]> = {
  ai_suggestions: [TenantPlan.ENTERPRISE, TenantPlan.GOVERNMENT],
  fhir_export: [TenantPlan.PROFESSIONAL, TenantPlan.ENTERPRISE, TenantPlan.GOVERNMENT],
  telemedicine: [TenantPlan.PROFESSIONAL, TenantPlan.ENTERPRISE, TenantPlan.GOVERNMENT],
  advanced_analytics: [TenantPlan.ENTERPRISE, TenantPlan.GOVERNMENT],
  multi_branch: [TenantPlan.ENTERPRISE, TenantPlan.GOVERNMENT],
  insurance_integration: [TenantPlan.PROFESSIONAL, TenantPlan.ENTERPRISE, TenantPlan.GOVERNMENT],
};

@Injectable()
export class SubscriptionsService {
  constructor(private prisma: PrismaService) {}

  async findAll(): Promise<Subscription[]> {
    return this.prisma.subscription.findMany({
      include: { tenant: { select: { id: true, name: true, slug: true } } },
    });
  }

  async findOne(id: string): Promise<Subscription> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id },
      include: { tenant: true },
    });
    if (!subscription) throw new NotFoundException(`Subscription ${id} not found`);
    return subscription;
  }

  async findByTenant(tenantId: string): Promise<Subscription | null> {
    return this.prisma.subscription.findUnique({
      where: { tenantId },
      include: { tenant: { select: { id: true, name: true, plan: true } } },
    });
  }

  async create(dto: CreateSubscriptionDto): Promise<Subscription> {
    return this.prisma.subscription.create({
      data: {
        tenantId: dto.tenantId,
        plan: dto.plan,
        status: dto.status ?? SubscriptionStatus.ACTIVE,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        amount: new Prisma.Decimal(dto.amount.toFixed(2)),
        currency: dto.currency ?? 'USD',
        interval: dto.interval ?? 'MONTHLY',
      },
      include: { tenant: { select: { id: true, name: true } } },
    });
  }

  async update(id: string, data: Partial<CreateSubscriptionDto>): Promise<Subscription> {
    await this.findOne(id);
    return this.prisma.subscription.update({
      where: { id },
      data: {
        ...(data.plan && { plan: data.plan }),
        ...(data.status && { status: data.status }),
        ...(data.startDate && { startDate: new Date(data.startDate) }),
        ...(data.endDate && { endDate: new Date(data.endDate) }),
        ...(data.amount !== undefined && { amount: new Prisma.Decimal(data.amount.toFixed(2)) }),
        ...(data.currency && { currency: data.currency }),
        ...(data.interval && { interval: data.interval }),
      },
    });
  }

  async upgradePlan(tenantId: string, newPlan: TenantPlan): Promise<Subscription> {
    const subscription = await this.findByTenant(tenantId);
    if (!subscription) throw new NotFoundException('No active subscription for this tenant');

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { plan: newPlan },
    });

    return this.prisma.subscription.update({
      where: { tenantId },
      data: { plan: newPlan },
    });
  }

  async checkFeatureAccess(tenantId: string, feature: string): Promise<boolean> {
    // Check FeatureFlag first
    const flag = await this.prisma.featureFlag.findFirst({
      where: { tenantId, feature },
    });
    if (flag !== null) {
      return flag.isEnabled;
    }

    // Fall back to plan-based check
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { plan: true },
    });
    if (!tenant) return false;

    const allowedPlans = PLAN_FEATURE_MAP[feature];
    if (!allowedPlans) return true; // Unknown feature allowed by default

    return allowedPlans.includes(tenant.plan);
  }

  async recordUsage(tenantId: string, feature: string, quantity = 1): Promise<void> {
    const subscription = await this.findByTenant(tenantId);
    await this.prisma.usageRecord.create({
      data: {
        tenantId,
        subscriptionId: subscription?.id,
        feature,
        quantity,
      },
    });
  }
}
