/**
 * The "automne" (autumn) decoration: maple and oak leaves, acorns, toadstools in the grass, a
 * hedgehog carrying a leaf, an umbrella in the rain, a rain cloud, a knitted hat; once each:
 * chestnuts, a pine cone, a rain boot, an owl, a pumpkin, a basket of apples.
 *
 *   node apps/web/scripts/themes/automne.mjs   → apps/web/public/themes/automne/*.svg
 */
import { c, ellipse, frame, hatch, rrect, sym, writeTheme } from './lib.mjs';
import { bonnet, cloudItem, drop, K } from './common.mjs';

const maple = {
  w: 1,
  h: 1,
  tilt: 0.6,
  draw(p) {
    // The stalk, from the leaf's base (behind it) down.
    p.color(K.wood);
    p.wire(
      [
        [0, 0.12],
        [0.01, 0.3],
        [0.06, 0.48],
      ],
      0.035,
      0.75,
    );
    // Five pointed, toothed lobes: the top one, two side ones, two small lower ones; deep
    // rounded notches between them (right half, top tip down to the stalk).
    p.color(K.autumnOrange);
    p.shape(
      sym([
        c(0, -0.48),
        c(0.05, -0.38),
        c(0.1, -0.41),
        c(0.09, -0.3),
        c(0.14, -0.29),
        [0.11, -0.18],
        [0.12, -0.12],
        [0.17, -0.13],
        c(0.22, -0.2),
        c(0.25, -0.28),
        c(0.3, -0.23),
        c(0.37, -0.3),
        c(0.47, -0.31),
        c(0.42, -0.21),
        c(0.46, -0.16),
        c(0.37, -0.09),
        c(0.39, -0.03),
        [0.3, 0.0],
        [0.22, 0.02],
        c(0.28, 0.07),
        c(0.36, 0.17),
        c(0.25, 0.16),
        c(0.2, 0.21),
        [0.13, 0.15],
        [0.06, 0.14],
        c(0, 0.13),
      ]),
    );
    // The main veins, from the stalk to each lobe's tip, gently curved.
    for (const [x, y] of [
      [0, -0.42],
      [0.42, -0.28],
      [0.31, 0.15],
    ]) {
      for (const s of x ? [1, -1] : [1]) {
        p.line(
          [
            [0, 0.12],
            [x * s * 0.45, y * 0.45 + 0.03],
            [x * s * 0.86, y * 0.86],
          ],
          0.5,
        );
      }
    }
  },
};

const oak = {
  w: 0.62,
  h: 1,
  tilt: 0.6,
  draw(p) {
    p.color(K.wood);
    p.wire(
      [
        [0, 0.3],
        [0.01, 0.42],
        [0.03, 0.5],
      ],
      0.03,
      0.7,
    );
    p.color(K.autumnGold);
    p.shape(
      sym([
        [0, -0.48],
        [0.09, -0.45],
        [0.13, -0.36],
        c(0.07, -0.29),
        [0.19, -0.25],
        [0.22, -0.15],
        c(0.09, -0.1),
        [0.24, -0.04],
        [0.25, 0.07],
        c(0.1, 0.12),
        [0.19, 0.2],
        [0.15, 0.28],
        c(0.0, 0.32),
      ]),
    );
    p.line(
      [
        [0, 0.3],
        [0.005, -0.1],
        [0, -0.42],
      ],
      0.55,
    );
    for (const [y, x] of [
      [-0.3, 0.11],
      [-0.16, 0.18],
      [0.0, 0.2],
      [0.16, 0.14],
    ]) {
      p.line(
        [
          [0, y + 0.05],
          [x * 0.6, y - 0.01],
          [x, y - 0.04],
        ],
        0.4,
      );
      p.line(
        [
          [0, y + 0.05],
          [-x * 0.6, y - 0.01],
          [-x, y - 0.04],
        ],
        0.4,
      );
    }
  },
};

