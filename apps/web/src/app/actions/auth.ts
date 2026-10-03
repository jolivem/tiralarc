'use server';

import type { SelfAssignableRole, TokenPair } from '@tiralarc/api-client';
import { cookies } from 'next/headers';
import { getLocale } from 'next-intl/server';
import { type ActionState, send } from '@/lib/action-state';
import { api, clientHeaders, getAuthedApi } from '@/lib/api';
import { clearSession, REFRESH_COOKIE, writeSession } from '@/lib/session';
import { redirect } from '@/i18n/navigation';

const SELF_ASSIGNABLE: readonly string[] = ['ARCHER', 'COACH'] satisfies SelfAssignableRole[];

function rolesFrom(formData: FormData): SelfAssignableRole[] {
  return formData
    .getAll('roles')
    .map(String)
    .filter((role): role is SelfAssignableRole => SELF_ASSIGNABLE.includes(role));
}

/** Only allow same-site, locale-less paths ("/profile") as post-login targets. */
function safeNext(value: unknown): string | undefined {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//')
    ? value
    : undefined;
}

/**
 * Stores the session, then sends users without a role (new Google / Apple
 * accounts) to onboarding, and everyone else to where they were going.
 */
async function completeSignIn(tokens: TokenPair, next?: string): Promise<never> {
  writeSession(await cookies(), tokens);
  const locale = await getLocale();
  const me = await send(
    api.GET('/api/v1/users/me', {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    }),
  );
  if (me.ok && me.data.roles.length === 0) {
    return redirect({
      href: { pathname: '/onboarding', query: next ? { next } : {} },
      locale,
    });
  }
  return redirect({ href: next ?? '/profile', locale });
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
  const roles = rolesFrom(formData);
  if (roles.length === 0) return { fieldErrors: { roles: ['arrayMinSize'] } };

  const displayName = String(formData.get('displayName') ?? '').trim();
  const locale = await getLocale();
  const result = await send(
    api.POST('/api/v1/auth/register', {
      body: {
        email: String(formData.get('email')),
        password: String(formData.get('password')),
        displayName: displayName || undefined,
        roles,
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
  /** Set on the sign-up page; omitted on the sign-in page. */
  roles?: SelfAssignableRole[];
  /** Apple only sends the user's name to the client, on first sign-in. */
  displayName?: string;
  next?: string;
}

export async function socialSignIn(input: SocialSignInInput): Promise<ActionState> {
  const body = {
    idToken: input.idToken,
    nonce: input.nonce,
    roles: input.roles?.filter((role) => SELF_ASSIGNABLE.includes(role)),
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

export async function updateRoles(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const roles = rolesFrom(formData);
  if (roles.length === 0) return { fieldErrors: { roles: ['arrayMinSize'] } };

  const authed = await getAuthedApi();
  const result = await send(authed.PUT('/api/v1/users/me/roles', { body: { roles } }));
  if (!result.ok) return result.state;

  const next = formData.get('next');
  if (typeof next === 'string') {
    return redirect({ href: safeNext(next) ?? '/profile', locale: await getLocale() });
  }
  return { notice: 'saved' };
}

export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_COOKIE)?.value;
  if (refreshToken) {
    // Best effort: the local session is cleared even if the API is unreachable.
    await send(api.POST('/api/v1/auth/logout', { body: { refreshToken } }));
  }
  clearSession(cookieStore);
  redirect({ href: '/login', locale: await getLocale() });
}
