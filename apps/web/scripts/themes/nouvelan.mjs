/**
 * The "nouvelan" (New Year) decoration: a garland of pennants behind, champagne flutes clinking,
 * a bottle popping its cork, a disco ball, an alarm clock at midnight, party hats, fireworks
 * (bursts and rockets), streamers, confetti and sparkles.
 *
 *   node apps/web/scripts/themes/nouvelan.mjs   → apps/web/public/themes/nouvelan/*.svg
 */
import {
  arc,
  bar,
  c,
  ellipse,
  polyPath,
  rrect,
  scallop,
  smooth,
  sparkle,
  star,
  sym,
  turn,
  writeTheme,
} from './lib.mjs';
import { sparkleItem, starItem, twinkles } from './common.mjs';

const flutes = {
  w: 0.82,
  h: 1,
  tilt: 0.06,
  draw(p) {
    const glass = (cx, angle) => {
      const t = (pts) =>
        turn(
          pts.map(([x, y, k]) => (k ? [x + cx, y, true] : [x + cx, y])),
          angle,
          cx,
          0.42,
        );
      p.poly(t(bar(0, -0.03, 0, 0.4, 0.022)), 0.8);
      p.shape(t(ellipse(0, 0.41, 0.12, 0.032, 14)), 0.9);
      p.shape(
        t(
          sym([
            c(0, -0.47),
            c(0.1, -0.47),
            [0.105, -0.3],
            [0.085, -0.12],
            [0.04, -0.04],
            c(0.012, -0.02),
            c(0, -0.02),
          ]),
        ),
      );
      p.line(
        t([
          [-0.102, -0.36],
          [0, -0.345],
          [0.102, -0.36],
        ]),
        0.6,
      );
      for (const [x, y, r] of [
        [-0.03, -0.25, 0.014],
        [0.03, -0.17, 0.011],
        [-0.01, -0.1, 0.009],
        [0.04, -0.29, 0.01],
      ]) {
        p.shape(t(ellipse(x, y, r, r, 8)), 0.5);
      }
    };
    glass(-0.17, 0.27);
    glass(0.17, -0.27);
    // The clink, and bubbles rising from it.
    p.shape(sparkle(0, -0.5, 0.07), 0.7);
    for (const [x, y, r] of [
      [-0.09, -0.46, 0.018],
      [0.08, -0.47, 0.014],
      [0.12, -0.42, 0.01],
    ]) {
      p.shape(ellipse(x, y, r, r, 8), 0.5);
    }
  },
};

const bottle = {
  w: 0.34,
  h: 1,
  tilt: 0.45,
  draw(p) {
    // The cork flying off, the foam.
    p.poly(rrect(-0.04, -0.5, 0.04, -0.44, 0.012), 0.8);
    p.seg(
      [
        [-0.08, -0.47],
        [-0.12, -0.49],
      ],
      0.5,
    );
    p.seg(
      [
        [0.08, -0.47],
        [0.12, -0.49],
      ],
      0.5,
    );
    p.shape(scallop(0, -0.39, 0.06, 7, 0.25));
    p.shape(
      sym([
        c(0, -0.37),
        c(0.05, -0.37),
        [0.055, -0.22],
        [0.085, -0.1],
        [0.15, 0.02],
        c(0.155, 0.47),
        c(0, 0.49),
      ]),
    );
    // Foil on the neck, the label with its star.
    p.shape(
      sym([c(0, -0.375), c(0.056, -0.375), c(0.068, -0.17), [0.035, -0.14], c(0, -0.15)]),
      0.9,
    );
    p.poly(rrect(-0.13, 0.07, 0.13, 0.31, 0.02), 0.9);
    p.shape(star(0, 0.17, 0.065, 0.45), 0.7);
    p.seg(
      [
        [-0.08, 0.26],
        [0.08, 0.26],
      ],
      0.45,
    );
    p.line(
      [
        [-0.11, 0.0],
        [-0.12, 0.2],
        [-0.115, 0.4],
      ],
      0.5,
    );
  },
};

