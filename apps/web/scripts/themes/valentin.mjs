/**
 * The "valentin" (Valentine's Day) decoration: a winged heart, a bouquet of roses, a LOVE
 * banner, a heart padlock and its key, a heart-shaped gift box, an open envelope with its letter,
 * a rose on its stem, Cupid's arrow, small hearts and sparkles.
 *
 *   node apps/web/scripts/themes/valentin.mjs   → apps/web/public/themes/valentin/*.svg
 */
import { bar, c, ellipse, frame, heart, rrect, scallop, sym, turn, writeTheme } from './lib.mjs';
import { heartItem, sparkleItem } from './common.mjs';

const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

/** A wing (right side; `s` −1 mirrors it): a covert row over long flight feathers. */
function wing(p, s, top, tip, base, rows = 4) {
  const m = (pts) => pts.map(([x, y, k]) => (k ? [x * s, y, true] : [x * s, y]));
  const outline = (from, to, end, n, bulge) => {
    const pts = [c(...from), [lerp(from, to, 0.45)[0], lerp(from, to, 0.45)[1] - 0.06], c(...to)];
    const dir = [end[0] - to[0], end[1] - to[1]];
    const len = Math.hypot(...dir);
    const normal = [dir[1] / len, -dir[0] / len];
    for (let i = 0; i < n; i++) {
      const a = lerp(to, end, i / n);
      const b = lerp(to, end, (i + 1) / n);
      const mid = lerp(a, b, 0.5);
      pts.push([mid[0] + normal[0] * bulge, mid[1] + normal[1] * bulge]);
      pts.push(c(...b));
    }
    return pts;
  };
  p.shape(m(outline(top, tip, base, rows, 0.06)));
  for (let i = 1; i < rows; i++) {
    const at = lerp(tip, base, i / rows);
    p.line(m([at, lerp(at, top, 0.45)]), 0.5);
  }
  const midTip = lerp(top, tip, 0.55);
  const midBase = lerp(top, base, 0.75);
  p.shape(m(outline(top, [midTip[0], midTip[1] + 0.03], midBase, 3, 0.04)), 0.8);
}

const wingedHeart = {
  w: 1,
  h: 0.62,
  tilt: 0.15,
  draw(p) {
    for (const s of [-1, 1]) wing(p, s, [0.12, -0.12], [0.5, -0.3], [0.2, 0.17]);
    p.shape(heart(0, 0.02, 0.52));
    p.line(
      [
        [-0.17, -0.06],
        [-0.15, -0.14],
        [-0.08, -0.17],
      ],
      0.6,
    );
  },
};

/** A rose seen from above: its outer petals, the cup, a spiral heart. */
function rose(p, cx, cy, r, k = 1) {
  p.shape(scallop(cx, cy, r, 5, 0.14, 0.4), k);
  p.shape(ellipse(cx + r * 0.04, cy + r * 0.04, r * 0.66, r * 0.6, 14), k * 0.8);
  p.line(
    Array.from({ length: 14 }, (_, i) => {
      const a = i * 0.75;
      const rr = r * (0.48 - i * 0.03);
      return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.92];
    }),
    k * 0.6,
  );
}

/** A pointed leaf from (x, y) heading `angle`, `length` long, with its midrib. */
function leaf(p, x, y, angle, length, k = 0.8) {
  const at = frame(x, y, angle);
  p.shape(
    [
      at(0, 0, true),
      at(length * 0.3, -length * 0.2),
      at(length * 0.7, -length * 0.16),
      at(length, 0, true),
      at(length * 0.7, length * 0.16),
      at(length * 0.3, length * 0.2),
    ],
    k,
  );
  p.line([at(length * 0.05, 0), at(length * 0.5, -0.01), at(length * 0.88, 0)], k * 0.6);
}

/** A bow: two loops, the knot, two tails. */
function bow(p, cx, cy, s, k = 0.8) {
  for (const side of [-1, 1]) {
    p.shape(
      [
        c(cx + side * 0.02 * s, cy - 0.04 * s),
        c(cx + side * 0.06 * s, cy + 0.16 * s),
        c(cx + side * 0.14 * s, cy + 0.24 * s),
        c(cx + side * 0.09 * s, cy + 0.06 * s),
      ],
      k,
    );
  }
  for (const side of [-1, 1]) {
    p.shape(
      [
        c(cx, cy),
        [cx + side * 0.12 * s, cy - 0.16 * s],
        [cx + side * 0.26 * s, cy - 0.12 * s],
        [cx + side * 0.24 * s, cy + 0.02 * s],
        [cx + side * 0.12 * s, cy + 0.04 * s],
      ],
      k,
    );
    p.line(
      [
        [cx + side * 0.05 * s, cy - 0.03 * s],
        [cx + side * 0.15 * s, cy - 0.07 * s],
        [cx + side * 0.2 * s, cy - 0.04 * s],
      ],
      k * 0.6,
    );
  }
  p.shape(ellipse(cx, cy, 0.05 * s, 0.055 * s, 10), k);
}

