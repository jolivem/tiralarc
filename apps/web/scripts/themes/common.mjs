/**
 * Elements several themes share (star, heart, snowflakes, the winter hat), drawn with a `pen`
 * from lib.mjs in their own units: box w × h (largest side 1), centred on 0.
 */
import { arc, c, frame, heart, scallop, star, sym, TAU } from './lib.mjs';

/**
 * Real-life colours for the colour maps (the web's automatic colouring), shared so that the same
 * matter has the same tint everywhere. White things get none: they stay paper.
 */
export const K = {
  wood: '#a0703c',
  darkWood: '#7f4f24',
  lightWood: '#d4a373',
  bark: '#8b5a2b',
  leaf: '#69db7c',
  darkLeaf: '#2f9e44',
  grass: '#8ce99a',
  autumnOrange: '#f76707',
  autumnGold: '#f59f00',
  red: '#e03131',
  darkRed: '#c92a2a',
  orange: '#fd7e14',
  yellow: '#ffd43b',
  gold: '#fcc419',
  cream: '#fff3bf',
  pink: '#f783ac',
  palePink: '#fcc2d7',
  skin: '#ffd8a8',
  sky: '#74c0fc',
  water: '#a5d8ff',
  blue: '#339af0',
  navy: '#1864ab',
  ice: '#d0ebff',
  violet: '#9775fa',
  lavender: '#d0bfff',
  teal: '#20c997',
  sand: '#f4d9a6',
  grey: '#adb5bd',
  lightGrey: '#dee2e6',
  darkGrey: '#495057',
  black: '#343a40',
  silver: '#ced4da',
  paper: '#fff9db',
};

export const starItem = {
  w: 1,
  h: 0.95,
  tilt: 0.5,
  color: K.gold,
  draw(p) {
    p.shape(star(0, 0.04, 0.52, 0.46));
  },
};

export const heartItem = {
  w: 1,
  h: 0.92,
  tilt: 0.35,
  color: K.red,
  draw(p) {
    p.shape(heart(0, 0, 0.9));
    // A gloss on its left lobe.
    p.line([
      [-0.3, -0.12],
      [-0.26, -0.24],
      [-0.16, -0.29],
    ]);
  },
};

/** A six-armed crystal, each arm with two pairs of side branches, a hexagon at its heart. */
export function snowflake(p, cx, cy, r, k = 1) {
  const half = [
    [0.1, 0.045],
    [0.36, 0.045],
    [0.52, 0.22],
    [0.58, 0.17],
    [0.46, 0.045],
    [0.62, 0.045],
    [0.73, 0.15],
    [0.78, 0.1],
    [0.7, 0.045],
    [0.88, 0.045],
  ];
  for (let i = 0; i < 6; i++) {
    const at = frame(cx, cy, (i * TAU) / 6 - Math.PI / 2);
    const arm = [
      ...half.map(([u, v]) => at(u * r, v * r, true)),
      at(r, 0, true),
      ...half
        .slice()
        .reverse()
        .map(([u, v]) => at(u * r, -v * r, true)),
    ];
    p.poly(arm, k);
  }
  const hexagon = (radius) =>
    Array.from({ length: 6 }, (_, i) => {
      const a = (i * TAU) / 6 - Math.PI / 2;
      return c(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius);
    });
  p.poly(hexagon(r * 0.24), k);
  p.poly(hexagon(r * 0.11), k * 0.7);
}

export const snowflakeItem = {
  w: 1,
  h: 1,
  tilt: 0.5,
  color: K.ice,
  draw(p) {
    snowflake(p, 0, 0, 0.5);
  },
};

/** A falling drop, point up. */
export const drop = (cx, cy, h) =>
  sym([
    c(cx, cy - h / 2),
    [cx + h * 0.18, cy - h * 0.05],
    [cx + h * 0.28, cy + h * 0.22],
    [cx + h * 0.18, cy + h * 0.44],
    [cx, cy + h / 2],
  ]);

