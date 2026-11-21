import { describe, expect, it } from 'vitest';
import {
  areaSeeds,
  enclosedRegionAt,
  realisticFills,
  inRegion,
  letterSeeds,
  paint,
  regionAt,
  toArtwork,
  touchesEdge,
} from './coloring';

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

describe('automatic colouring', () => {
  it('fills each closed area with its colour in the colour map, not the paper around', () => {
    const art = drawing();
    // The colour map: the box filled green, at twice the size (another resolution).
    const width = 18;
    const height = 10;
    const rgba = new Uint8ClampedArray(width * height * 4).fill(255);
    for (let row = 4; row < 6; row++)
      for (let col = 4; col < 10; col++) rgba.set([47, 158, 68, 255], (row * width + col) * 4);
    const fills = realisticFills(art, { rgba, width, height }, 'top', 10);
    expect(fills).toHaveLength(1);
    expect(fills[0]).toMatchObject({ band: 'top', color: '#2f9e44', pixels: 3 });
    // Its point is inside the box.
    const inside = regionAt(art, at(3, 2).x, at(3, 2).y)!;
    expect(inRegion(art, inside, fills[0]!)).toBe(true);
  });

  it('leaves areas white in the colour map uncoloured, and keeps to the limit', () => {
    const art = drawing();
    const rgba = new Uint8ClampedArray(9 * 5 * 4).fill(255);
    expect(realisticFills(art, { rgba, width: 9, height: 5 }, 'top', 10)).toEqual([]);
    rgba.set([255, 0, 0, 255], (2 * 9 + 3) * 4);
    expect(realisticFills(art, { rgba, width: 9, height: 5 }, 'top', 0)).toEqual([]);
  });

  it('fills an area cut by the image edge (a branch running off the band), not the paper around', () => {
    // A branch coming in from the left edge: its inside (row 2, columns 0–3) reaches the edge.
    const rows = ['.........', '#####....', '....#....', '#####....', '.........'];
    const rgba = new Uint8ClampedArray(9 * 5 * 4);
    rows
      .join('')
      .split('')
      .forEach((cell, i) => rgba.set(cell === '#' ? [0, 0, 0, 255] : [255, 255, 255, 255], i * 4));
    const art = toArtwork(rgba, 9, 5);
    // The colour map: everything brown but the paper around, left white.
    const colors = new Uint8ClampedArray(9 * 5 * 4).fill(255);
    for (let col = 0; col < 4; col++) colors.set([139, 90, 43, 255], (2 * 9 + col) * 4);
    const fills = realisticFills(art, { rgba: colors, width: 9, height: 5 }, 'left', 10);
    expect(fills).toEqual([expect.objectContaining({ color: '#8b5a2b', pixels: 4 })]);
    // The paper around stays out even where the colour map isn't white.
    expect(areaSeeds(art, { edges: true }).map((seed) => seed.pixels)).toEqual([4]);
  });

  it('finds every closed area, largest first, never the paper around', () => {
    expect(areaSeeds(drawing()).map((seed) => seed.pixels)).toEqual([3]);
  });
});

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

  it('seeds each letter at its deepest point, away from its outline', () => {
    // A thick hollow bar: its inside is 3 rows high, the seed on the middle one.
    const rows = ['.......', '.#####.', '.#...#.', '.#...#.', '.#...#.', '.#####.', '.......'];
    const width = 7;
    const rgba = new Uint8ClampedArray(width * rows.length * 4);
    rows
      .join('')
      .split('')
      .forEach((cell, i) => rgba.set(cell === '#' ? [0, 0, 0, 255] : [255, 255, 255, 255], i * 4));
    const seeds = letterSeeds(toArtwork(rgba, width, rows.length));
    expect(seeds).toEqual([{ x: 3.5 / width, y: 3.5 / rows.length }]);
  });

  it('finds a closed shape a few pixels below a point on its outline or just above it', () => {
    const art = drawing();
    const inside = regionAt(art, at(3, 2).x, at(3, 2).y)!;
    // On the box's top outline, and in the paper right above it.
    for (const point of [at(3, 1), at(3, 0)]) {
      const found = enclosedRegionAt(art, point.x, point.y);
      expect(found && inRegion(art, found, at(3, 2))).toBe(true);
    }
    expect(inRegion(art, inside, at(2, 2))).toBe(true);
    // Far from any closed shape: nothing.
    expect(enclosedRegionAt(art, at(8, 0).x, at(8, 0).y)).toBeNull();
  });

  it('never paints the paper around hollow letters', () => {
    const art = drawing();
    const out = paint(art, [{ ...at(8, 0), color: '#ff0000' }], [0, 0, 0], { enclosedOnly: true });
    expect(pixel(out, 7, 2)).toEqual([0, 0, 0, 0]);
    expect(pixel(out, 3, 2)).toEqual([0, 0, 0, 0]);
  });

  it('tells the paper around the drawing from a closed shape', () => {
    const art = drawing();
    expect(touchesEdge(art, regionAt(art, at(3, 2).x, at(3, 2).y)!)).toBe(false);
    expect(touchesEdge(art, regionAt(art, at(7, 2).x, at(7, 2).y)!)).toBe(true);
  });
});
