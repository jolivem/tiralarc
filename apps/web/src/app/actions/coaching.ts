'use server';

import type {
  Competition,
  CompetitionList,
  CopiedSession,
  JournalSessionSummary,
  PlannableType,
  PlannedSessionUpdate,
} from '@tiralarc/api-client';
import { refresh } from 'next/cache';
import { cookies } from 'next/headers';
import { getLocale } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { type ActionState, send } from '@/lib/action-state';
import { getAuthedApi } from '@/lib/api';
import { getCurrentUser } from '@/lib/current-user';
import { PROFILE_COOKIE, type Profile } from '@/lib/current-user-paths';
import { JOURNAL_COOKIE } from '@/lib/journals';

const ONE_YEAR = 60 * 60 * 24 * 365;
const COOKIE = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
} as const;

/** Users holding both roles switch profile along with the journal they open. */
async function switchProfile(profile: Profile) {
  const user = await getCurrentUser();
  if (user?.roles.includes(profile)) (await cookies()).set(PROFILE_COOKIE, profile, COOKIE);
}

/** From the header's journal menu: one of the user's own journals. */
export async function openOwnJournal(id: string, stay: boolean): Promise<void> {
  (await cookies()).set(JOURNAL_COOKIE, id, { ...COOKIE, maxAge: ONE_YEAR });
  await switchProfile('ARCHER');
  if (stay) return refresh();
  return redirect({ href: '/archer/journal', locale: await getLocale() });
}

/** From the header's journal menu: the journal of one of the user's archers. */
export async function openAthleteJournal(archerId: string): Promise<void> {
  await switchProfile('COACH');
  return redirect({ href: `/coach/${archerId}/journal`, locale: await getLocale() });
}

/** Runs a change to an event's comments, then shows the sheet anew. */
async function changeComments(
  call: (
    api: Awaited<ReturnType<typeof getAuthedApi>>,
  ) => Promise<{ data?: unknown; error?: unknown; response: Response }>,
): Promise<ActionState> {
  const result = await send(call(await getAuthedApi()));
  if (!result.ok) return result.state;
  refresh();
  return {};
}

/** The coach comments on one of their archer's events. */
export async function addSessionComment(
  archerId: string,
  id: string,
  text: string,
): Promise<ActionState> {
  return changeComments((api) =>
    api.POST('/api/v1/coach/athletes/{archerId}/sessions/{id}/comments', {
      params: { path: { archerId, id } },
      body: { text },
    }),
  );
}

export async function updateSessionComment(
  archerId: string,
  id: string,
  commentId: string,
  text: string,
): Promise<ActionState> {
  return changeComments((api) =>
    api.PATCH('/api/v1/coach/athletes/{archerId}/sessions/{id}/comments/{commentId}', {
      params: { path: { archerId, id, commentId } },
      body: { text },
    }),
  );
}

export async function deleteSessionComment(
  archerId: string,
  id: string,
  commentId: string,
): Promise<ActionState> {
  return changeComments((api) =>
    api.DELETE('/api/v1/coach/athletes/{archerId}/sessions/{id}/comments/{commentId}', {
      params: { path: { archerId, id, commentId } },
    }),
  );
}

/** Runs a change to the coach's groups, then shows the page and the header's menu anew. */
async function changeGroups(
  call: (
    api: Awaited<ReturnType<typeof getAuthedApi>>,
  ) => Promise<{ data?: unknown; error?: unknown; response: Response }>,
): Promise<ActionState> {
  const result = await send(call(await getAuthedApi()));
  if (!result.ok) return result.state;
  refresh();
  return {};
}

export async function createCoachGroup(name: string): Promise<ActionState> {
  return changeGroups((api) => api.POST('/api/v1/coach/groups', { body: { name } }));
}

export async function renameCoachGroup(id: string, name: string): Promise<ActionState> {
  return changeGroups((api) =>
    api.PATCH('/api/v1/coach/groups/{id}', { params: { path: { id } }, body: { name } }),
  );
}

export async function deleteCoachGroup(id: string): Promise<ActionState> {
  return changeGroups((api) =>
    api.DELETE('/api/v1/coach/groups/{id}', { params: { path: { id } } }),
  );
}

