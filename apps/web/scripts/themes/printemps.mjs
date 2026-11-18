/**
 * The "printemps" (spring) decoration: sunflowers, daisies, tulips, a bee, a ladybird, a
 * butterfly, a snail, honeycomb dripping honey, a flower; once each: a watering can, a bird, a
 * birdhouse, a flowerpot, a kite, a nest.
 *
 *   node apps/web/scripts/themes/printemps.mjs   → apps/web/public/themes/printemps/*.svg
 */
import { arc, c, ellipse, frame, rrect, sym, turn, writeTheme } from './lib.mjs';
import { drop, K } from './common.mjs';

const TAU = Math.PI * 2;

/** A petal from radius r0 to r1 at `angle`, `width` wide; pointed (sunflower) or rounded. */
function petal(r0, r1, angle, width, pointed) {
  const at = frame(0, 0, angle);
  const l = r1 - r0;
  return pointed
    ? [
        at(r0, 0, true),
        at(r0 + l * 0.3, -width / 2),
        at(r0 + l * 0.7, -width * 0.4),
        at(r1, 0, true),
        at(r0 + l * 0.7, width * 0.4),
        at(r0 + l * 0.3, width / 2),
      ]
    : [
        at(r0, 0, true),
        at(r0 + l * 0.35, -width / 2),
        at(r1 - width * 0.3, -width * 0.42),
        at(r1, 0),
        at(r1 - width * 0.3, width * 0.42),
        at(r0 + l * 0.35, width / 2),
      ];
}

/** Chords of a circle along `angle`, `step` apart: a diamond lattice when crossed. */
function lattice(p, cx, cy, r, angle, step, k = 0.45) {
  for (let o = -r + step / 2; o < r; o += step) {
    const half = Math.sqrt(r * r - o * o);
    const n = [-Math.sin(angle), Math.cos(angle)];
    const d = [Math.cos(angle), Math.sin(angle)];
    p.seg(
      [
        [cx + n[0] * o - d[0] * half, cy + n[1] * o - d[1] * half],
        [cx + n[0] * o + d[0] * half, cy + n[1] * o + d[1] * half],
      ],
      k,
    );
  }
}

const sunflower = {
  w: 1,
  h: 1,
  tilt: 0.3,
  draw(p) {
    p.color(K.autumnGold);
    for (let i = 0; i < 16; i++)
      p.shape(petal(0.18, 0.49, ((i + 0.5) / 16) * TAU, 0.13, true), 0.85);
    p.color(K.yellow);
    for (let i = 0; i < 16; i++) p.shape(petal(0.18, 0.43, (i / 16) * TAU, 0.13, true));
    p.color(K.darkWood);
    p.shape(ellipse(0, 0, 0.23, 0.23, 22));
    p.color(K.bark);
    p.shape(ellipse(0, 0, 0.18, 0.18, 20), 0.7);
    lattice(p, 0, 0, 0.18, Math.PI / 4, 0.06);
    lattice(p, 0, 0, 0.18, -Math.PI / 4, 0.06);
  },
};

const daisy = {
  w: 1,
  h: 1,
  tilt: 0.3,
  draw(p) {
    for (let i = 0; i < 14; i++)
      p.shape(petal(0.1, 0.46, ((i + 0.5) / 14) * TAU, 0.12, false), 0.8);
    for (let i = 0; i < 14; i++) p.shape(petal(0.1, 0.42, (i / 14) * TAU + 0.05, 0.12, false));
    p.color(K.yellow);
    p.shape(ellipse(0, 0, 0.14, 0.14, 16));
    for (let i = 0; i < 12; i++) {
      const a = i * 2.4;
      const r = 0.025 * Math.sqrt(i + 1);
      p.dot(Math.cos(a) * r, Math.sin(a) * r, 0.01);
    }
  },
};

