import type { SessionType } from '@tiralarc/api-client';

/** What counts as a session for the streak: archery and strength work, not notes or custom events. */
const SESSION_TYPES: ReadonlySet<SessionType> = new Set([
  'TRAINING',
  'COACHING',
  'COMPETITION',
  'STRENGTH',
]);
/** Sessions a week needs to keep the streak going. */
export const SESSIONS_PER_WEEK = 2;

const DAY = 86_400_000;
const utc = (day: string) => Date.parse(`${day}T00:00:00Z`);
/** "YYYY-MM-DD" of the Monday of `day`'s week. */
function mondayOf(day: string): string {
  const time = utc(day);
  const weekday = (new Date(time).getUTCDay() + 6) % 7;
  return new Date(time - weekday * DAY).toISOString().slice(0, 10);
}

export interface Regularity {
  /** Events dated from the season's start to today. */
  events: number;
  /** Days from the season's start to today, both counted. */
  days: number;
  /**
   * Weeks in a row (Monday to Sunday) with at least SESSIONS_PER_WEEK sessions, up to the last
   * one: this week counts once it has them, otherwise the streak ends last week (still on).
   * Only weeks starting within the season count.
   */
  streakWeeks: number;
}

/**
 * The home page's regularity figures over a journal (`startDate`, "YYYY-MM-DD") up to `today`.
 * `sessions`: the journal's events (any after today are left out).
 */
export function regularity(
  sessions: readonly { date: string; type: SessionType }[],
  startDate: string,
  today: string,
): Regularity {
  const past = sessions.filter((s) => s.date >= startDate && s.date <= today);
  const days = today < startDate ? 0 : Math.round((utc(today) - utc(startDate)) / DAY) + 1;

  const perWeek = new Map<string, number>();
  for (const s of past) {
    if (!SESSION_TYPES.has(s.type)) continue;
    const week = mondayOf(s.date);
    perWeek.set(week, (perWeek.get(week) ?? 0) + 1);
  }
  const full = (week: string) => (perWeek.get(week) ?? 0) >= SESSIONS_PER_WEEK;
  // The season's first week counts even when the season starts mid-week.
  const firstWeek = mondayOf(startDate);
  let week = mondayOf(today);
  // This week, still going, doesn't break the streak yet.
  if (!full(week)) week = new Date(utc(week) - 7 * DAY).toISOString().slice(0, 10);
  let streakWeeks = 0;
  while (week >= firstWeek && full(week)) {
    streakWeeks += 1;
    week = new Date(utc(week) - 7 * DAY).toISOString().slice(0, 10);
  }
  return { events: past.length, days, streakWeeks };
}
