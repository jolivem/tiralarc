import 'server-only';
import { createApiClient } from '@tiralarc/api-client';
import { cookies, headers } from 'next/headers';
import { ACCESS_COOKIE } from './session';

const API_URL = process.env.API_URL ?? 'http://localhost:3001';

/** Unauthenticated API client, for server-side code only. */
export const api = createApiClient({ baseUrl: API_URL, cache: 'no-store' });

/** API client authenticated with the current user's access token (Server Components / Actions). */
export async function getAuthedApi() {
  const accessToken = (await cookies()).get(ACCESS_COOKIE)?.value;
  return createApiClient({
    baseUrl: API_URL,
    cache: 'no-store',
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  });
}

/** Forwards the end user's IP and user agent so the API can rate-limit and label sessions. */
export async function clientHeaders(): Promise<Record<string, string>> {
  const incoming = await headers();
  const forwarded: Record<string, string> = {};
  for (const name of ['x-forwarded-for', 'user-agent']) {
    const value = incoming.get(name);
    if (value) forwarded[name] = value;
  }
  return forwarded;
}