const smallFlower = {
  w: 1,
  h: 1,
  tilt: 0.5,
  draw(p) {
    p.color(K.pink);
    for (let i = 0; i < 5; i++) p.shape(petal(0.05, 0.48, (i / 5) * TAU, 0.34, false), 0.9);
    p.color(K.yellow);
    p.shape(ellipse(0, 0, 0.13, 0.13, 12));
  },
};

/** A long leaf from (x, y) heading `angle`, bent. */
function blade(p, x, y, angle, length, width, bend = 0.15, k = 1) {
  const at = frame(x, y, angle);
  p.color(K.leaf);
  p.shape(
    [
      at(0, -width * 0.3, true),
      at(length * 0.35, -width * 0.55 - bend * length * 0.2),
      at(length * 0.75, -width * 0.3 - bend * length * 0.35),
      at(length, -bend * length * 0.5, true),
      at(length * 0.7, width * 0.3 - bend * length * 0.3),
      at(length * 0.3, width * 0.55 - bend * length * 0.1),
      at(0, width * 0.3, true),
    ],
    k,
  );
  p.line(
    [
      at(length * 0.05, 0),
      at(length * 0.5, -bend * length * 0.18),
      at(length * 0.9, -bend * length * 0.45),
    ],
    k * 0.5,
  );
}

const tulip = {
  w: 0.56,
  h: 1,
  tilt: 0.2,
  draw(p) {
    p.color(K.darkLeaf);
    p.wire(
      [
        [0.02, 0.5],
        [0.0, 0.2],
        [0.03, -0.05],
        [0, -0.14],
      ],
      0.04,
    );
    blade(p, 0.02, 0.48, -1.95, 0.55, 0.13, 0.25);
    blade(p, 0.02, 0.48, -1.2, 0.45, 0.11, -0.25);
    p.color(K.red);
    p.shape([
      c(0, -0.08),
      [-0.16, -0.13],
      [-0.19, -0.3],
      c(-0.12, -0.48),
      [-0.06, -0.33],
      [-0.02, -0.17],
    ]);
    p.shape([
      c(0, -0.08),
      [0.16, -0.13],
      [0.19, -0.3],
      c(0.12, -0.48),
      [0.06, -0.33],
      [0.02, -0.17],
    ]);
    p.color(K.darkRed);
    p.shape(sym([c(0, -0.44), [0.07, -0.37], [0.11, -0.22], [0.08, -0.11], c(0, -0.07)]));
  },
};

const bee = {
  w: 1,
  h: 0.74,
  tilt: 0.25,
  draw(p) {
    // Wings behind, veined.
    p.color(K.ice);
    p.shape(turn(ellipse(0.0, -0.2, 0.13, 0.21, 16), -0.45, 0.0, -0.2), 0.8);
    p.shape(turn(ellipse(0.17, -0.18, 0.11, 0.18, 16), 0.35, 0.17, -0.18), 0.8);
    p.line(
      [
        [-0.02, -0.04],
        [-0.05, -0.2],
        [-0.1, -0.32],
      ],
      0.4,
    );
    p.line(
      [
        [0.12, -0.04],
        [0.16, -0.17],
        [0.22, -0.28],
      ],
      0.4,
    );
    p.color(K.black);
    p.poly([c(0.38, 0.06), c(0.48, 0.1), c(0.38, 0.14)], 0.8);
    p.color(K.yellow);
    p.shape(ellipse(0.08, 0.1, 0.31, 0.2, 22));
    // Black stripes between the lines.
    for (const [x0, x1] of [
      [-0.06, 0.07],
      [0.18, 0.29],
    ])
      p.tint(
        [
          [x0, -0.12],
          [x1, -0.12],
          [x1, 0.32],
          [x0, 0.32],
        ],
        K.black,
      );
    for (const x of [-0.04, 0.08, 0.2, 0.3]) {
      const half = 0.2 * Math.sqrt(Math.max(0, 1 - ((x - 0.08) / 0.31) ** 2)) - 0.005;
      p.line(
        [
          [x - 0.03, 0.1 - half],
          [x + 0.01, 0.1],
          [x - 0.03, 0.1 + half],
        ],
        0.6,
      );
    }
    // Head, eye, smile, antennae.
    for (const s of [0, 1]) {
      const x0 = -0.3 + s * 0.08;
      p.wire(
        [
          [x0, -0.06],
          [x0 - 0.04, -0.2],
          [x0 - 0.1, -0.27],
        ],
        0.01,
        0.6,
      );
      p.dot(x0 - 0.1, -0.27, 0.022);
    }
    p.color(K.yellow);
    p.shape(ellipse(-0.3, 0.06, 0.15, 0.15, 18));
    p.dot(-0.34, 0.03, 0.022);
    p.line(
      [
        [-0.39, 0.1],
        [-0.34, 0.13],
        [-0.29, 0.11],
      ],
      0.5,
    );
    for (const x of [-0.05, 0.12])
      p.line(
        [
          [x, 0.28],
          [x - 0.02, 0.35],
          [x - 0.05, 0.37],
        ],
        0.5,
      );
  },
};

