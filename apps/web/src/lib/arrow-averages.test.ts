import type { ScoreStat } from '@tiralarc/api-client';
import { describe, expect, it } from 'vitest';
import { arrowAverages } from './arrow-averages';

let next = 0;
const scored = (fields: Partial<ScoreStat>): ScoreStat => ({
  id: `s${next++}`,
  date: '2026-10-01',
  type: 'TRAINING',
  discipline: 'INDOOR',
  score: 540,
  arrowCount: 60,
  distanceMeters: 18,
  ...fields,
});

describe('arrowAverages', () => {
  it('averages all the points over all the arrows, by distance, shortest first', () => {
    const [d18, d70] = arrowAverages([
      scored({ distanceMeters: 70, discipline: 'TAE_INTERNATIONAL', score: 600, arrowCount: 72 }),
      scored({ date: '2026-10-08', score: 570, arrowCount: 60 }),
      // 30 arrows: weighs half as much as a 60-arrow session.
      scored({ date: '2026-10-02', score: 255, arrowCount: 30 }),
    ]);
    expect(d18?.distance).toBe(18);
    expect(d18?.average).toBeCloseTo(825 / 90);
    expect(d18).toMatchObject({ arrows: 90, sessions: 2, best: 9.5 });
    // The chart's points by date.
    expect(d18?.points.map((p) => p.date)).toEqual(['2026-10-02', '2026-10-08']);
    expect(d70).toMatchObject({ distance: 70, sessions: 1, arrows: 72 });
    expect(d70?.average).toBeCloseTo(600 / 72);
  });

  it('leaves out what it cannot average: no arrows or distance, other disciplines, typos', () => {
    expect(
      arrowAverages([
        scored({ arrowCount: null }),
        scored({ arrowCount: 0 }),
        scored({ distanceMeters: null }),
        scored({ discipline: 'THREE_D' }),
        scored({ discipline: 'FIELD' }),
        // 540 points in 6 arrows: the arrows were mis-typed.
        scored({ arrowCount: 6 }),
      ]),
    ).toEqual([]);
  });
});
