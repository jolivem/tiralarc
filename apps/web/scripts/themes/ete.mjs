/**
 * The "ete" (summer) decoration: a sun in sunglasses, a beach parasol in the sand, a palm tree
 * with coconuts, a sailing boat on the waves, an ice cream cone, a starfish, a scallop shell,
 * flip-flops, a beach ball, a wave; once each: a sandcastle, a bucket and spade, sunglasses, a
 * life ring, a crab, a fish.
 *
 *   node apps/web/scripts/themes/ete.mjs   → apps/web/public/themes/ete/*.svg
 */
import { arc, bar, c, ellipse, frame, hatch, rrect, sym, turn, writeTheme } from './lib.mjs';
import { K } from './common.mjs';

const TAU = Math.PI * 2;

const sun = {
  w: 1,
  h: 1,
  tilt: 0.2,
  draw(p) {
    p.color(K.orange);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TAU;
      const at = frame(0, 0, a);
      const long = i % 2 === 0;
      p.shape([at(0.3, -0.07, true), at(long ? 0.49 : 0.42, 0, true), at(0.3, 0.07, true)], 0.85);
    }
    p.color(K.yellow);
    p.shape(ellipse(0, 0, 0.33, 0.33, 26));
    // Sunglasses, cheeks, a smile.
    p.seg(
      [
        [-0.27, -0.06],
        [-0.2, -0.08],
      ],
      0.6,
    );
    p.seg(
      [
        [0.27, -0.06],
        [0.2, -0.08],
      ],
      0.6,
    );
    p.wire(
      [
        [-0.04, -0.07],
        [0, -0.09],
        [0.04, -0.07],
      ],
      0.015,
      0.6,
    );
    for (const s of [-1, 1]) {
      p.color(K.darkGrey);
      p.shape([
        c(s * 0.04, -0.1),
        c(s * 0.21, -0.1),
        [s * 0.2, 0.0],
        [s * 0.12, 0.04],
        [s * 0.06, 0.0],
      ]);
      p.line(
        [
          [s * 0.09, -0.07],
          [s * 0.13, -0.04],
        ],
        0.45,
      );
      p.color(K.pink);
      p.shape(ellipse(s * 0.2, 0.1, 0.045, 0.03, 10), 0.5);
    }
    p.line(
      [
        [-0.1, 0.13],
        [0, 0.19],
        [0.1, 0.13],
      ],
      0.7,
    );
  },
};

const parasol = {
  w: 1,
  h: 1,
  tilt: 0.15,
  draw(p) {
    p.color(K.sand);
    p.shape([c(-0.4, 0.5), [-0.2, 0.37], [0.1, 0.35], [0.38, 0.42], c(0.48, 0.5)], 0.8);
    p.color(K.lightWood);
    p.poly(bar(0, -0.4, 0.07, 0.43, 0.03), 0.8);
    const edge = [];
    const n = 6;
    for (let i = 0; i <= n; i++) {
      const x = -0.48 + (0.96 * i) / n;
      edge.push(c(x, 0.0 - Math.abs(x) * 0.08));
      if (i < n) edge.push([x + 0.08, 0.06 - Math.abs(x + 0.08) * 0.08]);
    }
    p.color(K.red);
    p.shape([c(0, -0.42), [-0.3, -0.33], [-0.46, -0.12], ...edge, [0.46, -0.12], [0.3, -0.33]]);
    // Every other panel white: wedges from the top to the edge, between two ribs.
    for (let i = 1; i < n; i += 2) {
      const [x0, x1] = [-0.48 + (0.96 * i) / n, -0.48 + (0.96 * (i + 1)) / n];
      p.tint(
        [
          [0, -0.4],
          [x0 * 0.75, -0.22],
          [x0, -Math.abs(x0) * 0.08 + 0.04],
          [x1, -Math.abs(x1) * 0.08 + 0.04],
          [x1 * 0.75, -0.22],
        ],
        '#ffffff',
      );
    }
    for (let i = 1; i < n; i++) {
      const x = -0.48 + (0.96 * i) / n;
      p.line(
        [
          [0, -0.4],
          [x * 0.75, -0.22],
          [x, -Math.abs(x) * 0.08],
        ],
        0.55,
      );
    }
    p.color(K.red);
    p.shape(ellipse(0, -0.43, 0.03, 0.03, 8), 0.7);
    for (const [x, y] of [
      [-0.2, 0.44],
      [0.26, 0.45],
      [0.05, 0.42],
    ])
      p.dot(x, y, 0.008);
  },
};

