import type { JournalSessionSummary } from '@tiralarc/api-client';
import dayjs from 'dayjs';
import { listSessions } from '@/app/actions/journal';

/** The API returns at most this span of events per request. */
const MAX_RANGE_DAYS = 366;

/** The archer's events from `startDate` to `endDate` (inclusive), fetched in spans the API accepts. */
export async function eventsOf(
  startDate: string,
  endDate: string,
): Promise<JournalSessionSummary[]> {
  const end = dayjs(endDate);
  const spans: [string, string][] = [];
  for (let from = dayjs(startDate); !from.isAfter(end); from = from.add(MAX_RANGE_DAYS, 'day')) {
    const spanEnd = from.add(MAX_RANGE_DAYS - 1, 'day');
    const to = spanEnd.isAfter(end) ? end : spanEnd;
    spans.push([from.format('YYYY-MM-DD'), to.format('YYYY-MM-DD')]);
  }
  const results = await Promise.all(spans.map(([from, to]) => listSessions(from, to)));
  return results.flat();
}
