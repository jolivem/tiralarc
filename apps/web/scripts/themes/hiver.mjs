/**
 * The "hiver" (winter) decoration: icicles along the top, a snow bank along the bottom, an igloo,
 * a snowman, snowy firs, a snow globe, a penguin in its hat and scarf, mittens on their string, a
 * mug of hot chocolate, a knitted hat, snowflakes.
 *
 *   node apps/web/scripts/themes/hiver.mjs   → apps/web/public/themes/hiver/*.svg
 */
import { c, ellipse, hits, rrect, scallop, smooth, star, sym, writeTheme } from './lib.mjs';
import { bonnet, heartItem, K, snowflake, snowflakeItem } from './common.mjs';

/** A snowy fir: tiers with snow caps dripping over them, a trunk, a mound. */
function fir(p, cx, cy, s, k = 1) {
  const at = (pts) =>
    pts.map(([x, y, corner]) =>
      corner ? [cx + x * s, cy + y * s, true] : [cx + x * s, cy + y * s],
    );
  p.color(K.wood);
  p.poly(at(rrect(-0.05, 0.3, 0.05, 0.44, 0.01)), k);
  for (const [top, bottom, half] of [
    [-0.06, 0.34, 0.36],
    [-0.25, 0.14, 0.28],
    [-0.46, -0.06, 0.2],
  ]) {
    p.color(K.darkLeaf);
    p.shape(at([c(0, top), c(half, bottom), [0, bottom + 0.03], c(-half, bottom)]), k);
    p.color(null);
    const h = (bottom - top) * 0.42;
    const w = (half * h) / (bottom - top);
    p.shape(
      at([
        c(0, top),
        c(w, top + h),
        [w * 0.55, top + h + 0.03],
        [w * 0.2, top + h - 0.01],
        [-w * 0.2, top + h + 0.035],
        [-w * 0.6, top + h - 0.005],
        c(-w, top + h),
      ]),
      k * 0.75,
    );
  }
  p.shape(
    at([c(-0.36, 0.5), [-0.3, 0.42], [-0.1, 0.39], [0.12, 0.4], [0.32, 0.43], c(0.38, 0.5)]),
    k * 0.8,
  );
}

const firs = {
  w: 0.9,
  h: 1,
  tilt: 0.03,
  draw(p) {
    fir(p, 0.2, 0.06, 0.82, 0.85);
    fir(p, -0.12, 0.0, 1);
  },
};

const firItem = {
  w: 0.76,
  h: 1,
  tilt: 0.03,
  draw(p) {
    fir(p, 0, 0, 1);
  },
};

const igloo = {
  w: 1,
  h: 0.72,
  tilt: 0.02,
  draw(p) {
    const [cx, base, rx, ry] = [0, 0.3, 0.44, 0.62];
    p.color(K.ice);
    const dome = [];
    for (let i = 0; i <= 20; i++) {
      const a = Math.PI + (i / 20) * Math.PI;
      dome.push([cx + Math.cos(a) * rx, base + Math.sin(a) * ry]);
    }
    p.shape([c(...dome[0]), ...dome.slice(1, -1), c(...dome.at(-1))]);
    // Rows of blocks: courses, joints staggered.
    const rows = 5;
    for (let r = 1; r < rows; r++) {
      const y = base - (ry * r) / rows;
      const half = rx * Math.sqrt(1 - ((base - y) / ry) ** 2);
      p.line(
        [
          [-half, y],
          [0, y - 0.01],
          [half, y],
        ],
        0.5,
      );
      const yNext = base - (ry * (r - 1)) / rows;
      const count = 6 - r;
      for (let j = 0; j < count; j++) {
        const x = -half + ((j + (r % 2 ? 0.5 : 1)) * 2 * half) / (count + 0.5);
        if (Math.abs(x) < 0.2 && r < 3) continue;
        p.seg(
          [
            [x, y],
            [x * 1.05, yNext],
          ],
          0.45,
        );
      }
    }
    const top = base - ry * (1 - 1 / rows);
    for (const x of [-0.08, 0.09])
      p.seg(
        [
          [x, top],
          [x * 1.1, base - (ry * (rows - 2)) / rows],
        ],
        0.45,
      );
    // The entrance tunnel, the dark doorway.
    p.shape([c(-0.18, 0.33), [-0.18, 0.12], [-0.1, 0.0], [0.1, 0.0], [0.18, 0.12], c(0.18, 0.33)]);
    p.line(
      [
        [-0.18, 0.15],
        [0, 0.17],
        [0.18, 0.15],
      ],
      0.45,
    );
    p.color(K.navy);
    p.shape(
      [c(-0.11, 0.33), [-0.11, 0.17], [-0.05, 0.1], [0.05, 0.1], [0.11, 0.17], c(0.11, 0.33)],
      0.8,
    );
    p.color(null);
    p.shape(
      [c(-0.5, 0.36), [-0.36, 0.3], [-0.1, 0.32], [0.18, 0.3], [0.4, 0.31], c(0.5, 0.36)],
      0.8,
    );
  },
};

