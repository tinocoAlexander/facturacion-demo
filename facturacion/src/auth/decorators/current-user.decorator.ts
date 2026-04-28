import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export type CurrentUserPayload = {
  id: number;
  email: string;
  role: 'user' | 'admin' | 'cajero' | 'contador';
};

type RequestWithUser = Request & { user?: CurrentUserPayload };

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUserPayload => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    return request.user as CurrentUserPayload;
  },
);
