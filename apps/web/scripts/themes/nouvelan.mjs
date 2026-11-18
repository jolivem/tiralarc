/**
 * The "nouvelan" (New Year) decoration: a garland of pennants behind, champagne flutes clinking,
 * a bottle popping its cork, a disco ball, an alarm clock at midnight, party hats, fireworks
 * (bursts and rockets), streamers; once each: balloons, a party horn, a mask, a cake, an
 * hourglass, the calendar's first page.
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
import { K } from './common.mjs';

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
      p.color('#e7f5ff');
      p.poly(t(bar(0, -0.03, 0, 0.4, 0.022)), 0.8);
      p.shape(t(ellipse(0, 0.41, 0.12, 0.032, 14)), 0.9);
      p.color('#ffe066');
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
        p.color(K.cream);
        p.shape(t(ellipse(x, y, r, r, 8)), 0.5);
      }
    };
    glass(-0.17, 0.27);
    glass(0.17, -0.27);
    // The clink, and bubbles rising from it.
    p.color(K.gold);
    p.shape(sparkle(0, -0.5, 0.07), 0.7);
    p.color(K.cream);
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
    p.color(K.lightWood);
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
    p.color(null);
    p.shape(scallop(0, -0.39, 0.06, 7, 0.25));
    p.color('#2b8a3e');
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
    p.color(K.gold);
    p.shape(
      sym([c(0, -0.375), c(0.056, -0.375), c(0.068, -0.17), [0.035, -0.14], c(0, -0.15)]),
      0.9,
    );
    p.color(K.cream);
    p.poly(rrect(-0.13, 0.07, 0.13, 0.31, 0.02), 0.9);
    p.color(K.gold);
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
  color: K.silver,
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
    p.color(K.gold);
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
    p.color(K.gold);
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
      p.color(K.darkGrey);
      p.poly(bar(s * 0.2, 0.33, s * 0.3, 0.48, 0.05), 0.9);
      p.color(K.gold);
    }
    p.color(K.red);
    p.shape(ellipse(0, 0.06, 0.37, 0.37, 24));
    p.color(null);
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
    p.color(K.black);
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
    p.color(K.violet);
    p.shape([c(0, -0.36), c(0.27, 0.38), [0, 0.43], c(-0.27, 0.38)]);
    const edge = (y) => (0.27 * (y + 0.36)) / 0.74;
    // The middle band, between the two lines.
    p.tint(
      [
        [-edge(-0.12), -0.12],
        [0, -0.08],
        [edge(-0.12), -0.12],
        [edge(0.12), 0.12],
        [0, 0.16],
        [-edge(0.12), 0.12],
      ],
      K.pink,
    );
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
    p.color(K.gold);
    p.shape(star(0, -0.01, 0.06, 0.45), 0.6);
    p.color(K.yellow);
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
    p.color(K.gold);
    p.poly([...frill, c(0.27, 0.36), c(-0.27, 0.36)].reverse(), 0.8);
    p.color(K.pink);
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
      p.color([K.pink, K.blue, K.gold][i % 3]);
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
    p.color(K.gold);
    p.shape(star(0, 0, 0.1, 0.45), 0.8);
  },
};

const rocket = {
  w: 0.36,
  h: 1,
  tilt: 0.3,
  draw(p) {
    p.color(K.lightWood);
    p.poly(bar(0, 0.12, 0, 0.5, 0.03), 0.8);
    p.color(K.gold);
    for (const [x, y, r] of [
      [-0.12, 0.2, 0.05],
      [0.12, 0.24, 0.04],
      [-0.06, 0.32, 0.035],
    ])
      p.shape(sparkle(x, y, r), 0.5);
    p.color(K.red);
    p.poly(rrect(-0.09, -0.26, 0.09, 0.15, 0.015));
    for (const y of [-0.18, -0.06, 0.06])
      p.seg(
        [
          [-0.09, y + 0.05],
          [0.09, y - 0.03],
        ],
        0.55,
      );
    p.color(K.blue);
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
  color: K.teal,
  draw(p) {
    const points = [];
    for (let i = 0; i <= 28; i++) {
      const t = i / 28;
      points.push([0.17 * Math.sin(t * Math.PI * 4.5) * (1 - 0.35 * t), -0.46 + 0.92 * t]);
    }
    p.wire(points, 0.06);
  },
};

// ------------------------------------------------ shown once in the whole decoration

/** Three balloons on their strings. */
const balloons = {
  w: 0.8,
  h: 1,
  tilt: 0.12,
  draw(p) {
    const list = [
      [-0.17, -0.2],
      [0.17, -0.24],
      [0.0, -0.06],
    ];
    for (const [x, y] of list)
      p.line(
        [
          [x, y + 0.2],
          [x * 0.5, y + 0.4],
          [0, 0.48],
        ],
        0.5,
      );
    list.forEach(([x, y], i) => {
      p.color([K.red, K.blue, K.yellow][i]);
      p.poly([c(x, y + 0.17), c(x + 0.04, y + 0.22), c(x - 0.04, y + 0.22)], 0.7);
      p.shape(ellipse(x, y, 0.16, 0.19, 22));
      p.line(
        [
          [x - 0.09, y - 0.06],
          [x - 0.06, y - 0.12],
          [x - 0.01, y - 0.14],
        ],
        0.5,
      );
    });
  },
};