const snowman = {
  w: 0.8,
  h: 1,
  tilt: 0.06,
  draw(p) {
    p.color(K.darkWood);
    for (const s of [-1, 1]) {
      p.wire(
        [
          [s * 0.12, 0.0],
          [s * 0.26, -0.08],
          [s * 0.38, -0.18],
        ],
        0.022,
        0.65,
      );
      p.wire(
        [
          [s * 0.3, -0.12],
          [s * 0.36, -0.06],
        ],
        0.016,
        0.6,
      );
      p.wire(
        [
          [s * 0.36, -0.16],
          [s * 0.4, -0.24],
        ],
        0.016,
        0.6,
      );
    }
    p.color(null);
    p.shape(ellipse(0, 0.3, 0.21, 0.19, 22));
    p.shape(ellipse(0, 0.0, 0.16, 0.15, 20));
    p.color(K.black);
    for (const y of [-0.05, 0.03, 0.22]) p.shape(ellipse(0, y, 0.022, 0.022, 8), 0.6);
    // The scarf, its hanging end.
    p.color(K.red);
    p.shape(
      [c(-0.14, -0.15), [0, -0.12], c(0.14, -0.15), c(0.15, -0.09), [0, -0.06], c(-0.15, -0.09)],
      0.8,
    );
    p.poly([c(0.06, -0.1), c(0.14, -0.1), c(0.17, 0.08), c(0.08, 0.08)], 0.8);
    for (const x of [0.105, 0.125, 0.145])
      p.seg(
        [
          [x, 0.08],
          [x + 0.005, 0.12],
        ],
        0.45,
      );
    p.color(null);
    p.shape(ellipse(0, -0.24, 0.13, 0.12, 18));
    p.dot(-0.045, -0.27, 0.015);
    p.dot(0.045, -0.27, 0.015);
    p.color(K.orange);
    p.poly([c(-0.01, -0.24), c(0.15, -0.21), c(-0.01, -0.21)], 0.7);
    for (const x of [-0.05, -0.02, 0.02, 0.05]) p.dot(x, -0.17 + Math.abs(x) * -0.3 + 0.01, 0.009);
    // The hat.
    p.color(K.black);
    p.poly(rrect(-0.16, -0.36, 0.16, -0.32, 0.01));
    p.poly(rrect(-0.1, -0.5, 0.1, -0.35, 0.01));
    p.color(K.red);
    p.poly(rrect(-0.1, -0.4, 0.1, -0.36, 0.0), 0.7);
  },
};

