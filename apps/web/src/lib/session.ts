import type { TokenPair } from '@tiralarc/api-client';

/**
 * The browser never sees API tokens: they live in httpOnly cookies set by the
 * Next.js server (Server Actions and proxy.ts), which calls the API with
 * `Authorization: Bearer`. Mobile apps talk to the API directly instead.
 */
export const ACCESS_COOKIE = 'tl_access';
export const REFRESH_COOKIE = 'tl_refresh';

/** Drop the access cookie a bit before the JWT expires so proxy.ts refreshes it in time. */
const ACCESS_EXPIRY_MARGIN_SECONDS = 30;

interface CookieWriter {
  set(name: string, value: string, options: Record<string, unknown>): unknown;
  delete(name: string): unknown;
}

const baseCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
} as const;

export function writeSession(cookies: CookieWriter, tokens: TokenPair): void {
  cookies.set(ACCESS_COOKIE, tokens.accessToken, {
    ...baseCookieOptions,
    maxAge: Math.max(tokens.expiresIn - ACCESS_EXPIRY_MARGIN_SECONDS, 1),
  });
  cookies.set(REFRESH_COOKIE, tokens.refreshToken, {
    ...baseCookieOptions,
    maxAge: tokens.refreshExpiresIn,
  });
}

export function clearSession(cookies: CookieWriter): void {
  cookies.delete(ACCESS_COOKIE);
  cookies.delete(REFRESH_COOKIE);
}
