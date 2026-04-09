import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../prisma/prisma.service';

interface RequestUser {
  userId?: string;
  tenantId?: string;
}

interface HttpRequest {
  method: string;
  url: string;
  user?: RequestUser;
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
  params: Record<string, string>;
}

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);

  constructor(private prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<HttpRequest>();
    const { method, url, user, ip } = request;

    if (!WRITE_METHODS.has(method)) return next.handle();

    const startedAt = Date.now();

    return next.handle().pipe(
      tap({
        next: (responseData: unknown) => {
          const resource = url.split('/')[2] ?? 'unknown';
          const resourceId = (request.params?.id as string | undefined);

          this.prisma.auditLog
            .create({
              data: {
                tenantId: user?.tenantId ?? null,
                userId: user?.userId ?? null,
                action: method,
                resource,
                resourceId,
                newData: (responseData as Parameters<typeof this.prisma.auditLog.create>[0]['data']['newData']) ?? null,
                ipAddress: ip ?? null,
                userAgent: (request.headers['user-agent'] as string | undefined) ?? null,
              },
            })
            .catch((err: Error) =>
              this.logger.error(`Failed to write audit log: ${err.message}`),
            );

          this.logger.debug(
            `[AUDIT] ${method} ${url} by ${user?.userId ?? 'anon'} in ${Date.now() - startedAt}ms`,
          );
        },
        error: (err: Error) => {
          this.logger.warn(`[AUDIT] ${method} ${url} FAILED: ${err.message}`);
        },
      }),
    );
  }
}
