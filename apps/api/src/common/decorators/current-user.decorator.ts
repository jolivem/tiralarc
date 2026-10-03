import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { Role } from '../../generated/prisma/client.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  roles: Role[];
}

export type AuthenticatedRequest = Request & { user?: AuthenticatedUser };

/** Injects the user authenticated by AuthGuard. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.user) {
      throw new Error('CurrentUser used on a route that is not protected by AuthGuard');
    }
    return request.user;
  },
);