const acorn = {
  w: 0.52,
  h: 1,
  tilt: 0.5,
  draw(p) {
    p.color(K.lightWood);
    p.shape(sym([c(0, -0.1), [0.17, -0.07], [0.2, 0.12], [0.13, 0.33], [0.04, 0.44], c(0, 0.48)]));
    p.line(
      [
        [-0.12, 0.0],
        [-0.14, 0.15],
        [-0.09, 0.28],
      ],
      0.5,
    );
    const cap = [
      c(-0.24, -0.06),
      [-0.22, -0.22],
      [-0.1, -0.33],
      [0.1, -0.33],
      [0.22, -0.22],
      c(0.24, -0.06),
      [0, -0.01],
    ];
    p.color(K.bark);
    p.shape(cap);
    const inner = [
      [-0.215, -0.08],
      [-0.2, -0.21],
      [-0.1, -0.3],
      [0.1, -0.3],
      [0.2, -0.21],
      [0.215, -0.08],
      [0, -0.04],
    ];
    for (const angle of [0.7, Math.PI - 0.7])
      for (const s of hatch(inner, angle, 0.07)) p.seg(s, 0.4);
    p.wire(
      [
        [0, -0.32],
        [0.02, -0.42],
        [0.07, -0.48],
      ],
      0.04,
      0.7,
    );
  },
};

const toadstools = {
  w: 1,
  h: 0.9,
  tilt: 0.04,
  draw(p) {
    const mushroom = (x, y, s) => {
      p.color(K.paper);
      p.shape([
        c(x - 0.07 * s, y - 0.02 * s),
        [x - 0.08 * s, y + 0.2 * s],
        c(x - 0.11 * s, y + 0.38 * s),
        c(x + 0.11 * s, y + 0.38 * s),
        [x + 0.08 * s, y + 0.2 * s],
        c(x + 0.07 * s, y - 0.02 * s),
      ]);
      p.shape(
        [
          c(x - 0.075 * s, y + 0.08 * s),
          [x - 0.13 * s, y + 0.14 * s],
          c(x - 0.1 * s, y + 0.17 * s),
          [x, y + 0.15 * s],
          c(x + 0.1 * s, y + 0.17 * s),
          [x + 0.13 * s, y + 0.14 * s],
          c(x + 0.075 * s, y + 0.08 * s),
        ],
        0.8,
      );
      p.color(K.cream);
      p.shape(ellipse(x, y - 0.02 * s, 0.25 * s, 0.05 * s, 18), 0.8);
      for (let i = 1; i < 8; i++) {
        const gx = x - 0.24 * s + (0.48 * s * i) / 8;
        p.seg(
          [
            [gx, y - 0.04 * s],
            [x + (gx - x) * 0.35, y + 0.02 * s],
          ],
          0.35,
        );
      }
      p.color(K.red);
      p.shape([
        c(x - 0.3 * s, y - 0.03 * s),
        [x - 0.27 * s, y - 0.2 * s],
        [x - 0.12 * s, y - 0.33 * s],
        [x + 0.12 * s, y - 0.33 * s],
        [x + 0.27 * s, y - 0.2 * s],
        c(x + 0.3 * s, y - 0.03 * s),
        [x, y - 0.06 * s],
      ]);
      for (const [dx, dy, r] of [
        [-0.16, -0.14, 0.05],
        [0.0, -0.24, 0.05],
        [0.15, -0.13, 0.045],
        [-0.04, -0.1, 0.03],
        [0.2, -0.24, 0.025],
      ]) {
        p.color(null);
        p.shape(ellipse(x + dx * s, y + dy * s, r * s, r * s * 0.8, 10), 0.6);
      }
    };
    mushroom(0.18, -0.02, 0.85);
    mushroom(-0.16, 0.05, 1.15);
    const grass = [];
    for (let i = 0; i <= 18; i++) {
      const x = -0.48 + (0.96 * i) / 18;
      grass.push(i % 2 ? c(x + 0.015, 0.3 + ((i * 7) % 4) * 0.015) : c(x, 0.42));
    }
    p.color(K.grass);
    p.shape([c(-0.48, 0.48), ...grass, c(0.48, 0.48)], 0.8);
  },
};

