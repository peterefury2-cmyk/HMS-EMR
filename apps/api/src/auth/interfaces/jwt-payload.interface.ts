import { Role } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  tenantId: string | null;
  iat?: number;
  exp?: number;
}
