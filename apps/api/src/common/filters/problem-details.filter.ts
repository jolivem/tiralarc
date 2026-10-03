import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { STATUS_CODES } from 'node:http';
import type { Request, Response } from 'express';
import { defaultErrorCode, type ErrorCode } from '../errors.js';

export interface FieldError {
  field: string;
  /** Failed rule names (e.g. "isEmail", "minLength"), stable for client-side translation. */
  constraints: string[];
  /** English messages, for developers. */
  messages: string[];
}

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  /** Stable machine-readable code, see common/errors.ts. */
  code: ErrorCode;
  detail?: string;
  instance: string;
  /** Field-level validation errors, when code is VALIDATION_FAILED. */
  errors?: FieldError[];
}

/**
 * Serialises every error as RFC 9457 `application/problem+json`, so web and
 * mobile clients can rely on a single error shape.
 */
@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemDetailsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    if (status >= 500) {
      this.logger.error(exception);
    }

    const problem: ProblemDetails = {
      type: 'about:blank',
      title: STATUS_CODES[status] ?? 'Error',
      status,
      code: defaultErrorCode(status),
      instance: request.originalUrl,
    };

    if (exception instanceof HttpException && status < 500) {
      const body = exception.getResponse();
      if (typeof body === 'string') {
        problem.detail = body;
      } else if (typeof body === 'object' && body !== null) {
        const { message, errors, code } = body as {
          message?: unknown;
          errors?: FieldError[];
          code?: ErrorCode;
        };
        if (typeof message === 'string') problem.detail = message;
        if (Array.isArray(errors)) problem.errors = errors;
        if (code) problem.code = code;
      }
    }

    response.status(status).type('application/problem+json').json(problem);
  }
}
