/**
 * "Paint bucket" colouring of line art (black strokes on white), on raw pixels:
 * no canvas here, so it runs in unit tests too.
 */

/** A band image reduced to what colouring needs: how light each pixel is (0 = stroke, 255 = paper). */
export interface Artwork {
  width: number;
  height: number;
  light: Uint8Array;
}

/** One click: the closed area around (x, y) — fractions of the image size — takes the colour. */
export interface Fill {
  x: number;
  y: number;
  /** "#rrggbb" */
  color: string;
}

/** Pixels at least this light are paper (fillable); darker ones belong to a stroke. */
const PAPER = 128;
/** Strokes are anti-aliased: the colour also goes under this many pixels of their edge. */
const EDGE = 2;

export function toArtwork(rgba: Uint8ClampedArray, width: number, height: number): Artwork {
  const light = new Uint8Array(width * height);
  for (let i = 0; i < light.length; i++) {
    const p = i * 4;
    const alpha = at(rgba, p + 3) / 255;
    // Transparent artwork is drawn on white paper.
    const luminance = 0.299 * at(rgba, p) + 0.587 * at(rgba, p + 1) + 0.114 * at(rgba, p + 2);
    light[i] = Math.round(luminance * alpha + 255 * (1 - alpha));
  }
  return { width, height, light };
}

/** Typed-array read; every index used here is within bounds by construction. */
const at = (values: ArrayLike<number>, index: number): number => values[index] as number;

const pixelOf = ({ width, height }: Artwork, x: number, y: number) =>
  Math.min(height - 1, Math.max(0, Math.floor(y * height))) * width +
  Math.min(width - 1, Math.max(0, Math.floor(x * width)));

/**
 * The closed area of paper containing (x, y), as a mask over the pixels
 * (1 = in the area, 2 = stroke edge around it). Null when the point is on a stroke.
 */
export function regionAt(art: Artwork, x: number, y: number): Uint8Array | null {
  const { width, height, light } = art;
  const seed = pixelOf(art, x, y);
  if (at(light, seed) < PAPER) return null;

  const mask = new Uint8Array(width * height);
  let frontier: number[] = [];
  const stack = [seed];
  mask[seed] = 1;
  const visit = (i: number) => {
    if (mask[i]) return;
    if (at(light, i) >= PAPER) {
      mask[i] = 1;
      stack.push(i);
    } else {
      mask[i] = 2;
      frontier.push(i);
    }
  };
  const neighbours = (i: number, each: (n: number) => void) => {
    const col = i % width;
    if (col > 0) each(i - 1);
    if (col < width - 1) each(i + 1);
    if (i >= width) each(i - width);
    if (i < width * (height - 1)) each(i + width);
  };
  while (stack.length > 0) neighbours(stack.pop()!, visit);

  // Widen under the strokes' soft edge, so no pale halo is left between colour and line.
  for (let ring = 1; ring < EDGE; ring++) {
    const next: number[] = [];
    for (const i of frontier) {
      neighbours(i, (n) => {
        if (!mask[n] && at(light, n) < PAPER) {
          mask[n] = 2;
          next.push(n);
        }
      });
    }
    frontier = next;
  }
  return mask;
}

/**
 * True when the area reaches the edge of the image: the paper around a drawing (e.g.
 * around hollow letters) rather than a closed shape inside it.
 */
export function touchesEdge({ width, height }: Artwork, mask: Uint8Array): boolean {
  for (let x = 0; x < width; x++) {
    if (mask[x] === 1 || mask[(height - 1) * width + x] === 1) return true;
  }
  for (let y = 0; y < height; y++) {
    if (mask[y * width] === 1 || mask[y * width + width - 1] === 1) return true;
  }
  return false;
}

/**
 * One point (fractions of the image size) in each closed shape forming hollow letters:
 * the paper areas one stroke away from the paper around the drawing, not the holes of
 * letters such as "o" (two strokes away), nor the paper around. Filling each point
 * colours the letters, and only them.
 */
