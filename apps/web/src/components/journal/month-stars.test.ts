import { describe, expect, it } from 'vitest';
import { clickStar, starFill } from './month-stars';

describe('starFill', () => {
  it('fills the stars up to the rating, the last one by half', () => {
    expect([1, 2, 3, 4, 5].map((n) => starFill(3.5, n))).toEqual([
      'full',
      'full',
      'full',
      'half',
      'empty',
    ]);
    expect([1, 2, 3, 4, 5].map((n) => starFill(null, n))).toEqual(Array(5).fill('empty'));
  });
});

describe('clickStar', () => {
  it('cycles the clicked star: half, full, then empty', () => {
    expect(clickStar(null, 3)).toBe(2.5);
    expect(clickStar(2.5, 3)).toBe(3);
    expect(clickStar(3, 3)).toBe(2);
  });

  it('fills the stars before the clicked one and empties those after it', () => {
    // Star 2 is full within a rating of 4.5: it empties, star 1 stays full, the others empty.
    expect(clickStar(4.5, 2)).toBe(1);
    // Star 5 is empty: it fills by half, the four before it fully.
    expect(clickStar(1, 5)).toBe(4.5);
  });

  it('leaves no rating once the first star empties', () => {
    expect(clickStar(null, 1)).toBe(0.5);
    expect(clickStar(0.5, 1)).toBe(1);
    expect(clickStar(1, 1)).toBeNull();
  });
});
