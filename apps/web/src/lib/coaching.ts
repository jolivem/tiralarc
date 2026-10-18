import 'server-only';
import type { Athlete } from '@tiralarc/api-client';
import { cache } from 'react';
import { getAuthedApi } from './api';

/** The archers who made the user their coach, by name. Memoised per request. */
export const getAthletes = cache(async (): Promise<Athlete[]> => {
  try {
    const { data } = await (await getAuthedApi()).GET('/api/v1/coach/athletes');
    return data ?? [];
  } catch {
    return [];
  }
});

/** One of the user's archers (null if they don't coach them). Memoised per request. */
export const getAthlete = cache(async (archerId: string): Promise<Athlete | null> => {
  const { data } = await (
    await getAuthedApi()
  ).GET('/api/v1/coach/athletes/{archerId}', { params: { path: { archerId } } });
  return data ?? null;
});
