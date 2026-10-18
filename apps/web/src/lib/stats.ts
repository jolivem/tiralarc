import 'server-only';
import type { Journal, JournalStats } from '@tiralarc/api-client';
import type { Period } from '@/components/stats/chart-utils';
import { getAuthedApi } from './api';

const NO_STATS: JournalStats = {
  competitions: [],
  scores: [],
  arrowsByDay: [],
  durationsByDay: [],
  eventsByDay: [],
  physicalFeelingsByDay: [],
  mentalFeelingsByDay: [],
};

/**
 * The indicators' figures over a journal's period, or all time (`null`), with the span the
 * charts cover and today (decided here, so the server and the browser draw the same
 * "today" marker). Used by the Indicators page and the favourite indicator on the home page.
 */
export async function getStats(
  journal: Journal | null,
): Promise<{ stats: JournalStats; span: Period; today: string }> {
  const { data } = await (
    await getAuthedApi()
  ).GET('/api/v1/journal/sessions/stats', {
    params: { query: journal ? { from: journal.startDate, to: journal.endDate } : {} },
  });
  const stats = data ?? NO_STATS;
  const today = new Date().toISOString().slice(0, 10);
  // All time: the charts span from the first recorded event to the last one, or to today if
  // later (so the running totals' "last n days" end today).
  const days = [
    ...stats.competitions.map((c) => c.date),
    ...stats.arrowsByDay.map((d) => d.date),
    ...stats.durationsByDay.map((d) => d.date),
  ].sort();
  const last = days.at(-1) ?? today;
  const span = journal ?? { startDate: days[0] ?? today, endDate: last > today ? last : today };
  return { stats, span, today };
}
