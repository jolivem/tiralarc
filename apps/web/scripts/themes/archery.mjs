/**
 * The "archery" decoration: a target on its stand with arrows in it, a recurve bow with its
 * stabiliser and an arrow on the string, a quiver full of arrows, crossed arrows, a medal, a
 * trophy, feathers and stars, overlapping as one scene.
 *
 *   node apps/web/scripts/themes/archery.mjs   → apps/web/public/themes/archery/*.svg
 */
import { bar, c, ellipse, frame, rrect, star, sym, writeTheme } from './lib.mjs';
import { sparkleItem, starItem } from './common.mjs';

/** An arrow's fletching (two vanes) and nock at its tail, along `at` (u forwards). */
function fletching(p, at, length = 0.2, width = 0.06) {
  for (const side of [1, -1]) {
    p.shape(
      [
        at(0.02, side * 0.01, true),
        at(0.04, side * width, true),
        at(length * 0.55, side * width * 1.02),
        at(length, side * width * 0.55, true),
        at(length + 0.025, side * 0.01, true),
      ],
      0.8,
    );
  }
  p.poly(
    [
      at(-0.025, -0.018, true),
      at(0.03, -0.018, true),
      at(0.03, 0.018, true),
      at(-0.025, 0.018, true),
    ],
    0.8,
  );
}

/** A whole arrow from its tail to its point. */
function arrow(p, [x0, y0], [x1, y1], { head = 0.1, vane = 0.2, width = 0.06 } = {}) {
  const angle = Math.atan2(y1 - y0, x1 - x0);
  const length = Math.hypot(x1 - x0, y1 - y0);
  const at = frame(x0, y0, angle);
  p.poly(
    [
      at(0.02, -0.012, true),
      at(length - head * 0.6, -0.012, true),
      at(length - head * 0.6, 0.012, true),
      at(0.02, 0.012, true),
    ],
    0.8,
  );
  p.poly([
    at(length - head, -0.014, true),
    at(length - head * 1.15, -head * 0.42, true),
    at(length, 0, true),
    at(length - head * 1.15, head * 0.42, true),
    at(length - head, 0.014, true),
  ]);
  fletching(p, at, vane, width);
}

/** The target face's rings, outside in (each its own area to colour). */
function rings(p, cx, cy, r) {
  for (const k of [1, 0.8, 0.6, 0.4, 0.2])
    p.shape(ellipse(cx, cy, r * k, r * k, 20), k === 1 ? 1 : 0.7);
  p.seg(
    [
      [cx - r * 0.06, cy],
      [cx + r * 0.06, cy],
    ],
    0.5,
  );
  p.seg(
    [
      [cx, cy - r * 0.06],
      [cx, cy + r * 0.06],
    ],
    0.5,
  );
}

/** An arrow stuck in the target: only its back half shows, heading out towards us. */
function stuck(p, [x, y], angle, length = 0.3) {
  const at = frame(x, y, angle);
  p.poly(
    [at(0, -0.011, true), at(length, -0.011, true), at(length, 0.011, true), at(0, 0.011, true)],
    0.8,
  );
  const tail = frame(at(length, 0)[0], at(length, 0)[1], angle + Math.PI);
  fletching(p, tail, 0.12, 0.045);
}

const targetStand = {
  w: 0.8,
  h: 1,
  tilt: 0.04,
  draw(p) {
    p.poly(bar(0.02, -0.15, 0.06, 0.5, 0.045));
    p.poly(bar(-0.26, 0.33, 0.26, 0.33, 0.035));
    p.poly(bar(-0.12, -0.1, -0.31, 0.5, 0.05));
    p.poly(bar(0.12, -0.1, 0.31, 0.5, 0.05));
    // The straw boss, its edge bristling, then the face.
    p.shape(ellipse(0, -0.13, 0.37, 0.36, 22));
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2 + p.rand.range(-0.05, 0.05);
      const r0 = 0.31 + p.rand.range(0, 0.02);
      p.line(
        [
          [Math.cos(a) * r0, -0.13 + Math.sin(a) * r0],
          [Math.cos(a + 0.04) * (r0 + 0.035), -0.13 + Math.sin(a + 0.04) * (r0 + 0.035)],
        ],
        0.45,
      );
    }
    rings(p, 0, -0.13, 0.29);
    stuck(p, [0.03, -0.11], -2.45, 0.3);
    stuck(p, [-0.07, -0.18], -1.95, 0.26);
    stuck(p, [0.1, -0.06], -0.6, 0.28);
  },
};

const targetFace = {
  w: 1,
  h: 1,
  tilt: 0.1,
  draw(p) {
    p.shape(ellipse(0, 0, 0.48, 0.48, 24));
    rings(p, 0, 0, 0.42);
    stuck(p, [0.06, 0.02], -2.3, 0.4);
  },
};

