import 'server-only';
import type { Journal } from '@tiralarc/api-client';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { getAuthedApi } from './api';

/** Id of the journal the archer selected (a UI preference, not a secret). */
export const JOURNAL_COOKIE = 'tl_journal';

/** The archer's journals, most recent season first. Memoised per request. */
export const getJournals = cache(async (): Promise<Journal[]> => {
  try {
    const { data } = await (await getAuthedApi()).GET('/api/v1/journals');
    return data ?? [];
  } catch {
    return [];
  }
});

/**
 * The journal the archer works in: the selected one, otherwise the season
 * in progress, otherwise the most recent. Null when there is no journal yet.
 */
export async function getSelectedJournal(): Promise<Journal | null> {
  const journals = await getJournals();
  const selectedId = (await cookies()).get(JOURNAL_COOKIE)?.value;
  const today = new Date().toISOString().slice(0, 10);
  return (
    journals.find((j) => j.id === selectedId) ??
    journals.find((j) => j.startDate <= today && today <= j.endDate) ??
    journals[0] ??
    null
  );
}