const palm = {
  w: 0.92,
  h: 1,
  tilt: 0.08,
  draw(p) {
    // The trunk, leaning, its rings.
    p.color(K.lightWood);
    const trunk = p.branch(
      [
        [0.14, 0.5],
        [0.15, 0.25],
        [0.09, 0.0],
        [-0.02, -0.17],
      ],
      0.13,
      0.075,
    );
    const rings = 10;
    for (let i = 1; i < rings; i++) {
      const s = trunk.spine[Math.floor((i * (trunk.spine.length - 1)) / rings)];
      const [nx, ny] = [-Math.sin(s.angle), Math.cos(s.angle)];
      const [tx, ty] = [Math.cos(s.angle), Math.sin(s.angle)];
      const h = s.width * 0.5;
      // Back to the pen's units: the spine is in pixels.
      const at = (k, bow) => [s.x + nx * h * k + tx * bow, s.y + ny * h * k + ty * bow];
      p.raw.line([at(-0.98, 0), at(0, -h * 0.35), at(0.98, 0)], 0.5);
    }
    // Coconuts, then the fronds: drooping, leaflets hanging from their lower edge.
    p.color(K.darkWood);
    for (const [x, y] of [
      [-0.08, -0.13],
      [0.03, -0.12],
      [-0.03, -0.07],
    ])
      p.shape(ellipse(x, y, 0.055, 0.05, 12), 0.8);
    const crown = [-0.03, -0.2];
    p.color(K.darkLeaf);
    for (const [a, l, droop] of [
      [-2.75, 0.44, 0.32],
      [-0.4, 0.44, 0.32],
      [-2.2, 0.36, 0.26],
      [-0.95, 0.38, 0.26],
      [-1.6, 0.28, 0.05],
      [3.05, 0.34, 0.3],
      [0.05, 0.34, 0.3],
    ]) {
      const pts = [];
      for (let i = 0; i <= 14; i++) {
        const t = i / 14;
        pts.push([
          crown[0] + Math.cos(a) * l * t,
          crown[1] + Math.sin(a) * l * t + droop * l * t * t,
        ]);
      }
      const upper = [];
      const lower = [];
      for (let i = 0; i < pts.length; i++) {
        const prev = pts[Math.max(0, i - 1)];
        const next = pts[Math.min(pts.length - 1, i + 1)];
        const ang = Math.atan2(next[1] - prev[1], next[0] - prev[0]);
        let [nx, ny] = [-Math.sin(ang), Math.cos(ang)];
        if (ny < 0) [nx, ny] = [-nx, -ny];
        const t = i / (pts.length - 1);
        const w = 0.09 * Math.pow(Math.sin(Math.PI * Math.min(0.98, t * 0.92 + 0.06)), 0.8);
        upper.push([pts[i][0] - nx * w * 0.32, pts[i][1] - ny * w * 0.32]);
        // Leaflets: deep cuts, tips swept towards the frond's end.
        const tip = i % 2 === 1;
        const [dx, dy] = [Math.cos(ang), Math.sin(ang)];
        lower.push(
          tip
            ? c(pts[i][0] + nx * w + dx * w * 0.5, pts[i][1] + ny * w + dy * w * 0.5)
            : c(pts[i][0] + nx * w * 0.25, pts[i][1] + ny * w * 0.25),
        );
      }
      p.shape(
        [c(...pts[0]), ...upper.slice(1, -1), c(...pts.at(-1)), ...lower.slice(1, -1).reverse()],
        0.8,
      );
      p.line(pts.slice(1, -1), 0.45);
    }
  },
};

