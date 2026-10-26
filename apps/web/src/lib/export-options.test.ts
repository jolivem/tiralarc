import { describe, expect, it } from 'vitest';
import { exportMonths, exportQuery, parseExportOptions } from './export-options';

const parse = (query: string) => parseExportOptions(new URLSearchParams(query));

describe('parseExportOptions', () => {
  it('reads the days and the parts asked for', () => {
    expect(parse('from=2026-09-01&to=2027-08-31&stats=1&sheets=1&photos=1')).toEqual({
      from: '2026-09-01',
      to: '2027-08-31',
      rankings: false,
      stats: true,
      sheets: true,
      photos: true,
    });
  });

  it('takes no photos without the sheets', () => {
    expect(parse('from=2026-09-01&to=2026-09-30&photos=1')?.photos).toBe(false);
  });

  it('turns down missing, reversed, invalid or too distant days', () => {
    expect(parse('from=2026-09-01')).toBeNull();
    expect(parse('from=2026-10-01&to=2026-09-01')).toBeNull();
    expect(parse('from=2026-02-31&to=2026-03-01')).toBeNull();
    expect(parse('from=2026-01-01&to=2027-06-01')).toBeNull();
  });

  it('round-trips through its query string', () => {
    const options = {
      from: '2026-09-01',
      to: '2026-12-31',
      rankings: true,
      stats: false,
      sheets: true,
      photos: false,
    };
    expect(parseExportOptions(exportQuery(options))).toEqual(options);
  });
});

describe('exportMonths', () => {
  it('lists every month the days touch, across a new year', () => {
    expect(exportMonths('2026-11-15', '2027-02-01')).toEqual([
      '2026-11',
      '2026-12',
      '2027-01',
      '2027-02',
    ]);
    expect(exportMonths('2026-09-10', '2026-09-20')).toEqual(['2026-09']);
  });
});
