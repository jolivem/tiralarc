/**
 * The "rentree" (back to school) decoration: a satchel, a spiral notepad, a clipboard with its
 * checklist, a pile of books, pencils, a ruler, a set square, a sharpener, pushpins, paperclips,
 * an apple, maths signs, overlapping as one scene.
 *
 *   node apps/web/scripts/themes/rentree.mjs   → apps/web/public/themes/rentree/*.svg
 */
import { c, ellipse, rrect, star, sym, turn, writeTheme } from './lib.mjs';
import { apple, starItem } from './common.mjs';

const pushpin = {
  w: 0.5,
  h: 1,
  tilt: 0.6,
  draw(p) {
    p.poly([c(-0.022, 0.03), c(0.022, 0.03), c(0, 0.5)], 0.8);
    p.shape(ellipse(0, 0.02, 0.21, 0.06, 16));
    p.shape(
      sym([c(0, -0.38), c(0.12, -0.38), [0.085, -0.25], [0.08, -0.12], c(0.12, 0.01), c(0, 0.01)]),
    );
    p.shape(ellipse(0, -0.4, 0.22, 0.075, 16));
    p.line(
      [
        [-0.05, -0.3],
        [-0.045, -0.18],
        [-0.06, -0.06],
      ],
      0.5,
    );
  },
};

const notepad = {
  w: 0.76,
  h: 1,
  tilt: 0.12,
  draw(p) {
    p.poly(rrect(-0.3, -0.38, 0.37, 0.5, 0.02));
    p.poly([c(-0.36, -0.42), c(0.32, -0.42), c(0.32, 0.36), c(0.22, 0.46), c(-0.36, 0.46)]);
    p.poly([c(0.32, 0.36), c(0.22, 0.46), c(0.24, 0.38)], 0.8);
    p.seg(
      [
        [-0.22, -0.34],
        [-0.22, 0.46],
      ],
      0.5,
    );
    for (let y = -0.22; y < 0.4; y += 0.075) {
      p.seg(
        [
          [-0.33, y],
          [y > 0.33 ? 0.2 : 0.29, y],
        ],
        0.4,
      );
    }
    for (let i = 0; i < 9; i++) {
      const x = -0.3 + i * 0.075;
      p.shape(ellipse(x + 0.01, -0.36, 0.014, 0.014, 8), 0.6);
      p.wire(
        [
          [x + 0.01, -0.36],
          [x - 0.012, -0.44],
          [x + 0.012, -0.495],
          [x + 0.034, -0.45],
          [x + 0.03, -0.41],
        ],
        0.012,
        0.6,
      );
    }
  },
};

const clipboard = {
  w: 0.74,
  h: 1,
  tilt: 0.1,
  draw(p) {
    p.poly(rrect(-0.36, -0.42, 0.36, 0.5, 0.045));
    p.poly(rrect(-0.3, -0.33, 0.3, 0.44, 0.01));
    p.seg(
      [
        [-0.22, -0.2],
        [0.2, -0.2],
      ],
      0.9,
    );
    for (let i = 0; i < 4; i++) {
      const y = -0.08 + i * 0.13;
      p.poly(rrect(-0.24, y - 0.035, -0.17, y + 0.035, 0.008), 0.7);
      p.seg(
        [
          [-0.12, y],
          [0.22 - (i % 2) * 0.08, y],
        ],
        0.5,
      );
      if (i < 2)
        p.seg(
          [
            [-0.235, y - 0.005],
            [-0.21, y + 0.03],
            [-0.15, y - 0.07],
          ],
          0.8,
        );
    }
    // The clip: its plate and its ring.
    p.shape(sym([c(0, -0.5), [0.045, -0.49], c(0.065, -0.44), c(0, -0.44)]));
    p.shape(ellipse(0, -0.466, 0.018, 0.014, 8), 0.6);
    p.poly([c(-0.17, -0.35), c(-0.12, -0.45), c(0.12, -0.45), c(0.17, -0.35)]);
    p.seg(
      [
        [-0.1, -0.4],
        [0.1, -0.4],
      ],
      0.45,
    );
  },
};

