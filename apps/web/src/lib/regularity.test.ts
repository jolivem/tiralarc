import { describe, expect, it } from 'vitest';
import { regularity } from './regularity';

const training = (date: string) => ({ date, type: 'TRAINING' as const });

describe('regularity', () => {
  // 2026-11-15 is a Sunday; its week starts on Monday 2026-11-09.
  const start = '2026-09-01';

  it('counts the events and the days since the season began, today included', () => {
    const r = regularity(
      [training('2026-09-01'), { date: '2026-09-02', type: 'OTHER' }, training('2026-12-01')],
      start,
      '2026-09-10',
    );
    expect(r.events).toBe(2);
    expect(r.days).toBe(10);
  });

  it('counts the weeks in a row with at least two sessions', () => {
    const sessions = [
      // Week of 26 Oct: only one, the streak starts after it.
      training('2026-10-27'),
      // Weeks of 2 Nov and 9 Nov: two each.
      training('2026-11-02'),
      { date: '2026-11-05', type: 'STRENGTH' as const },
      training('2026-11-10'),
      training('2026-11-12'),
    ];
    expect(regularity(sessions, start, '2026-11-15').streakWeeks).toBe(2);
  });

  it('lets this week run on: the streak ends last week until it has its sessions', () => {
    const sessions = [training('2026-11-03'), training('2026-11-04'), training('2026-11-10')];
    expect(regularity(sessions, start, '2026-11-11').streakWeeks).toBe(1);
  });

  it('leaves notes and custom events out of the streak', () => {
    const sessions = [
      { date: '2026-11-10', type: 'OTHER' as const },
      { date: '2026-11-11', type: 'CUSTOM' as const },
    ];
    expect(regularity(sessions, start, '2026-11-15').streakWeeks).toBe(0);
  });

  it('is empty before the season starts', () => {
    expect(regularity([], start, '2026-08-20')).toEqual({ events: 0, days: 0, streakWeeks: 0 });
  });
});