/** A hedgehog walking left: a round back bristling with spines, its pointed face, a leaf. */
const hedgehog = {
  w: 1,
  h: 0.7,
  tilt: 0.05,
  draw(p) {
    // Its feet, under the body.
    p.color(K.skin);
    for (const x of [-0.16, 0.24]) p.shape(ellipse(x, 0.29, 0.07, 0.045, 12), 0.8);
    // The coat: a dome of spines from the nape over the back down to the rump.
    const [cx, cy, rx, ry] = [0.06, 0.13, 0.41, 0.37];
    const spines = [];
    const n = 18;
    const [a0, a1] = [Math.PI * 1.02, Math.PI * 2.08];
    for (let i = 0; i <= n; i++) {
      const a = a0 + ((a1 - a0) * i) / n;
      const r = i % 2 ? 0.8 : 1;
      spines.push(c(cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r));
    }
    p.color(K.bark);
    p.shape([...spines, [0.4, 0.22], [0.3, 0.29], [0.0, 0.3], c(-0.24, 0.27)]);
    // A few spines' lines on the coat.
    for (const [x, y] of [
      [0.0, -0.08],
      [0.16, -0.12],
      [0.3, -0.02],
      [0.12, 0.06],
      [0.28, 0.14],
    ])
      p.line(
        [
          [x, y],
          [x + 0.05, y - 0.03],
          [x + 0.08, y - 0.08],
        ],
        0.45,
      );
    // The face: a teardrop pointing left, out of the coat.
    p.color(K.sand);
    p.shape([
      [-0.07, -0.05],
      [-0.18, -0.04],
      [-0.31, 0.01],
      [-0.42, 0.07],
      c(-0.48, 0.1),
      [-0.42, 0.15],
      [-0.3, 0.22],
      [-0.17, 0.27],
      [-0.06, 0.23],
      [-0.02, 0.1],
    ]);
    // Its ear, nose, eye and smile.
    p.shape(ellipse(-0.11, -0.04, 0.05, 0.04, 12), 0.8);
    p.color(K.black);
    p.shape(ellipse(-0.47, 0.1, 0.04, 0.035, 10), 0.8);
    p.dot(-0.22, 0.07, 0.022);
    p.line(
      [
        [-0.38, 0.17],
        [-0.31, 0.2],
        [-0.25, 0.17],
      ],
      0.5,
    );
    // A leaf caught on its spines.
    const at = frame(0.08, -0.19, -0.4);
    p.color(K.autumnOrange);
    p.shape(
      [
        at(0, 0, true),
        at(0.07, -0.06),
        at(0.17, -0.05),
        at(0.24, 0, true),
        at(0.17, 0.05),
        at(0.07, 0.06),
      ],
      0.75,
    );
    p.line([at(0.02, 0), at(0.2, 0)], 0.4);
  },
};

const umbrella = {
  w: 0.92,
  h: 1,
  tilt: 0.25,
  draw(p) {
    p.color(K.water);
    for (const [x, y, h] of [
      [-0.4, 0.2, 0.1],
      [0.42, 0.28, 0.09],
      [-0.3, 0.42, 0.08],
      [0.32, 0.46, 0.07],
    ])
      p.shape(drop(x, y, h), 0.7);
    p.color(K.darkWood);
    p.wire(
      [
        [0, -0.34],
        [0, 0.34],
        [0.0, 0.42],
        [-0.06, 0.47],
        [-0.12, 0.42],
      ],
      0.035,
      0.8,
    );
    const edge = [];
    const n = 6;
    for (let i = 0; i <= n; i++) {
      const x = 0.44 - (0.88 * i) / n;
      edge.push(c(x, 0.04));
      if (i < n) edge.push([x - 0.0733, -0.02]);
    }
    p.color(K.yellow);
    p.shape([c(0, -0.38), [0.28, -0.32], [0.42, -0.14], ...edge, [-0.42, -0.14], [-0.28, -0.32]]);
    for (let i = 1; i < n; i++) {
      const x = 0.44 - (0.88 * i) / n;
      p.line(
        [
          [0, -0.37],
          [x * 0.7, -0.2],
          [x, 0.04],
        ],
        0.55,
      );
    }
    p.color(K.darkWood);
    p.poly([c(-0.012, -0.38), c(0.012, -0.38), c(0.008, -0.46), c(-0.008, -0.46)], 0.7);
  },
};

const rainCloud = {
  w: 1,
  h: 0.84,
  tilt: 0.05,
  draw(p) {
    p.color(K.water);
    for (const [x, y, h] of [
      [-0.25, 0.22, 0.12],
      [0.0, 0.3, 0.14],
      [0.25, 0.22, 0.12],
      [-0.12, 0.4, 0.1],
      [0.14, 0.4, 0.1],
    ])
      p.shape(drop(x, y, h), 0.7);
    const cloud = cloudItem;
    p.color(K.grey);
    const shift = (points) => points.map(([x, y, k]) => (k ? [x, y - 0.12, true] : [x, y - 0.12]));
    cloud.draw({
      ...p,
      shape: (pts, k) => p.shape(shift(pts), k),
      line: (pts, k) => p.line(shift(pts), k),
    });
  },
};

