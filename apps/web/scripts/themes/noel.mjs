/**
 * The "noel" (Christmas) decoration: a decorated tree in its pot, a wreath with its bow, a
 * stocking with a candy cane, presents, a reindeer, holly, baubles, candy canes, a gingerbread
 * man, stars and snowflakes.
 *
 *   node apps/web/scripts/themes/noel.mjs   → apps/web/public/themes/noel/*.svg
 */
import { arc, c, ellipse, frame, rrect, star, sym, writeTheme } from './lib.mjs';
import { snowflakeItem, sparkleItem, starItem } from './common.mjs';

const TAU = Math.PI * 2;

/** A bow: two loops, the knot, two tails. */
function bow(p, cx, cy, s, k = 0.8) {
  for (const side of [-1, 1]) {
    p.shape(
      [
        c(cx + side * 0.02 * s, cy),
        c(cx + side * 0.06 * s, cy + 0.2 * s),
        c(cx + side * 0.15 * s, cy + 0.26 * s),
        c(cx + side * 0.1 * s, cy + 0.06 * s),
      ],
      k,
    );
  }
  for (const side of [-1, 1]) {
    p.shape(
      [
        c(cx, cy),
        [cx + side * 0.12 * s, cy - 0.16 * s],
        [cx + side * 0.27 * s, cy - 0.12 * s],
        [cx + side * 0.25 * s, cy + 0.03 * s],
        [cx + side * 0.12 * s, cy + 0.05 * s],
      ],
      k,
    );
    p.line(
      [
        [cx + side * 0.05 * s, cy - 0.03 * s],
        [cx + side * 0.15 * s, cy - 0.07 * s],
        [cx + side * 0.21 * s, cy - 0.04 * s],
      ],
      k * 0.6,
    );
  }
  p.shape(ellipse(cx, cy, 0.05 * s, 0.055 * s, 10), k);
}

/** A holly leaf from (x, y) heading `angle`: spiny edges, its midrib. */
function hollyLeaf(p, x, y, angle, length, width, k = 1) {
  const at = frame(x, y, angle);
  const spikes = 4;
  const top = [];
  const bottom = [];
  for (let i = 1; i <= spikes; i++) {
    const t = i / (spikes + 0.6);
    const tm = (i - 0.5) / (spikes + 0.6);
    const w = width * Math.sin(Math.PI * Math.min(1, t * 1.05)) + width * 0.15;
    const wm = width * Math.sin(Math.PI * tm) * 0.55;
    top.push(at(length * tm, -wm), at(length * t, -w, true));
    bottom.push(at(length * tm, wm), at(length * t, w, true));
  }
  p.shape([at(0, 0, true), ...top, at(length, 0, true), ...bottom.reverse()], k);
  p.line([at(0.01, 0), at(length * 0.5, -0.01), at(length * 0.92, 0)], k * 0.55);
}

const berries = (p, list, k = 0.9) => {
  for (const [x, y, r] of list) {
    p.shape(ellipse(x, y, r, r, 14), k);
    p.line(arc(x - r * 0.15, y - r * 0.15, r * 0.55, r * 0.55, 3.6, 4.6, 4), k * 0.5);
  }
};

const holly = {
  w: 1,
  h: 0.6,
  tilt: 0.25,
  draw(p) {
    hollyLeaf(p, -0.03, 0.04, Math.PI + 0.3, 0.46, 0.13);
    hollyLeaf(p, 0.03, 0.04, -0.3, 0.46, 0.13);
    hollyLeaf(p, 0, 0.02, -Math.PI / 2 - 0.15, 0.28, 0.09, 0.9);
    berries(p, [
      [-0.06, 0.08, 0.075],
      [0.07, 0.07, 0.075],
      [0.0, 0.19, 0.075],
    ]);
  },
};

