/**
 * The "halloween" decoration: jack-o'-lanterns, a witch's hat, a bubbling cauldron, a ghost, a
 * tombstone in the grass, bats, a spider's web and its spider, wrapped sweets, the moon, stars.
 *
 *   node apps/web/scripts/themes/halloween.mjs   → apps/web/public/themes/halloween/*.svg
 */
import { arc, c, ellipse, frame, rrect, star, sym, turn, writeTheme } from './lib.mjs';
import { crescent, K } from './common.mjs';

const TAU = Math.PI * 2;

const pumpkin = {
  w: 1,
  h: 0.82,
  tilt: 0.1,
  draw(p) {
    p.color(K.darkLeaf);
    p.wire(
      Array.from({ length: 14 }, (_, i) => {
        const a = i * 0.75;
        const r = 0.06 - i * 0.0035;
        return [0.14 + i * 0.012 + Math.cos(a) * r, -0.33 + Math.sin(a) * r];
      }),
      0.012,
      0.5,
    );
    const at = frame(-0.04, -0.27, -2.7);
    p.shape(
      [
        at(0, 0, true),
        at(0.08, -0.07),
        at(0.18, -0.06),
        at(0.26, 0, true),
        at(0.18, 0.06),
        at(0.08, 0.07),
      ],
      0.75,
    );
    p.line([at(0.02, 0), at(0.2, 0)], 0.4);
    // Ribs: the outer lobes first, the middle one in front.
    p.color(K.orange);
    for (const [x, rx, ry] of [
      [-0.3, 0.18, 0.27],
      [0.3, 0.18, 0.27],
      [-0.17, 0.22, 0.32],
      [0.17, 0.22, 0.32],
      [0, 0.2, 0.34],
    ]) {
      p.shape(ellipse(x, 0.07, rx, ry, 22));
    }
    p.color('#5c940d');
    p.shape(
      [
        c(-0.035, -0.24),
        [-0.05, -0.33],
        c(-0.03, -0.41),
        c(0.06, -0.39),
        [0.03, -0.32],
        c(0.04, -0.24),
      ],
      0.9,
    );
    // The carved face, lit from inside.
    p.color(K.yellow);
    p.poly([c(-0.2, -0.02), c(-0.07, -0.02), c(-0.12, -0.12)], 0.8);
    p.poly([c(0.07, -0.02), c(0.2, -0.02), c(0.13, -0.12)], 0.8);
    p.poly([c(-0.03, 0.07), c(0.03, 0.07), c(0, 0.02)], 0.7);
    p.poly(
      [
        c(-0.24, 0.12),
        c(-0.12, 0.18),
        c(-0.08, 0.13),
        c(-0.04, 0.2),
        c(0.04, 0.2),
        c(0.08, 0.13),
        c(0.12, 0.18),
        c(0.24, 0.12),
        c(0.16, 0.27),
        c(0.06, 0.24),
        c(0.02, 0.29),
        c(-0.06, 0.24),
        c(-0.16, 0.27),
      ],
      0.8,
    );
  },
};

const witchHat = {
  w: 1,
  h: 0.92,
  tilt: 0.12,
  draw(p) {
    p.color('#5f3dc4');
    p.shape(ellipse(0, 0.33, 0.48, 0.12, 26));
    p.shape([
      c(-0.26, 0.31),
      [-0.21, 0.05],
      [-0.13, -0.2],
      [0.02, -0.38],
      c(0.3, -0.46),
      [0.13, -0.3],
      [0.15, -0.08],
      [0.2, 0.12],
      c(0.26, 0.31),
      [0, 0.36],
    ]);
    p.line(
      [
        [-0.235, 0.17],
        [0, 0.22],
        [0.225, 0.17],
      ],
      0.6,
    );
    // Its band (between the line and the brim), the buckle.
    p.tint(
      [
        [-0.25, 0.17],
        [0, 0.22],
        [0.25, 0.17],
        [0.27, 0.32],
        [0, 0.36],
        [-0.27, 0.32],
      ],
      K.violet,
    );
    p.color(K.gold);
    p.poly(rrect(-0.07, 0.17, 0.07, 0.33, 0.015), 0.8);
    p.color(K.violet);
    p.poly(rrect(-0.035, 0.205, 0.035, 0.295, 0.01), 0.6);
    // A patch, stitched on.
    const patch = turn(rrect(-0.1, -0.12, 0.0, -0.03, 0.005), 0.3, -0.05, -0.08);
    p.color('#94d82d');
    p.poly(patch, 0.7);
    for (const [x, y] of [
      [-0.11, -0.13],
      [0.0, -0.1],
      [-0.12, -0.04],
      [0.0, -0.01],
    ]) {
      p.seg(
        [
          [x - 0.015, y - 0.015],
          [x + 0.015, y + 0.015],
        ],
        0.4,
      );
    }
  },
};