/** A party horn, its paper tongue unrolled. */
const partyHorn = {
  w: 1,
  h: 0.6,
  tilt: 0.3,
  draw(p) {
    const tongue = [];
    for (let i = 0; i <= 24; i++) {
      const t = i / 24;
      const a = t * Math.PI * 2.6;
      const r = 0.2 * (1 - t * 0.7);
      tongue.push([0.06 + t * 0.26 + Math.sin(a) * r * 0.4, -Math.cos(a) * r + r * 0.2]);
    }
    p.color(K.yellow);
    p.wire(tongue, 0.08, 0.75);
    p.color(K.blue);
    p.poly([c(-0.46, -0.04), c(0.06, -0.18), c(0.06, 0.18), c(-0.46, 0.04)]);
    p.color(K.gold);
    p.shape(ellipse(0.07, 0, 0.05, 0.18, 14), 0.9);
    for (const x of [-0.28, -0.1])
      p.seg(
        [
          [x, -0.1 - (x + 0.46) * 0.12],
          [x + 0.06, 0.1 + (x + 0.46) * 0.12],
        ],
        0.5,
      );
  },
};

/** A masquerade mask on its stick. */
const mask = {
  w: 1,
  h: 0.66,
  tilt: 0.25,
  draw(p) {
    p.color(K.gold);
    p.wire(
      [
        [0.36, 0.06],
        [0.42, 0.2],
        [0.46, 0.32],
      ],
      0.04,
      0.8,
    );
    p.color(K.pink);
    p.shape([c(-0.3, -0.1), [-0.38, -0.24], c(-0.42, -0.32), [-0.28, -0.26], c(-0.22, -0.14)], 0.8);
    p.color(K.violet);
    p.shape(
      sym([
        [0, -0.06],
        [0.18, -0.16],
        [0.36, -0.14],
        c(0.46, -0.22),
        [0.42, 0.0],
        [0.3, 0.14],
        [0.14, 0.12],
        [0, 0.06],
      ]),
    );
    p.color(null);
    for (const s of [1, -1])
      p.shape([c(0.08 * s, -0.04), [0.18 * s, -0.1], c(0.3 * s, -0.06), [0.2 * s, 0.03]], 0.8);
  },
};

/** A two-tier cake, three candles. */
const cake = {
  w: 0.86,
  h: 1,
  tilt: 0.05,
  flip: false,
  draw(p) {
    for (const x of [-0.12, 0, 0.12]) {
      p.color(K.orange);
      p.shape([c(x, -0.48), [x + 0.04, -0.4], [x, -0.36], [x - 0.04, -0.4]], 0.7);
      p.color(K.sky);
      p.poly(rrect(x - 0.03, -0.34, x + 0.03, -0.16), 0.8);
    }
    p.color(K.palePink);
    p.shape(rrect(-0.24, -0.18, 0.24, 0.1, 0.03));
    p.color('#8b5a2b');
    p.shape(rrect(-0.4, 0.06, 0.4, 0.42, 0.04));
    p.color(K.palePink);
    p.shape(
      [
        c(-0.4, 0.06),
        c(0.4, 0.06),
        [0.4, 0.14],
        [0.3, 0.2],
        [0.2, 0.13],
        [0.06, 0.22],
        [-0.06, 0.13],
        [-0.2, 0.2],
        [-0.32, 0.12],
        [-0.4, 0.15],
      ],
      0.9,
    );
    p.color(K.silver);
    p.shape(rrect(-0.46, 0.4, 0.46, 0.48, 0.03), 0.9);
  },
};

