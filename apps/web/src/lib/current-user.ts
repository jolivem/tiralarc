import 'server-only';
import type { User } from '@tiralarc/api-client';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { getAuthedApi } from './api';
import { ACCESS_COOKIE } from './session';

/**
 * The signed-in user, or null. Memoised per request (React `cache`), so the
 * layout and the page share a single GET /users/me.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  if (!(await cookies()).has(ACCESS_COOKIE)) return null;
  try {
    const { data } = await (await getAuthedApi()).GET('/api/v1/users/me');
    return data ?? null;
  } catch {
    return null;
  }
});

export { homePathFor } from './current-user-paths';
