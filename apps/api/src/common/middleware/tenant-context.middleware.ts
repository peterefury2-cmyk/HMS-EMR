import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  use(req: Request & { tenantId?: string }, _res: Response, next: NextFunction) {
    // Extract tenant from header, subdomain, or JWT (populated by JwtStrategy)
    const tenantHeader = req.headers['x-tenant-id'] as string | undefined;
    if (tenantHeader) {
      req.tenantId = tenantHeader;
    }
    next();
  }
}
