/**
 * The "fruits" decoration, a still life along the band: a watermelon slice, a pineapple, a bunch
 * of grapes, an orange and its slice, strawberries, cherries, an apple, a pear, a kiwi, a lemon.
 *
 *   node apps/web/scripts/themes/fruits.mjs   → apps/web/public/themes/fruits/*.svg
 */
import { arc, c, ellipse, frame, sym, turn, writeTheme } from './lib.mjs';
import { apple } from './common.mjs';

const TAU = Math.PI * 2;

/** A pointed leaf from (x, y) heading `angle`, with its midrib and a vein or two. */
function leaf(p, x, y, angle, length, k = 0.85) {
  const at = frame(x, y, angle);
  p.shape(
    [
      at(0, 0, true),
      at(length * 0.3, -length * 0.22),
      at(length * 0.72, -length * 0.17),
      at(length, 0, true),
      at(length * 0.7, length * 0.18),
      at(length * 0.3, length * 0.21),
    ],
    k,
  );
  p.line([at(length * 0.04, 0), at(length * 0.5, -length * 0.02), at(length * 0.9, 0)], k * 0.55);
  for (const t of [0.35, 0.6]) {
    p.line([at(length * t, -length * 0.015), at(length * (t + 0.12), -length * 0.12)], k * 0.45);
    p.line([at(length * t, length * 0.01), at(length * (t + 0.12), length * 0.12)], k * 0.45);
  }
}

/** Where the line through (ox, oy) heading `angle` crosses an ellipse: its chord, or null. */
function chord(cx, cy, rx, ry, ox, oy, angle) {
  const [dx, dy] = [Math.cos(angle), Math.sin(angle)];
  const [px, py] = [(ox - cx) / rx, (oy - cy) / ry];
  const [qx, qy] = [dx / rx, dy / ry];
  const a = qx * qx + qy * qy;
  const b = 2 * (px * qx + py * qy);
  const k = px * px + py * py - 1;
  const disc = b * b - 4 * a * k;
  if (disc <= 0) return null;
  const t0 = (-b - Math.sqrt(disc)) / (2 * a);
  const t1 = (-b + Math.sqrt(disc)) / (2 * a);
  return [
    [ox + dx * t0, oy + dy * t0],
    [ox + dx * t1, oy + dy * t1],
  ];
}

const watermelon = {
  w: 1,
  h: 0.6,
  tilt: 0.12,
  draw(p) {
    const half = (r, ry) => [
      c(-r, -0.26),
      ...arc(0, -0.26, r, ry, Math.PI, 0, 18).slice(1, -1),
      c(r, -0.26),
    ];
    p.shape(half(0.49, 0.55));
    p.shape(half(0.445, 0.5), 0.7);
    p.shape(half(0.4, 0.45), 0.8);
    for (const [x, y] of [
      [-0.24, -0.15],
      [-0.08, -0.12],
      [0.1, -0.16],
      [0.26, -0.13],
      [-0.16, 0.0],
      [0.02, 0.02],
      [0.18, 0.0],
      [-0.04, 0.12],
      [0.1, 0.12],
    ]) {
      const a = Math.atan2(y + 0.26, x) + Math.PI;
      const at = frame(x, y, a);
      p.shape([at(-0.028, 0, true), at(0, -0.016), at(0.022, 0), at(0, 0.016)], 0.5);
    }
  },
};

const pineapple = {
  w: 0.58,
  h: 1,
  tilt: 0.12,
  draw(p) {
    // The crown: stiff leaves fanning out, the middle ones in front.
    for (const [a, l, w] of [
      [-2.35, 0.24, 0.05],
      [-0.8, 0.24, 0.05],
      [-2.0, 0.32, 0.055],
      [-1.15, 0.32, 0.055],
      [-1.75, 0.38, 0.06],
      [-1.4, 0.38, 0.06],
      [-1.57, 0.4, 0.06],
    ]) {
      const at = frame(0, -0.1, a);
      p.shape(
        [
          at(0, -w, true),
          at(l * 0.5, -w * 0.7),
          at(l, 0, true),
          at(l * 0.5, w * 0.7),
          at(0, w, true),
        ],
        0.8,
      );
      p.line([at(0.04, 0), at(l * 0.7, 0)], 0.4);
    }
    const [cx, cy, rx, ry] = [0, 0.2, 0.25, 0.3];
    p.shape(ellipse(cx, cy, rx, ry, 24));
    for (const angle of [0.75, -0.75]) {
      for (let o = -0.36; o <= 0.36; o += 0.09) {
        const n = [-Math.sin(angle), Math.cos(angle)];
        const seg = chord(cx, cy, rx - 0.004, ry - 0.004, cx + n[0] * o, cy + n[1] * o, angle);
        if (seg)
          p.line(
            [seg[0], [(seg[0][0] + seg[1][0]) / 2, (seg[0][1] + seg[1][1]) / 2 + 0.01], seg[1]],
            0.5,
          );
      }
    }
  },
};