const disco = {
  w: 0.72,
  h: 1,
  tilt: 0.08,
  draw(p) {
    p.wire(
      [
        [0, -0.5],
        [0, -0.34],
      ],
      0.012,
      0.6,
    );
    p.poly(rrect(-0.05, -0.36, 0.05, -0.29, 0.01), 0.8);
    const r = 0.34;
    const cy = 0.07;
    p.shape(ellipse(0, cy, r, r, 24));
    // Tiles: parallels, and meridians drawn as half ellipses.
    for (let i = -3; i <= 3; i++) {
      const y = cy + i * 0.085;
      const half = Math.sqrt(r * r - (y - cy) ** 2);
      p.line(
        [
          [-half, y],
          [0, y + 0.015 * Math.sign(i || 1) * 0],
          [half, y],
        ],
        0.45,
      );
    }
    for (const k of [0.25, 0.55, 0.82]) {
      p.line(arc(0, cy, r * k, r, -Math.PI / 2, Math.PI / 2, 12), 0.45);
      p.line(arc(0, cy, r * k, r, Math.PI / 2, (Math.PI * 3) / 2, 12), 0.45);
    }
    p.shape(sparkle(-0.15, -0.04, 0.09), 0.7);
    p.shape(sparkle(0.3, -0.22, 0.08), 0.6);
  },
};

const clock = {
  w: 0.8,
  h: 1,
  tilt: 0.12,
  draw(p) {
    // Bells and hammer, legs.
    p.poly(bar(0, -0.42, 0, -0.32, 0.03), 0.7);
    p.poly(rrect(-0.06, -0.46, 0.06, -0.41, 0.015), 0.7);
    for (const s of [-1, 1]) {
      p.shape(
        turn(
          [c(-0.13, -0.33), [-0.12, -0.42], [0, -0.47], [0.12, -0.42], c(0.13, -0.33)],
          s * 0.65,
          0,
          -0.08,
        ).map(([x, y, k]) => [x, y, k]),
      );
      p.poly(bar(s * 0.2, 0.33, s * 0.3, 0.48, 0.05), 0.9);
    }
    p.shape(ellipse(0, 0.06, 0.37, 0.37, 24));
    p.shape(ellipse(0, 0.06, 0.3, 0.3, 24), 0.8);
    for (let h = 0; h < 12; h++) {
      const a = (h / 12) * Math.PI * 2;
      const long = h % 3 === 0;
      p.seg(
        [
          [Math.sin(a) * (long ? 0.22 : 0.25), 0.06 - Math.cos(a) * (long ? 0.22 : 0.25)],
          [Math.sin(a) * 0.28, 0.06 - Math.cos(a) * 0.28],
        ],
        long ? 0.7 : 0.45,
      );
    }
    // Midnight: both hands up, the minute one a hair ahead.
    p.poly([c(-0.022, 0.07), c(0, -0.12), c(0.022, 0.07)], 0.8);
    p.poly(turn([c(-0.016, 0.08), c(0, -0.2), c(0.016, 0.08)], 0.06, 0, 0.06), 0.8);
    p.shape(ellipse(0, 0.06, 0.03, 0.03, 10), 0.8);
  },
};

const partyHat = {
  w: 0.6,
  h: 1,
  tilt: 0.35,
  draw(p) {
    p.shape([c(0, -0.36), c(0.27, 0.38), [0, 0.43], c(-0.27, 0.38)]);
    const edge = (y) => (0.27 * (y + 0.36)) / 0.74;
    for (const y of [-0.12, 0.12]) {
      const x = edge(y);
      p.line(
        [
          [-x, y],
          [0, y + 0.04],
          [x, y],
        ],
        0.6,
      );
    }
    p.shape(star(0, -0.01, 0.06, 0.45), 0.6);
    for (const [x, y] of [
      [-0.1, 0.24],
      [0.09, 0.27],
      [0, 0.2],
    ])
      p.shape(ellipse(x, y, 0.025, 0.025, 8), 0.5);
    // The frill, then the pompom.
    const frill = [];
    for (let i = 0; i <= 12; i++) {
      const x = -0.3 + (0.6 * i) / 12;
      frill.push(c(x, 0.4 + (i % 2 ? 0.07 : 0) + 0.02 * (1 - (x / 0.3) ** 2)));
    }
    p.poly([...frill, c(0.27, 0.36), c(-0.27, 0.36)].reverse(), 0.8);
    p.shape(scallop(0, -0.39, 0.1, 9, 0.25));
  },
};

