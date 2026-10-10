import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Machine-readable error codes returned in `problem+json` bodies (`code`).
 * Clients (web, iOS, Android) translate them; `detail` stays English, for developers.
 * Treat this list as part of the public API contract: never rename a code.
 */
export const ErrorCode = {
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  EMAIL_TAKEN: 'EMAIL_TAKEN',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
  INVALID_VERIFICATION_TOKEN: 'INVALID_VERIFICATION_TOKEN',
  INVALID_REFRESH_TOKEN: 'INVALID_REFRESH_TOKEN',
  INVALID_ID_TOKEN: 'INVALID_ID_TOKEN',
  PROVIDER_NOT_CONFIGURED: 'PROVIDER_NOT_CONFIGURED',
  JOURNAL_OVERLAP: 'JOURNAL_OVERLAP',
  INVITATION_ALREADY_SENT: 'INVITATION_ALREADY_SENT',
  INVALID_INVITATION_TOKEN: 'INVALID_INVITATION_TOKEN',
  CANNOT_INVITE_SELF: 'CANNOT_INVITE_SELF',
  LIMIT_REACHED: 'LIMIT_REACHED',
  INVALID_IMAGE: 'INVALID_IMAGE',
  MONTH_HAS_NO_THEME: 'MONTH_HAS_NO_THEME',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

/** Fallback code when an exception was thrown without one. */
export function defaultErrorCode(status: number): ErrorCode {
  switch (status) {
    case HttpStatus.BAD_REQUEST:
      return ErrorCode.VALIDATION_FAILED;
    case HttpStatus.UNAUTHORIZED:
      return ErrorCode.UNAUTHORIZED;
    case HttpStatus.FORBIDDEN:
      return ErrorCode.FORBIDDEN;
    case HttpStatus.NOT_FOUND:
      return ErrorCode.NOT_FOUND;
    case HttpStatus.TOO_MANY_REQUESTS:
      return ErrorCode.TOO_MANY_REQUESTS;
    case HttpStatus.PAYLOAD_TOO_LARGE:
      return ErrorCode.FILE_TOO_LARGE;
    default:
      return ErrorCode.INTERNAL_ERROR;
  }
}

/** Throws-ready HTTP exception carrying an ErrorCode, e.g. `throw new ApiException(409, ErrorCode.EMAIL_TAKEN, '...')`. */
export class ApiException extends HttpException {
  constructor(status: HttpStatus, code: ErrorCode, detail: string) {
    super({ message: detail, code }, status);
  }
}