const bauble = {
  w: 0.72,
  h: 1,
  tilt: 0.25,
  draw(p) {
    p.wire(
      [
        [0, -0.32],
        [-0.04, -0.4],
        [0, -0.48],
        [0.04, -0.4],
        [0, -0.32],
      ],
      0.012,
      0.6,
    );
    p.shape(ellipse(0, 0.12, 0.35, 0.35, 26));
    p.poly(rrect(-0.08, -0.3, 0.08, -0.21, 0.015));
    for (const x of [-0.04, 0, 0.04])
      p.seg(
        [
          [x, -0.3],
          [x, -0.21],
        ],
        0.4,
      );
    for (const y of [0.0, 0.26]) {
      const half = Math.sqrt(0.35 ** 2 - (y - 0.12) ** 2) - 0.004;
      p.line(
        [
          [-half, y],
          [0, y + 0.045],
          [half, y],
        ],
        0.6,
      );
    }
    for (let i = 0; i < 5; i++) {
      const x = -0.24 + i * 0.12;
      p.shape(star(x, 0.15 + 0.02 * (1 - (x / 0.3) ** 2), 0.045, 0.45), 0.5);
    }
    p.line(arc(0, 0.12, 0.28, 0.28, 3.5, 4.3, 6), 0.5);
  },
};

const tree = {
  w: 0.8,
  h: 1,
  tilt: 0.04,
  draw(p) {
    p.poly(rrect(-0.06, 0.28, 0.06, 0.4, 0.01));
    p.poly([c(-0.17, 0.36), c(0.17, 0.36), c(0.13, 0.5), c(-0.13, 0.5)]);
    p.poly(rrect(-0.19, 0.34, 0.19, 0.4, 0.01), 0.8);
    const tier = (top, bottom, half) => {
      const edge = [];
      const n = 5;
      for (let i = 0; i <= n; i++) {
        const x = half - (2 * half * i) / n;
        edge.push(c(x, bottom));
        if (i < n) edge.push([x - half / n, bottom + 0.04]);
      }
      p.shape([c(0, top), ...edge]);
    };
    tier(-0.04, 0.3, 0.38);
    tier(-0.22, 0.12, 0.3);
    tier(-0.38, -0.07, 0.22);
    // Garlands, baubles, the star.
    p.line(
      [
        [-0.24, 0.15],
        [0.0, 0.24],
        [0.27, 0.17],
      ],
      0.55,
    );
    p.line(
      [
        [-0.18, -0.03],
        [0.02, 0.06],
        [0.2, -0.0],
      ],
      0.55,
    );
    for (const [x, y] of [
      [-0.3, 0.3],
      [0.3, 0.3],
      [-0.08, 0.3],
      [0.12, 0.13],
      [-0.2, 0.12],
      [0.05, -0.07],
      [-0.12, -0.08],
    ]) {
      p.shape(ellipse(x, y + 0.035, 0.035, 0.035, 10), 0.6);
    }
    p.shape(star(0, -0.41, 0.09, 0.45));
  },
};

const wreath = {
  w: 1,
  h: 1,
  tilt: 0.06,
  draw(p) {
    p.shape(ellipse(0, -0.02, 0.43, 0.43, 28));
    p.shape(ellipse(0, -0.02, 0.22, 0.22, 22), 0.8);
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * TAU;
      const r = i % 2 ? 0.27 : 0.36;
      const at = frame(
        Math.cos(a) * r,
        -0.02 + Math.sin(a) * r,
        a + Math.PI / 2 + (i % 2 ? 0.5 : -0.5),
      );
      p.shape(
        [
          at(-0.09, 0, true),
          at(-0.03, -0.045),
          at(0.05, -0.04),
          at(0.1, 0, true),
          at(0.05, 0.04),
          at(-0.03, 0.045),
        ],
        0.6,
      );
      p.line([at(-0.07, 0), at(0.08, 0)], 0.35);
    }
    berries(
      p,
      [
        [-0.3, -0.24, 0.035],
        [-0.26, -0.29, 0.03],
        [0.32, -0.18, 0.035],
        [0.0, -0.4, 0.033],
        [0.05, -0.37, 0.03],
      ],
      0.6,
    );
    bow(p, 0, 0.3, 0.95);
  },
};

