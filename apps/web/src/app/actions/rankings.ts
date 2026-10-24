'use server';

import type { RankingList } from '@tiralarc/api-client';
import { send } from '@/lib/action-state';
import { getAuthedApi } from '@/lib/api';

/**
 * The archer's places in the FFTA national rankings (their category and bow, found by licence);
 * null when they could not be loaded. Read from the FFTA website: slow the first time, hence
 * loaded by the page once shown.
 */
export async function listRankings(): Promise<RankingList | null> {
  const result = await send((await getAuthedApi()).GET('/api/v1/rankings'));
  return result.ok ? result.data : null;
}
