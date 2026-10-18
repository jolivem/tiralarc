'use server';

import type { TokenPair } from '@tiralarc/api-client';
import { cookies } from 'next/headers';
import { getLocale } from 'next-intl/server';
import { type ActionState, send } from '@/lib/action-state';
import { api, clientHeaders } from '@/lib/api';
import { homePathFor, PROFILE_COOKIE } from '@/lib/current-user-paths';
import { JOURNAL_COOKIE } from '@/lib/journals';
import { clearSession, REFRESH_COOKIE, writeSession } from '@/lib/session';
import { redirect } from '@/i18n/navigation';

/** Only allow same-site, locale-less paths ("/archer/journal") as post-login targets. */
function safeNext(value: unknown): string | undefined {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//')
    ? value
    : undefined;
}

/**
 * Stores the session, then goes where the user was going (their home by default).
 * Nobody picks a role or a profile: every account is an archer's, and the journal
 * opened in the header's menu decides the profile.
 */
async function completeSignIn(tokens: TokenPair, next?: string): Promise<never> {
  const cookieStore = await cookies();
  writeSession(cookieStore, tokens);
  // A new session starts from the archer's default journal, not the last one selected
  // (archers first: an archer who also coaches lands on their own journal).
  cookieStore.delete(JOURNAL_COOKIE);
  cookieStore.delete(PROFILE_COOKIE);
  const locale = await getLocale();
  const me = await send(
    api.GET('/api/v1/users/me', {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    }),
  );
  return redirect({ href: next ?? homePathFor(me.ok ? me.data.roles : []), locale });
}

export async function login(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const result = await send(
    api.POST('/api/v1/auth/login', {
      body: { email: String(formData.get('email')), password: String(formData.get('password')) },
      headers: await clientHeaders(),
    }),
  );
  if (!result.ok) return result.state;
  return completeSignIn(result.data, safeNext(formData.get('next')));
}

export async function register(_prev: ActionState, formData: FormData): Promise<ActionState> {
  // The form checks it too; this covers a submission made before the page's script ran.
  if (formData.get('password') !== formData.get('passwordConfirm')) {
    return { fieldErrors: { passwordConfirm: ['passwordMismatch'] } };
  }

  const displayName = String(formData.get('displayName') ?? '').trim();
  const locale = await getLocale();
  const result = await send(
    api.POST('/api/v1/auth/register', {
      body: {
        email: String(formData.get('email')),
        password: String(formData.get('password')),
        displayName: displayName || undefined,
        locale,
      },
      headers: await clientHeaders(),
    }),
  );
  if (!result.ok) return result.state;
  return redirect({
    href: { pathname: '/register/check-email', query: { email: result.data.email } },
    locale,
  });
}

export async function resendVerification(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const result = await send(
    api.POST('/api/v1/auth/resend-verification', {
      body: { email: String(formData.get('email')) },
      headers: await clientHeaders(),
    }),
  );
  return result.ok ? { notice: 'resent' } : result.state;
}

export async function verifyEmail(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const result = await send(
    api.POST('/api/v1/auth/verify-email', {
      body: { token: String(formData.get('token')) },
      headers: await clientHeaders(),
    }),
  );
  if (!result.ok) return result.state;
  return completeSignIn(result.data);
}

export interface SocialSignInInput {
  provider: 'google' | 'apple';
  idToken: string;
  nonce?: string;
  /** Apple only sends the user's name to the client, on first sign-in. */
  displayName?: string;
  next?: string;
}

export async function socialSignIn(input: SocialSignInInput): Promise<ActionState> {
  const body = {
    idToken: input.idToken,
    nonce: input.nonce,
    displayName: input.displayName?.slice(0, 100) || undefined,
    locale: await getLocale(),
  };
  const options = { body, headers: await clientHeaders() };
  const result = await send(
    input.provider === 'google'
      ? api.POST('/api/v1/auth/google', options)
      : api.POST('/api/v1/auth/apple', options),
  );
  if (!result.ok) return result.state;
  return completeSignIn(result.data, safeNext(input.next));
}

export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_COOKIE)?.value;
  if (refreshToken) {
    // Best effort: the local session is cleared even if the API is unreachable.
    await send(api.POST('/api/v1/auth/logout', { body: { refreshToken } }));
  }
  clearSession(cookieStore);
  cookieStore.delete(PROFILE_COOKIE);
  redirect({ href: '/login', locale: await getLocale() });
}