const bouquet = {
  w: 0.66,
  h: 1,
  tilt: 0.15,
  draw(p) {
    leaf(p, -0.12, -0.2, -2.3, 0.26);
    leaf(p, 0.1, -0.22, -0.75, 0.26);
    leaf(p, 0.0, -0.25, -1.6, 0.24);
    for (const [x, y, r] of [
      [-0.17, -0.3, 0.12],
      [0.14, -0.32, 0.115],
      [-0.25, -0.1, 0.105],
      [0.22, -0.12, 0.105],
      [-0.02, -0.17, 0.13],
    ]) {
      rose(p, x, y, r);
    }
    // The paper cone, its fold, the bow.
    p.shape([c(-0.33, -0.05), [0, 0.0], c(0.33, -0.05), c(0.05, 0.48), c(-0.05, 0.48)]);
    p.line(
      [
        [-0.1, -0.02],
        [-0.02, 0.2],
        [0.02, 0.46],
      ],
      0.5,
    );
    bow(p, 0, 0.22, 0.75);
  },
};

const banner = {
  w: 1,
  h: 0.56,
  tilt: 0.1,
  draw(p) {
    const string = (x) => [x, -0.22 + 0.1 * (1 - (x / 0.5) ** 2)];
    p.line(
      Array.from({ length: 11 }, (_, i) => string(-0.5 + i * 0.1)),
      0.6,
    );
    const letters = [
      (at) => [[at(-0.04, -0.07, true), at(-0.04, 0.07, true), at(0.05, 0.07, true)]],
      () => null,
      (at) => [[at(-0.055, -0.07, true), at(0, 0.075, true), at(0.055, -0.07, true)]],
      (at) => [
        [
          at(0.05, -0.07, true),
          at(-0.045, -0.07, true),
          at(-0.045, 0.07, true),
          at(0.05, 0.07, true),
        ],
        [at(-0.045, 0, true), at(0.035, 0, true)],
      ],
    ];
    letters.forEach((letter, i) => {
      const x = -0.36 + i * 0.24;
      const [sx, sy] = string(x);
      const a = (x / 0.5) * -0.12;
      const t = (pts) =>
        turn(
          pts.map(([px, py, k]) => (k ? [px + sx, py + sy, true] : [px + sx, py + sy])),
          a,
          sx,
          sy,
        );
      p.poly(t([c(-0.095, -0.01), c(0.095, -0.01), c(0.095, 0.21), c(0, 0.28), c(-0.095, 0.21)]));
      const at = (u, v, k) => t([[u, v + 0.11, k]])[0];
      const strokes = letter(at);
      if (strokes) for (const s of strokes) p.wire(s, 0.022, 0.6);
      else {
        const [ox, oy] = at(0, 0);
        p.shape(turn(ellipse(ox, oy, 0.06, 0.075, 14), a, ox, oy), 0.75);
        p.shape(turn(ellipse(ox, oy, 0.035, 0.05, 12), a, ox, oy), 0.6);
      }
    });
    p.shape(heart(-0.47, -0.17, 0.08), 0.6);
    p.shape(heart(0.47, -0.17, 0.08), 0.6);
  },
};

const padlock = {
  w: 0.8,
  h: 1,
  tilt: 0.2,
  draw(p) {
    p.wire(
      [
        [-0.15, -0.08],
        [-0.16, -0.3],
        [-0.08, -0.42],
        [0, -0.44],
        [0.08, -0.42],
        [0.16, -0.3],
        [0.15, -0.08],
      ],
      0.07,
    );
    p.shape(heart(0, 0.12, 0.74));
    p.line(
      [
        [-0.24, -0.04],
        [-0.27, 0.06],
        [-0.2, 0.16],
      ],
      0.55,
    );
    p.shape(
      sym([c(0, 0.0), [0.04, 0.005], [0.055, 0.045], [0.035, 0.085], c(0.045, 0.2), c(0, 0.2)]),
      0.8,
    );
  },
};

const key = {
  w: 0.36,
  h: 1,
  tilt: 0.5,
  draw(p) {
    p.poly(rrect(-0.03, -0.12, 0.03, 0.48, 0.01));
    p.poly([
      c(0.03, 0.3),
      c(0.12, 0.3),
      c(0.12, 0.36),
      c(0.08, 0.36),
      c(0.08, 0.4),
      c(0.12, 0.4),
      c(0.12, 0.47),
      c(0.03, 0.47),
    ]);
    p.shape(ellipse(0, -0.12, 0.06, 0.025, 10), 0.8);
    p.shape(heart(0, -0.3, 0.34));
    p.shape(heart(0, -0.31, 0.15), 0.7);
  },
};