const bow = {
  w: 0.56,
  h: 1,
  tilt: 0.15,
  draw(p) {
    // Limbs: out from the riser, curving back towards the string, the tips recurved.
    const upper = [
      [0.035, -0.15],
      [0.03, -0.27],
      [-0.01, -0.37],
      [-0.08, -0.44],
      [-0.13, -0.48],
      [-0.12, -0.5],
    ];
    p.branch(upper, 0.065, 0.022);
    p.branch(
      upper.map(([x, y]) => [x, -y]),
      0.065,
      0.022,
    );
    // The string, from tip to tip, its nocking point and serving.
    p.seg(
      [
        [-0.118, -0.47],
        [-0.118, 0.47],
      ],
      0.7,
    );
    p.shape(rrect(-0.128, -0.06, -0.108, 0.05, 0.006), 0.6);
    // Stabiliser forwards, its weight; the sight above.
    p.poly(bar(0.06, 0.08, 0.235, 0.08, 0.022), 0.8);
    p.poly(rrect(0.225, 0.05, 0.275, 0.11, 0.012), 0.9);
    p.poly(bar(0.06, -0.12, 0.2, -0.13, 0.016), 0.8);
    p.poly(rrect(0.19, -0.16, 0.225, -0.1, 0.008), 0.8);
    p.dot(0.207, -0.13, 0.008);
    // The riser: grip below the arrow shelf, sight window above.
    p.shape([
      c(0, -0.19),
      c(0.07, -0.19),
      [0.08, -0.05],
      [0.075, 0.1],
      c(0.07, 0.19),
      c(0, 0.19),
      [-0.04, 0.12],
      [-0.042, 0.05],
      c(-0.012, -0.005),
      c(0.028, -0.015),
      c(0.028, -0.13),
    ]);
    p.line(
      [
        [-0.03, 0.06],
        [0.0, 0.08],
        [0.04, 0.07],
      ],
      0.45,
    );
    p.line(
      [
        [-0.03, 0.11],
        [0.0, 0.13],
        [0.04, 0.12],
      ],
      0.45,
    );
    // An arrow on the string, resting on the shelf.
    arrow(p, [-0.118, -0.022], [0.26, -0.022], { head: 0.06, vane: 0.11, width: 0.035 });
  },
};

const quiver = {
  w: 0.52,
  h: 1,
  tilt: 0.18,
  draw(p) {
    // The strap, behind.
    p.wire(
      [
        [0.12, -0.15],
        [0.26, 0.05],
        [0.24, 0.24],
        [0.11, 0.36],
      ],
      0.035,
    );
    // Arrows standing in it, tails up.
    const tops = [
      [-0.13, -0.41],
      [0.13, -0.43],
      [-0.045, -0.5],
      [0.05, -0.46],
    ];
    for (const [x, y] of tops) {
      const at = frame(x, y, Math.PI / 2 + x * 1.6);
      p.poly(
        [at(0.02, -0.01, true), at(0.3, -0.01, true), at(0.3, 0.01, true), at(0.02, 0.01, true)],
        0.7,
      );
      fletching(p, at, 0.13, 0.034);
    }
    // The tube, its rim and foot, bands and a star.
    p.shape([
      c(-0.16, -0.24),
      c(0.16, -0.24),
      [0.15, 0.1],
      c(0.125, 0.48),
      c(-0.125, 0.48),
      [-0.15, 0.1],
    ]);
    p.poly(rrect(-0.175, -0.27, 0.175, -0.18, 0.02));
    p.poly(rrect(-0.14, 0.4, 0.14, 0.49, 0.02));
    p.line(
      [
        [-0.153, 0.18],
        [0, 0.2],
        [0.152, 0.18],
      ],
      0.6,
    );
    p.line(
      [
        [-0.15, 0.25],
        [0, 0.27],
        [0.148, 0.25],
      ],
      0.6,
    );
    p.shape(star(0, 0.0, 0.085, 0.45), 0.8);
    p.line(
      [
        [-0.11, -0.14],
        [-0.115, 0.1],
      ],
      0.45,
    );
  },
};

const crossedArrows = {
  w: 1,
  h: 0.8,
  tilt: 0.1,
  draw(p) {
    arrow(p, [-0.46, 0.34], [0.46, -0.36], { head: 0.13, vane: 0.22, width: 0.07 });
    arrow(p, [0.46, 0.34], [-0.46, -0.36], { head: 0.13, vane: 0.22, width: 0.07 });
  },
};