const sailboat = {
  w: 0.9,
  h: 1,
  tilt: 0.1,
  draw(p) {
    p.color(K.lightWood);
    p.poly(bar(0.02, -0.46, 0.02, 0.2, 0.025), 0.8);
    p.color(K.red);
    p.poly([c(0.035, -0.47), c(0.14, -0.43), c(0.035, -0.39)], 0.7);
    p.color(null);
    p.shape([c(0.05, -0.38), [0.2, -0.18], c(0.38, 0.13), c(0.05, 0.13)]);
    p.shape([c(-0.01, -0.34), c(-0.01, 0.13), c(-0.3, 0.13), [-0.14, -0.1]]);
    p.line(
      [
        [0.05, -0.12],
        [0.25, -0.1],
      ],
      0.45,
    );
    p.line(
      [
        [0.05, 0.02],
        [0.33, 0.04],
      ],
      0.45,
    );
    p.color(K.navy);
    p.shape([
      c(-0.42, 0.17),
      c(0.42, 0.17),
      [0.36, 0.26],
      c(0.28, 0.35),
      c(-0.28, 0.35),
      [-0.36, 0.26],
    ]);
    p.seg(
      [
        [-0.39, 0.22],
        [0.39, 0.22],
      ],
      0.6,
    );
    p.color(K.sky);
    for (const x of [-0.18, 0, 0.18]) p.shape(ellipse(x, 0.28, 0.025, 0.025, 8), 0.5);
    // Waves along its hull.
    p.color(K.water);
    const top = [];
    for (let i = 0; i <= 8; i++) {
      const x = -0.48 + (0.96 * i) / 8;
      top.push(i % 2 ? [x, 0.33] : c(x, 0.38));
    }
    p.shape([c(-0.48, 0.5), ...top, c(0.48, 0.5)]);
    p.line(
      [
        [-0.3, 0.44],
        [-0.2, 0.42],
        [-0.1, 0.44],
      ],
      0.45,
    );
    p.line(
      [
        [0.1, 0.45],
        [0.2, 0.43],
        [0.3, 0.45],
      ],
      0.45,
    );
  },
};

const iceCream = {
  w: 0.5,
  h: 1,
  tilt: 0.25,
  draw(p) {
    const cone = [c(-0.17, -0.02), c(0.17, -0.02), c(0, 0.5)];
    p.color('#e8b06b');
    p.shape(cone);
    for (const angle of [0.95, Math.PI - 0.95])
      for (const s of hatch(cone, angle, 0.075)) p.seg(s, 0.45);
    // Two scoops, the lower one dripping, a cherry on top.
    const lower = [
      c(-0.22, -0.02),
      [-0.22, -0.14],
      [-0.12, -0.22],
      [0.12, -0.22],
      [0.22, -0.14],
      c(0.22, -0.02),
    ];
    for (let i = 0; i < 6; i++) {
      const x = 0.22 - (0.44 * (i + 0.5)) / 6;
      lower.push([x, i % 2 ? 0.02 : 0.08]);
    }
    p.color(K.palePink);
    p.shape(lower);
    p.color('#8b5a2b');
    p.shape(sym([c(0, -0.44), [0.12, -0.41], [0.18, -0.3], [0.16, -0.2], c(0, -0.17)]));
    p.color('#5c940d');
    p.wire(
      [
        [0.02, -0.45],
        [0.05, -0.49],
        [0.1, -0.5],
      ],
      0.012,
      0.6,
    );
    p.color(K.red);
    p.shape(ellipse(0.0, -0.44, 0.045, 0.04, 10), 0.8);
    p.color(K.yellow);
    for (const [x, y] of [
      [-0.06, -0.32],
      [0.07, -0.28],
      [-0.1, -0.1],
      [0.08, -0.12],
    ]) {
      p.shape(turn(rrect(x - 0.02, y - 0.006, x + 0.02, y + 0.006, 0.005), x * 10, x, y), 0.4);
    }
  },
};

const starfish = {
  w: 1,
  h: 0.96,
  tilt: 0.5,
  draw(p) {
    const outline = [];
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const r = i % 2 ? 0.2 : 0.48;
      outline.push([Math.cos(a) * r, 0.03 + Math.sin(a) * r]);
    }
    p.color(K.orange);
    p.shape(outline);
    p.color('#ffc078');
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i * TAU) / 5;
      for (const [r, s] of [
        [0.14, 0.03],
        [0.24, 0.026],
        [0.33, 0.02],
      ]) {
        p.shape(ellipse(Math.cos(a) * r, 0.03 + Math.sin(a) * r, s, s, 8), 0.45);
      }
    }
  },
};

