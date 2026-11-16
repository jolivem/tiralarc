/**
 * The "espace" (space) decoration: a crescent moon, a ringed planet and its moon, a cratered
 * moon, a rocket in flight, a flying saucer with its pilot, a satellite, a shooting star, a
 * constellation, stars and sparkles.
 *
 *   node apps/web/scripts/themes/espace.mjs   → apps/web/public/themes/espace/*.svg
 */
import { arc, bar, c, ellipse, rrect, sparkle, star, sym, turn, writeTheme } from './lib.mjs';
import { crescent, sparkleItem, starItem, twinkles } from './common.mjs';

const moon = {
  w: 0.62,
  h: 1,
  tilt: 0.3,
  draw(p) {
    p.shape(crescent(0.08, 0, 0.48, 0.24, -0.08, 0.4));
    for (const [x, y, r] of [
      [-0.28, -0.12, 0.05],
      [-0.22, 0.2, 0.04],
      [-0.33, 0.06, 0.03],
      [-0.1, 0.36, 0.035],
    ]) {
      p.shape(ellipse(x, y, r, r * 0.85, 10), 0.6);
      p.line(arc(x + r * 0.15, y + r * 0.1, r * 0.7, r * 0.6, 0.2, 1.8, 5), 0.4);
    }
  },
};

const planet = {
  w: 1,
  h: 0.68,
  tilt: 0.15,
  draw(p) {
    const tilt = -0.28;
    const ring = (rx, ry, a0, a1, n = 16) => turn(arc(0, 0, rx, ry, a0, a1, n), tilt);
    p.shape(turn(ellipse(0, 0, 0.5, 0.135, 28), tilt));
    p.shape(turn(ellipse(0, 0, 0.37, 0.085, 24), tilt), 0.8);
    p.shape(ellipse(0, 0, 0.29, 0.29, 24));
    for (const y of [-0.15, -0.04, 0.09]) {
      const x = Math.sqrt(0.29 ** 2 - y ** 2) - 0.004;
      p.line(
        turn(
          [
            [-x, y],
            [0, y + 0.035],
            [x, y],
          ],
          tilt,
        ),
        0.55,
      );
    }
    // The ring's near half, in front of the planet.
    p.shape([...ring(0.5, 0.135, 0, Math.PI), ...ring(0.37, 0.085, Math.PI, 0)]);
    p.line(ring(0.43, 0.108, 0.25, Math.PI - 0.25, 12), 0.45);
    p.shape(ellipse(0.38, -0.25, 0.055, 0.055, 12), 0.8);
  },
};

const crateredMoon = {
  w: 1,
  h: 1,
  tilt: 0.3,
  draw(p) {
    p.shape(ellipse(0, 0, 0.47, 0.47, 28));
    for (const [x, y, r] of [
      [-0.15, -0.18, 0.12],
      [0.19, -0.05, 0.08],
      [-0.05, 0.2, 0.1],
      [0.22, 0.24, 0.05],
      [-0.3, 0.08, 0.05],
      [0.05, -0.33, 0.045],
    ]) {
      p.shape(ellipse(x, y, r, r * 0.88, 14), 0.7);
      p.line(arc(x + r * 0.18, y + r * 0.14, r * 0.68, r * 0.6, 0.1, 1.9, 6), 0.45);
    }
    p.line(arc(0, 0, 0.4, 0.4, 2.2, 3.4, 8), 0.5);
  },
};