const globe = {
  w: 0.76,
  h: 1,
  tilt: 0.05,
  draw(p) {
    p.color('#e7f5ff');
    p.shape(ellipse(0, -0.12, 0.35, 0.35, 28));
    // Snow on the ground, inside.
    p.tint(
      [
        [-0.3, 0.06],
        [0, 0.03],
        [0.3, 0.06],
        [0.2, 0.17],
        [-0.2, 0.17],
      ],
      '#ffffff',
    );
    // Inside: a snowy ground, a small fir, a house.
    p.line(
      [
        [-0.3, 0.06],
        [0, 0.03],
        [0.3, 0.06],
      ],
      0.55,
    );
    fir(p, -0.12, -0.12, 0.34, 0.6);
    p.color(K.red);
    p.poly([c(0.06, 0.04), c(0.06, -0.08), c(0.13, -0.15), c(0.2, -0.08), c(0.2, 0.04)], 0.6);
    p.color(K.darkWood);
    p.poly(rrect(0.11, -0.04, 0.15, 0.04, 0), 0.5);
    for (const [x, y] of [
      [-0.2, -0.32],
      [0.08, -0.36],
      [0.22, -0.24],
      [-0.04, -0.22],
      [0.15, -0.3],
      [-0.26, -0.12],
      [0.26, -0.1],
    ])
      p.dot(x, y, 0.012);
    p.line(
      [
        [-0.24, -0.3],
        [-0.27, -0.2],
      ],
      0.5,
    );
    p.color(K.darkWood);
    p.poly([c(-0.28, 0.16), c(0.28, 0.16), c(0.36, 0.48), c(-0.36, 0.48)]);
    p.seg(
      [
        [-0.31, 0.27],
        [0.31, 0.27],
      ],
      0.55,
    );
    p.color(K.gold);
    p.shape(star(0, 0.38, 0.06, 0.45), 0.6);
  },
};

const penguin = {
  w: 0.7,
  h: 1,
  tilt: 0.12,
  draw(p) {
    for (const s of [-1, 1]) {
      p.color(K.black);
      p.shape(
        [c(s * 0.2, -0.1), [s * 0.32, 0.05], [s * 0.34, 0.2], c(s * 0.3, 0.25), [s * 0.24, 0.12]],
        0.85,
      );
      p.color(K.orange);
      p.shape(ellipse(s * 0.09, 0.45, 0.09, 0.035, 10), 0.8);
    }
    p.color(K.black);
    p.shape(sym([c(0, -0.34), [0.17, -0.3], [0.24, -0.08], [0.25, 0.2], [0.17, 0.42], c(0, 0.46)]));
    p.color(null);
    p.shape(
      sym([c(0, -0.18), [0.1, -0.15], [0.16, 0.05], [0.16, 0.25], [0.1, 0.39], c(0, 0.41)]),
      0.7,
    );
    for (const s of [-1, 1]) {
      p.shape(ellipse(s * 0.07, -0.22, 0.035, 0.04, 10), 0.6);
      p.dot(s * 0.065, -0.21, 0.018);
    }
    p.color(K.orange);
    p.poly([c(-0.05, -0.17), c(0.05, -0.17), c(0, -0.1)], 0.7);
    // Scarf and hat.
    p.color(K.blue);
    p.shape(
      [c(-0.2, -0.08), [0, -0.04], c(0.2, -0.08), c(0.21, -0.01), [0, 0.03], c(-0.21, -0.01)],
      0.8,
    );
    p.poly([c(-0.15, 0.0), c(-0.07, 0.0), c(-0.09, 0.2), c(-0.17, 0.19)], 0.8);
    p.shape([c(-0.18, -0.33), [-0.15, -0.44], [0, -0.48], [0.15, -0.44], c(0.18, -0.33)], 0.9);
    p.color(K.navy);
    p.poly(rrect(-0.2, -0.36, 0.2, -0.3, 0.02), 0.85);
    p.color(null);
    p.shape(scallop(0, -0.48, 0.06, 9, 0.25), 0.8);
  },
};

