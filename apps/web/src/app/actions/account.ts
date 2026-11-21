'use server';

import { cookies } from 'next/headers';
import { getLocale } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { type ActionState, send } from '@/lib/action-state';
import { getAuthedApi } from '@/lib/api';
import { PROFILE_COOKIE } from '@/lib/current-user-paths';
import { JOURNAL_COOKIE } from '@/lib/journals';
import { clearSession } from '@/lib/session';

/**
 * Deletes the signed-in account (its email typed again, its password if it has one), then
 * signs out here and goes to the visitors' home page, which says it is done.
 */
export async function deleteAccount(input: {
  email: string;
  password?: string;
}): Promise<ActionState> {
  const result = await send(
    (await getAuthedApi()).DELETE('/api/v1/users/me', {
      body: { email: input.email, password: input.password || undefined },
    }),
  );
  if (!result.ok) return result.state;
  const cookieStore = await cookies();
  clearSession(cookieStore);
  cookieStore.delete(PROFILE_COOKIE);
  cookieStore.delete(JOURNAL_COOKIE);
  return redirect({
    href: { pathname: '/', query: { account: 'deleted' } },
    locale: await getLocale(),
  });
}