const rocket = {
  w: 0.52,
  h: 1,
  tilt: 0.55,
  draw(p) {
    p.shape(sym([c(0, 0.25), c(0.085, 0.28), [0.11, 0.38], [0.07, 0.45], c(0, 0.5)]));
    p.shape(sym([c(0, 0.26), c(0.045, 0.28), [0.055, 0.34], c(0, 0.41)]), 0.7);
    for (const s of [-1, 1]) {
      p.shape([
        c(s * 0.11, 0.0),
        [s * 0.22, 0.12],
        c(s * 0.25, 0.3),
        [s * 0.17, 0.25],
        c(s * 0.09, 0.2),
      ]);
    }
    p.poly([c(-0.065, 0.2), c(0.065, 0.2), c(0.085, 0.27), c(-0.085, 0.27)]);
    p.shape(
      sym([
        c(0, -0.5),
        [0.07, -0.42],
        [0.12, -0.28],
        [0.13, -0.05],
        [0.115, 0.14],
        c(0.085, 0.22),
        c(0, 0.22),
      ]),
    );
    p.line(
      [
        [-0.1, -0.36],
        [0, -0.34],
        [0.1, -0.36],
      ],
      0.6,
    );
    p.line(
      [
        [-0.128, 0.06],
        [0, 0.085],
        [0.128, 0.06],
      ],
      0.6,
    );
    for (const x of [-0.08, -0.03, 0.03, 0.08])
      p.dot(x, 0.075 + 0.008 * (1 - Math.abs(x) * 10), 0.008);
    p.shape(ellipse(0, -0.15, 0.07, 0.07, 14));
    p.shape(ellipse(0, -0.15, 0.048, 0.048, 12), 0.7);
    p.line(
      [
        [-0.025, -0.165],
        [-0.012, -0.18],
      ],
      0.5,
    );
    p.poly(bar(0, 0.0, 0, 0.27, 0.035), 0.8);
  },
};

const saucer = {
  w: 1,
  h: 0.66,
  tilt: 0.15,
  draw(p) {
    p.poly([c(-0.13, 0.08), c(0.13, 0.08), c(0.3, 0.33), c(-0.3, 0.33)], 0.7);
    for (const [x, y] of [
      [-0.12, 0.25],
      [0.1, 0.2],
      [0.02, 0.29],
    ])
      p.shape(sparkle(x, y, 0.035), 0.5);
    // The pilot under the dome.
    p.shape(sym([c(0, -0.3), [0.18, -0.26], [0.22, -0.1], c(0.22, -0.02), c(0, -0.02)]));
    p.line(
      [
        [-0.03, -0.17],
        [-0.06, -0.27],
        [-0.08, -0.29],
      ],
      0.45,
    );
    p.line(
      [
        [0.03, -0.17],
        [0.06, -0.27],
        [0.08, -0.29],
      ],
      0.45,
    );
    p.dot(-0.08, -0.29, 0.012);
    p.dot(0.08, -0.29, 0.012);
    p.shape(ellipse(0, -0.11, 0.075, 0.07, 12), 0.7);
    p.dot(-0.028, -0.12, 0.013);
    p.dot(0.028, -0.12, 0.013);
    p.line(
      [
        [-0.13, -0.24],
        [-0.15, -0.16],
        [-0.12, -0.08],
      ],
      0.5,
    );
    p.shape(ellipse(0, 0.02, 0.49, 0.12, 28));
    p.line(arc(0, -0.01, 0.4, 0.07, 0.15, Math.PI - 0.15, 14), 0.5);
    for (const x of [-0.3, -0.15, 0, 0.15, 0.3])
      p.shape(ellipse(x, 0.075 - Math.abs(x) * 0.05, 0.03, 0.022, 8), 0.6);
  },
};

const satellite = {
  w: 1,
  h: 0.62,
  tilt: 0.4,
  draw(p) {
    p.poly(bar(-0.42, 0, 0.42, 0, 0.03), 0.7);
    for (const s of [-1, 1]) {
      const [x0, x1] = s < 0 ? [-0.5, -0.17] : [0.17, 0.5];
      p.poly(rrect(x0, -0.11, x1, 0.11, 0.01));
      for (let i = 1; i < 4; i++)
        p.seg(
          [
            [x0 + ((x1 - x0) * i) / 4, -0.11],
            [x0 + ((x1 - x0) * i) / 4, 0.11],
          ],
          0.45,
        );
      p.seg(
        [
          [x0, 0],
          [x1, 0],
        ],
        0.45,
      );
    }
    p.poly(rrect(-0.11, -0.14, 0.11, 0.16, 0.02));
    p.seg(
      [
        [-0.11, 0.05],
        [0.11, 0.05],
      ],
      0.5,
    );
    p.shape(ellipse(0, -0.04, 0.04, 0.04, 10), 0.6);
    // The dish and its feed.
    p.poly(bar(0, -0.14, 0, -0.22, 0.025), 0.7);
    p.shape([c(-0.14, -0.27), [0, -0.19], c(0.14, -0.27), [0.0, -0.24]]);
    p.seg(
      [
        [0, -0.235],
        [0, -0.32],
      ],
      0.5,
    );
    p.dot(0, -0.32, 0.016);
  },
};