const mittens = {
  w: 0.92,
  h: 1,
  tilt: 0.1,
  draw(p) {
    p.color(K.red);
    p.wire(
      [
        [-0.24, 0.42],
        [-0.12, 0.49],
        [0.0, 0.47],
        [0.14, 0.49],
        [0.24, 0.42],
      ],
      0.015,
      0.6,
    );
    for (const s of [-1, 1]) {
      const m = (pts) =>
        pts.map(([x, y, k]) => (k ? [x * s + s * 0.22, y, true] : [x * s + s * 0.22, y]));
      p.color(K.red);
      p.shape(
        m([
          c(0.13, 0.2),
          [0.14, -0.05],
          [0.12, -0.28],
          [0.0, -0.38],
          [-0.13, -0.3],
          [-0.15, -0.08],
          [-0.15, 0.0],
          [-0.22, -0.06],
          [-0.28, -0.02],
          [-0.25, 0.08],
          c(-0.14, 0.2),
        ]),
      );
      p.line(
        m([
          [-0.15, 0.0],
          [-0.13, 0.06],
        ]),
        0.45,
      );
      p.color(null);
      p.poly(m(rrect(-0.16, 0.18, 0.15, 0.36, 0.03)));
      for (let i = 1; i < 6; i++)
        p.seg(
          m([
            [-0.16 + (0.31 * i) / 6, 0.19],
            [-0.16 + (0.31 * i) / 6, 0.35],
          ]),
          0.4,
        );
      if (s < 0) snowflake(p, s * 0.22, -0.12, 0.09, 0.55);
      else p.shape(heartItemPoints(0.22, -0.12, 0.13), 0.6);
      p.color(K.red);
    }
  },
};

/** A small heart's outline (the shared heart element, as points). */
function heartItemPoints(cx, cy, h) {
  const out = [];
  heartItem.draw({ shape: (pts) => out.push(...pts), line: () => {} });
  return out.map(([x, y, k]) => (k ? [cx + x * h, cy + y * h, true] : [cx + x * h, cy + y * h]));
}

const mug = {
  w: 0.84,
  h: 1,
  tilt: 0.08,
  draw(p) {
    for (const x of [-0.12, 0.04, 0.18]) {
      p.wire(
        [
          [x, -0.2],
          [x - 0.04, -0.28],
          [x + 0.03, -0.36],
          [x - 0.02, -0.44],
        ],
        0.02,
        0.5,
      );
    }
    p.wire(
      [
        [0.26, -0.02],
        [0.4, 0.0],
        [0.42, 0.14],
        [0.36, 0.24],
        [0.24, 0.26],
      ],
      0.06,
      0.8,
    );
    p.color(K.blue);
    p.shape([
      c(-0.3, -0.1),
      c(0.3, -0.1),
      [0.29, 0.2],
      [0.26, 0.38],
      [0.18, 0.46],
      c(-0.18, 0.46),
      [-0.26, 0.38],
      [-0.29, 0.2],
    ]);
    p.color('#8b5a2b');
    p.shape(ellipse(0, -0.1, 0.3, 0.06, 20));
    p.color('#fff0f6');
    for (const [x, y, a] of [
      [-0.12, -0.14, 0.3],
      [0.04, -0.15, -0.2],
      [0.15, -0.12, 0.5],
      [-0.02, -0.1, 0.1],
    ]) {
      const pts = rrect(x - 0.045, y - 0.03, x + 0.045, y + 0.03, 0.01).map(([px, py, k]) => {
        const dx = px - x;
        const dy = py - y;
        const q = [
          x + dx * Math.cos(a) - dy * Math.sin(a),
          y + dx * Math.sin(a) + dy * Math.cos(a),
        ];
        return k ? [...q, true] : q;
      });
      p.poly(pts, 0.6);
    }
    p.color(null);
    snowflake(p, 0, 0.18, 0.12, 0.55);
  },
};

// ------------------------------------------------ shown once in the whole decoration

const sled = {
  w: 1,
  h: 0.6,
  tilt: 0.1,
  draw(p) {
    p.line(
      [
        [0.36, -0.06],
        [0.44, -0.2],
        [0.48, -0.28],
      ],
      0.6,
    );
    p.color(K.darkGrey);
    p.wire(
      [
        [-0.44, 0.22],
        [0.3, 0.22],
        [0.42, 0.16],
        [0.44, 0.04],
        [0.38, -0.02],
      ],
      0.05,
      0.8,
    );
    for (const x of [-0.28, 0.0, 0.24])
      p.wire(
        [
          [x, 0.02],
          [x, 0.2],
        ],
        0.04,
        0.75,
      );
    p.color(K.red);
    p.shape(rrect(-0.4, -0.12, 0.34, 0.04, 0.03));
    p.seg(
      [
        [-0.15, -0.12],
        [-0.15, 0.04],
      ],
      0.5,
    );
    p.seg(
      [
        [0.1, -0.12],
        [0.1, 0.04],
      ],
      0.5,
    );
  },
};