const giftHeart = {
  w: 0.86,
  h: 1,
  tilt: 0.15,
  draw(p) {
    p.shape(heart(0, 0.1, 0.78));
    p.shape(heart(0, 0.06, 0.62), 0.7);
    p.line(
      [
        [-0.22, -0.06],
        [-0.24, 0.04],
        [-0.17, 0.14],
      ],
      0.5,
    );
    bow(p, 0, -0.24, 1.1);
  },
};

const envelope = {
  w: 1,
  h: 0.84,
  tilt: 0.15,
  draw(p) {
    p.poly([c(-0.48, -0.2), c(0, -0.47), c(0.48, -0.2)], 0.9);
    p.poly(rrect(-0.48, -0.2, 0.48, 0.42, 0.02));
    // The letter, half out.
    p.poly(rrect(-0.38, -0.42, 0.38, 0.2, 0.01));
    for (const y of [-0.3, -0.22, -0.14])
      p.seg(
        [
          [-0.3, y],
          [y === -0.14 ? 0.1 : 0.3, y],
        ],
        0.45,
      );
    p.shape(heart(0.2, -0.05, 0.1), 0.6);
    // The front: its folds and a seal.
    p.poly([c(-0.48, -0.2), c(0, 0.12), c(0.48, -0.2), c(0.48, 0.42), c(-0.48, 0.42)]);
    p.seg(
      [
        [-0.48, 0.42],
        [-0.08, 0.1],
      ],
      0.5,
    );
    p.seg(
      [
        [0.48, 0.42],
        [0.08, 0.1],
      ],
      0.5,
    );
    p.shape(scallop(0, 0.14, 0.085, 9, 0.15), 0.8);
    p.shape(heart(0, 0.14, 0.09), 0.6);
  },
};

const longRose = {
  w: 0.44,
  h: 1,
  tilt: 0.4,
  draw(p) {
    p.wire(
      [
        [0.02, 0.5],
        [-0.02, 0.2],
        [0.01, -0.05],
        [0, -0.22],
      ],
      0.035,
    );
    for (const [y, s] of [
      [0.38, 1],
      [0.12, -1],
      [0.02, 1],
    ]) {
      p.poly([c(s * 0.015, y), c(s * 0.055, y - 0.035), c(s * 0.015, y - 0.03)], 0.6);
    }
    leaf(p, 0.0, 0.26, -0.5, 0.2);
    leaf(p, -0.01, 0.07, -2.6, 0.18);
    // The bloom from the side: sepals, the cup, petals folding over.
    leaf(p, 0, -0.2, -0.7, 0.1, 0.6);
    leaf(p, 0, -0.2, -2.45, 0.1, 0.6);
    p.shape(
      sym([c(0, -0.5), [0.09, -0.47], [0.17, -0.4], [0.17, -0.3], [0.1, -0.21], c(0, -0.18)]),
    );
    p.shape(
      [
        c(-0.17, -0.37),
        [-0.12, -0.27],
        [-0.02, -0.22],
        c(0.08, -0.25),
        [0.0, -0.33],
        [-0.08, -0.38],
      ],
      0.8,
    );
    p.shape(
      [c(0.17, -0.36), [0.12, -0.26], [0.03, -0.22], c(-0.04, -0.27), [0.05, -0.33], [0.12, -0.38]],
      0.8,
    );
    p.line(
      [
        [-0.07, -0.45],
        [0, -0.41],
        [0.07, -0.45],
      ],
      0.5,
    );
  },
};

const cupidArrow = {
  w: 1,
  h: 0.3,
  tilt: 0.5,
  draw(p) {
    p.poly(bar(-0.4, 0, 0.32, 0, 0.022), 0.8);
    p.shape(
      turn(heart(0.0, 0, 0.18), Math.PI / 2).map(([x, y, k]) =>
        k ? [x + 0.4, y, true] : [x + 0.4, y],
      ),
    );
    for (const s of [-1, 1]) {
      p.shape([c(-0.48, s * 0.01), c(-0.46, s * 0.1), c(-0.36, s * 0.1), c(-0.32, s * 0.01)], 0.8);
    }
  },
};

writeTheme('valentin', {
  seed: 401,
  thumb: wingedHeart,
  front: [wingedHeart, bouquet, padlock, envelope, giftHeart],
  middle: [banner, key, longRose, cupidArrow, heartItem, giftHeart],
  back: [heartItem, sparkleItem, heartItem],
});