const grapes = {
  w: 0.7,
  h: 1,
  tilt: 0.15,
  draw(p) {
    p.wire(
      [
        [0.0, -0.3],
        [0.02, -0.42],
        [0.06, -0.5],
      ],
      0.035,
    );
    p.wire(
      Array.from({ length: 16 }, (_, i) => {
        const a = i * 0.7;
        const r = 0.06 - i * 0.003;
        return [-0.18 + Math.cos(a) * r - i * 0.008, -0.38 + Math.sin(a) * r];
      }),
      0.01,
      0.5,
    );
    // A vine leaf: five lobes, veins to each.
    const lobes = [];
    for (let i = 0; i <= 10; i++) {
      const a = -Math.PI / 2 - 1.5 + (i / 10) * 3;
      const r = i % 2 ? 0.1 : 0.16;
      lobes.push(i % 2 ? [Math.cos(a) * r, Math.sin(a) * r] : c(Math.cos(a) * r, Math.sin(a) * r));
    }
    const leafAt = (pts) =>
      turn(pts, 0.9).map(([x, y, k]) => (k ? [x + 0.17, y - 0.36, true] : [x + 0.17, y - 0.36]));
    p.shape(leafAt([c(0, 0.03), ...lobes]), 0.8);
    for (let i = 0; i <= 10; i += 2) {
      const a = -Math.PI / 2 - 1.5 + (i / 10) * 3;
      p.line(
        leafAt([
          [0, 0.02],
          [Math.cos(a) * 0.12, Math.sin(a) * 0.12],
        ]),
        0.4,
      );
    }
    const rows = [
      [-0.27, 4],
      [-0.12, 4],
      [0.03, 4],
      [0.17, 3],
      [0.3, 2],
      [0.42, 1],
    ];
    for (const [y, n] of rows) {
      for (let i = 0; i < n; i++) {
        const x = (i - (n - 1) / 2) * 0.15 + ((y * 37) % 0.02);
        p.shape(ellipse(x, y, 0.085, 0.08, 14), 0.9);
        p.line(arc(x - 0.01, y - 0.01, 0.05, 0.045, 3.6, 4.4, 4), 0.45);
      }
    }
  },
};

const orange = {
  w: 1,
  h: 0.8,
  tilt: 0.1,
  draw(p) {
    // The whole fruit behind, its stalk and leaf, its dimpled skin.
    p.shape(ellipse(-0.18, -0.02, 0.32, 0.32, 24));
    for (let i = 0; i < 14; i++) {
      const a = i * 2.4;
      const r = 0.06 + ((i * 37) % 20) / 100;
      p.dot(-0.18 + Math.cos(a) * r, -0.02 + Math.sin(a) * r, 0.007);
    }
    leaf(p, -0.17, -0.33, -0.5, 0.2);
    p.shape(ellipse(-0.18, -0.33, 0.025, 0.02, 8), 0.7);
    // The slice in front: rind, pith, segments.
    const [cx, cy] = [0.22, 0.12];
    p.shape(ellipse(cx, cy, 0.27, 0.27, 24));
    p.shape(ellipse(cx, cy, 0.23, 0.23, 22), 0.7);
    for (let i = 0; i < 9; i++) {
      const a0 = (i / 9) * TAU + 0.04;
      const a1 = ((i + 1) / 9) * TAU - 0.04;
      const mid = (a0 + a1) / 2;
      p.shape(
        [
          c(cx + Math.cos(mid) * 0.03, cy + Math.sin(mid) * 0.03),
          ...arc(cx, cy, 0.2, 0.2, a0, a1, 4).map(([x, y], j, all) =>
            j === 0 || j === all.length - 1 ? c(x, y) : [x, y],
          ),
        ],
        0.6,
      );
    }
  },
};

const strawberry = {
  w: 0.68,
  h: 1,
  tilt: 0.3,
  draw(p) {
    p.wire(
      [
        [0, -0.3],
        [0.02, -0.42],
        [0.06, -0.5],
      ],
      0.03,
    );
    p.shape(
      sym([c(0, -0.24), [0.18, -0.28], [0.31, -0.17], [0.31, 0.03], [0.2, 0.28], c(0, 0.47)]),
    );
    for (const [x, y] of [
      [-0.18, -0.1],
      [0, -0.13],
      [0.18, -0.1],
      [-0.1, 0.03],
      [0.1, 0.03],
      [-0.2, 0.08],
      [0.2, 0.08],
      [0, 0.14],
      [-0.1, 0.24],
      [0.1, 0.24],
      [0, 0.35],
    ]) {
      p.shape(ellipse(x, y, 0.016, 0.026, 8), 0.45);
    }
    // The calyx: pointed sepals spread over the shoulders.
    const sepals = [];
    for (let i = 0; i < 7; i++) {
      const a = Math.PI + 0.15 + (i / 6) * (Math.PI - 0.3);
      const r = i % 2 ? 0.2 : 0.26;
      sepals.push(c(Math.cos(a) * r, -0.24 + Math.sin(a) * r * -0.55 + 0.04));
      if (i < 6) {
        const b = a + (Math.PI - 0.3) / 12;
        sepals.push([Math.cos(b) * 0.08, -0.24 + Math.sin(b) * -0.03 + 0.03]);
      }
    }
    p.shape([c(-0.06, -0.26), ...sepals, c(0.06, -0.26)], 0.8);
  },
};

