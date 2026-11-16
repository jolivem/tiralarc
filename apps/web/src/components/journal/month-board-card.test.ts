import { describe, expect, it } from 'vitest';
import { iconSlots, monthWeeks } from './month-board-card';

describe('monthWeeks', () => {
  it('starts on Monday, the other months left blank', () => {
    // 1 November 2026 is a Sunday.
    const weeks = monthWeeks('2026-11');
    expect(weeks).toHaveLength(6);
    expect(weeks[0]).toEqual([null, null, null, null, null, null, '2026-11-01']);
    expect(weeks[5]).toEqual(['2026-11-30', null, null, null, null, null, null]);
  });

  it('takes four weeks for a February starting on Monday', () => {
    const weeks = monthWeeks('2027-02');
    expect(weeks).toHaveLength(4);
    expect(weeks[0]![0]).toBe('2027-02-01');
    expect(weeks[3]![6]).toBe('2027-02-28');
  });

  it('knows leap years', () => {
    expect(monthWeeks('2028-02').flat().filter(Boolean)).toHaveLength(29);
  });
});

describe('iconSlots', () => {
  const box = { x: 0, y: 0, w: 100, h: 100 };

  it('centres a single icon', () => {
    expect(iconSlots(1, box)).toEqual([{ x: 2, y: 2, size: 96 }]);
  });

  it('puts two side by side, in the middle', () => {
    const [a, b] = iconSlots(2, box);
    expect(a!.y).toBe(b!.y);
    expect(a!.size).toBe(48);
    expect(a!.y + a!.size / 2).toBe(50);
  });

  it('centres the third under the first two', () => {
    const slots = iconSlots(3, box);
    expect(slots[2]!.x + slots[2]!.size / 2).toBe(50);
    expect(slots[2]!.y).toBeGreaterThan(slots[0]!.y);
  });

  it('shows four at most', () => {
    expect(iconSlots(6, box)).toHaveLength(4);
    expect(iconSlots(0, box)).toEqual([]);
  });
});
