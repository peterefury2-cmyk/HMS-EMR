import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { FEATURE_GATE_KEY } from '../decorators/feature-gate.decorator';
import { RequestWithUser } from '../types/request-with-user.type';
import { TenantPlan } from '@prisma/client';

const PLAN_FEATURES: Record<string, TenantPlan[]> = {
  ai_suggestions: [TenantPlan.ENTERPRISE],
  fhir_export: [TenantPlan.PROFESSIONAL, TenantPlan.ENTERPRISE, TenantPlan.GOVERNMENT],
  telemedicine: [TenantPlan.PROFESSIONAL, TenantPlan.ENTERPRISE, TenantPlan.GOVERNMENT],
  advanced_analytics: [TenantPlan.ENTERPRISE, TenantPlan.GOVERNMENT],
  multi_branch: [TenantPlan.ENTERPRISE, TenantPlan.GOVERNMENT],
};

@Injectable()
export class FeatureGateGuard implements CanActivate {
  private readonly logger = new Logger(FeatureGateGuard.name);

  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const feature = this.reflector.getAllAndOverride<string | undefined>(
      FEATURE_GATE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!feature) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const tenantId = request.user?.tenantId;

    if (!tenantId) {
      throw new ForbiddenException('Tenant context required for this feature');
    }

    // Check FeatureFlag table first
    const flag = await this.prisma.featureFlag.findFirst({
      where: { tenantId, feature },
    });

    if (flag !== null) {
      if (!flag.isEnabled) {
        throw new ForbiddenException(`Feature '${feature}' is not enabled for your account`);
      }
      return true;
    }

    // Fall back to plan-based check
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      throw new ForbiddenException('Tenant not found');
    }

    const allowedPlans = PLAN_FEATURES[feature];
    if (!allowedPlans) {
      this.logger.warn(
        `Unknown feature gate '${feature}' encountered — access allowed by default. Register it in PLAN_FEATURES to enforce plan restrictions.`,
      );
      return true;
    }

    if (!allowedPlans.includes(tenant.plan)) {
      throw new ForbiddenException(
        `Feature '${feature}' requires plan: ${allowedPlans.join(' or ')}. Current plan: ${tenant.plan}`,
      );
    }

    return true;
  }
}
