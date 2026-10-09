'use server';

import type {
  JournalCreate,
  JournalSessionSummary,
  JournalUpdate,
  JournalSessionUpdate,
  SessionType,
  ThemeFill,
} from '@tiralarc/api-client';
import { refresh } from 'next/cache';
import { cookies } from 'next/headers';
import { getLocale } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { type ActionState, send } from '@/lib/action-state';
import { getAuthedApi } from '@/lib/api';
import { JOURNAL_COOKIE } from '@/lib/journals';

const ONE_YEAR = 60 * 60 * 24 * 365;

async function rememberJournal(id: string) {
  (await cookies()).set(JOURNAL_COOKIE, id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: ONE_YEAR,
  });
}

/** Creates a journal and selects it. */
export async function createJournal(input: JournalCreate): Promise<ActionState> {
  const result = await send((await getAuthedApi()).POST('/api/v1/journals', { body: input }));
  if (!result.ok) return result.state;
  await rememberJournal(result.data.id);
  refresh();
  return {};
}

export async function updateJournal(id: string, values: JournalUpdate): Promise<ActionState> {
  const result = await send(
    (await getAuthedApi()).PATCH('/api/v1/journals/{id}', {
      params: { path: { id } },
      body: values,
    }),
  );
  if (!result.ok) return result.state;
  refresh();
  return {};
}

/** Sets the calendar decoration of one month ("YYYY-MM") of a journal; null removes it. */
export async function setMonthTheme(
  id: string,
  month: string,
  theme: string | null,
): Promise<ActionState> {
  const result = await send(
    (await getAuthedApi()).PUT('/api/v1/journals/{id}/months/{month}/theme', {
      params: { path: { id, month } },
      body: { theme },
    }),
  );
  if (!result.ok) return result.state;
  refresh();
  return {};
}

/** Saves the archer's colouring of one month's decoration (no re-render: the page already shows it). */
export async function saveMonthColoring(
  id: string,
  month: string,
  fills: ThemeFill[],
): Promise<ActionState> {
  const result = await send(
    (await getAuthedApi()).PUT('/api/v1/journals/{id}/months/{month}/coloring', {
      params: { path: { id, month } },
      body: { fills },
    }),
  );
  return result.ok ? {} : result.state;
}

/** Makes a journal the one the Journal section opens. */
export async function selectJournal(id: string): Promise<void> {
  await rememberJournal(id);
  refresh();
}

/** Deletes a journal and its sessions. */
export async function deleteJournal(id: string): Promise<ActionState> {
  const result = await send(
    (await getAuthedApi()).DELETE('/api/v1/journals/{id}', { params: { path: { id } } }),
  );
  if (!result.ok) return result.state;
  refresh();
  return {};
}

/** A journal's sessions between two days (inclusive, YYYY-MM-DD), for the calendar. */
export async function listSessions(
  journalId: string,
  from: string,
  to: string,
): Promise<JournalSessionSummary[]> {
  const result = await send(
    (await getAuthedApi()).GET('/api/v1/journal/sessions', {
      params: { query: { journalId, from, to } },
    }),
  );
  return result.ok ? result.data : [];
}

/** Step 1 of the two-step entry: type + date (+ optional time), then open the event's form. */
export async function createSession(input: {
  journalId: string;
  type: SessionType;
  date: string;
  startTime?: string | null;
}): Promise<ActionState> {
  const result = await send(
    (await getAuthedApi()).POST('/api/v1/journal/sessions', {
      body: {
        journalId: input.journalId,
        type: input.type,
        date: input.date,
        startTime: input.startTime || undefined,
      },
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

/** Attaches one photo (form field `file`) to an event; the API resizes and stores it. */
export async function uploadPhoto(sessionId: string, form: FormData): Promise<ActionState> {
  const result = await send(
    (await getAuthedApi()).POST('/api/v1/journal/sessions/{sessionId}/photos', {
      params: { path: { sessionId } },
      // Sent as multipart (fetch sets the boundary itself); the typed body is only a placeholder.
      body: { file: '' },
      bodySerializer: () => form,
    }),
  );
  if (!result.ok) return result.state;
  refresh();
  return {};
}

export async function deletePhoto(sessionId: string, id: string): Promise<ActionState> {
  const result = await send(
    (await getAuthedApi()).DELETE('/api/v1/journal/sessions/{sessionId}/photos/{id}', {
      params: { path: { sessionId, id } },
    }),
  );
  if (!result.ok) return result.state;
  refresh();
  return {};
}

export async function deleteSession(id: string): Promise<ActionState> {
  const result = await send(
    (await getAuthedApi()).DELETE('/api/v1/journal/sessions/{id}', { params: { path: { id } } }),
  );
  if (!result.ok) return result.state;
  return redirect({ href: '/archer/journal', locale: await getLocale() });
}
