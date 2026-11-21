/**
 * A figured goal's progress, from the archer's events since the day it was set (pure,
 * unit-tested): SCORE — the best score in competition (of the goal's discipline / distance if it
 * has one: a competition's round has a fixed number of arrows, unlike a training whose score
 * counts however many were shot); ARROWS — the arrows shot in all. Reached the day the target
 * was first met.
 */

export type GoalMetric = 'SCORE' | 'ARROWS';

export interface FiguredGoal {
  metric: GoalMetric;
  target: number;
  /** "YYYY-MM-DD". */
  createdOn: string;
  discipline: string | null;
  distanceMeters: number | null;
}

export interface ProgressSession {
  /** "YYYY-MM-DD". */
  date: string;
  type: string;
  discipline: string | null;
  distanceMeters: number | null;
  score: number | null;
  arrowCount: number | null;
}

export interface GoalProgress {
  /** The best score, or the arrows shot so far. */
  value: number;
  /** The day the target was first met; null = not yet. */
  reachedOn: string | null;
}

const SCORED_TYPES = new Set(['COMPETITION']);

/** `sessions` in any order; those after `today` are not counted (still to come). */
export function goalProgress(
  goal: FiguredGoal,
  sessions: ProgressSession[],
  today: string,
): GoalProgress {
  const counted = sessions
    .filter((s) => s.date >= goal.createdOn && s.date <= today)
    .toSorted((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  let value = 0;
  let reachedOn: string | null = null;
  for (const s of counted) {
    if (goal.metric === 'ARROWS') {
      value += s.arrowCount ?? 0;
    } else {
      const fits =
        SCORED_TYPES.has(s.type) &&
        s.score !== null &&
        (goal.discipline === null || s.discipline === goal.discipline) &&
        (goal.distanceMeters === null || s.distanceMeters === goal.distanceMeters);
      if (!fits) continue;
      value = Math.max(value, s.score!);
    }
    if (reachedOn === null && value >= goal.target) reachedOn = s.date;
  }
  return { value, reachedOn };
}