const cauldron = {
  w: 0.94,
  h: 1,
  tilt: 0.06,
  draw(p) {
    p.color('#94d82d');
    for (const [x, y, r] of [
      [-0.1, -0.33, 0.06],
      [0.12, -0.4, 0.045],
      [0.02, -0.46, 0.035],
      [-0.2, -0.44, 0.03],
    ])
      p.shape(ellipse(x, y, r, r, 12), 0.7);
    p.color(K.darkGrey);
    for (const s of [-1, 1]) {
      p.shape(ellipse(s * 0.42, -0.04, 0.06, 0.06, 12), 0.8);
      p.poly([c(s * 0.2, 0.34), c(s * 0.3, 0.34), c(s * 0.32, 0.48), c(s * 0.22, 0.48)], 0.9);
    }
    p.color(K.black);
    p.shape(
      sym([c(0, -0.14), c(0.38, -0.14), [0.43, 0.05], [0.38, 0.25], [0.24, 0.37], c(0, 0.4)]),
    );
    p.line(
      [
        [-0.32, 0.12],
        [-0.28, 0.26],
        [-0.18, 0.32],
      ],
      0.5,
    );
    // The brew bubbling over the rim.
    p.color('#94d82d');
    p.shape([
      c(-0.36, -0.15),
      [-0.3, -0.24],
      [-0.18, -0.21],
      [-0.1, -0.29],
      [0.02, -0.24],
      [0.14, -0.3],
      [0.24, -0.22],
      [0.34, -0.25],
      c(0.36, -0.15),
      [0.3, -0.08],
      c(0.26, -0.03),
      [0.22, -0.09],
      [0, -0.1],
      [-0.2, -0.09],
      c(-0.24, 0.0),
      [-0.28, -0.09],
    ]);
    p.color(K.darkGrey);
    p.shape(ellipse(0, -0.14, 0.42, 0.06, 24));
    p.color('#c0eb75');
    p.shape(ellipse(0.1, -0.22, 0.04, 0.04, 10), 0.6);
    p.shape(ellipse(-0.15, -0.21, 0.03, 0.03, 10), 0.6);
  },
};

const ghost = {
  w: 0.74,
  h: 1,
  tilt: 0.2,
  draw(p) {
    const hem = [];
    for (let i = 0; i <= 6; i++) {
      const x = 0.3 - (0.6 * i) / 6;
      hem.push(i % 2 ? [x, 0.38] : c(x, 0.48));
    }
    p.shape([
      [-0.06, -0.48],
      [0.14, -0.46],
      [0.26, -0.3],
      c(0.25, -0.08),
      [0.37, -0.1],
      [0.36, 0.0],
      c(0.26, 0.06),
      [0.29, 0.28],
      ...hem,
      [-0.29, 0.28],
      c(-0.26, 0.06),
      [-0.36, -0.04],
      [-0.36, -0.12],
      c(-0.24, -0.05),
      [-0.22, -0.36],
    ]);
    p.color(K.black);
    p.shape(ellipse(-0.09, -0.2, 0.045, 0.07, 12), 0.8);
    p.shape(ellipse(0.09, -0.2, 0.045, 0.07, 12), 0.8);
    p.dot(-0.08, -0.22, 0.02);
    p.dot(0.1, -0.22, 0.02);
    p.shape(ellipse(0, -0.04, 0.05, 0.065, 12), 0.8);
    p.color(K.palePink);
    p.shape(ellipse(-0.17, -0.08, 0.04, 0.025, 10), 0.5);
    p.shape(ellipse(0.17, -0.08, 0.04, 0.025, 10), 0.5);
  },
};