/** A knitted hat: the dome's ribs and a zigzag band, the cuff's rib, a pompom. */
export const bonnet = {
  w: 0.86,
  h: 1,
  tilt: 0.15,
  draw(p) {
    p.color(K.red);
    p.shape([
      c(-0.38, 0.16),
      [-0.37, -0.06],
      [-0.27, -0.23],
      [0, -0.31],
      [0.27, -0.23],
      [0.37, -0.06],
      c(0.38, 0.16),
    ]);
    // Ribs from the crown down, following the dome.
    for (const x of [-0.24, -0.12, 0, 0.12, 0.24]) {
      const top = -0.31 + Math.abs(x) ** 2 * 1.5;
      p.line(
        [
          [x * 0.4, top + 0.005],
          [x * 0.9, -0.08],
          [x, 0.16],
        ],
        0.55,
      );
    }
    // A zigzag band across.
    const zig = [];
    for (let i = 0; i <= 14; i++) {
      const x = -0.37 + (0.74 * i) / 14;
      zig.push([x, (i % 2 ? -0.03 : 0.03) - 0.01]);
    }
    p.seg(zig, 0.6);
    // The folded cuff with its rib.
    p.color(K.darkRed);
    p.shape([c(-0.43, 0.1), [0, 0.07], c(0.43, 0.1), c(0.44, 0.44), [0, 0.47], c(-0.44, 0.44)]);
    for (let i = 1; i < 10; i++) {
      const x = -0.43 + (0.86 * i) / 10;
      p.line(
        [
          [x, 0.085 + Math.abs(x) * 0.07],
          [x * 1.01, 0.455 - Math.abs(x) * 0.07],
        ],
        0.5,
      );
    }
    p.color(K.cream);
    p.shape(scallop(0, -0.36, 0.14, 11, 0.22));
  },
};

/** An apple on its stalk, a leaf, a gloss. */
export const apple = {
  w: 0.82,
  h: 1,
  tilt: 0.2,
  draw(p) {
    p.color(K.darkWood);
    p.wire(
      [
        [0, -0.2],
        [0.02, -0.34],
        [0.07, -0.46],
      ],
      0.035,
    );
    p.color(K.red);
    p.shape(
      sym([
        c(0, -0.2),
        [0.12, -0.29],
        [0.3, -0.26],
        [0.4, -0.08],
        [0.38, 0.15],
        [0.27, 0.36],
        [0.13, 0.43],
        c(0, 0.39),
      ]),
    );
    p.color(K.leaf);
    p.shape(
      [c(0.05, -0.33), [0.12, -0.45], [0.25, -0.48], c(0.34, -0.44), [0.24, -0.35], [0.12, -0.31]],
      0.85,
    );
    p.line(
      [
        [0.07, -0.34],
        [0.18, -0.41],
        [0.3, -0.44],
      ],
      0.45,
    );
    p.line(
      [
        [-0.25, -0.13],
        [-0.29, 0.0],
        [-0.25, 0.12],
      ],
      0.6,
    );
    p.line(
      [
        [-0.07, -0.19],
        [0, -0.16],
        [0.07, -0.19],
      ],
      0.5,
    );
  },
};

/** The crescent left by a circle (dx, dy, r) cut out of the circle (0, 0, R), around (cx, cy). */
export function crescent(cx, cy, R, dx, dy, r) {
  const d = Math.hypot(dx, dy);
  const a = (R * R - r * r + d * d) / (2 * d);
  const h = Math.sqrt(R * R - a * a);
  const base = Math.atan2(dy, dx);
  const spread = Math.atan2(h, a);
  const [o0, o1] = [base + spread, base + TAU - spread];
  const p0 = [Math.cos(o0) * R, Math.sin(o0) * R];
  const p1 = [Math.cos(o1) * R, Math.sin(o1) * R];
  // From the second point back to the first, round the side facing the crescent.
  const ix = (x, y) => Math.atan2(y - dy, x - dx);
  const norm = (v) => ((v % TAU) + TAU) % TAU;
  const i0 = ix(...p1);
  const span = norm(ix(...p0) - i0);
  const i1 = norm(base + Math.PI - i0) < span ? i0 + span : i0 - (TAU - span);
  const outer = arc(0, 0, R, R, o0, o1, 18);
  const inner = arc(dx, dy, r, r, i0, i1, 14);
  return [c(...outer[0]), ...outer.slice(1, -1), c(...outer.at(-1)), ...inner.slice(1, -1)].map(
    ([x, y, k]) => (k ? [x + cx, y + cy, true] : [x + cx, y + cy]),
  );
}

/** A small puffy cloud. */
export const cloudItem = {
  w: 1,
  h: 0.6,
  tilt: 0.04,
  color: K.lightGrey,
  draw(p) {
    p.shape([
      c(-0.46, 0.2),
      [-0.48, 0.06],
      [-0.36, -0.04],
      [-0.26, -0.18],
      [-0.08, -0.26],
      [0.08, -0.2],
      [0.2, -0.27],
      [0.36, -0.2],
      [0.4, -0.06],
      [0.48, 0.06],
      c(0.46, 0.2),
    ]);
    p.line(
      [
        [-0.2, 0.04],
        [-0.1, -0.05],
        [0.02, -0.06],
      ],
      0.5,
    );
  },
};
