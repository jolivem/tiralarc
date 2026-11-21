/** Where a guided tour's note goes next to the element it highlights (pure: unit-tested). */

export type Box = { top: number; left: number; width: number; height: number };

export type NotePlacement = {
  top: number;
  left: number;
  width: number;
  /**
   * Where the note sits: under / over / right / left of the element, its drawn arrow pointing at
   * it (`arrowX` from the note's left edge when under or over it, `arrowY` from its top when
   * beside it); `over` when none fits (a big element on a phone): at the bottom of the window,
   * no arrow; `centre` when there is no element.
   */
  side: 'below' | 'above' | 'right' | 'left' | 'over' | 'centre';
  arrowX: number;
  arrowY: number;
};

/** Room kept to the window's edges. */
export const MARGIN = 16;
/** Between the highlighted element and the note: the arrow's height. */
export const GAP = 34;
/** The note's width from tablets up; on phones the window's width less the margins. */
export const NOTE_WIDTH = 340;
/** The spotlight's room around the element. */
export const PADDING = 8;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), Math.max(min, max));

/** Several elements (the same step's, e.g. a note on each page) as one box; null if none. */
export function union(boxes: readonly Box[]): Box | null {
  if (boxes.length === 0) return null;
  const top = Math.min(...boxes.map((b) => b.top));
  const left = Math.min(...boxes.map((b) => b.left));
  const bottom = Math.max(...boxes.map((b) => b.top + b.height));
  const right = Math.max(...boxes.map((b) => b.left + b.width));
  return { top, left, width: right - left, height: bottom - top };
}

/** The spotlight around the element: a little room around it, kept inside the window. */
export function spotlight(target: Box, viewport: { width: number; height: number }): Box {
  const top = Math.max(target.top - PADDING, 0);
  const left = Math.max(target.left - PADDING, 0);
  const bottom = Math.min(target.top + target.height + PADDING, viewport.height);
  const right = Math.min(target.left + target.width + PADDING, viewport.width);
  return { top, left, width: Math.max(right - left, 0), height: Math.max(bottom - top, 0) };
}

/** Keeps an arrow away from the note's corners (the bottom right one is rounded). */
const ARROW_CORNER = 28;

/**
 * The note (`noteHeight` tall) under the element when it fits, else over it, else on its right
 * or left, else at the bottom of the window on top of it; centred on the element's part in
 * the window, kept inside the window.
 */
export function placeNote(
  target: Box | null,
  noteHeight: number,
  viewport: { width: number; height: number },
): NotePlacement {
  const width = Math.min(NOTE_WIDTH, viewport.width - 2 * MARGIN);
  if (!target) {
    return {
      top: Math.max((viewport.height - noteHeight) / 2, MARGIN),
      left: (viewport.width - width) / 2,
      width,
      side: 'centre',
      arrowX: width / 2,
      arrowY: noteHeight / 2,
    };
  }
  const light = spotlight(target, viewport);
  const centreX = light.left + light.width / 2;
  const centreY = light.top + light.height / 2;
  const left = clamp(centreX - width / 2, MARGIN, viewport.width - width - MARGIN);
  const top = clamp(centreY - noteHeight / 2, MARGIN, viewport.height - noteHeight - MARGIN);
  const arrowX = clamp(centreX - left, ARROW_CORNER, width - ARROW_CORNER);
  const arrowY = clamp(centreY - top, ARROW_CORNER, noteHeight - ARROW_CORNER);

  const below = light.top + light.height + GAP;
  if (below + noteHeight <= viewport.height - MARGIN) {
    return { top: below, left, width, side: 'below', arrowX, arrowY };
  }
  const above = light.top - GAP - noteHeight;
  if (above >= MARGIN) return { top: above, left, width, side: 'above', arrowX, arrowY };
  const right = light.left + light.width + GAP;
  if (right + width <= viewport.width - MARGIN) {
    return { top, left: right, width, side: 'right', arrowX, arrowY };
  }
  const leftOf = light.left - GAP - width;
  if (leftOf >= MARGIN) return { top, left: leftOf, width, side: 'left', arrowX, arrowY };
  return {
    top: Math.max(viewport.height - MARGIN - noteHeight, MARGIN),
    left,
    width,
    side: 'over',
    arrowX,
    arrowY,
  };
}