const tombstone = {
  w: 0.8,
  h: 1,
  tilt: 0.1,
  draw(p) {
    p.color(K.grey);
    p.shape(sym([c(0, -0.46), [0.18, -0.43], [0.28, -0.3], c(0.29, 0.38), c(0, 0.38)]));
    p.color('#868e96');
    p.poly(rrect(-0.035, -0.33, 0.035, -0.02, 0.008), 0.7);
    p.poly(rrect(-0.12, -0.25, 0.12, -0.18, 0.008), 0.7);
    p.line(
      [
        [0.29, -0.12],
        [0.2, -0.06],
        [0.23, 0.02],
        [0.14, 0.1],
      ],
      0.5,
    );
    for (const y of [0.1, 0.18])
      p.seg(
        [
          [-0.16, y],
          [0.1, y],
        ],
        0.4,
      );
    // Grass in front.
    const blades = [];
    for (let i = 0; i <= 16; i++) {
      const x = -0.4 + (0.8 * i) / 16;
      blades.push(i % 2 ? c(x + 0.02, 0.26 + ((i * 7) % 5) * 0.012) : c(x, 0.4));
    }
    p.color(K.grass);
    p.shape([c(-0.4, 0.5), ...blades, c(0.4, 0.5)], 0.8);
  },
};

const bat = {
  w: 1,
  h: 0.52,
  tilt: 0.3,
  color: K.darkGrey,
  draw(p) {
    for (const s of [-1, 1]) {
      const m = (pts) => pts.map(([x, y, k]) => (k ? [x * s, y, true] : [x * s, y]));
      p.shape(
        m([
          c(0.06, -0.06),
          [0.14, -0.16],
          c(0.25, -0.2),
          [0.36, -0.17],
          c(0.49, -0.06),
          [0.42, -0.06],
          [0.38, 0.0],
          c(0.36, 0.08),
          [0.31, 0.02],
          [0.24, 0.02],
          c(0.2, 0.12),
          [0.16, 0.04],
          [0.1, 0.05],
          c(0.06, 0.12),
        ]),
      );
      for (const [x, y] of [
        [0.36, 0.08],
        [0.2, 0.12],
        [0.49, -0.06],
      ])
        p.line(
          m([
            [0.25, -0.19],
            [x * 0.7 + 0.075, y * 0.6 - 0.1],
            [x, y],
          ]),
          0.45,
        );
      p.poly(m([c(0.03, -0.12), c(0.09, -0.24), c(0.1, -0.1)]), 0.8);
    }
    p.shape(ellipse(0, 0.06, 0.08, 0.14, 14));
    p.shape(ellipse(0, -0.09, 0.09, 0.08, 14));
    p.color(K.yellow);
    p.shape(ellipse(-0.035, -0.1, 0.022, 0.022, 8), 0.5);
    p.shape(ellipse(0.035, -0.1, 0.022, 0.022, 8), 0.5);
    p.dot(-0.035, -0.1, 0.01);
    p.dot(0.035, -0.1, 0.01);
    p.color(null);
    p.poly([c(-0.03, -0.045), c(-0.015, -0.045), c(-0.022, -0.02)], 0.5);
    p.poly([c(0.015, -0.045), c(0.03, -0.045), c(0.022, -0.02)], 0.5);
  },
};

