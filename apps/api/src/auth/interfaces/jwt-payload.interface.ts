export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  tenantId: string | null;
  iat?: number;
  exp?: number;
}