const scallop = {
  w: 1,
  h: 0.9,
  tilt: 0.3,
  color: '#ffc9a8',
  draw(p) {
    const [hx, hy] = [0, 0.33];
    const n = 9;
    const a0 = Math.PI + 0.3;
    const a1 = TAU - 0.3;
    const edge = [];
    for (let i = 0; i <= n * 2; i++) {
      const a = a0 + ((a1 - a0) * i) / (n * 2);
      const r = i % 2 ? 0.75 : 0.71;
      edge.push(
        i % 2
          ? [hx + Math.cos(a) * r * 0.68, hy + Math.sin(a) * r]
          : c(hx + Math.cos(a) * r * 0.68, hy + Math.sin(a) * r),
      );
    }
    p.shape([c(hx, hy + 0.04), ...edge]);
    for (let i = 1; i < n; i++) {
      const a = a0 + ((a1 - a0) * i) / n;
      p.line(
        [
          [hx, hy],
          [hx + Math.cos(a) * 0.4 * 0.68, hy + Math.sin(a) * 0.4],
          [hx + Math.cos(a) * 0.71 * 0.68, hy + Math.sin(a) * 0.71],
        ],
        0.5,
      );
    }
    p.poly([c(-0.17, 0.3), c(0.17, 0.3), c(0.1, 0.44), c(-0.1, 0.44)]);
    p.seg(
      [
        [-0.06, 0.3],
        [-0.04, 0.44],
      ],
      0.45,
    );
    p.seg(
      [
        [0.06, 0.3],
        [0.04, 0.44],
      ],
      0.45,
    );
  },
};

const flipFlops = {
  w: 0.92,
  h: 1,
  tilt: 0.15,
  draw(p) {
    const sole = sym([
      c(0, -0.47),
      [0.1, -0.44],
      [0.13, -0.28],
      [0.1, -0.08],
      [0.12, 0.15],
      [0.11, 0.36],
      c(0, 0.47),
    ]);
    for (const [x, y, a, bloom] of [
      [-0.2, 0.0, -0.12, false],
      [0.2, 0.03, 0.1, true],
    ]) {
      const t = (pts) =>
        turn(
          pts.map(([px, py, k]) => (k ? [px + x, py + y, true] : [px + x, py + y])),
          a,
          x,
          y,
        );
      p.color(K.blue);
      p.shape(t(sole));
      p.color(K.sky);
      p.shape(
        t(
          sym([
            c(0, -0.43),
            [0.075, -0.4],
            [0.1, -0.27],
            [0.075, -0.08],
            [0.09, 0.15],
            [0.08, 0.34],
            c(0, 0.42),
          ]),
        ),
        0.6,
      );
      p.color(K.pink);
      p.wire(
        t([
          [-0.1, -0.08],
          [-0.05, -0.2],
          [0, -0.33],
        ]),
        0.035,
      );
      p.wire(
        t([
          [0.1, -0.08],
          [0.05, -0.2],
          [0, -0.33],
        ]),
        0.035,
      );
      p.color(K.yellow);
      if (bloom) {
        const [fx, fy] = t([[0, -0.3]])[0];
        for (let i = 0; i < 5; i++) {
          const ang = (i / 5) * TAU;
          p.shape(
            ellipse(fx + Math.cos(ang) * 0.05, fy + Math.sin(ang) * 0.05, 0.04, 0.04, 10),
            0.6,
          );
        }
        p.shape(ellipse(fx, fy, 0.03, 0.03, 8), 0.6);
      } else p.shape(t(ellipse(0, -0.32, 0.025, 0.025, 8)), 0.6);
    }
  },
};

const beachBall = {
  w: 1,
  h: 1,
  tilt: 0.6,
  draw(p) {
    p.shape(ellipse(0, 0, 0.47, 0.47, 28));
    // Its segments' colours, between the seams (x = k·r·cos t): red, white, blue, white, yellow.
    const seam = (k) =>
      Array.from({ length: 15 }, (_, i) => {
        const t = -Math.PI / 2 + (Math.PI * i) / 14;
        return [k * 0.47 * Math.cos(t), 0.47 * Math.sin(t)];
      });
    [
      [-1, -0.75, K.red],
      [-0.25, 0.25, K.blue],
      [0.75, 1, K.yellow],
    ].forEach(([k0, k1, color]) => p.tint([...seam(k0), ...seam(k1).reverse()], color));
    for (const k of [-0.75, -0.25, 0.25, 0.75]) {
      p.line(
        arc(
          0,
          0,
          Math.abs(k) * 0.47,
          0.47,
          k < 0 ? Math.PI / 2 : -Math.PI / 2,
          k < 0 ? (Math.PI * 3) / 2 : Math.PI / 2,
          14,
        ),
        0.6,
      );
    }
    p.color(null);
    p.shape(ellipse(0, -0.47 + 0.1, 0.1, 0.06, 12), 0.7);
    p.line(arc(0, 0, 0.38, 0.38, 3.6, 4.3, 6), 0.5);
  },
};

