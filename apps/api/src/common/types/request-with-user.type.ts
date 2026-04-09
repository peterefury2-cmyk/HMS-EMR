import { Role } from '@prisma/client';
import { Request } from 'express';

export interface RequestUser {
  userId: string;
  email: string;
  role: Role;
  tenantId: string | null;
}

export type CurrentUserPayload = RequestUser;

export interface RequestWithUser extends Request {
  user: RequestUser;
}
