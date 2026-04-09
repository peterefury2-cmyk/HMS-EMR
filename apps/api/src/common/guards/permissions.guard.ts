import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../enums/roles.enum';

export const PERMISSIONS_KEY = 'permissions';

interface RequestUser {
  userId: string;
  role: Role;
  tenantId?: string;
}

interface AuthenticatedRequest {
  user: RequestUser;
}

const ROLE_HIERARCHY: Record<Role, number> = {
  [Role.SUPER_ADMIN]: 100,
  [Role.SYSTEM_ADMIN]: 90,
  [Role.HOSPITAL_ADMIN]: 80,
  [Role.DOCTOR]: 60,
  [Role.NURSE]: 55,
  [Role.PHARMACIST]: 50,
  [Role.LAB_SCIENTIST]: 50,
  [Role.RADIOLOGIST]: 50,
  [Role.BILLING_OFFICER]: 45,
  [Role.RECEPTIONIST]: 40,
  [Role.INSURANCE_PROVIDER]: 35,
  [Role.ENTERPRISE_CLIENT]: 30,
  [Role.PATIENT]: 10,
};

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!user) return false;

    if (user.role === Role.SUPER_ADMIN) return true;

    const userLevel = ROLE_HIERARCHY[user.role] ?? 0;
    return requiredRoles.some((role) => {
      const requiredLevel = ROLE_HIERARCHY[role] ?? 0;
      return user.role === role || userLevel >= requiredLevel;
    });
  }
}
