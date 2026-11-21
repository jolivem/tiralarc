import { describe, expect, it } from 'vitest';
import { demoSeason } from './demo-season.js';

describe('demoSeason', () => {
  const today = '2026-11-21';
  const season = demoSeason(today, 'fr');

  it("covers the season today belongs to, decorated month by month up to the plan's end", () => {
    expect(season.journal).toMatchObject({
      title: 'Saison 2026-2027',
      startDate: '2026-09-01',
      endDate: '2027-08-31',
    });
    expect(Object.keys(season.journal.monthThemes)).toEqual([
      '2026-09',
      '2026-10',
      '2026-11',
      '2026-12',
    ]);
    // Months over are rated, the current one not yet.
    expect(Object.keys(season.journal.monthSatisfactions)).toEqual(['2026-09', '2026-10']);
  });

  it('reviews the days gone (but the last trainings) and plans the days to come', () => {
    const past = season.sessions.filter((s) => s.date < today && s.type === 'COMPETITION');
    expect(past.length).toBeGreaterThan(0);
    expect(past.every((s) => s.score !== null && s.arrowCount === 60)).toBe(true);
    const toComplete = season.sessions.filter(
      (s) => s.date < today && s.type === 'TRAINING' && s.score === null,
    );
    expect(toComplete.length).toBeGreaterThan(0);
    const future = season.sessions.filter((s) => s.date >= today);
    expect(future.length).toBeGreaterThan(0);
    expect(future.every((s) => s.score === null && s.satisfaction === null)).toBe(true);
    expect(future.at(-1)!.date <= '2026-12-19').toBe(true);
    // At most four events a day (the API's DAY_FULL).
    const perDay = new Map<string, number>();
    for (const s of season.sessions) perDay.set(s.date, (perDay.get(s.date) ?? 0) + 1);
    expect(Math.max(...perDay.values())).toBeLessThanOrEqual(4);
  });

  it('is the same for the same day, and written in the language asked for', () => {
    expect(demoSeason(today, 'fr')).toEqual(season);
    expect(demoSeason(today, 'en').journal.title).toBe('Season 2026-2027');
    expect(demoSeason('2027-03-02', 'fr').journal.startDate).toBe('2026-09-01');
  });
});
