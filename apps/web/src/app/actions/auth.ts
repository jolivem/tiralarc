'use server';

import type { ProblemDetails } from '@tiralarc/api-client';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { api, clientHeaders } from '@/lib/api';
import { clearSession, REFRESH_COOKIE, writeSession } from '@/lib/session';

export interface AuthFormState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

function toFormState(problem: unknown): AuthFormState {
  const p = problem as Partial<ProblemDetails> | undefined;
  return {
    error: p?.detail ?? 'Une erreur est survenue, veuillez réessayer.',
    fieldErrors: Object.fromEntries((p?.errors ?? []).map((e) => [e.field, e.messages])),
  };
}

/** Only allow same-site relative redirects after login. */
function safeNext(value: FormDataEntryValue | null): string {
  const next = typeof value === 'string' ? value : '';
  return next.startsWith('/') && !next.startsWith('//') ? next : '/profile';
}

export async function login(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const { data, error, response } = await api.POST('/api/v1/auth/login', {
    body: { email: String(formData.get('email')), password: String(formData.get('password')) },
    headers: await clientHeaders(),
  });
  if (!data) {
    return response.status === 401
      ? { error: 'Email ou mot de passe incorrect.' }
      : toFormState(error);
  }
  writeSession(await cookies(), data);
  redirect(safeNext(formData.get('next')));
}

export async function register(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const displayName = String(formData.get('displayName') ?? '').trim();
  const { data, error, response } = await api.POST('/api/v1/auth/register', {
    body: {
      email: String(formData.get('email')),
      password: String(formData.get('password')),
      displayName: displayName || undefined,
    },
    headers: await clientHeaders(),
  });
  if (!data) {
    return response.status === 409
      ? { error: 'Un compte existe déjà avec cet email.' }
      : toFormState(error);
  }
  writeSession(await cookies(), data);
  redirect('/profile');
}

export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_COOKIE)?.value;
  if (refreshToken) {
    // Best effort: the local session is cleared even if the API is unreachable.
    await api.POST('/api/v1/auth/logout', { body: { refreshToken } }).catch(() => undefined);
  }
  clearSession(cookieStore);
  redirect('/login');
}