const web = {
  w: 1,
  h: 1,
  tilt: 0.2,
  draw(p) {
    const n = 9;
    const rings = [0.12, 0.22, 0.32, 0.42, 0.49];
    const angle = (i) => (i / n) * TAU + 0.2;
    const ring = (r) => {
      const pts = [];
      for (let i = 0; i < n; i++) {
        pts.push(c(Math.cos(angle(i)) * r, Math.sin(angle(i)) * r));
        const mid = angle(i + 0.5);
        pts.push([Math.cos(mid) * r * 0.86, Math.sin(mid) * r * 0.86]);
      }
      return pts;
    };
    p.shape(ring(rings.at(-1)), 0.7);
    for (let i = 0; i < n; i++)
      p.seg(
        [
          [0, 0],
          [Math.cos(angle(i)) * 0.49, Math.sin(angle(i)) * 0.49],
        ],
        0.45,
      );
    for (const r of rings.slice(0, -1)) p.line([...ring(r), ring(r)[0]], 0.45);
  },
};

const spider = {
  w: 0.62,
  h: 1,
  tilt: 0.1,
  color: K.black,
  draw(p) {
    p.seg(
      [
        [0, -0.5],
        [0, -0.12],
      ],
      0.5,
    );
    for (const s of [-1, 1]) {
      for (const [y, reach, drop] of [
        [-0.06, 0.24, -0.1],
        [0.0, 0.29, -0.02],
        [0.06, 0.28, 0.08],
        [0.12, 0.22, 0.18],
      ]) {
        p.wire(
          [
            [s * 0.06, y],
            [s * reach * 0.7, y + drop - 0.08],
            [s * reach, y + drop + 0.06],
          ],
          0.018,
          0.6,
        );
      }
    }
    p.shape(ellipse(0, 0.17, 0.13, 0.16, 16));
    p.shape(ellipse(0, -0.04, 0.1, 0.09, 14));
    p.color(null);
    p.shape(ellipse(-0.04, -0.06, 0.03, 0.03, 8), 0.5);
    p.shape(ellipse(0.04, -0.06, 0.03, 0.03, 8), 0.5);
    p.dot(-0.035, -0.055, 0.013);
    p.dot(0.045, -0.055, 0.013);
    p.line(
      [
        [-0.04, 0.0],
        [0, 0.02],
        [0.04, 0.0],
      ],
      0.45,
    );
    p.line(
      [
        [-0.06, 0.12],
        [0, 0.15],
        [0.06, 0.12],
      ],
      0.4,
    );
  },
};

const candy = {
  w: 1,
  h: 0.5,
  tilt: 0.5,
  draw(p) {
    p.color('#cc5de8');
    for (const s of [-1, 1]) {
      const m = (pts) => pts.map(([x, y, k]) => (k ? [x * s, y, true] : [x * s, y]));
      p.shape(
        m([
          c(0.16, -0.06),
          c(0.46, -0.22),
          [0.42, -0.1],
          [0.45, 0.0],
          [0.42, 0.1],
          c(0.46, 0.22),
          c(0.16, 0.06),
        ]),
        0.85,
      );
      for (const y of [-0.08, 0.0, 0.08])
        p.line(
          m([
            [0.2, y * 0.3],
            [0.33, y],
            [0.42, y * 1.5],
          ]),
          0.4,
        );
    }
    p.color(K.orange);
    p.shape(ellipse(0, 0, 0.2, 0.2, 18));
    for (const off of [-0.09, 0.0, 0.09]) {
      p.line(
        [
          [-0.13 + off, -0.15 + Math.abs(off)],
          [off, 0],
          [0.13 + off, 0.15 - Math.abs(off)],
        ].map(([x, y]) => [x * 0.95, y]),
        0.5,
      );
    }
  },
};