const satchel = {
  w: 0.84,
  h: 1,
  tilt: 0.08,
  draw(p) {
    p.wire(
      [
        [-0.15, -0.16],
        [-0.14, -0.33],
        [0, -0.42],
        [0.14, -0.33],
        [0.15, -0.16],
      ],
      0.05,
    );
    p.poly(rrect(-0.42, -0.18, 0.42, 0.47, 0.08));
    p.shape(
      sym([c(0, -0.2), c(0.38, -0.2), [0.43, -0.14], [0.43, 0.08], [0.34, 0.17], c(0, 0.17)]),
    );
    p.line(
      [
        [-0.36, -0.13],
        [-0.37, 0.07],
        [-0.3, 0.12],
        [0.3, 0.12],
        [0.37, 0.07],
        [0.36, -0.13],
      ],
      0.45,
    );
    for (const x of [-0.2, 0.2]) {
      p.poly(rrect(x - 0.05, -0.2, x + 0.05, 0.28, 0.01), 0.8);
      p.poly(rrect(x - 0.075, 0.12, x + 0.075, 0.24, 0.015), 0.9);
      p.poly(rrect(x - 0.035, 0.155, x + 0.035, 0.205, 0.01), 0.6);
    }
    // A pocket, a name tag.
    p.poly(rrect(-0.1, 0.24, 0.1, 0.38, 0.02), 0.7);
    p.line(
      [
        [-0.06, 0.3],
        [0.06, 0.3],
      ],
      0.5,
    );
    p.line(
      [
        [-0.06, 0.33],
        [0.03, 0.33],
      ],
      0.5,
    );
  },
};

const books = {
  w: 1,
  h: 0.76,
  tilt: 0.06,
  draw(p) {
    const book = (x0, y0, x1, y1, a = 0) => {
      const cx = (x0 + x1) / 2;
      const cy = (y0 + y1) / 2;
      const t = (pts) => turn(pts, a, cx, cy);
      // Cover, then the page block showing at one end.
      p.poly(t(rrect(x0, y0, x1, y1, 0.02)));
      p.poly(
        t([
          c(x1 - 0.1, y0 + 0.03),
          c(x1 + 0.015, y0 + 0.03),
          c(x1 + 0.015, y1 - 0.03),
          c(x1 - 0.1, y1 - 0.03),
        ]),
        0.8,
      );
      for (let k = 1; k < 4; k++) {
        const y = y0 + 0.03 + ((y1 - y0 - 0.06) * k) / 4;
        p.seg(
          t([
            [x1 - 0.09, y],
            [x1 + 0.01, y],
          ]),
          0.35,
        );
      }
      for (const x of [x0 + 0.06, x0 + 0.09])
        p.seg(
          t([
            [x, y0],
            [x, y1],
          ]),
          0.5,
        );
      p.poly(
        t(rrect(cx - 0.14, cy - (y1 - y0) * 0.22, cx + 0.06, cy + (y1 - y0) * 0.22, 0.01)),
        0.6,
      );
    };
    book(-0.48, 0.17, 0.42, 0.38);
    book(-0.42, -0.04, 0.44, 0.17);
    book(-0.36, -0.25, 0.32, -0.04, -0.05);
    p.poly([c(0.18, 0.15), c(0.24, 0.15), c(0.24, 0.36), c(0.21, 0.32), c(0.18, 0.36)], 0.8);
  },
};

const pencil = {
  w: 1,
  h: 0.16,
  tilt: 0.5,
  draw(p) {
    p.shape([c(0.29, -0.07), c(0.5, 0), c(0.29, 0.07)]);
    p.poly([c(0.44, -0.021), c(0.5, 0), c(0.44, 0.021)], 0.7);
    p.shape([
      c(-0.32, -0.07),
      c(0.31, -0.07),
      [0.27, -0.035],
      [0.31, 0],
      [0.27, 0.035],
      c(0.31, 0.07),
      c(-0.32, 0.07),
    ]);
    p.seg(
      [
        [-0.32, -0.023],
        [0.28, -0.023],
      ],
      0.5,
    );
    p.seg(
      [
        [-0.32, 0.023],
        [0.28, 0.023],
      ],
      0.5,
    );
    p.shape([c(-0.42, -0.07), [-0.48, -0.065], [-0.5, 0], [-0.48, 0.065], c(-0.42, 0.07)]);
    p.poly(rrect(-0.43, -0.078, -0.31, 0.078, 0.01));
    p.seg(
      [
        [-0.39, -0.078],
        [-0.39, 0.078],
      ],
      0.5,
    );
    p.seg(
      [
        [-0.35, -0.078],
        [-0.35, 0.078],
      ],
      0.5,
    );
  },
};

