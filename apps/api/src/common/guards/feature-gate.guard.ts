import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';

export const FEATURE_KEY = 'feature';
export const Feature = (feature: string) => SetMetadata(FEATURE_KEY, feature);

interface RequestUser {
  tenantId?: string;
}

interface AuthenticatedRequest {
  user: RequestUser;
}

@Injectable()
export class FeatureGateGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const feature = this.reflector.getAllAndOverride<string>(FEATURE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!feature) return true;

    const { user } = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!user?.tenantId) return true; // No tenant = super admin context

    const tenant = await this.prisma.tenant.findUnique({ where: { id: user.tenantId } });
    if (!tenant) return false;

    const flag = await this.prisma.featureFlag.findUnique({
      where: { plan_feature: { plan: tenant.plan, feature } },
    });

    if (!flag?.enabled) {
      throw new ForbiddenException(
        `Feature '${feature}' is not available on your current plan (${tenant.plan}). Please upgrade.`,
      );
    }

    return true;
  }
}
