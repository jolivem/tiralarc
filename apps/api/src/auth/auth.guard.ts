import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiException, ErrorCode } from '../common/errors.js';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedRequest } from '../common/decorators/current-user.decorator.js';
import { IS_PUBLIC_KEY } from '../common/decorators/public.decorator.js';
import { ROLES_KEY } from '../common/decorators/roles.decorator.js';
import type { Role } from '../generated/prisma/client.js';
import { AuthService } from './auth.service.js';

/** What the example journal's account may do: read. */
const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Global guard: every route requires `Authorization: Bearer <access token>`
 * unless marked with @Public(), and enforces @Roles(). Works the same for web (via the Next.js BFF)
 * and native mobile clients.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly auth: AuthService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
    if (isPublic) {
      // Signed-in callers of a public route are still known to it (see `OptionalUser`).
      if (scheme === 'Bearer' && token) {
        try {
          const payload = await this.auth.verifyAccessToken(token);
          request.user = { id: payload.sub, email: payload.email, roles: payload.roles ?? [] };
        } catch {
          // An expired token on a public route counts as no token.
        }
      }
      return true;
    }

    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    let demo = false;
    try {
      const payload = await this.auth.verifyAccessToken(token);
      request.user = { id: payload.sub, email: payload.email, roles: payload.roles ?? [] };
      demo = payload.demo === true;
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }
    // The example journal is shown, never changed.
    if (demo && !READ_METHODS.has(request.method)) {
      throw new ApiException(
        HttpStatus.FORBIDDEN,
        ErrorCode.DEMO_READ_ONLY,
        'The example journal is read-only',
      );
    }

    const required = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (required && !required.some((role) => request.user?.roles.includes(role))) {
      throw new ForbiddenException('Insufficient role');
    }
    return true;
  }
}