const ruler = {
  w: 1,
  h: 0.22,
  tilt: 0.4,
  draw(p) {
    p.poly(rrect(-0.5, -0.1, 0.5, 0.1, 0.02));
    p.seg(
      [
        [-0.5, 0.055],
        [0.5, 0.055],
      ],
      0.5,
    );
    for (let i = 0; i <= 20; i++) {
      const x = -0.46 + i * 0.044;
      const length = i % 10 === 0 ? 0.08 : i % 5 === 0 ? 0.06 : 0.035;
      p.seg(
        [
          [x, -0.1],
          [x, -0.1 + length],
        ],
        0.45,
      );
    }
    p.shape(ellipse(0.455, 0.0, 0.022, 0.022, 10), 0.6);
  },
};

const setSquare = {
  w: 1,
  h: 0.62,
  tilt: 0.3,
  draw(p) {
    p.poly([c(-0.48, 0.29), c(0.48, 0.29), c(-0.48, -0.31)]);
    p.poly([c(-0.34, 0.18), c(0.14, 0.18), c(-0.34, -0.12)], 0.8);
    for (let i = 1; i < 18; i++) {
      const x = -0.46 + i * 0.05;
      p.seg(
        [
          [x, 0.29],
          [x, 0.29 - (i % 5 === 0 ? 0.06 : 0.035)],
        ],
        0.45,
      );
    }
    for (let i = 1; i < 10; i++) {
      const y = 0.27 - i * 0.05;
      p.seg(
        [
          [-0.48, y],
          [-0.48 + (i % 5 === 0 ? 0.06 : 0.035), y],
        ],
        0.45,
      );
    }
  },
};

const sharpener = {
  w: 0.62,
  h: 0.52,
  tilt: 0.2,
  draw(p) {
    p.poly([c(-0.3, -0.1), c(-0.18, -0.24), c(0.3, -0.24), c(0.18, -0.1)]);
    p.poly([c(0.18, -0.1), c(0.3, -0.24), c(0.3, 0.12), c(0.18, 0.26)]);
    p.poly([c(-0.3, -0.1), c(0.18, -0.1), c(0.18, 0.26), c(-0.3, 0.26)]);
    p.shape(ellipse(-0.06, 0.08, 0.11, 0.11, 16));
    p.shape(ellipse(-0.06, 0.08, 0.05, 0.05, 12), 0.7);
    p.dot(-0.06, 0.08, 0.012);
    // The blade, screwed on top.
    p.poly([c(-0.2, -0.13), c(-0.12, -0.21), c(0.16, -0.21), c(0.08, -0.13)], 0.7);
    p.shape(ellipse(0.06, -0.17, 0.018, 0.012, 8), 0.5);
  },
};

const paperclip = {
  w: 0.3,
  h: 1,
  tilt: 0.7,
  draw(p) {
    p.wire(
      [
        [0.05, -0.18],
        [0.05, 0.3],
        [0.04, 0.37],
        [0, 0.39],
        [-0.04, 0.37],
        [-0.05, 0.3],
        [-0.05, -0.33],
        [-0.035, -0.42],
        [0.03, -0.45],
        [0.09, -0.42],
        [0.1, -0.33],
        [0.1, 0.38],
        [0.085, 0.46],
        [0, 0.49],
        [-0.085, 0.46],
        [-0.1, 0.38],
        [-0.1, -0.22],
      ],
      0.028,
    );
  },
};

const plusSign = {
  w: 1,
  h: 1,
  tilt: 0.3,
  draw(p) {
    const a = 0.13;
    p.poly([
      c(-a, -0.45),
      c(a, -0.45),
      c(a, -a),
      c(0.45, -a),
      c(0.45, a),
      c(a, a),
      c(a, 0.45),
      c(-a, 0.45),
      c(-a, a),
      c(-0.45, a),
      c(-0.45, -a),
      c(-a, -a),
    ]);
  },
};

const equalsSign = {
  w: 1,
  h: 0.7,
  tilt: 0.3,
  draw(p) {
    p.poly(rrect(-0.45, -0.3, 0.45, -0.06, 0.04));
    p.poly(rrect(-0.45, 0.06, 0.45, 0.3, 0.04));
  },
};

const rootSign = {
  w: 1,
  h: 0.8,
  tilt: 0.2,
  draw(p) {
    p.wire(
      [
        [-0.45, 0.05],
        [-0.32, -0.02],
        [-0.15, 0.36],
        [0.08, -0.36],
        [0.45, -0.36],
      ],
      0.07,
    );
    p.shape(star(0.25, 0.06, 0.16, 0.45), 0.8);
  },
};

writeTheme('rentree', {
  seed: 201,
  thumb: satchel,
  front: [satchel, notepad, clipboard, books],
  middle: [ruler, setSquare, pencil, sharpener, apple, pushpin, paperclip, pencil],
  back: [plusSign, equalsSign, rootSign, starItem, paperclip, pushpin],
});