const burst = {
  w: 1,
  h: 1,
  tilt: 0.4,
  draw(p) {
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const [ca, sa] = [Math.cos(a), Math.sin(a)];
      const [na, nb] = [-sa * 0.025, ca * 0.025];
      p.shape(
        [
          c(ca * 0.13, sa * 0.13),
          [ca * 0.3 + na, sa * 0.3 + nb],
          c(ca * 0.4, sa * 0.4),
          [ca * 0.3 - na, sa * 0.3 - nb],
        ],
        0.7,
      );
      p.shape(ellipse(ca * 0.45, sa * 0.45, 0.03, 0.03, 8), 0.6);
      const b = a + Math.PI / 12;
      p.seg(
        [
          [Math.cos(b) * 0.2, Math.sin(b) * 0.2],
          [Math.cos(b) * 0.28, Math.sin(b) * 0.28],
        ],
        0.5,
      );
      p.dot(Math.cos(b) * 0.33, Math.sin(b) * 0.33, 0.012);
    }
    p.shape(star(0, 0, 0.1, 0.45), 0.8);
  },
};

const rocket = {
  w: 0.36,
  h: 1,
  tilt: 0.3,
  draw(p) {
    p.poly(bar(0, 0.12, 0, 0.5, 0.03), 0.8);
    for (const [x, y, r] of [
      [-0.12, 0.2, 0.05],
      [0.12, 0.24, 0.04],
      [-0.06, 0.32, 0.035],
    ])
      p.shape(sparkle(x, y, r), 0.5);
    p.poly(rrect(-0.09, -0.26, 0.09, 0.15, 0.015));
    for (const y of [-0.18, -0.06, 0.06])
      p.seg(
        [
          [-0.09, y + 0.05],
          [0.09, y - 0.03],
        ],
        0.55,
      );
    p.poly([c(-0.115, -0.25), c(0, -0.46), c(0.115, -0.25)]);
    p.wire(
      [
        [0, -0.46],
        [0.03, -0.49],
        [0.06, -0.47],
      ],
      0.01,
      0.5,
    );
  },
};

const streamer = {
  w: 0.5,
  h: 1,
  tilt: 0.4,
  draw(p) {
    const points = [];
    for (let i = 0; i <= 28; i++) {
      const t = i / 28;
      points.push([0.17 * Math.sin(t * Math.PI * 4.5) * (1 - 0.35 * t), -0.46 + 0.92 * t]);
    }
    p.wire(points, 0.06);
  },
};

const confetti = {
  w: 1,
  h: 1,
  tilt: 0.4,
  draw(p) {
    p.poly(turn(rrect(-0.38, -0.36, -0.12, -0.24, 0.02), 0.5, -0.25, -0.3), 0.8);
    p.poly(turn(rrect(0.1, 0.12, 0.36, 0.24, 0.02), -0.7, 0.23, 0.18), 0.8);
    p.shape(ellipse(0.28, -0.25, 0.08, 0.08, 10), 0.8);
    p.shape(star(-0.2, 0.25, 0.16, 0.45), 0.8);
    p.wire(
      [
        [-0.05, -0.05],
        [0.05, -0.12],
        [0.1, 0.0],
        [0.0, 0.05],
      ],
      0.04,
      0.6,
    );
  },
};

/** A garland of pennants behind everything, sagging between its hooks (horizontal bands). */
function garland(d, rand, { band, width, height }) {
  if (band === 'left' || band === 'right') return;
  const y = band === 'bottom' ? height - 70 : 18;
  const spans = Math.max(1, Math.round(width / 520));
  const span = width / spans;
  for (let s = 0; s < spans; s++) {
    const x0 = s * span;
    const sag = 34;
    const at = (t) => [x0 + span * t, y + sag * 4 * t * (1 - t)];
    const string = Array.from({ length: 13 }, (_, i) => at(i / 12));
    d.line(smooth(string, false), 2.4);
    const flags = Math.max(3, Math.round(span / 75));
    for (let f = 0; f < flags; f++) {
      const t0 = (f + 0.18) / flags;
      const t1 = (f + 0.82) / flags;
      const [ax, ay] = at(t0);
      const [bx, by] = at(t1);
      const mx = (ax + bx) / 2;
      const my = (ay + by) / 2 + 52;
      d.shape(
        polyPath([
          [ax, ay],
          [bx, by],
          [mx, my],
        ]),
        2.6,
      );
      if (f % 2)
        d.line(
          polyPath(
            [
              [ax + (mx - ax) * 0.4, ay + (my - ay) * 0.4],
              [bx + (mx - bx) * 0.4, by + (my - by) * 0.4],
            ],
            false,
          ),
          1.8,
        );
      else d.dot(mx, (ay + by) / 2 + 20, 4);
    }
  }
}

writeTheme('nouvelan', {
  seed: 301,
  thumb: flutes,
  front: [flutes, disco, clock, bottle],
  middle: [partyHat, burst, rocket, streamer, burst, partyHat],
  back: [sparkleItem, starItem, confetti, twinkles],
  before: garland,
});