/** An ice skate. */
const skate = {
  w: 1,
  h: 0.9,
  tilt: 0.12,
  draw(p) {
    p.color(K.silver);
    p.wire(
      [
        [0.36, 0.3],
        [0.44, 0.28],
        [0.46, 0.2],
        [0.4, 0.17],
      ],
      0.04,
      0.75,
    );
    for (const x of [-0.2, 0.18]) p.poly(rrect(x - 0.04, 0.12, x + 0.04, 0.28), 0.8);
    p.shape(rrect(-0.38, 0.26, 0.38, 0.33, 0.03), 0.9);
    p.color(K.palePink);
    p.shape([
      c(-0.3, -0.42),
      c(0.02, -0.42),
      [0.04, -0.12],
      [0.2, -0.04],
      [0.34, 0.02],
      c(0.36, 0.16),
      c(-0.32, 0.16),
    ]);
    p.color(K.pink);
    p.shape(rrect(-0.31, -0.44, 0.03, -0.34, 0.03), 0.9);
    for (const y of [-0.26, -0.16, -0.06])
      p.seg(
        [
          [-0.08, y],
          [0.0, y + 0.05],
        ],
        0.5,
      );
    p.seg(
      [
        [-0.32, 0.06],
        [0.35, 0.06],
      ],
      0.5,
    );
  },
};

/** A log cabin, snow on its roof, smoke from its chimney. */
const cabin = {
  w: 1,
  h: 0.92,
  tilt: 0.04,
  flip: false,
  draw(p) {
    p.line(
      [
        [0.24, -0.34],
        [0.2, -0.4],
        [0.27, -0.44],
        [0.22, -0.48],
      ],
      0.6,
    );
    p.color('#868e96');
    p.poly(rrect(0.18, -0.32, 0.3, -0.1), 0.9);
    p.color(K.wood);
    p.poly([c(-0.34, 0.0), c(0.34, 0.0), c(0.34, 0.44), c(-0.34, 0.44)]);
    for (const y of [0.11, 0.22, 0.33])
      p.seg(
        [
          [-0.34, y],
          [0.34, y],
        ],
        0.45,
      );
    const snow = [c(-0.46, 0.04)];
    for (let i = 0; i <= 6; i++) snow.push([-0.42 + (0.84 * i) / 6, 0.08 + (i % 2) * 0.03]);
    p.color(null);
    p.shape([c(0, -0.34), c(0.46, 0.04), ...snow.reverse()]);
    p.color(K.yellow);
    p.poly(rrect(-0.24, 0.12, -0.04, 0.3), 0.9);
    p.seg(
      [
        [-0.14, 0.12],
        [-0.14, 0.3],
      ],
      0.5,
    );
    p.seg(
      [
        [-0.24, 0.21],
        [-0.04, 0.21],
      ],
      0.5,
    );
    p.color(K.darkWood);
    p.poly(rrect(0.06, 0.16, 0.24, 0.44), 0.9);
  },
};