const ladybird = {
  w: 0.86,
  h: 1,
  tilt: 0.5,
  color: K.black,
  draw(p) {
    for (const s of [-1, 1]) {
      for (const y of [-0.05, 0.1, 0.25])
        p.wire(
          [
            [s * 0.2, y],
            [s * 0.36, y - 0.03],
            [s * 0.42, y + 0.05],
          ],
          0.012,
          0.6,
        );
      p.wire(
        [
          [s * 0.04, -0.32],
          [s * 0.1, -0.42],
          [s * 0.18, -0.46],
        ],
        0.01,
        0.6,
      );
      p.dot(s * 0.18, -0.46, 0.02);
    }
    p.shape(ellipse(0, -0.25, 0.16, 0.12, 16));
    p.color(null);
    for (const s of [-1, 1]) {
      p.shape(ellipse(s * 0.07, -0.29, 0.035, 0.03, 10), 0.6);
      p.dot(s * 0.07, -0.29, 0.012);
    }
    p.color(K.red);
    p.shape(ellipse(0, 0.08, 0.34, 0.38, 24));
    p.color(K.black);
    p.seg(
      [
        [0, -0.3],
        [0, 0.46],
      ],
      0.6,
    );
    for (const [x, y, r] of [
      [-0.18, -0.06, 0.06],
      [0.18, -0.06, 0.06],
      [-0.2, 0.17, 0.065],
      [0.2, 0.17, 0.065],
      [-0.1, 0.33, 0.045],
      [0.1, 0.33, 0.045],
      [-0.06, 0.06, 0.035],
      [0.06, 0.06, 0.035],
    ]) {
      p.shape(ellipse(x, y, r, r, 12), 0.7);
    }
    p.line(arc(-0.02, 0.06, 0.26, 0.3, 3.5, 4.3, 6), 0.5);
  },
};

const butterfly = {
  w: 1,
  h: 0.84,
  tilt: 0.35,
  draw(p) {
    for (const s of [-1, 1]) {
      const m = (pts) => pts.map(([x, y, k]) => (k ? [x * s, y, true] : [x * s, y]));
      p.color(K.sky);
      p.shape(
        m([c(0.03, 0.03), [0.3, 0.06], [0.38, 0.2], [0.3, 0.36], [0.14, 0.38], c(0.03, 0.14)]),
      );
      p.color(K.yellow);
      p.shape(m(ellipse(0.2, 0.2, 0.08, 0.07, 12)), 0.6);
      p.color(K.blue);
      p.shape(
        m([
          c(0.02, -0.04),
          [0.12, -0.32],
          [0.34, -0.42],
          [0.49, -0.34],
          [0.44, -0.12],
          c(0.04, 0.02),
        ]),
      );
      p.color(K.sky);
      p.shape(m([c(0.08, -0.06), [0.15, -0.24], [0.3, -0.3], [0.38, -0.22], [0.3, -0.1]]), 0.6);
      p.color(K.yellow);
      p.shape(m(ellipse(0.42, -0.3, 0.035, 0.035, 10)), 0.55);
      p.color(K.black);
      p.wire(
        m([
          [0.01, -0.22],
          [0.06, -0.34],
          [0.12, -0.4],
        ]),
        0.01,
        0.55,
      );
      p.dot(0.12 * s, -0.4, 0.016);
    }
    p.shape(ellipse(0, 0.06, 0.035, 0.24, 12));
    p.shape(ellipse(0, -0.2, 0.04, 0.04, 10), 0.8);
  },
};

