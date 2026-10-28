import type { Discipline, Indicator } from '@tiralarc/api-client';

/**
 * What the PDF extract of the journal holds (the home page's export dialog): the days it
 * covers and its optional parts. The month calendars are always in it. Read from a query
 * string by the PDF route and the printed page, written by the dialog.
 */
export interface ExportOptions {
  /** First and last day, inclusive (YYYY-MM-DD). */
  from: string;
  to: string;
  /** The disciplines whose national rankings are printed, in `RANKED_DISCIPLINES` order. */
  rankings: Discipline[];
  /** The Indicators page's cards printed, in `INDICATORS` order. */
  indicators: Indicator[];
  /** One page per training, coaching and competition sheet. */
  sheets: boolean;
  /** Each sheet's photos on a page of their own (with the sheets only). */
  photos: boolean;
}

/** The disciplines with a national ranking (the API's: not Beursault nor Run Archery). */
export const RANKED_DISCIPLINES: readonly Discipline[] = [
  'INDOOR',
  'TAE_NATIONAL',
  'TAE_INTERNATIONAL',
  'FIELD',
  'THREE_D',
  'NATURE',
];

/** The Indicators page's cards, in its order (goals aside). */
export const INDICATORS: readonly Indicator[] = [
  'ARROWS',
  'DURATIONS',
  'SCORES',
  'EVENTS',
  'PHYSICAL_FEELINGS',
  'MENTAL_FEELINGS',
  'COMPETITIONS',
];

/** The longest extract, in days: a year, as far as the API lists events at once. */
export const MAX_EXPORT_DAYS = 366;
const PARTS = ['sheets', 'photos'] as const;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** The known values of a comma-separated list, in the order of `known`. */
const listOf = <T extends string>(value: string | null, known: readonly T[]): T[] => {
  const given = new Set(value?.split(','));
  return known.filter((item) => given.has(item));
};

/** A real day: some engines read "02-31" as March 3rd, hence the round trip. */
const isDay = (value: string | null): value is string => {
  if (value === null || !DAY.test(value)) return false;
  const time = Date.parse(`${value}T00:00:00Z`);
  return !Number.isNaN(time) && new Date(time).toISOString().slice(0, 10) === value;
};

/** Days from `from` to `to`, both counted. */
export function spanDays(from: string, to: string): number {
  return (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000 + 1;
}

/** The options of a query string; null when its days are missing, reversed or too far apart. */
export function parseExportOptions(query: URLSearchParams): ExportOptions | null {
  const from = query.get('from');
  const to = query.get('to');
  if (!isDay(from) || !isDay(to) || from > to || spanDays(from, to) > MAX_EXPORT_DAYS) return null;
  const on = (part: (typeof PARTS)[number]) => query.get(part) === '1';
  return {
    from,
    to,
    rankings: listOf(query.get('rankings'), RANKED_DISCIPLINES),
    indicators: listOf(query.get('indicators'), INDICATORS),
    sheets: on('sheets'),
    photos: on('sheets') && on('photos'),
  };
}

export function exportQuery(options: ExportOptions): URLSearchParams {
  const query = new URLSearchParams({ from: options.from, to: options.to });
  if (options.rankings.length > 0) query.set('rankings', options.rankings.join(','));
  if (options.indicators.length > 0) query.set('indicators', options.indicators.join(','));
  for (const part of PARTS) if (options[part]) query.set(part, '1');
  return query;
}

/** "YYYY-MM" of each month the days touch, in order. */
export function exportMonths(from: string, to: string): string[] {
  const months: string[] = [];
  let [year, month] = from.split('-').map(Number) as [number, number];
  const last = to.slice(0, 7);
  for (;;) {
    const current = `${year}-${String(month).padStart(2, '0')}`;
    if (current > last) return months;
    months.push(current);
    month += 1;
    if (month > 12) [year, month] = [year + 1, 1];
  }
}