const shootingStar = {
  w: 1,
  h: 0.6,
  tilt: 0.2,
  draw(p) {
    const head = [0.26, -0.12];
    const tail = [-0.48, 0.25];
    for (const [off, len, width] of [
      [-0.07, 0.62, 0.06],
      [0, 0.78, 0.075],
      [0.07, 0.55, 0.05],
    ]) {
      const ang = Math.atan2(tail[1] - head[1], tail[0] - head[0]);
      const nx = -Math.sin(ang);
      const ny = Math.cos(ang);
      const sx = head[0] + nx * off;
      const sy = head[1] + ny * off;
      const ex = sx + Math.cos(ang) * len;
      const ey = sy + Math.sin(ang) * len;
      p.shape(
        [
          c(sx + (nx * width) / 2, sy + (ny * width) / 2),
          [(sx + ex) / 2 + nx * width * 0.3, (sy + ey) / 2 + ny * width * 0.3 + 0.02],
          c(ex, ey),
          [(sx + ex) / 2 - nx * width * 0.15, (sy + ey) / 2 - ny * width * 0.15 + 0.02],
          c(sx - (nx * width) / 2, sy - (ny * width) / 2),
        ],
        0.7,
      );
    }
    p.shape(star(head[0], head[1], 0.2, 0.46, 5, -Math.PI / 2 - 0.3));
    p.shape(sparkle(0.42, -0.24, 0.05), 0.6);
  },
};

const constellation = {
  w: 1,
  h: 0.66,
  tilt: 0.2,
  draw(p) {
    const stars = [
      [-0.44, -0.12],
      [-0.22, 0.06],
      [-0.02, -0.04],
      [0.16, 0.2],
      [0.4, 0.12],
      [0.36, -0.22],
      [0.06, -0.26],
    ];
    const links = [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
      [6, 2],
    ];
    for (const [a, b] of links) {
      const [x0, y0] = stars[a];
      const [x1, y1] = stars[b];
      const n = 5;
      for (let i = 0; i < n; i++) {
        const t0 = 0.12 + (0.76 * i) / n;
        const t1 = t0 + 0.07;
        p.seg(
          [
            [x0 + (x1 - x0) * t0, y0 + (y1 - y0) * t0],
            [x0 + (x1 - x0) * t1, y0 + (y1 - y0) * t1],
          ],
          0.45,
        );
      }
    }
    stars.forEach(([x, y], i) => p.shape(star(x, y, i % 3 === 0 ? 0.075 : 0.055, 0.45), 0.7));
  },
};

const smallPlanet = {
  w: 1,
  h: 0.7,
  tilt: 0.3,
  draw(p) {
    p.shape(turn(ellipse(0, 0, 0.5, 0.13, 20), -0.3));
    p.shape(ellipse(0, 0, 0.27, 0.27, 18));
    p.shape([
      ...turn(arc(0, 0, 0.5, 0.13, 0, Math.PI, 12), -0.3),
      ...turn(arc(0, 0, 0.32, 0.07, Math.PI, 0, 12), -0.3),
    ]);
  },
};

writeTheme('espace', {
  seed: 501,
  thumb: planet,
  front: [planet, rocket, saucer, crateredMoon, moon],
  middle: [shootingStar, constellation, satellite, smallPlanet, moon],
  back: [starItem, sparkleItem, twinkles, starItem, smallPlanet],
});