const snail = {
  w: 1,
  h: 0.68,
  tilt: 0.06,
  draw(p) {
    // The body: a foot along the ground, the head raised with its stalks.
    p.color(K.sand);
    for (const [x, a] of [
      [-0.36, -2.0],
      [-0.3, -1.6],
    ]) {
      const at = frame(x, -0.04, a);
      p.wire([at(0, 0), at(0.12, 0.01), at(0.2, 0)], 0.012, 0.6);
      p.dot(...at(0.2, 0), 0.022);
    }
    p.shape([
      c(0.48, 0.3),
      [0.3, 0.32],
      [-0.2, 0.32],
      [-0.36, 0.26],
      [-0.42, 0.1],
      [-0.36, -0.04],
      [-0.26, 0.02],
      [-0.22, 0.16],
      [0.1, 0.18],
      [0.4, 0.22],
    ]);
    p.dot(-0.36, 0.08, 0.015);
    p.line(
      [
        [-0.4, 0.17],
        [-0.36, 0.2],
        [-0.32, 0.18],
      ],
      0.5,
    );
    // The shell and its spiral.
    p.color(K.autumnGold);
    p.shape(ellipse(0.12, -0.04, 0.29, 0.27, 22));
    p.line(
      Array.from({ length: 30 }, (_, i) => {
        const t = i / 29;
        const a = -0.5 + t * TAU * 2.2;
        const r = 0.25 * (1 - t * 0.92);
        return [0.12 + Math.cos(a) * r, -0.04 + Math.sin(a) * r * 0.93];
      }),
      0.6,
    );
  },
};

const honeycomb = {
  w: 1,
  h: 0.9,
  tilt: 0.15,
  draw(p) {
    const r = 0.135;
    const hex = (cx, cy, rr) =>
      Array.from({ length: 6 }, (_, i) =>
        c(cx + Math.cos((i * TAU) / 6) * rr, cy + Math.sin((i * TAU) / 6) * rr),
      );
    const cells = [
      [0, 0],
      [1, -0.5],
      [1, 0.5],
      [-1, -0.5],
      [-1, 0.5],
      [0, -1],
      [0, 1],
      [2, 0],
    ];
    const dx = r * 1.5;
    const dy = r * Math.sqrt(3);
    for (const [i, j] of cells) {
      const cx = i * dx;
      const cy = j * dy - 0.06;
      p.color(K.gold);
      p.poly(hex(cx, cy, r));
      p.color('#ffe066');
      p.poly(hex(cx, cy, r * 0.7), 0.5);
    }
    p.color(K.gold);
    // Honey dripping from the lowest cells.
    for (const [x, y, h] of [
      [-0.06, 0.28, 0.12],
      [0.2, 0.16, 0.16],
      [-0.2, 0.16, 0.1],
    ])
      p.shape(drop(x, y + h / 2, h), 0.7);
  },
};

// ------------------------------------------------ shown once in the whole decoration

