import { createApiClient, type TokenPair } from '@tiralarc/api-client';
import { type NextRequest, NextResponse } from 'next/server';
import { ACCESS_COOKIE, clearSession, REFRESH_COOKIE, writeSession } from './lib/session';

const api = createApiClient({ baseUrl: process.env.API_URL ?? 'http://localhost:3001' });

/** Routes that require a signed-in user. */
const PROTECTED_PREFIXES = ['/profile'];

/**
 * Refresh tokens are single-use: concurrent requests (parallel navigations,
 * prefetches) must share one refresh call, otherwise the API sees a reused
 * token and revokes the session. In-memory, so per server instance.
 */
const inflightRefreshes = new Map<string, Promise<TokenPair | null>>();

function refreshOnce(refreshToken: string, request: NextRequest): Promise<TokenPair | null> {
  let pending = inflightRefreshes.get(refreshToken);
  if (!pending) {
    pending = api
      .POST('/api/v1/auth/refresh', {
        body: { refreshToken },
        headers: {
          'user-agent': request.headers.get('user-agent') ?? '',
          'x-forwarded-for': request.headers.get('x-forwarded-for') ?? '',
        },
      })
      .then(({ data }) => data ?? null)
      .catch(() => null);
    inflightRefreshes.set(refreshToken, pending);
    // Keep the result briefly so requests arriving just after still reuse it.
    void pending.finally(() => setTimeout(() => inflightRefreshes.delete(refreshToken), 10_000));
  }
  return pending;
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const hasAccess = request.cookies.has(ACCESS_COOKIE);
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;

  if (hasAccess) return NextResponse.next();

  const tokens = refreshToken ? await refreshOnce(refreshToken, request) : null;

  if (!tokens) {
    const response = isProtected
      ? NextResponse.redirect(
          new URL(`/login?next=${encodeURIComponent(pathname + search)}`, request.url),
        )
      : NextResponse.next();
    if (refreshToken) clearSession(response.cookies);
    return response;
  }

  // Make the new tokens visible to this render (request) and persist them (response).
  request.cookies.set(ACCESS_COOKIE, tokens.accessToken);
  request.cookies.set(REFRESH_COOKIE, tokens.refreshToken);
  const response = NextResponse.next({ request: { headers: request.headers } });
  writeSession(response.cookies, tokens);
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
