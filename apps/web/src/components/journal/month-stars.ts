import type { MonthStars } from '@tiralarc/api-client';

/** Stars of a month's satisfaction (0.5 to 5, by halves; null = not rated). */
export const STAR_COUNT = 5;

export type StarFill = 'empty' | 'half' | 'full';

/** How star `n` (1 to 5) is filled for a rating. */
export function starFill(stars: MonthStars | null, n: number): StarFill {
  const rating = stars ?? 0;
  if (rating >= n) return 'full';
  return rating >= n - 0.5 ? 'half' : 'empty';
}

/**
 * The rating after a click on star `n` (1 to 5): that star goes empty → half → full → empty;
 * the ones before it end up full, the ones after it empty. Null when no star is left filled.
 */
export function clickStar(stars: MonthStars | null, n: number): MonthStars | null {
  const fill = starFill(stars, n);
  const next = fill === 'empty' ? n - 0.5 : fill === 'half' ? n : n - 1;
  // A multiple of 0.5 between 0.5 and 5, as `n` is a star's number.
  return next > 0 ? (next as MonthStars) : null;
}