const moon = {
  w: 0.8,
  h: 1,
  tilt: 0.2,
  draw(p) {
    p.color(K.yellow);
    p.shape(crescent(0.05, 0.02, 0.44, 0.22, -0.1, 0.36));
    p.color(K.gold);
    p.shape(star(0.24, -0.34, 0.07, 0.45), 0.6);
    p.shape(star(0.32, 0.12, 0.05, 0.45), 0.6);
    // A wisp of cloud across it.
    p.color(K.grey);
    p.shape(
      [
        c(-0.4, 0.32),
        [-0.38, 0.24],
        [-0.28, 0.22],
        [-0.2, 0.15],
        [-0.08, 0.17],
        [0.0, 0.22],
        [0.1, 0.22],
        [0.14, 0.28],
        c(0.12, 0.34),
      ],
      0.8,
    );
    p.line(arc(-0.1, 0.0, 0.3, 0.32, 2.3, 3.4, 6), 0.45);
  },
};

// ------------------------------------------------ shown once in the whole decoration

const broom = {
  w: 0.52,
  h: 1,
  tilt: 0.45,
  draw(p) {
    p.color(K.wood);
    p.wire(
      [
        [0.02, -0.48],
        [0, 0.08],
      ],
      0.05,
      0.8,
    );
    p.color('#e9c46a');
    p.shape([
      c(-0.09, 0.08),
      c(0.09, 0.08),
      [0.18, 0.28],
      c(0.25, 0.47),
      c(-0.25, 0.47),
      [-0.18, 0.28],
    ]);
    for (const x of [-0.12, 0, 0.12])
      p.line(
        [
          [x * 0.5, 0.16],
          [x, 0.44],
        ],
        0.5,
      );
    p.color(K.red);
    p.shape(rrect(-0.11, 0.04, 0.11, 0.14, 0.02), 0.9);
  },
};

/** A black cat sitting, its tail curled. */
const blackCat = {
  w: 0.8,
  h: 1,
  tilt: 0.08,
  color: K.black,
  draw(p) {
    p.wire(
      [
        [0.16, 0.42],
        [0.36, 0.36],
        [0.4, 0.16],
        [0.3, 0.04],
      ],
      0.07,
      0.8,
    );
    p.shape(sym([[0, -0.08], [0.18, 0.0], [0.27, 0.22], [0.24, 0.4], c(0.15, 0.47), c(0, 0.47)]));
    p.line(
      [
        [0.06, 0.3],
        [0.06, 0.46],
      ],
      0.5,
    );
    p.line(
      [
        [-0.06, 0.3],
        [-0.06, 0.46],
      ],
      0.5,
    );
    p.shape(
      sym([[0, -0.34], c(0.15, -0.48), [0.2, -0.32], [0.23, -0.18], [0.14, -0.06], [0, -0.04]]),
    );
    p.color(K.yellow);
    for (const s of [1, -1]) {
      p.shape(ellipse(0.09 * s, -0.22, 0.055, 0.045, 12), 0.8);
      p.dot(0.09 * s, -0.22, 0.02);
      p.line(
        [
          [0.08 * s, -0.12],
          [0.3 * s, -0.15],
        ],
        0.45,
      );
      p.line(
        [
          [0.08 * s, -0.1],
          [0.3 * s, -0.06],
        ],
        0.45,
      );
    }
    p.color(K.pink);
    p.poly([c(-0.03, -0.15), c(0.03, -0.15), c(0, -0.11)], 0.7);
  },
};

const skull = {
  w: 0.8,
  h: 0.9,
  tilt: 0.2,
  draw(p) {
    p.color(K.paper);
    p.shape(
      sym([
        [0, -0.44],
        [0.22, -0.4],
        [0.34, -0.2],
        [0.33, 0.02],
        [0.22, 0.14],
        [0.2, 0.3],
        [0.12, 0.38],
        [0, 0.4],
      ]),
    );
    p.color(K.black);
    for (const s of [1, -1]) p.shape(ellipse(0.13 * s, -0.07, 0.09, 0.1, 14), 0.9);
    p.poly([c(0, 0.04), c(0.05, 0.13), c(-0.05, 0.13)], 0.8);
    p.seg(
      [
        [-0.14, 0.24],
        [0.14, 0.24],
      ],
      0.6,
    );
    for (const x of [-0.07, 0, 0.07])
      p.seg(
        [
          [x, 0.2],
          [x, 0.3],
        ],
        0.5,
      );
  },
};

