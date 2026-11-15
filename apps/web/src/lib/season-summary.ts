import type { Discipline, Goal, JournalStats } from '@tiralarc/api-client';
import { arrowAverages } from './arrow-averages';

/** The built-in types counted in the summary (custom and "Divers" events left out). */
const COUNTED = ['TRAINING', 'COACHING', 'COMPETITION', 'STRENGTH'] as const;
type CountedType = (typeof COUNTED)[number];

/** A discipline's best score at a competition. */
export interface BestScore {
  discipline: Discipline;
  score: number;
  date: string;
  location: string | null;
}

/** How a distance's average per arrow moved over the season: its first half against its last. */
export interface Progression {
  distance: number;
  first: number;
  last: number;
}

export interface SeasonSummary {
  /** Events of each built-in type, then all of them. */
  events: Record<CountedType, number> & { total: number };
  arrows: number;
  minutes: number;
  /** Days with at least one built-in event. */
  activeDays: number;
  bestScores: BestScore[];
  /** Per distance: the season's average and best session (`lib/arrow-averages.ts`). */
  averages: { distance: number; average: number; best: number }[];
  /** Distances averaged in at least two sessions. */
  progressions: Progression[];
  /** Goals reached within the period, by day; and those still open at its end. */
  goalsReached: Goal[];
  goalsOpen: Goal[];
}

/** Weighted average of `points` (score, arrows) as one figure. */
const mean = (items: { score: number; arrows: number }[]) =>
  items.reduce((sum, i) => sum + i.score, 0) / items.reduce((sum, i) => sum + i.arrows, 0);

/**
 * The season summary of a journal's period (`from`–`to`, inclusive) from the indicators'
 * figures over that period (`stats`) and the archer's goals.
 */
export function seasonSummary(
  stats: JournalStats,
  goals: readonly Goal[],
  from: string,
  to: string,
): SeasonSummary {
  const within = (date: string) => date >= from && date <= to;

  const events = { TRAINING: 0, COACHING: 0, COMPETITION: 0, STRENGTH: 0, total: 0 };
  const days = new Set<string>();
  for (const e of stats.eventsByDay) {
    if (!within(e.date) || !(COUNTED as readonly string[]).includes(e.type)) continue;
    events[e.type as CountedType] += e.count;
    events.total += e.count;
    days.add(e.date);
  }

  // The best competition score of each discipline (the earlier one when tied).
  const best = new Map<Discipline, BestScore>();
  for (const c of stats.competitions) {
    if (!within(c.date) || c.score === null || c.discipline === null) continue;
    const kept = best.get(c.discipline);
    if (!kept || c.score > kept.score) {
      best.set(c.discipline, {
        discipline: c.discipline,
        score: c.score,
        date: c.date,
        location: c.location,
      });
    }
  }

  const scores = stats.scores.filter((s) => within(s.date));
  const distances = arrowAverages(scores);
  // Each distance's sessions in two halves by date (the middle one in the first when odd).
  const progressions = distances.flatMap(({ distance }): Progression[] => {
    const sessions = scores
      .filter(
        (s) =>
          s.distanceMeters === distance && arrowAverages([s]).length === 1 && s.arrowCount !== null,
      )
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
      .map((s) => ({ score: s.score, arrows: s.arrowCount as number }));
    if (sessions.length < 2) return [];
    const half = Math.ceil(sessions.length / 2);
    return [{ distance, first: mean(sessions.slice(0, half)), last: mean(sessions.slice(half)) }];
  });

  const byDay = (a: Goal, b: Goal) =>
    (a.achievedOn ?? '') < (b.achievedOn ?? '')
      ? -1
      : (a.achievedOn ?? '') > (b.achievedOn ?? '')
        ? 1
        : 0;
  return {
    events,
    arrows: stats.arrowsByDay.filter((d) => within(d.date)).reduce((sum, d) => sum + d.arrows, 0),
    minutes: stats.durationsByDay
      .filter((d) => within(d.date))
      .reduce((sum, d) => sum + d.minutes, 0),
    activeDays: days.size,
    bestScores: [...best.values()],
    averages: distances.map(({ distance, average, best: top }) => ({
      distance,
      average,
      best: top,
    })),
    progressions,
    goalsReached: goals.filter((g) => g.achievedOn !== null && within(g.achievedOn)).sort(byDay),
    goalsOpen: goals.filter(
      (g) => g.createdOn <= to && (g.achievedOn === null || g.achievedOn > to),
    ),
  };
}