const medal = {
  w: 0.62,
  h: 1,
  tilt: 0.2,
  draw(p) {
    // The ribbon's two straps, crossing.
    const strap = (x) => [
      c(x, -0.5),
      c(x + 0.16 * Math.sign(-x), -0.5),
      c(0.07 * Math.sign(-x), -0.05),
      c(-0.06 * Math.sign(-x), -0.05),
    ];
    for (const x of [-0.27, 0.27]) {
      p.poly(strap(x));
      const s = Math.sign(-x);
      for (const k of [0.36, 0.66]) {
        p.seg(
          [
            [x + 0.16 * s * k, -0.5],
            [-0.06 * s + 0.13 * s * k, -0.05],
          ],
          0.55,
        );
      }
    }
    p.shape(ellipse(0, -0.03, 0.05, 0.045, 12), 0.9);
    // The medal: notched rim, inner disc, star, a laurel's two sprigs.
    const rim = [];
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      const r = i % 2 ? 0.28 : 0.265;
      rim.push([Math.cos(a) * r, 0.21 + Math.sin(a) * r]);
    }
    p.shape(rim);
    p.shape(ellipse(0, 0.21, 0.215, 0.215, 18), 0.8);
    p.shape(star(0, 0.2, 0.11, 0.45), 0.8);
    for (const s of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        const a = Math.PI / 2 + s * (0.55 + i * 0.32);
        const x = Math.cos(a) * 0.165;
        const y = 0.21 + Math.sin(a) * 0.165;
        p.shape(ellipse(x, y, 0.03, 0.013, 8, a + (s * Math.PI) / 2), 0.55);
      }
    }
  },
};

const trophy = {
  w: 0.76,
  h: 1,
  tilt: 0.05,
  draw(p) {
    for (const s of [-1, 1]) {
      p.wire(
        [
          [s * 0.24, -0.38],
          [s * 0.36, -0.37],
          [s * 0.37, -0.24],
          [s * 0.29, -0.12],
          [s * 0.15, -0.05],
        ],
        0.04,
      );
    }
    p.shape(
      sym([
        c(0, -0.44),
        c(0.27, -0.44),
        [0.26, -0.24],
        [0.2, -0.07],
        [0.11, 0.04],
        c(0.045, 0.09),
        c(0, 0.09),
      ]),
    );
    p.poly(rrect(-0.3, -0.49, 0.3, -0.42, 0.02));
    p.shape(star(0, -0.22, 0.1, 0.45), 0.8);
    p.line(
      [
        [-0.2, -0.36],
        [-0.19, -0.22],
        [-0.13, -0.1],
      ],
      0.5,
    );
    p.shape(sym([c(0, 0.08), c(0.045, 0.08), [0.035, 0.18], c(0.085, 0.28), c(0, 0.28)]));
    p.shape(ellipse(0, 0.16, 0.06, 0.024, 12), 0.8);
    p.poly(rrect(-0.2, 0.27, 0.2, 0.37, 0.012));
    p.poly(rrect(-0.27, 0.37, 0.27, 0.5, 0.015));
    p.poly(rrect(-0.13, 0.405, 0.13, 0.465, 0.006), 0.7);
  },
};

const feather = {
  w: 0.34,
  h: 1,
  tilt: 0.7,
  draw(p) {
    p.shape([
      c(0, -0.5),
      [0.08, -0.4],
      [0.14, -0.2],
      [0.15, 0.0],
      [0.11, 0.18],
      c(0.025, 0.3),
      c(-0.025, 0.3),
      [-0.1, 0.16],
      [-0.12, 0.03],
      c(-0.06, -0.03),
      c(-0.125, -0.06),
      [-0.12, -0.22],
      [-0.09, -0.36],
      [-0.04, -0.46],
    ]);
    p.line(
      [
        [0, -0.46],
        [0.004, -0.1],
        [0, 0.29],
      ],
      0.6,
    );
    p.wire(
      [
        [0, 0.29],
        [0.004, 0.4],
        [0, 0.5],
      ],
      0.025,
      0.6,
    );
    for (const y of [-0.34, -0.22, -0.1, 0.02, 0.14]) {
      p.line(
        [
          [0.003, y + 0.03],
          [0.07, y - 0.01],
          [0.115, y - 0.05],
        ],
        0.4,
      );
    }
    for (const y of [-0.3, -0.16, 0.08]) {
      p.line(
        [
          [-0.003, y + 0.03],
          [-0.06, y - 0.01],
          [-0.095, y - 0.05],
        ],
        0.4,
      );
    }
  },
};

writeTheme('archery', {
  seed: 101,
  thumb: targetStand,
  front: [targetStand, bow, quiver, trophy],
  middle: [crossedArrows, medal, targetFace, quiver, feather],
  back: [feather, starItem, sparkleItem, starItem],
});