const stocking = {
  w: 0.72,
  h: 1,
  tilt: 0.12,
  draw(p) {
    p.shape([
      c(-0.24, -0.3),
      c(0.12, -0.3),
      [0.12, 0.05],
      [0.24, 0.16],
      [0.34, 0.32],
      [0.26, 0.46],
      [0.04, 0.46],
      [-0.16, 0.34],
      [-0.24, 0.12],
    ]);
    p.line(
      [
        [0.19, 0.13],
        [0.15, 0.3],
        [0.22, 0.465],
      ],
      0.6,
    );
    p.line(
      [
        [-0.24, 0.12],
        [-0.14, 0.18],
        [-0.06, 0.32],
        [-0.12, 0.39],
      ],
      0.6,
    );
    p.shape(star(-0.03, 0.06, 0.07, 0.45), 0.6);
    const cuff = [];
    for (let i = 0; i <= 8; i++) cuff.push([-0.28 + (0.44 * i) / 8, i % 2 ? -0.13 : -0.15]);
    p.shape([c(-0.28, -0.4), [-0.06, -0.42], c(0.16, -0.4), ...cuff.slice().reverse()]);
    p.line(
      [
        [-0.2, -0.33],
        [-0.18, -0.28],
      ],
      0.4,
    );
    p.line(
      [
        [0.0, -0.36],
        [0.02, -0.31],
      ],
      0.4,
    );
    p.line(
      [
        [0.1, -0.26],
        [0.12, -0.21],
      ],
      0.4,
    );
  },
};

const gift = {
  w: 0.9,
  h: 1,
  tilt: 0.06,
  draw(p) {
    // A smaller one behind.
    p.poly(rrect(0.08, 0.04, 0.44, 0.48, 0.01));
    p.poly(rrect(0.05, -0.04, 0.47, 0.06, 0.01));
    p.poly(rrect(0.23, -0.04, 0.3, 0.48, 0.005), 0.8);
    p.poly(rrect(-0.44, -0.12, 0.2, 0.48, 0.01));
    p.poly(rrect(-0.48, -0.24, 0.24, -0.1, 0.012));
    p.poly(rrect(-0.16, -0.24, -0.08, 0.48, 0.005));
    p.poly(rrect(-0.44, 0.16, 0.2, 0.24, 0.005));
    bow(p, -0.12, -0.27, 0.8);
  },
};

const reindeer = {
  w: 0.92,
  h: 1,
  tilt: 0.1,
  draw(p) {
    for (const s of [-1, 1]) {
      const m = (pts) => pts.map(([x, y]) => [x * s, y]);
      p.branch(
        m([
          [0.08, -0.12],
          [0.16, -0.26],
          [0.27, -0.38],
          [0.32, -0.48],
        ]),
        0.06,
        0.03,
        0.85,
      );
      p.branch(
        m([
          [0.14, -0.22],
          [0.08, -0.33],
          [0.06, -0.42],
        ]),
        0.045,
        0.025,
        0.8,
      );
      p.branch(
        m([
          [0.24, -0.33],
          [0.36, -0.34],
          [0.44, -0.38],
        ]),
        0.04,
        0.022,
        0.8,
      );
      const at = frame(s * 0.15, -0.1, s > 0 ? -0.35 : Math.PI + 0.35);
      p.shape(
        [
          at(0, 0, true),
          at(0.07, -0.05),
          at(0.17, -0.03),
          at(0.21, 0, true),
          at(0.15, 0.04),
          at(0.06, 0.05),
        ],
        0.85,
      );
    }
    p.shape(sym([c(0, -0.2), [0.14, -0.18], [0.18, -0.04], [0.14, 0.16], [0.11, 0.3], c(0, 0.38)]));
    p.shape(sym([c(0, 0.1), [0.1, 0.13], [0.13, 0.25], [0.09, 0.36], c(0, 0.4)]), 0.7);
    for (const s of [-1, 1]) {
      p.shape(ellipse(s * 0.07, -0.04, 0.03, 0.038, 10), 0.6);
      p.dot(s * 0.07, -0.03, 0.017);
      p.shape(ellipse(s * 0.12, 0.07, 0.035, 0.022, 8), 0.45);
    }
    p.shape(ellipse(0, 0.33, 0.085, 0.075, 14));
    p.line(arc(-0.02, 0.31, 0.04, 0.035, 3.6, 4.6, 4), 0.45);
    p.line(
      [
        [-0.05, 0.2],
        [0, 0.23],
        [0.05, 0.2],
      ],
      0.45,
    );
  },
};