// ------------------------------------------------ shown once in the whole decoration

/** Two chestnuts on their open, spiky husk. */
const chestnuts = {
  w: 1,
  h: 0.8,
  tilt: 0.2,
  draw(p) {
    const spikes = [];
    const n = 18;
    for (let i = 0; i <= n; i++) {
      const a = Math.PI - (i / n) * Math.PI;
      const r = i % 2 ? 0.46 : 0.36;
      spikes.push(c(Math.cos(a) * r, 0.02 + Math.sin(a) * r * 0.8));
    }
    p.color('#a9e34b');
    p.shape(spikes);
    const nut = (x, y, s) => {
      const at = (px, py, k) => (k ? c(x + px * s, y + py * s) : [x + px * s, y + py * s]);
      p.color('#8b4513');
      p.shape([
        at(0, -0.34, true),
        at(0.14, -0.27),
        at(0.24, -0.1),
        at(0.24, 0.07),
        at(0.13, 0.15),
        at(-0.13, 0.15),
        at(-0.24, 0.07),
        at(-0.24, -0.1),
        at(-0.14, -0.27),
      ]);
      p.color(K.sand);
      p.shape([at(-0.22, 0.02), at(0, 0.0), at(0.22, 0.02), at(0.13, 0.13), at(-0.13, 0.13)], 0.8);
      p.line([at(-0.12, -0.18), at(-0.16, -0.06)], 0.5);
    };
    nut(-0.15, 0.0, 1);
    nut(0.17, 0.04, 0.9);
  },
};

/** A pine cone, its scales in rows, on a short stalk. */
const pineCone = {
  w: 0.66,
  h: 1,
  tilt: 0.35,
  color: K.wood,
  draw(p) {
    p.wire(
      [
        [0, -0.36],
        [0.02, -0.44],
        [0.06, -0.49],
      ],
      0.05,
      0.7,
    );
    p.shape(
      sym([
        [0, -0.4],
        [0.18, -0.34],
        [0.3, -0.1],
        [0.28, 0.2],
        [0.14, 0.42],
        [0, 0.48],
      ]),
    );
    // Rows of scales from the top down: each lower one covers the one above.
    const rows = [
      [-0.3, 0.16, 2],
      [-0.17, 0.26, 3],
      [-0.03, 0.3, 3],
      [0.11, 0.28, 3],
      [0.25, 0.22, 2],
      [0.37, 0.12, 1],
    ];
    rows.forEach(([y, half, count], r) => {
      for (let i = 0; i < count; i++) {
        const x = count === 1 ? 0 : -half + (2 * half * i) / (count - 1) + (r % 2 ? 0 : 0.02);
        const w = Math.min(0.12, (half * 1.1) / Math.max(1, count - 1) + 0.04);
        p.shape(
          [
            c(x - w, y - 0.06),
            [x - w, y + 0.03],
            [x, y + 0.1],
            [x + w, y + 0.03],
            c(x + w, y - 0.06),
          ],
          0.8,
        );
      }
    });
  },
};

/** A rain boot in its puddle. */
const rainBoot = {
  w: 1,
  h: 1,
  tilt: 0.08,
  draw(p) {
    p.color(K.water);
    p.shape(ellipse(0.02, 0.42, 0.48, 0.07, 22), 0.8);
    p.color(K.yellow);
    p.shape([
      c(-0.3, -0.4),
      c(0.12, -0.4),
      [0.14, 0.12],
      [0.3, 0.22],
      [0.4, 0.3],
      c(0.41, 0.4),
      c(-0.3, 0.4),
      [-0.32, 0.0],
    ]);
    p.color(K.autumnGold);
    p.shape(rrect(-0.33, 0.33, 0.43, 0.43, 0.03), 0.9);
    p.shape(rrect(-0.33, -0.48, 0.15, -0.36, 0.03), 0.9);
    p.line(
      [
        [0.14, 0.12],
        [0.02, 0.2],
        [-0.05, 0.33],
      ],
      0.5,
    );
  },
};

