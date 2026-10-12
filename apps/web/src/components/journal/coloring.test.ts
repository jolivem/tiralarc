import { describe, expect, it } from 'vitest';
import { inRegion, letterSeeds, paint, regionAt, toArtwork, touchesEdge } from './coloring';

/**
 * 9 × 5 drawing: a closed box (#) in the middle of the paper (.).
 *   .........
 *   .#####...
 *   .#...#...
 *   .#####...
 *   .........
 */
function drawing() {
  const rows = ['.........', '.#####...', '.#...#...', '.#####...', '.........'];
  const width = 9;
  const rgba = new Uint8ClampedArray(width * rows.length * 4);
  rows
    .join('')
    .split('')
    .forEach((cell, i) => rgba.set(cell === '#' ? [0, 0, 0, 255] : [255, 255, 255, 255], i * 4));
  return toArtwork(rgba, width, rows.length);
}
const at = (col: number, row: number) => ({ x: (col + 0.5) / 9, y: (row + 0.5) / 5 });
const pixel = (out: Uint8ClampedArray, col: number, row: number) => [
  ...out.slice((row * 9 + col) * 4, (row * 9 + col) * 4 + 4),
];

describe('colouring', () => {
  it('fills the closed area around the click, not beyond its outline', () => {
    const art = drawing();
    const inside = regionAt(art, at(3, 2).x, at(3, 2).y)!;
    expect(inRegion(art, inside, at(2, 2))).toBe(true);
    expect(inRegion(art, inside, at(4, 2))).toBe(true);
    expect(inRegion(art, inside, at(7, 2))).toBe(false);
    expect(inRegion(art, inside, at(0, 0))).toBe(false);
  });

  it('ignores a click on a stroke', () => {
    const art = drawing();
    expect(regionAt(art, at(1, 1).x, at(1, 1).y)).toBeNull();
  });

  it('paints fills opaque, keeps strokes, leaves uncoloured paper transparent', () => {
    const art = drawing();
    const out = paint(art, [{ ...at(3, 2), color: '#ff0000' }], [0, 0, 0]);
    expect(pixel(out, 3, 2)).toEqual([255, 0, 0, 255]); // inside the box
    expect(pixel(out, 1, 1)).toEqual([0, 0, 0, 255]); // its outline
    expect(pixel(out, 7, 2)).toEqual([0, 0, 0, 0]); // paper outside
  });

  it('lets a later fill of the same area win, and draws strokes in the given colour', () => {
    const art = drawing();
    const out = paint(
      art,
      [
        { ...at(3, 2), color: '#ff0000' },
        { ...at(2, 2), color: '#0000ff' },
        { ...at(8, 4), color: '#00ff00' },
      ],
      [255, 255, 255],
    );
    expect(pixel(out, 4, 2)).toEqual([0, 0, 255, 255]);
    expect(pixel(out, 0, 0)).toEqual([0, 255, 0, 255]); // the paper around the box is one area
    expect(pixel(out, 1, 1)).toEqual([255, 255, 255, 255]); // stroke, in white (dark mode)
  });

  it('finds the letters of hollow lettering, not the holes inside them', () => {
    // An outlined "O": its body (the ring between both outlines) and its hole.
    const rows = [
      '...........',
      '.#########.',
      '.#.......#.',
      '.#.#####.#.',
      '.#.#...#.#.',
      '.#.#####.#.',
      '.#.......#.',
      '.#########.',
      '...........',
    ];
    const width = 11;
    const rgba = new Uint8ClampedArray(width * rows.length * 4);
    rows
      .join('')
      .split('')
      .forEach((cell, i) => rgba.set(cell === '#' ? [0, 0, 0, 255] : [255, 255, 255, 255], i * 4));
    const art = toArtwork(rgba, width, rows.length);
    const point = (col: number, row: number) => ({
      x: (col + 0.5) / width,
      y: (row + 0.5) / rows.length,
    });

    const seeds = letterSeeds(art);
    expect(seeds).toHaveLength(1);
    const body = regionAt(art, seeds[0]!.x, seeds[0]!.y)!;
    expect(inRegion(art, body, point(2, 2))).toBe(true); // the ring
    expect(inRegion(art, body, point(5, 4))).toBe(false); // the hole
    expect(inRegion(art, body, point(0, 0))).toBe(false); // around
  });

  it('tells the paper around the drawing from a closed shape', () => {
    const art = drawing();
    expect(touchesEdge(art, regionAt(art, at(3, 2).x, at(3, 2).y)!)).toBe(false);
    expect(touchesEdge(art, regionAt(art, at(7, 2).x, at(7, 2).y)!)).toBe(true);
  });
});