export function letterSeeds(art: Artwork): { x: number; y: number }[] {
  const { width, height, light } = art;
  const size = width * height;
  // Connected areas of paper, and of strokes (4-neighbourhood, as in `regionAt`).
  const area = new Int32Array(size).fill(-1);
  const isPaper = (i: number) => at(light, i) >= PAPER;
  const firstPixel: number[] = [];
  const onEdge: boolean[] = [];
  let areas = 0;
  let strokes = 0;
  const neighbours = (i: number): number[] => {
    const col = i % width;
    const out: number[] = [];
    if (col > 0) out.push(i - 1);
    if (col < width - 1) out.push(i + 1);
    if (i >= width) out.push(i - width);
    if (i < size - width) out.push(i + width);
    return out;
  };
  const edge = (i: number) => {
    const col = i % width;
    return col === 0 || col === width - 1 || i < width || i >= size - width;
  };
  for (let seed = 0; seed < size; seed++) {
    if (area[seed] !== -1) continue;
    const paper = isPaper(seed);
    // Paper areas get ids 0, 1…; strokes −2, −3…
    const id = paper ? areas++ : -2 - strokes++;
    if (paper) {
      firstPixel.push(seed);
      onEdge.push(false);
    }
    area[seed] = id;
    const stack = [seed];
    while (stack.length > 0) {
      const i = stack.pop()!;
      if (paper && edge(i)) onEdge[id] = true;
      for (const n of neighbours(i)) {
        if (area[n] === -1 && isPaper(n) === paper) {
          area[n] = id;
          stack.push(n);
        }
      }
    }
  }

  // Which paper areas each stroke touches.
  const touching = new Map<number, Set<number>>();
  for (let i = 0; i < size; i++) {
    const id = at(area, i);
    if (id >= 0) continue;
    for (const n of neighbours(i)) {
      const other = at(area, n);
      if (other < 0) continue;
      let set = touching.get(id);
      if (!set) touching.set(id, (set = new Set()));
      set.add(other);
    }
  }
  const strokesOf = new Map<number, number[]>();
  for (const [stroke, touched] of touching) {
    for (const a of touched) strokesOf.set(a, [...(strokesOf.get(a) ?? []), stroke]);
  }

  // Strokes crossed from the paper around the drawing: 1 = a letter, 2 = a hole in one…
  const depth = new Array<number>(areas).fill(-1);
  let queue = onEdge.flatMap((around, id) => (around ? [id] : []));
  for (const id of queue) depth[id] = 0;
  for (let d = 1; queue.length > 0; d++) {
    const next: number[] = [];
    for (const id of queue) {
      for (const stroke of strokesOf.get(id) ?? []) {
        for (const other of touching.get(stroke) ?? []) {
          if (depth[other] === -1) {
            depth[other] = d;
            next.push(other);
          }
        }
      }
    }
    queue = next;
  }

  return depth.flatMap((d, id) => {
    if (d % 2 !== 1) return [];
    const i = at(firstPixel, id);
    return [{ x: ((i % width) + 0.5) / width, y: (Math.floor(i / width) + 0.5) / height }];
  });
}

/** True when the fill's point lies in the paper area described by `mask`. */
export function inRegion(art: Artwork, mask: Uint8Array, fill: Pick<Fill, 'x' | 'y'>): boolean {
  return mask[pixelOf(art, fill.x, fill.y)] === 1;
}

const channels = (hex: string): [number, number, number] => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

/**
 * RGBA pixels of the coloured artwork: strokes in `line` colour over the fills,
 * uncoloured paper left transparent (so it takes the page colour, light or dark).
 */
export function paint(
  art: Artwork,
  fills: Fill[],
  line: [number, number, number],
): Uint8ClampedArray<ArrayBuffer> {
  const { width, height, light } = art;
  // 0 = not coloured, otherwise 1 + index in `colors`.
  const under = new Uint16Array(width * height);
  const colors: [number, number, number][] = [];
  for (const fill of fills) {
    const mask = regionAt(art, fill.x, fill.y);
    if (!mask) continue;
    colors.push(channels(fill.color));
    for (let i = 0; i < mask.length; i++) if (mask[i]) under[i] = colors.length;
  }

  const out = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < under.length; i++) {
    const p = i * 4;
    const paper = at(light, i);
    const ink = 255 - paper; // how much of the stroke covers this pixel
    if (under[i] === 0) {
      out[p] = line[0];
      out[p + 1] = line[1];
      out[p + 2] = line[2];
      out[p + 3] = ink;
    } else {
      const color = colors[at(under, i) - 1] as [number, number, number];
      for (let c = 0; c < 3; c++) out[p + c] = (at(line, c) * ink + at(color, c) * paper) / 255;
      out[p + 3] = 255;
    }
  }
  return out;
}
