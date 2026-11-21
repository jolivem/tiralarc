import { describe, expect, it } from 'vitest';
import { GAP, MARGIN, NOTE_WIDTH, PADDING, placeNote, spotlight, union } from './tour-layout';

const desktop = { width: 1280, height: 800 };
const phone = { width: 360, height: 700 };

describe('guided tour layout', () => {
  it('puts the note under the element, centred on it, the arrow at its middle', () => {
    const target = { top: 100, left: 500, width: 200, height: 40 };
    const note = placeNote(target, 180, desktop);
    expect(note).toMatchObject({ side: 'below', top: 100 + 40 + PADDING + GAP, width: NOTE_WIDTH });
    expect(note.left + note.arrowX).toBe(600);
  });

  it('puts it over the element when there is no room under it', () => {
    const target = { top: 600, left: 500, width: 200, height: 100 };
    const note = placeNote(target, 180, desktop);
    expect(note).toMatchObject({ side: 'above', top: 600 - PADDING - GAP - 180 });
  });

  it('puts it beside a tall element, on its right if there is room, else on its left', () => {
    // The divider tabs, down the left of the window.
    const tabs = { top: 60, left: 10, width: 50, height: 700 };
    const right = placeNote(tabs, 200, desktop);
    expect(right).toMatchObject({ side: 'right', left: 10 + 50 + PADDING + GAP });
    // The arrow at the middle of the element's part in the window.
    expect(right.top + right.arrowY).toBe((60 - PADDING + 760 + PADDING) / 2);
    // A card on the right page.
    const card = { top: 120, left: 720, width: 520, height: 600 };
    expect(placeNote(card, 200, desktop)).toMatchObject({
      side: 'left',
      left: 720 - PADDING - GAP - NOTE_WIDTH,
    });
  });

  it('puts it at the bottom of the window over an element too big for any side', () => {
    const target = { top: 60, left: 0, width: 360, height: 600 };
    const note = placeNote(target, 200, phone);
    expect(note).toMatchObject({ side: 'over', top: 700 - MARGIN - 200 });
  });

  it('keeps it inside the window: full width on phones, the arrow still on the element', () => {
    const target = { top: 100, left: 330, width: 30, height: 30 };
    const note = placeNote(target, 150, phone);
    expect(note.width).toBe(360 - 2 * MARGIN);
    expect(note.left).toBe(MARGIN);
    expect(note.left + note.arrowX).toBeLessThanOrEqual(345);
    expect(note.arrowX).toBeLessThanOrEqual(note.width - 28);
  });

  it('centres it in the window when there is no element', () => {
    expect(placeNote(null, 200, desktop)).toMatchObject({
      side: 'centre',
      top: 300,
      left: (1280 - NOTE_WIDTH) / 2,
    });
  });

  it('keeps the spotlight inside the window, and joins several elements', () => {
    expect(spotlight({ top: 2, left: 0, width: 100, height: 20 }, desktop)).toEqual({
      top: 0,
      left: 0,
      width: 100 + PADDING,
      height: 2 + 20 + PADDING,
    });
    expect(
      union([
        { top: 10, left: 10, width: 10, height: 10 },
        { top: 50, left: 100, width: 20, height: 5 },
      ]),
    ).toEqual({ top: 10, left: 10, width: 110, height: 45 });
    expect(union([])).toBeNull();
  });
});