const wateringCan = {
  w: 1,
  h: 0.82,
  tilt: 0.1,
  draw(p) {
    p.wire(
      [
        [-0.26, -0.08],
        [-0.24, -0.32],
        [-0.04, -0.38],
        [0.1, -0.3],
        [0.12, -0.08],
      ],
      0.05,
      0.8,
    );
    p.color(K.teal);
    p.poly([c(0.12, 0.12), c(0.36, -0.2), c(0.4, -0.16), c(0.16, 0.24)]);
    p.color(K.silver);
    p.shape(ellipse(0.4, -0.2, 0.05, 0.1, 12, -0.65), 0.9);
    p.color(K.teal);
    p.shape(rrect(-0.34, -0.1, 0.18, 0.38, 0.05));
    p.shape(rrect(-0.36, -0.14, 0.2, -0.06, 0.03), 0.9);
    p.color(K.pink);
    for (let i = 0; i < 5; i++)
      p.shape(
        petal(0.03, 0.12, (i / 5) * TAU, 0.08, false).map(([x, y, k]) => [x - 0.08, y + 0.14, k]),
        0.7,
      );
    p.color(K.yellow);
    p.shape(ellipse(-0.08, 0.14, 0.035, 0.035, 8), 0.7);
  },
};

/** A little bird. */
const bird = {
  w: 1,
  h: 0.8,
  tilt: 0.15,
  draw(p) {
    for (const x of [-0.04, 0.08])
      p.seg(
        [
          [x, 0.2],
          [x - 0.02, 0.38],
          [x + 0.04, 0.38],
        ],
        0.6,
      );
    p.color(K.blue);
    p.poly([c(-0.22, 0.0), c(-0.48, -0.14), c(-0.44, 0.1)]);
    p.color(K.sky);
    p.shape([
      c(0.3, -0.24),
      [0.2, -0.1],
      [0.16, 0.12],
      [0.0, 0.26],
      [-0.2, 0.2],
      c(-0.32, 0.02),
      [-0.14, -0.02],
      [0.08, -0.24],
    ]);
    p.shape(ellipse(0.22, -0.2, 0.14, 0.14, 18));
    p.color(K.orange);
    p.poly([c(0.34, -0.24), c(0.46, -0.18), c(0.34, -0.14)], 0.8);
    p.dot(0.24, -0.23, 0.025);
    p.color(K.blue);
    p.shape([c(-0.16, 0.0), [0.0, -0.06], [0.12, 0.02], [0.04, 0.12], c(-0.1, 0.12)], 0.8);
  },
};

const birdhouse = {
  w: 0.72,
  h: 1,
  tilt: 0.06,
  flip: false,
  draw(p) {
    p.color(K.wood);
    p.poly(rrect(-0.04, 0.24, 0.04, 0.48), 0.9);
    p.color(K.lightWood);
    p.poly([c(-0.24, -0.12), c(0, -0.32), c(0.24, -0.12), c(0.24, 0.26), c(-0.24, 0.26)]);
    p.color(K.red);
    p.poly([
      c(-0.34, -0.06),
      c(0, -0.44),
      c(0.34, -0.06),
      c(0.28, 0.0),
      c(0, -0.32),
      c(-0.28, 0.0),
    ]);
    p.color(K.black);
    p.shape(ellipse(0, 0.02, 0.08, 0.08, 14), 0.9);
    p.color(K.wood);
    p.poly(rrect(-0.03, 0.12, 0.03, 0.2), 0.7);
    p.wire(
      [
        [-0.03, 0.16],
        [-0.14, 0.16],
      ],
      0.025,
      0.6,
    );
  },
};