const wave = {
  w: 1,
  h: 0.5,
  tilt: 0.05,
  color: K.water,
  draw(p) {
    p.shape([
      c(-0.48, 0.24),
      [-0.35, 0.02],
      [-0.15, -0.16],
      [0.05, -0.2],
      [0.2, -0.12],
      c(0.22, -0.02),
      [0.3, 0.1],
      [0.4, 0.18],
      c(0.48, 0.24),
    ]);
    p.line(
      [
        [0.12, -0.06],
        [0.08, -0.12],
        [0.0, -0.1],
        [-0.02, -0.02],
      ],
      0.5,
    );
    p.line(
      [
        [-0.3, 0.12],
        [-0.15, 0.0],
        [0.0, 0.04],
      ],
      0.45,
    );
  },
};

// ------------------------------------------------ shown once in the whole decoration

/** A tower of crenellations; `poly` points from the bottom left. */
function tower(x0, x1, top, bottom) {
  const w = (x1 - x0) / 3;
  return [
    c(x0, bottom),
    c(x0, top - 0.07),
    c(x0 + w, top - 0.07),
    c(x0 + w, top),
    c(x0 + 2 * w, top),
    c(x0 + 2 * w, top - 0.07),
    c(x1, top - 0.07),
    c(x1, bottom),
  ];
}

/** A sandcastle with its flag. */
const sandcastle = {
  w: 1,
  h: 0.9,
  tilt: 0.04,
  flip: false,
  draw(p) {
    p.color(K.lightWood);
    p.wire(
      [
        [0, -0.22],
        [0, -0.44],
      ],
      0.025,
      0.7,
    );
    p.color(K.red);
    p.poly([c(0.01, -0.44), c(0.16, -0.39), c(0.01, -0.33)], 0.8);
    p.color(K.sand);
    p.poly(tower(-0.4, -0.16, -0.08, 0.12));
    p.poly(tower(0.16, 0.4, -0.08, 0.12));
    p.poly(tower(-0.13, 0.13, -0.22, 0.12));
    p.poly(tower(-0.46, 0.46, 0.08, 0.44));
    p.color(K.wood);
    p.shape([c(-0.08, 0.44), [-0.08, 0.3], [0, 0.23], [0.08, 0.3], c(0.08, 0.44)], 0.8);
  },
};

/** A bucket and its spade. */
const bucket = {
  w: 0.9,
  h: 1,
  tilt: 0.08,
  draw(p) {
    p.color(K.lightWood);
    p.wire(
      [
        [0.42, -0.44],
        [0.3, 0.14],
      ],
      0.05,
      0.8,
    );
    p.color(K.yellow);
    p.shape(
      [c(0.26, 0.1), [0.38, 0.14], [0.42, 0.3], [0.32, 0.44], [0.22, 0.32], c(0.24, 0.12)],
      0.9,
    );
    p.color(K.grey);
    p.wire(
      [
        [-0.28, -0.14],
        [-0.22, -0.4],
        [0, -0.48],
        [0.14, -0.4],
        [0.18, -0.14],
      ],
      0.03,
      0.7,
    );
    p.color(K.red);
    p.poly([c(-0.3, -0.12), c(0.2, -0.12), c(0.14, 0.44), c(-0.24, 0.44)]);
    p.color(K.darkRed);
    p.shape(rrect(-0.34, -0.2, 0.24, -0.08, 0.03), 0.9);
    p.seg(
      [
        [-0.28, 0.12],
        [0.18, 0.12],
      ],
      0.5,
    );
    p.seg(
      [
        [-0.27, 0.22],
        [0.17, 0.22],
      ],
      0.5,
    );
  },
};

/** Sunglasses. */
const sunglasses = {
  w: 1,
  h: 0.48,
  tilt: 0.2,
  color: K.darkGrey,
  draw(p) {
    for (const s of [1, -1])
      p.wire(
        [
          [0.4 * s, -0.08],
          [0.46 * s, -0.18],
          [0.48 * s, -0.22],
        ],
        0.03,
        0.7,
      );
    p.wire(
      [
        [-0.08, -0.06],
        [0, -0.1],
        [0.08, -0.06],
      ],
      0.035,
      0.7,
    );
    for (const s of [1, -1]) {
      const x = 0.24 * s;
      p.shape([
        c(x - 0.18, -0.12),
        c(x + 0.18, -0.12),
        [x + 0.17, 0.06],
        [x, 0.17],
        [x - 0.16, 0.06],
      ]);
      p.line(
        [
          [x - 0.1, -0.06],
          [x - 0.04, 0.02],
        ],
        0.5,
      );
    }
  },
};

