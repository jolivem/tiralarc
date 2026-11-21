import { describe, expect, it } from 'vitest';
import { goalProgress, type ProgressSession } from './goal-progress.js';

const session = (date: string, extra: Partial<ProgressSession>): ProgressSession => ({
  date,
  type: 'COMPETITION',
  discipline: 'INDOOR',
  distanceMeters: 18,
  score: null,
  arrowCount: null,
  ...extra,
});

describe('goalProgress', () => {
  const scoreGoal = {
    metric: 'SCORE' as const,
    target: 550,
    createdOn: '2026-10-01',
    discipline: 'INDOOR',
    distanceMeters: 18,
  };

  it('keeps the best competition score of the goal discipline and distance since it was set', () => {
    const progress = goalProgress(
      scoreGoal,
      [
        session('2026-09-20', { score: 580 }), // before the goal
        session('2026-10-05', { score: 530 }),
        session('2026-10-12', { score: 560, distanceMeters: 25 }), // another distance
        session('2026-10-19', { score: 545 }),
        // A training's score counts however many arrows were shot: not comparable.
        session('2026-10-26', { score: 790, type: 'TRAINING', arrowCount: 90 }),
      ],
      '2026-11-21',
    );
    expect(progress).toEqual({ value: 545, reachedOn: null });
  });

  it('is reached on the day the target is first met, sessions in any order', () => {
    const progress = goalProgress(
      { ...scoreGoal, discipline: null, distanceMeters: null },
      [session('2026-11-02', { score: 556 }), session('2026-10-20', { score: 551 })],
      '2026-11-21',
    );
    expect(progress).toEqual({ value: 556, reachedOn: '2026-10-20' });
  });

  it('adds up the arrows of every event, not counting the days to come', () => {
    const goal = {
      metric: 'ARROWS' as const,
      target: 150,
      createdOn: '2026-10-01',
      discipline: null,
      distanceMeters: null,
    };
    const sessions = [
      session('2026-10-02', { arrowCount: 72 }),
      session('2026-10-09', { arrowCount: 90, type: 'TRAINING' }),
      session('2026-12-01', { arrowCount: 500 }),
    ];
    expect(goalProgress(goal, sessions, '2026-11-21')).toEqual({
      value: 162,
      reachedOn: '2026-10-09',
    });
    expect(goalProgress(goal, sessions.slice(0, 1), '2026-11-21')).toEqual({
      value: 72,
      reachedOn: null,
    });
  });
});