/** An owl on a branch. */
const owl = {
  w: 0.8,
  h: 0.92,
  tilt: 0.1,
  flip: false,
  draw(p) {
    p.color(K.wood);
    p.shape(
      sym([
        [0, -0.29],
        c(0.2, -0.44),
        [0.27, -0.25],
        [0.3, 0.0],
        [0.26, 0.22],
        [0.14, 0.34],
        [0, 0.37],
      ]),
    );
    p.color(K.darkWood);
    for (const s of [1, -1])
      p.shape(
        [c(0.22 * s, -0.08), [0.34 * s, 0.08], [0.3 * s, 0.26], c(0.19 * s, 0.3), [0.22 * s, 0.1]],
        0.9,
      );
    p.color(K.sand);
    p.shape(ellipse(0, 0.13, 0.17, 0.2, 18), 0.8);
    p.color(K.yellow);
    for (const s of [1, -1]) {
      p.shape(ellipse(0.11 * s, -0.15, 0.1, 0.1, 16), 0.9);
      p.dot(0.11 * s, -0.15, 0.035);
    }
    p.color(K.autumnGold);
    p.poly([c(-0.04, -0.08), c(0.04, -0.08), c(0, 0.01)], 0.8);
    p.color(K.bark);
    p.shape(rrect(-0.4, 0.34, 0.4, 0.44, 0.04), 0.9);
  },
};

/** A pumpkin with its leaf and a curling tendril. */
const pumpkin = {
  w: 1,
  h: 0.8,
  tilt: 0.12,
  draw(p) {
    p.color('#5c940d');
    p.poly([c(-0.05, -0.18), c(-0.04, -0.34), c(0.06, -0.37), c(0.05, -0.18)], 0.9);
    p.color(K.leaf);
    p.shape(
      [c(0.06, -0.3), [0.18, -0.38], [0.32, -0.34], c(0.38, -0.27), [0.24, -0.22], [0.14, -0.24]],
      0.8,
    );
    p.line(
      [
        [-0.05, -0.3],
        [-0.16, -0.36],
        [-0.2, -0.29],
        [-0.13, -0.27],
      ],
      0.5,
    );
    p.color(K.orange);
    p.shape(ellipse(-0.2, 0.08, 0.27, 0.3, 20));
    p.shape(ellipse(0.2, 0.08, 0.27, 0.3, 20));
    p.shape(ellipse(0, 0.08, 0.22, 0.32, 20));
  },
};

/** A wicker basket of apples. */
const appleBasket = {
  w: 1,
  h: 0.9,
  tilt: 0.08,
  draw(p) {
    p.color(K.lightWood);
    p.wire(
      [
        [-0.36, 0.0],
        [-0.3, -0.3],
        [0, -0.43],
        [0.3, -0.3],
        [0.36, 0.0],
      ],
      0.05,
      0.75,
    );
    for (const [x, y] of [
      [-0.2, -0.1],
      [0.21, -0.1],
      [0.01, -0.17],
    ]) {
      p.color(K.red);
      p.shape(
        sym([
          c(x, y - 0.11),
          [x + 0.1, y - 0.15],
          [x + 0.17, y - 0.03],
          [x + 0.13, y + 0.12],
          [x, y + 0.15],
        ]),
      );
      p.line(
        [
          [x, y - 0.11],
          [x + 0.02, y - 0.19],
        ],
        0.6,
      );
    }
    p.color(K.lightWood);
    p.poly([c(-0.42, 0.02), c(0.42, 0.02), c(0.32, 0.44), c(-0.32, 0.44)]);
    p.seg(
      [
        [-0.39, 0.16],
        [0.39, 0.16],
      ],
      0.5,
    );
    p.seg(
      [
        [-0.35, 0.3],
        [0.35, 0.3],
      ],
      0.5,
    );
    p.color(K.wood);
    p.shape(rrect(-0.46, -0.04, 0.46, 0.06, 0.03), 0.9);
  },
};

writeTheme('automne', {
  seed: 1001,
  thumb: maple,
  front: [maple, umbrella, toadstools, hedgehog, bonnet],
  middle: [oak, acorn, rainCloud],
  once: [chestnuts, pineCone, rainBoot, owl, pumpkin, appleBasket],
});
