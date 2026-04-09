import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) return false;
    // Super admin and system admin can bypass tenant check
    if (user.role === 'SUPER_ADMIN' || user.role === 'SYSTEM_ADMIN') return true;
    return !!user.tenantId;
  }
}
