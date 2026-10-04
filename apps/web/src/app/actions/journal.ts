'use server';

import type {
  JournalSessionSummary,
  JournalSessionUpdate,
  SessionType,
} from '@tiralarc/api-client';
import { getLocale } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { type ActionState, send } from '@/lib/action-state';
import { getAuthedApi } from '@/lib/api';

/** Sessions between two days (inclusive, YYYY-MM-DD), for the calendar. */
export async function listSessions(from: string, to: string): Promise<JournalSessionSummary[]> {
  const result = await send(
    (await getAuthedApi()).GET('/api/v1/journal/sessions', { params: { query: { from, to } } }),
  );
  return result.ok ? result.data : [];
}

/** Step 1 of the two-step entry: type + date (+ optional time), then open the full sheet. */
export async function createSession(input: {
  type: SessionType;
  date: string;
  startTime?: string | null;
}): Promise<ActionState> {
  const result = await send(
    (await getAuthedApi()).POST('/api/v1/journal/sessions', {
      body: { type: input.type, date: input.date, startTime: input.startTime || undefined },
    }),
  );
  if (!result.ok) return result.state;
  return redirect({ href: `/archer/journal/${result.data.id}`, locale: await getLocale() });
}

export async function saveSession(id: string, values: JournalSessionUpdate): Promise<ActionState> {
  const result = await send(
    (await getAuthedApi()).PATCH('/api/v1/journal/sessions/{id}', {
      params: { path: { id } },
      body: values,
    }),
  );
  return result.ok ? { notice: 'saved' } : result.state;
}

export async function deleteSession(id: string): Promise<ActionState> {
  const result = await send(
    (await getAuthedApi()).DELETE('/api/v1/journal/sessions/{id}', { params: { path: { id } } }),
  );
  if (!result.ok) return result.state;
  return redirect({ href: '/archer/journal', locale: await getLocale() });
}