const flowerPot = {
  w: 0.8,
  h: 1,
  tilt: 0.06,
  draw(p) {
    p.color(K.darkLeaf);
    for (const [x, y] of [
      [-0.16, -0.22],
      [0.16, -0.3],
      [0.0, -0.08],
    ])
      p.wire(
        [
          [x * 0.3, 0.12],
          [x, y],
        ],
        0.03,
        0.7,
      );
    blade(p, 0, 0.1, -2.5, 0.24, 0.1, 0.1, 0.8);
    blade(p, 0, 0.1, -0.6, 0.24, 0.1, -0.1, 0.8);
    for (const [x, y] of [
      [-0.16, -0.22],
      [0.16, -0.3],
      [0.0, -0.08],
    ]) {
      p.color(x < 0 ? K.violet : x > 0 ? K.pink : K.red);
      for (let i = 0; i < 5; i++)
        p.shape(
          petal(0.03, 0.15, (i / 5) * TAU, 0.11, false).map(([px, py, k]) => [px + x, py + y, k]),
          0.8,
        );
      p.color(K.yellow);
      p.shape(ellipse(x, y, 0.045, 0.045, 10), 0.8);
    }
    p.color('#e8590c');
    p.poly([c(-0.24, 0.18), c(0.24, 0.18), c(0.18, 0.48), c(-0.18, 0.48)]);
    p.poly(rrect(-0.28, 0.1, 0.28, 0.2), 0.9);
  },
};

/** A kite, bows along its tail. */
const kite = {
  w: 0.8,
  h: 1,
  tilt: 0.25,
  draw(p) {
    const tail = [];
    for (let i = 0; i <= 10; i++)
      tail.push([0.0 + Math.sin(i * 0.9) * 0.08 + i * 0.012, 0.18 + i * 0.03]);
    p.line(tail, 0.6);
    p.color(K.yellow);
    for (const i of [4, 8]) {
      const [x, y] = tail[i];
      p.poly([c(x, y), c(x - 0.1, y - 0.06), c(x - 0.1, y + 0.06)], 0.7);
      p.poly([c(x, y), c(x + 0.1, y - 0.06), c(x + 0.1, y + 0.06)], 0.7);
    }
    p.color(K.red);
    p.poly([c(0, -0.48), c(0.3, -0.16), c(0, 0.2), c(-0.3, -0.16)]);
    // Its four panels: red, yellow, blue, green.
    p.tint([c(0, -0.48), c(0.3, -0.16), c(0, -0.16)], K.yellow);
    p.tint([c(0, -0.16), c(0.3, -0.16), c(0, 0.2)], K.blue);
    p.tint([c(0, -0.16), c(-0.3, -0.16), c(0, 0.2)], K.leaf);
    p.seg(
      [
        [0, -0.48],
        [0, 0.2],
      ],
      0.5,
    );
    p.seg(
      [
        [-0.3, -0.16],
        [0.3, -0.16],
      ],
      0.5,
    );
  },
};

/** A nest with three eggs. */
const nest = {
  w: 1,
  h: 0.62,
  tilt: 0.06,
  draw(p) {
    p.color('#c5f6fa');
    for (const [x, y] of [
      [-0.16, -0.06],
      [0.16, -0.06],
      [0, -0.12],
    ])
      p.shape(ellipse(x, y, 0.11, 0.15, 16));
    p.color(K.lightWood);
    p.shape([
      c(-0.46, -0.02),
      [-0.3, 0.04],
      [0, 0.06],
      [0.3, 0.04],
      c(0.46, -0.02),
      [0.38, 0.18],
      [0.2, 0.28],
      [-0.2, 0.28],
      [-0.38, 0.18],
    ]);
    p.line(
      [
        [-0.36, 0.1],
        [-0.1, 0.18],
        [0.2, 0.14],
      ],
      0.5,
    );
    p.line(
      [
        [-0.18, 0.24],
        [0.1, 0.24],
        [0.34, 0.1],
      ],
      0.5,
    );
  },
};

writeTheme('printemps', {
  seed: 601,
  thumb: sunflower,
  front: [sunflower, daisy, tulip, bee, snail],
  middle: [ladybird, honeycomb, butterfly, smallFlower],
  once: [wateringCan, bird, birdhouse, flowerPot, kite, nest],
});