const cherries = {
  w: 0.7,
  h: 1,
  tilt: 0.25,
  draw(p) {
    p.wire(
      [
        [-0.15, 0.17],
        [-0.12, -0.05],
        [0.0, -0.3],
        [0.06, -0.4],
      ],
      0.025,
    );
    p.wire(
      [
        [0.17, 0.12],
        [0.14, -0.1],
        [0.08, -0.3],
        [0.06, -0.4],
      ],
      0.025,
    );
    leaf(p, 0.06, -0.4, -0.3, 0.28);
    for (const [x, y] of [
      [-0.16, 0.31],
      [0.17, 0.26],
    ]) {
      p.shape(
        sym([
          c(x, y - 0.13),
          [x + 0.1, y - 0.16],
          [x + 0.17, y - 0.04],
          [x + 0.13, y + 0.12],
          [x + 0.03, y + 0.18],
          c(x, y + 0.18),
        ]).map(([px, py, k]) => [px, py, k]),
      );
      p.line(arc(x - 0.06, y - 0.03, 0.06, 0.06, 3.5, 4.5, 5), 0.5);
    }
  },
};

const pear = {
  w: 0.66,
  h: 1,
  tilt: 0.2,
  draw(p) {
    p.wire(
      [
        [0, -0.3],
        [0.02, -0.42],
        [0.0, -0.5],
      ],
      0.035,
    );
    leaf(p, 0.01, -0.42, -0.5, 0.22);
    p.shape(
      sym([
        c(0, -0.32),
        [0.09, -0.3],
        [0.13, -0.14],
        [0.24, 0.06],
        [0.31, 0.25],
        [0.25, 0.42],
        c(0, 0.48),
      ]),
    );
    p.line(
      [
        [-0.2, 0.12],
        [-0.23, 0.25],
        [-0.18, 0.36],
      ],
      0.55,
    );
    for (const [x, y] of [
      [0.1, 0.1],
      [0.15, 0.3],
      [-0.05, 0.36],
    ])
      p.dot(x, y, 0.008);
  },
};

const kiwi = {
  w: 1,
  h: 0.8,
  tilt: 0.25,
  draw(p) {
    p.shape(ellipse(0, 0, 0.47, 0.39, 26));
    p.shape(ellipse(0, 0, 0.42, 0.34, 26), 0.7);
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * TAU;
      p.line(
        [
          [Math.cos(a) * 0.19, Math.sin(a) * 0.15],
          [Math.cos(a) * 0.37, Math.sin(a) * 0.3],
        ],
        0.35,
      );
    }
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * TAU + 0.1;
      const at = frame(Math.cos(a) * 0.25, Math.sin(a) * 0.2, a);
      p.shape([at(-0.028, 0, true), at(0, -0.014), at(0.022, 0), at(0, 0.014)], 0.45);
    }
    p.shape(ellipse(0, 0, 0.16, 0.12, 18), 0.7);
  },
};

const lemon = {
  w: 1,
  h: 0.66,
  tilt: 0.3,
  draw(p) {
    leaf(p, 0.36, -0.12, -0.9, 0.28);
    p.shape([
      c(-0.48, 0.04),
      [-0.4, -0.14],
      [-0.15, -0.26],
      [0.15, -0.25],
      [0.37, -0.14],
      c(0.46, -0.03),
      [0.38, 0.12],
      [0.15, 0.24],
      [-0.15, 0.24],
      [-0.38, 0.17],
    ]);
    p.line(
      [
        [-0.25, -0.12],
        [-0.08, -0.18],
        [0.1, -0.17],
      ],
      0.5,
    );
    for (const [x, y] of [
      [-0.2, 0.05],
      [0, -0.02],
      [0.18, 0.06],
      [0.05, 0.14],
    ])
      p.dot(x, y, 0.007);
  },
};

writeTheme('fruits', {
  seed: 701,
  thumb: watermelon,
  front: [watermelon, pineapple, grapes, orange, apple],
  middle: [cherries, strawberry, pear, kiwi, lemon, apple, strawberry],
  back: [cherries, strawberry, lemon],
});
