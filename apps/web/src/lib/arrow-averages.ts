import type { Discipline, ScoreStat } from '@tiralarc/api-client';

/**
 * Target archery, where a score divided by its arrows means the same everywhere (10 at most
 * per arrow): indoor and outdoor target (TAE). Field, 3D, nature, Beursault and run archery
 * score otherwise (or at varying distances): left out.
 */
export const AVERAGED_DISCIPLINES: readonly Discipline[] = [
  'INDOOR',
  'TAE_NATIONAL',
  'TAE_INTERNATIONAL',
];
/** Above this, the arrows were mis-typed (fewer than shot): the session is left out. */
const MAX_PER_ARROW = 10;

/** One session's average, for the chart. */
export interface ArrowAveragePoint {
  id: string;
  date: string;
  average: number;
}

/** What the archer averages per arrow at one distance. */
export interface DistanceAverage {
  distance: number;
  /** All the period's points over all its arrows (not the mean of the sessions' averages). */
  average: number;
  arrows: number;
  sessions: number;
  /** The best session's average. */
  best: number;
  /** By date. */
  points: ArrowAveragePoint[];
}

/**
 * Average points per arrow, by distance (shortest first), over the scored sessions given that
 * have their arrows and distance (target archery only, `AVERAGED_DISCIPLINES`).
 */
export function arrowAverages(scores: readonly ScoreStat[]): DistanceAverage[] {
  const byDistance = new Map<
    number,
    { score: number; arrows: number; points: ArrowAveragePoint[] }
  >();
  for (const s of scores) {
    const { arrowCount: arrows, distanceMeters: distance } = s;
    if (!arrows || arrows <= 0 || !distance || !AVERAGED_DISCIPLINES.includes(s.discipline)) {
      continue;
    }
    const average = s.score / arrows;
    if (average > MAX_PER_ARROW) continue;
    const entry = byDistance.get(distance) ?? { score: 0, arrows: 0, points: [] };
    entry.score += s.score;
    entry.arrows += arrows;
    entry.points.push({ id: s.id, date: s.date, average });
    byDistance.set(distance, entry);
  }
  return [...byDistance.entries()]
    .sort(([a], [b]) => a - b)
    .map(([distance, { score, arrows, points }]) => ({
      distance,
      average: score / arrows,
      arrows,
      sessions: points.length,
      best: Math.max(...points.map((p) => p.average)),
      points: points.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)),
    }));
}
