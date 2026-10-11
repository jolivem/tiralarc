import 'server-only';
import type { User } from '@tiralarc/api-client';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { getAuthedApi } from './api';
import { activeProfile, PROFILE_COOKIE, type Profile } from './current-user-paths';
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

/** The signed-in user's active profile (see `PROFILE_COOKIE`), or null when signed out. */
export async function getActiveProfile(): Promise<Profile | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  return activeProfile(user.roles, (await cookies()).get(PROFILE_COOKIE)?.value);
}

export { homePathFor } from './current-user-paths';
