import { Request } from 'express';
import { Role } from '@prisma/client';

export interface RequestUser {
  userId: string;
  email: string;
  role: Role;
  tenantId: string | null;
}

export interface RequestWithUser extends Request {
  user: RequestUser;
}