/** A round potion flask, bubbles in it. */
const potion = {
  w: 0.66,
  h: 1,
  tilt: 0.25,
  draw(p) {
    p.color('#e7f5ff');
    p.shape(rrect(-0.08, -0.32, 0.08, 0.0, 0.02));
    p.shape(ellipse(0, 0.18, 0.31, 0.29, 28));
    // The potion, below its surface.
    p.tint(
      [
        [-0.3, 0.12],
        [-0.14, 0.06],
        [0, 0.12],
        [0.16, 0.06],
        [0.3, 0.12],
        [0.3, 0.48],
        [-0.3, 0.48],
      ],
      '#cc5de8',
    );
    p.line(
      [
        [-0.3, 0.12],
        [-0.14, 0.06],
        [0, 0.12],
        [0.16, 0.06],
        [0.3, 0.12],
      ],
      0.6,
    );
    p.color('#eebefa');
    p.shape(ellipse(-0.08, 0.26, 0.06, 0.06, 12), 0.7);
    p.shape(ellipse(0.1, 0.32, 0.045, 0.045, 10), 0.7);
    p.color(K.lightWood);
    p.shape(rrect(-0.11, -0.45, 0.11, -0.3, 0.03), 0.9);
  },
};

/** A candle, wax dripping. */
const candle = {
  w: 0.56,
  h: 1,
  tilt: 0.08,
  draw(p) {
    p.color(K.grey);
    p.shape(ellipse(0, 0.42, 0.27, 0.07, 18), 0.9);
    p.color(K.cream);
    p.shape(rrect(-0.15, -0.14, 0.15, 0.42, 0.02));
    p.shape(
      [
        c(-0.17, -0.18),
        c(0.17, -0.18),
        [0.17, -0.04],
        [0.12, 0.04],
        [0.08, -0.06],
        [0.0, 0.1],
        [-0.06, -0.04],
        [-0.12, 0.0],
        [-0.17, -0.06],
      ],
      0.9,
    );
    p.color(K.orange);
    p.shape(
      [c(0, -0.48), [0.08, -0.34], [0.06, -0.25], [0, -0.22], [-0.06, -0.25], [-0.08, -0.34]],
      0.8,
    );
    p.seg(
      [
        [0, -0.22],
        [0, -0.18],
      ],
      0.6,
    );
  },
};

const hauntedHouse = {
  w: 0.9,
  h: 1,
  tilt: 0.06,
  flip: false,
  draw(p) {
    p.color('#868e96');
    p.poly([c(0.16, -0.32), c(0.26, -0.32), c(0.26, -0.12), c(0.16, -0.12)], 0.9);
    p.color('#9775fa');
    p.poly([c(-0.32, -0.04), c(0.32, -0.04), c(0.34, 0.46), c(-0.33, 0.46)]);
    p.color(K.black);
    p.poly([
      c(-0.43, 0.0),
      c(-0.02, -0.4),
      c(0.42, -0.02),
      c(0.36, 0.03),
      c(-0.02, -0.3),
      c(-0.37, 0.05),
    ]);
    p.color(K.yellow);
    p.poly([c(-0.24, 0.08), c(-0.08, 0.06), c(-0.08, 0.2), c(-0.24, 0.21)], 0.8);
    p.poly([c(0.1, 0.06), c(0.25, 0.08), c(0.24, 0.21), c(0.1, 0.2)], 0.8);
    p.color(K.darkWood);
    p.shape([c(-0.08, 0.46), [-0.08, 0.32], [0, 0.26], [0.08, 0.32], c(0.08, 0.46)], 0.8);
    p.color(K.yellow);
    p.shape(ellipse(-0.02, -0.18, 0.06, 0.06, 12), 0.8);
  },
};

writeTheme('halloween', {
  seed: 901,
  thumb: pumpkin,
  front: [pumpkin, witchHat, cauldron, ghost, tombstone],
  middle: [bat, web, spider, candy, moon],
  once: [broom, blackCat, skull, potion, candle, hauntedHouse],
});