export async function setAthleteGroup(
  archerId: string,
  groupId: string | null,
): Promise<ActionState> {
  return changeGroups((api) =>
    api.PUT('/api/v1/coach/athletes/{archerId}/group', {
      params: { path: { archerId } },
      body: { groupId },
    }),
  );
}

/** The archer's events between two days, within their journal of the season in progress. */
export async function listAthleteSessions(
  archerId: string,
  from: string,
  to: string,
): Promise<JournalSessionSummary[]> {
  const result = await send(
    (await getAuthedApi()).GET('/api/v1/coach/athletes/{archerId}/sessions', {
      params: { path: { archerId }, query: { from, to } },
    }),
  );
  return result.ok ? result.data : [];
}

/**
 * The FFTA competitions the archer sees (their departments and disciplines) between two days,
 * within their journal of the season in progress; null when they could not be loaded.
 */
export async function listAthleteCompetitions(
  archerId: string,
  from: string,
  to: string,
): Promise<CompetitionList | null> {
  const result = await send(
    (await getAuthedApi()).GET('/api/v1/coach/athletes/{archerId}/competitions', {
      params: { path: { archerId }, query: { from, to } },
    }),
  );
  return result.ok ? result.data : null;
}

/**
 * Plans one day of an FFTA competition in the archer's journal (WRITE access, a day after
 * today), like the archer's own "Add to my journal": the event carries the coach's stamp.
 */
export async function addCompetitionToAthleteJournal(
  archerId: string,
  competition: Pick<Competition, 'id' | 'title' | 'discipline'>,
  date: string,
): Promise<ActionState & { id?: string }> {
  const result = await send(
    (await getAuthedApi()).POST('/api/v1/coach/athletes/{archerId}/sessions', {
      params: { path: { archerId } },
      body: {
        type: 'COMPETITION',
        date,
        location: competition.title.slice(0, 200),
        discipline: competition.discipline,
        fftaCompetitionId: competition.id,
      },
    }),
  );
  return result.ok ? { id: result.data.id } : result.state;
}

/** Plans an event (type + day), then opens its sheet for the rest of the planning. */
export async function planSession(
  archerId: string,
  input: { type: PlannableType; date: string },
): Promise<ActionState> {
  const result = await send(
    (await getAuthedApi()).POST('/api/v1/coach/athletes/{archerId}/sessions', {
      params: { path: { archerId } },
      body: input,
    }),
  );
  if (!result.ok) return result.state;
  return redirect({
    href: `/coach/${archerId}/journal/${result.data.id}`,
    locale: await getLocale(),
  });
}

/**
 * Plans one of the archer's trainings / coachings again on `date` for the archers chosen: one
 * outcome per archer (the new event, or why there is none), shown in the dialog.
 */
export async function copySessionToAthletes(
  archerId: string,
  id: string,
  date: string,
  archerIds: string[],
): Promise<ActionState & { results?: CopiedSession[] }> {
  const result = await send(
    (await getAuthedApi()).POST('/api/v1/coach/athletes/{archerId}/sessions/{id}/copy', {
      params: { path: { archerId, id } },
      body: { date, archerIds },
    }),
  );
  if (!result.ok) return result.state;
  return { results: result.data };
}

export async function savePlannedSession(
  archerId: string,
  id: string,
  values: PlannedSessionUpdate,
): Promise<ActionState> {
  const result = await send(
    (await getAuthedApi()).PATCH('/api/v1/coach/athletes/{archerId}/sessions/{id}', {
      params: { path: { archerId, id } },
      body: values,
    }),
  );
  return result.ok ? { notice: 'saved' } : result.state;
}

/** Then back to the archer's journal, on `month` ("YYYY-MM": the event's) when given. */
export async function deletePlannedSession(
  archerId: string,
  id: string,
  month?: string,
): Promise<ActionState> {
  const result = await send(
    (await getAuthedApi()).DELETE('/api/v1/coach/athletes/{archerId}/sessions/{id}', {
      params: { path: { archerId, id } },
    }),
  );
  if (!result.ok) return result.state;
  return redirect({
    href: { pathname: `/coach/${archerId}/journal`, query: month ? { month } : {} },
    locale: await getLocale(),
  });
}