const candyCane = {
  w: 0.42,
  h: 1,
  tilt: 0.4,
  draw(p) {
    const cane = p.branch(
      [
        [0.06, 0.48],
        [0.06, -0.18],
        [0.04, -0.33],
        [-0.03, -0.42],
        [-0.12, -0.41],
        [-0.17, -0.33],
        [-0.17, -0.26],
      ],
      0.1,
      0.1,
    );
    const stripes = 11;
    for (let i = 1; i < stripes; i++) {
      const s = cane.spine[Math.floor((i * (cane.spine.length - 1)) / stripes)];
      const [nx, ny] = [-Math.sin(s.angle), Math.cos(s.angle)];
      const [tx, ty] = [Math.cos(s.angle), Math.sin(s.angle)];
      const h = s.width * 0.48;
      const slant = h * 0.8;
      p.raw.line(
        [
          [s.x - nx * h - tx * slant, s.y - ny * h - ty * slant],
          [s.x + nx * h + tx * slant, s.y + ny * h + ty * slant],
        ],
        0.6,
      );
    }
  },
};

const gingerbread = {
  w: 0.84,
  h: 1,
  tilt: 0.2,
  draw(p) {
    p.shape(
      sym([
        [0, -0.48],
        [0.13, -0.45],
        [0.17, -0.33],
        c(0.1, -0.22),
        [0.3, -0.2],
        [0.41, -0.13],
        [0.37, -0.04],
        c(0.17, -0.04),
        [0.19, 0.16],
        [0.3, 0.38],
        [0.24, 0.48],
        [0.13, 0.45],
        c(0.0, 0.25),
      ]),
    );
    for (const s of [-1, 1]) {
      p.seg(
        [
          [s * 0.27, -0.17],
          [s * 0.3, -0.12],
          [s * 0.33, -0.17],
          [s * 0.36, -0.12],
        ].map(([x, y]) => [x, y]),
        0.5,
      );
      p.seg(
        [
          [s * 0.17, 0.33],
          [s * 0.21, 0.31],
          [s * 0.2, 0.37],
          [s * 0.25, 0.35],
        ],
        0.5,
      );
      p.dot(s * 0.055, -0.36, 0.018);
    }
    p.line(
      [
        [-0.06, -0.3],
        [0, -0.27],
        [0.06, -0.3],
      ],
      0.5,
    );
    for (const y of [-0.08, 0.04, 0.16]) p.shape(ellipse(0, y, 0.032, 0.032, 10), 0.6);
    p.shape(
      [c(0, -0.2), [-0.07, -0.25], [-0.08, -0.17], c(0, -0.2), [0.08, -0.17], [0.07, -0.25]],
      0.6,
    );
  },
};

writeTheme('noel', {
  seed: 1101,
  thumb: tree,
  front: [tree, wreath, stocking, gift, reindeer],
  middle: [holly, bauble, candyCane, gingerbread, bauble, holly],
  back: [starItem, snowflakeItem, sparkleItem, holly],
});