/** A lantern, its candle lit. */
const lantern = {
  w: 0.56,
  h: 1,
  tilt: 0.1,
  draw(p) {
    p.wire(
      [
        [-0.1, -0.36],
        [-0.08, -0.46],
        [0.08, -0.46],
        [0.1, -0.36],
      ],
      0.03,
      0.7,
    );
    p.color(K.darkGrey);
    p.poly([c(-0.12, -0.38), c(0.12, -0.38), c(0.24, -0.26), c(-0.24, -0.26)]);
    p.poly(rrect(-0.2, -0.26, 0.2, 0.34));
    p.color(K.cream);
    p.poly(rrect(-0.14, -0.2, 0.14, 0.28), 0.8);
    p.color(null);
    p.poly(rrect(-0.06, 0.04, 0.06, 0.28), 0.8);
    p.color(K.orange);
    p.shape(
      [c(0, -0.14), [0.05, -0.04], [0.04, 0.01], [0, 0.03], [-0.04, 0.01], [-0.05, -0.04]],
      0.7,
    );
    p.color(K.darkGrey);
    p.poly(rrect(-0.24, 0.34, 0.24, 0.44), 0.9);
  },
};

/** Fluffy earmuffs. */
const earmuffs = {
  w: 1,
  h: 0.84,
  tilt: 0.15,
  draw(p) {
    p.color(K.violet);
    p.wire(
      [
        [-0.3, 0.12],
        [-0.3, -0.18],
        [0, -0.38],
        [0.3, -0.18],
        [0.3, 0.12],
      ],
      0.07,
      0.8,
    );
    for (const s of [1, -1]) {
      p.color(K.lavender);
      p.shape(ellipse(0.3 * s, 0.18, 0.19, 0.2, 22));
      p.color(K.violet);
      p.shape(ellipse(0.3 * s, 0.18, 0.09, 0.09, 14), 0.7);
    }
  },
};

/** A pair of skis crossed, a pole. */
const skis = {
  w: 0.7,
  h: 1,
  tilt: 0.12,
  draw(p) {
    const ski = (x0, x1) => {
      const a = Math.atan2(-0.92, x1 - x0);
      const nx = Math.sin(a) * 0.045;
      const ny = -Math.cos(a) * 0.045;
      p.shape([
        c(x0 + nx, 0.46 + ny),
        c(x0 - nx, 0.46 - ny),
        [x1 - nx * 1.4, -0.42],
        [x1 + 0.02, -0.48],
        [x1 + nx * 1.4, -0.42],
      ]);
    };
    p.color(K.red);
    ski(-0.26, 0.2);
    p.color(K.blue);
    ski(0.26, -0.2);
    p.color(K.darkGrey);
    p.poly(rrect(-0.1, 0.0, 0.1, 0.08), 0.8);
  },
};

/** Icicles along the top band's edge; a snow bank along the bottom band's (both behind). */
function edges(d, rand, { band, width, height, boxes }) {
  if (band === 'top') {
    // Icicles: ice blue in the colour map.
    d.color = K.ice;
    const ledge = [[0, 0]];
    for (let x = 0; x <= width; x += 40) ledge.push([x, 12 + rand.range(0, 8)]);
    ledge.push([width, 0]);
    d.shape(smooth(ledge), 3);
    let x = rand.range(10, 40);
    while (x < width - 20) {
      // Wide enough to colour.
      const len = rand.range(40, 90);
      const w = rand.range(24, 36);
      // None behind an element.
      if (hits({ x0: x - w / 2, y0: 14, x1: x + w / 2, y1: 14 + len }, boxes)) {
        x += rand.range(44, 90);
        continue;
      }
      d.shape(
        smooth([
          [x - w / 2, 14, true],
          [x - w * 0.3, 14 + len * 0.45],
          [x, 14 + len, true],
          [x + w * 0.25, 14 + len * 0.5],
          [x + w / 2, 14, true],
        ]),
        2.6,
      );
      x += rand.range(44, 90);
    }
  } else if (band === 'bottom') {
    const bank = [[0, height + 4]];
    for (let x = 0; x <= width; x += 120) bank.push([x, height - 30 - rand.range(0, 28)]);
    bank.push([width, height + 4]);
    d.shape(smooth(bank), 3);
  }
}

writeTheme('hiver', {
  seed: 1201,
  thumb: snowman,
  front: [igloo, snowman, firs, globe, penguin],
  middle: [mittens, mug, bonnet, snowflakeItem, firItem],
  once: [sled, skate, cabin, lantern, earmuffs, skis],
  before: edges,
});