/** An hourglass: the last grains of the year. */
const hourglass = {
  w: 0.62,
  h: 1,
  tilt: 0.25,
  draw(p) {
    p.color(K.wood);
    for (const s of [1, -1])
      p.wire(
        [
          [0.24 * s, -0.4],
          [0.24 * s, 0.4],
        ],
        0.035,
        0.75,
      );
    p.color('#e7f5ff');
    p.shape([
      c(-0.2, -0.38),
      c(0.2, -0.38),
      [0.18, -0.18],
      c(0.03, 0),
      [0.18, 0.18],
      c(0.2, 0.38),
      c(-0.2, 0.38),
      [-0.18, 0.18],
      c(-0.03, 0),
      [-0.18, -0.18],
    ]);
    p.color(K.sand);
    p.shape([c(-0.18, 0.37), c(0.18, 0.37), [0.11, 0.25], c(0, 0.2), [-0.11, 0.25]], 0.8);
    p.shape([c(-0.12, -0.2), c(0.12, -0.2), c(0.02, -0.06), c(-0.02, -0.06)], 0.8);
    p.color(K.darkWood);
    p.shape(rrect(-0.3, -0.48, 0.3, -0.38, 0.03), 0.9);
    p.shape(rrect(-0.3, 0.38, 0.3, 0.48, 0.03), 0.9);
  },
};

/** A calendar page: the 1st. */
const calendarPage = {
  w: 0.82,
  h: 1,
  tilt: 0.2,
  // Its "1" would read backwards in a mirror.
  flip: false,
  draw(p) {
    p.color(null);
    p.shape(rrect(-0.38, -0.38, 0.38, 0.46, 0.04));
    p.color(K.red);
    p.shape(rrect(-0.38, -0.38, 0.38, -0.16, 0.04), 0.9);
    p.color(K.silver);
    for (const x of [-0.2, 0.2]) p.shape(rrect(x - 0.04, -0.47, x + 0.04, -0.3, 0.03), 0.8);
    p.color(K.black);
    p.poly(
      [
        c(-0.1, -0.0),
        c(0.04, -0.1),
        c(0.11, -0.1),
        c(0.11, 0.3),
        c(0.18, 0.3),
        c(0.18, 0.38),
        c(-0.12, 0.38),
        c(-0.12, 0.3),
        c(-0.03, 0.3),
        c(-0.03, 0.06),
        c(-0.1, 0.1),
      ],
      0.9,
    );
  },
};

/** The strip along the outer edge of the top and bottom bands kept for the garland (px). */
const GARLAND = 70;

/**
 * A garland of pennants along the outer edge of the top and bottom bands, in a strip of its own
 * (`GARLAND`, kept free of elements): its string sags between hooks, every pennant hangs from it
 * whole, large enough to colour.
 */
function garland(d, rand, { band, width, height }) {
  if (band !== 'top' && band !== 'bottom') return;
  const sag = 10;
  const drop = 44;
  // Hooks at the top of the strip: the pennants hang down within it.
  const y = band === 'top' ? 8 : height - GARLAND + 4;
  const spans = Math.max(1, Math.round(width / 500));
  const span = width / spans;
  for (let s = 0; s < spans; s++) {
    const x0 = s * span;
    const at = (t) => [x0 + span * t, y + sag * 4 * t * (1 - t)];
    d.line(
      smooth(
        Array.from({ length: 13 }, (_, i) => at(i / 12)),
        false,
      ),
      2.6,
    );
    const flags = Math.max(3, Math.round(span / 64));
    for (let f = 0; f < flags; f++) {
      const [ax, ay] = at((f + 0.1) / flags);
      const [bx, by] = at((f + 0.9) / flags);
      const mx = (ax + bx) / 2;
      const my = (ay + by) / 2 + drop;
      d.color = [K.red, K.gold, K.blue, K.leaf][f % 4];
      d.shape(
        polyPath([
          [ax, ay],
          [bx, by],
          [mx, my],
        ]),
        3,
      );
      if (f % 2) d.dot(mx, (ay + by) / 2 + drop * 0.35, 4.5);
    }
  }
}

writeTheme('nouvelan', {
  seed: 301,
  thumb: flutes,
  front: [flutes, disco, clock, bottle],
  middle: [partyHat, burst, rocket, streamer],
  once: [balloons, partyHorn, mask, cake, hourglass, calendarPage],
  before: garland,
  inset: (band) => (band === 'top' ? [GARLAND, 0] : band === 'bottom' ? [0, GARLAND] : [0, 0]),
});
