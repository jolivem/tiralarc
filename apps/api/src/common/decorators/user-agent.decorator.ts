import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

/**
 * The caller's User-Agent, used to label sessions. Unlike @Headers('user-agent'),
 * it is not documented as a required parameter in the OpenAPI contract.
 */
export const UserAgent = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined =>
    ctx.switchToHttp().getRequest<Request>().get('user-agent'),
);
