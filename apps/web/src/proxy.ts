import { createApiClient, type TokenPair } from '@tiralarc/api-client';
import { type NextRequest, NextResponse } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { ACCESS_COOKIE, clearSession, REFRESH_COOKIE, writeSession } from './lib/session';

const api = createApiClient({ baseUrl: process.env.API_URL ?? 'http://localhost:3001' });
const handleI18nRouting = createIntlMiddleware(routing);

/** Locale-less routes that require a signed-in user. */
const PROTECTED_PREFIXES = ['/account', '/archer', '/onboarding'];

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

/** "/en/account" → { locale: "en", path: "/account" } */
function splitLocale(pathname: string): { locale: string; path: string } {
  const [, first, ...rest] = pathname.split('/');
  if (first && (routing.locales as readonly string[]).includes(first)) {
    return { locale: first, path: `/${rest.join('/')}` };
  }
  return { locale: routing.defaultLocale, path: pathname };
}

/**
 * 1. Refreshes the access token when only the refresh token is left.
 * 2. Redirects anonymous visitors away from protected pages.
 * 3. Applies locale routing (next-intl): "/" → "/fr", etc.
 */
export async function proxy(request: NextRequest) {
  const { locale, path } = splitLocale(request.nextUrl.pathname);
  const isProtected = PROTECTED_PREFIXES.some((prefix) => path.startsWith(prefix));
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;

  let tokens: TokenPair | null = null;
  let signedIn = request.cookies.has(ACCESS_COOKIE);
  if (!signedIn && refreshToken) {
    tokens = await refreshOnce(refreshToken, request);
    signedIn = tokens !== null;
    if (tokens) {
      // Make the new tokens visible to this render; next-intl forwards request headers.
      request.cookies.set(ACCESS_COOKIE, tokens.accessToken);
      request.cookies.set(REFRESH_COOKIE, tokens.refreshToken);
    }
  }

  const response =
    isProtected && !signedIn
      ? NextResponse.redirect(
          new URL(
            `/${locale}/login?next=${encodeURIComponent(path + request.nextUrl.search)}`,
            request.url,
          ),
        )
      : handleI18nRouting(request);

  if (tokens) writeSession(response.cookies, tokens);
  else if (refreshToken && !signedIn) clearSession(response.cookies);
  return response;
}

export const config = {
  // Everything except Next internals and static files.
  matcher: ['/((?!_next|_vercel|.*\\..*).*)'],
};
