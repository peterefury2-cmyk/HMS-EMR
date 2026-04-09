import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestWithUser, CurrentUserPayload } from '../types/request-with-user.type';

export type { CurrentUserPayload };

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUserPayload => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    return request.user;
  },
);
