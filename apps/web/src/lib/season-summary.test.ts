import type { Goal, JournalStats } from '@tiralarc/api-client';
import { describe, expect, it } from 'vitest';
import { seasonSummary } from './season-summary';

const empty: JournalStats = {
  competitions: [],
  scores: [],
  arrowsByDay: [],
  durationsByDay: [],
  eventsByDay: [],
  physicalFeelingsByDay: [],
  mentalFeelingsByDay: [],
};
const goal = (fields: Partial<Goal>): Goal => ({
  id: 'g',
  type: 'SPORT',
  description: '',
  createdOn: '2026-09-01',
  achieved: false,
  achievedOn: null,
  metric: null,
  target: null,
  discipline: null,
  distanceMeters: null,
  progress: null,
  ...fields,
});
const indoor = (date: string, score: number, arrowCount = 60) => ({
  id: date,
  date,
  type: 'TRAINING' as const,
  discipline: 'INDOOR' as const,
  score,
  arrowCount,
  distanceMeters: 18,
});

describe('seasonSummary', () => {
  const from = '2026-09-01';
  const to = '2027-08-31';

  it('counts the events, arrows, time and days within the period', () => {
    const s = seasonSummary(
      {
        ...empty,
        eventsByDay: [
          { date: '2026-09-02', type: 'TRAINING', count: 2 },
          { date: '2026-09-02', type: 'COMPETITION', count: 1 },
          { date: '2026-09-05', type: 'STRENGTH', count: 1 },
          // Left out: a custom event, and a day out of the period.
          { date: '2026-09-06', type: 'CUSTOM', count: 1 },
          { date: '2026-08-31', type: 'TRAINING', count: 1 },
        ],
        arrowsByDay: [
          { date: '2026-09-02', arrows: 120 },
          { date: '2027-09-01', arrows: 60 },
        ],
        durationsByDay: [{ date: '2026-09-02', minutes: 150 }],
      },
      [],
      from,
      to,
    );
    expect(s.events).toEqual({ TRAINING: 2, COACHING: 0, COMPETITION: 1, STRENGTH: 1, total: 4 });
    expect(s).toMatchObject({ arrows: 120, minutes: 150, activeDays: 2 });
  });

  it('keeps the best competition score of each discipline', () => {
    const competition = (date: string, score: number | null, discipline = 'INDOOR' as const) => ({
      id: date,
      date,
      discipline,
      arrowCount: 60,
      score,
      location: date,
    });
    const s = seasonSummary(
      {
        ...empty,
        competitions: [
          competition('2026-10-01', 540),
          competition('2026-11-01', 556),
          competition('2026-12-01', 556),
          competition('2027-01-01', null),
        ],
      },
      [],
      from,
      to,
    );
    expect(s.bestScores).toEqual([
      { discipline: 'INDOOR', score: 556, date: '2026-11-01', location: '2026-11-01' },
    ]);
  });

  it('compares the first half of a distance’s sessions with the last', () => {
    const s = seasonSummary(
      {
        ...empty,
        scores: [
          indoor('2026-10-01', 510),
          indoor('2026-10-08', 530),
          indoor('2026-12-01', 550),
          // Alone at 70 m: no progression.
          { ...indoor('2026-10-02', 600, 72), distanceMeters: 70, discipline: 'TAE_NATIONAL' },
        ],
      },
      [],
      from,
      to,
    );
    expect(s.progressions).toHaveLength(1);
    expect(s.progressions[0]?.distance).toBe(18);
    expect(s.progressions[0]?.first).toBeCloseTo(1040 / 120);
    expect(s.progressions[0]?.last).toBeCloseTo(550 / 60);
    expect(s.averages.map((a) => a.distance)).toEqual([18, 70]);
  });

  it('lists the goals reached in the period, and those still open at its end', () => {
    const reached = goal({ id: 'r', achievedOn: '2027-03-01' });
    const before = goal({ id: 'b', createdOn: '2025-01-01', achievedOn: '2025-06-01' });
    const open = goal({ id: 'o' });
    const later = goal({ id: 'l', achievedOn: '2027-10-01' });
    const s = seasonSummary(empty, [reached, before, open, later], from, to);
    expect(s.goalsReached.map((g) => g.id)).toEqual(['r']);
    expect(s.goalsOpen.map((g) => g.id)).toEqual(['o', 'l']);
  });
});