/** A life ring, its four bands. */
const lifebuoy = {
  w: 1,
  h: 1,
  tilt: 0.2,
  draw(p) {
    p.color(K.red);
    p.shape(ellipse(0, 0, 0.45, 0.45, 32));
    p.color(null);
    const band = (a) => [
      ...arc(0, 0, 0.45, 0.45, a - 0.3, a + 0.3, 6).map(([x, y]) => [x, y]),
      ...arc(0, 0, 0.21, 0.21, a + 0.3, a - 0.3, 6),
    ];
    for (let i = 0; i < 4; i++) p.poly(band(Math.PI / 4 + (i * Math.PI) / 2), 0.8);
    p.shape(ellipse(0, 0, 0.21, 0.21, 24));
  },
};

/** A crab, claws up. */
const crab = {
  w: 1,
  h: 0.74,
  tilt: 0.1,
  flip: false,
  color: K.red,
  draw(p) {
    for (const s of [1, -1]) {
      for (const [dx, dy] of [
        [0.38, 0.12],
        [0.42, 0.22],
        [0.36, 0.32],
      ])
        p.wire(
          [
            [0.18 * s, 0.14],
            [dx * s, dy - 0.06],
            [(dx + 0.04) * s, dy + 0.02],
          ],
          0.035,
          0.7,
        );
      p.wire(
        [
          [0.22 * s, 0.0],
          [0.3 * s, -0.1],
          [0.32 * s, -0.18],
        ],
        0.05,
        0.75,
      );
      const x = 0.33 * s;
      p.shape([
        c(x - 0.02 * s, -0.12),
        [x - 0.1 * s, -0.2],
        [x - 0.08 * s, -0.32],
        c(x + 0.01 * s, -0.36),
        [x - 0.01 * s, -0.27],
        c(x + 0.1 * s, -0.3),
        [x + 0.1 * s, -0.17],
      ]);
      p.wire(
        [
          [0.07 * s, -0.08],
          [0.09 * s, -0.2],
        ],
        0.03,
        0.7,
      );
      p.color(null);
      p.shape(ellipse(0.09 * s, -0.23, 0.05, 0.05, 10), 0.8);
      p.dot(0.09 * s, -0.23, 0.02);
      p.color(K.red);
    }
    p.shape(ellipse(0, 0.1, 0.27, 0.18, 22));
    p.line(
      [
        [-0.08, 0.12],
        [0, 0.16],
        [0.08, 0.12],
      ],
      0.6,
    );
  },
};

/** A fish and a bubble. */
const fish = {
  w: 1,
  h: 0.62,
  tilt: 0.25,
  draw(p) {
    p.color(K.orange);
    p.shape([c(0.22, 0.0), c(0.47, -0.2), [0.42, 0.0], c(0.47, 0.2)]);
    p.shape([c(-0.02, -0.17), [0.06, -0.28], c(0.2, -0.24), [0.12, -0.14]], 0.8);
    p.color('#ffa94d');
    p.shape([
      c(-0.4, 0.0),
      [-0.24, -0.17],
      [0.0, -0.2],
      [0.2, -0.1],
      c(0.26, 0.0),
      [0.2, 0.1],
      [0.0, 0.2],
      [-0.24, 0.17],
    ]);
    p.line(
      [
        [-0.2, -0.12],
        [-0.15, 0.0],
        [-0.2, 0.12],
      ],
      0.6,
    );
    p.color(null);
    p.shape(ellipse(-0.28, -0.04, 0.045, 0.045, 10), 0.7);
    p.dot(-0.28, -0.04, 0.02);
    p.color(K.water);
    p.shape(ellipse(-0.44, -0.22, 0.06, 0.06, 12), 0.7);
  },
};

writeTheme('ete', {
  seed: 801,
  thumb: sun,
  front: [sun, parasol, palm, sailboat],
  middle: [iceCream, starfish, scallop, flipFlops, beachBall, wave],
  once: [sandcastle, bucket, sunglasses, lifebuoy, crab, fish],
});
