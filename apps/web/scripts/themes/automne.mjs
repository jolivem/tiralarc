/**
 * The "automne" (autumn) decoration: maple and oak leaves (falling, far away), acorns,
 * toadstools in the grass, a hedgehog carrying a leaf, an umbrella in the rain, a rain cloud, a
 * knitted hat.
 *
 *   node apps/web/scripts/themes/automne.mjs   → apps/web/public/themes/automne/*.svg
 */
import { c, ellipse, frame, hatch, sym, writeTheme } from './lib.mjs';
import { bonnet, cloudItem, drop } from './common.mjs';

const maple = {
  w: 1,
  h: 1,
  tilt: 0.6,
  draw(p) {
    p.wire(
      [
        [0, 0.14],
        [0.01, 0.32],
        [0.05, 0.5],
      ],
      0.03,
      0.7,
    );
    p.shape(
      sym([
        c(0, -0.48),
        c(0.05, -0.37),
        c(0.1, -0.41),
        c(0.09, -0.29),
        c(0.15, -0.3),
        c(0.08, -0.13),
        c(0.2, -0.22),
        c(0.23, -0.31),
        c(0.29, -0.25),
        c(0.38, -0.35),
        c(0.47, -0.31),
        c(0.4, -0.2),
        c(0.44, -0.14),
        c(0.31, -0.06),
        c(0.36, 0.0),
        c(0.16, 0.03),
        c(0.28, 0.1),
        c(0.37, 0.2),
        c(0.24, 0.18),
        c(0.18, 0.24),
        c(0.12, 0.15),
        c(0, 0.16),
      ]),
    );
    for (const [x, y] of [
      [0, -0.42],
      [0.42, -0.28],
      [-0.42, -0.28],
      [0.33, 0.17],
      [-0.33, 0.17],
    ]) {
      p.line(
        [
          [0, 0.13],
          [x * 0.5, y * 0.5 + 0.06],
          [x * 0.88, y * 0.88],
        ],
        0.5,
      );
    }
  },
};

const oak = {
  w: 0.62,
  h: 1,
  tilt: 0.6,
  draw(p) {
    p.wire(
      [
        [0, 0.3],
        [0.01, 0.42],
        [0.03, 0.5],
      ],
      0.03,
      0.7,
    );
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
    p.shape([c(-0.48, 0.48), ...grass, c(0.48, 0.48)], 0.8);
  },
};

const hedgehog = {
  w: 1,
  h: 0.66,
  tilt: 0.05,
  draw(p) {
    for (const x of [-0.2, 0.02, 0.2]) p.shape(ellipse(x, 0.27, 0.06, 0.04, 10), 0.7);
    // The coat: spines all over its back.
    const spines = [];
    const n = 15;
    for (let i = 0; i <= n; i++) {
      const a = Math.PI + 0.05 + (i / n) * (Math.PI - 0.25);
      const r = i % 2 ? 0.27 : 0.36;
      const pt = [0.08 + Math.cos(a) * r * 1.2, 0.13 + Math.sin(a) * r];
      spines.push(i % 2 ? pt : c(...pt));
    }
    p.shape([c(-0.3, 0.25), ...spines, c(0.38, 0.12), [0.34, 0.24], c(0.2, 0.27)]);
    for (const [x, y] of [
      [-0.1, -0.05],
      [0.08, -0.12],
      [0.2, 0.0],
      [-0.04, 0.08],
    ])
      p.line(
        [
          [x, y],
          [x - 0.04, y - 0.06],
        ],
        0.45,
      );
    // Its face, pointed nose forward.
    p.shape([
      c(-0.24, -0.04),
      [-0.32, 0.0],
      [-0.44, 0.09],
      c(-0.49, 0.13),
      [-0.42, 0.2],
      [-0.3, 0.26],
      c(-0.18, 0.25),
      [-0.15, 0.1],
    ]);
    p.shape(ellipse(-0.48, 0.13, 0.03, 0.03, 8), 0.7);
    p.dot(-0.33, 0.07, 0.018);
    p.line(
      [
        [-0.42, 0.18],
        [-0.37, 0.2],
        [-0.33, 0.18],
      ],
      0.45,
    );
    p.shape(ellipse(-0.28, 0.17, 0.035, 0.022, 8), 0.45);
    // A leaf caught on its spines.
    const at = frame(0.02, -0.2, -0.4);
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
    for (const [x, y, h] of [
      [-0.4, 0.2, 0.1],
      [0.42, 0.28, 0.09],
      [-0.3, 0.42, 0.08],
      [0.32, 0.46, 0.07],
    ])
      p.shape(drop(x, y, h), 0.7);
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
    p.poly([c(-0.012, -0.38), c(0.012, -0.38), c(0.008, -0.46), c(-0.008, -0.46)], 0.7);
  },
};

const rainCloud = {
  w: 1,
  h: 0.84,
  tilt: 0.05,
  draw(p) {
    for (const [x, y, h] of [
      [-0.25, 0.22, 0.12],
      [0.0, 0.3, 0.14],
      [0.25, 0.22, 0.12],
      [-0.12, 0.4, 0.1],
      [0.14, 0.4, 0.1],
    ])
      p.shape(drop(x, y, h), 0.7);
    const cloud = cloudItem;
    const shift = (points) => points.map(([x, y, k]) => (k ? [x, y - 0.12, true] : [x, y - 0.12]));
    cloud.draw({
      ...p,
      shape: (pts, k) => p.shape(shift(pts), k),
      line: (pts, k) => p.line(shift(pts), k),
    });
  },
};

writeTheme('automne', {
  seed: 1001,
  thumb: maple,
  front: [maple, umbrella, toadstools, hedgehog, bonnet],
  middle: [oak, acorn, rainCloud, maple, bonnet, acorn],
  back: [maple, oak, acorn, maple],
});
