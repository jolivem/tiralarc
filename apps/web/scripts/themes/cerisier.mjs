/**
 * The "cerisier" (cherry blossom) decoration: gnarled cherry branches with their bark's
 * lenticels, blossom clusters on short stalks (flowers of every size, open or seen at an angle,
 * buds, young leaves), petals drifting down and butterflies near and far. Things overlap and
 * shrink with distance (thinner lines far away), so the bands read as one scene.
 *
 *   node apps/web/scripts/themes/cerisier.mjs   → apps/web/public/themes/cerisier/*.svg
 */
import { writeFileSync } from 'node:fs';
import { branchOutline, Drawing, place, random, smooth, wander } from './lib.mjs';

const OUT = new URL('../../public/themes/cerisier/', import.meta.url);
const TAU = Math.PI * 2;

// ------------------------------------------------------------------ elements

/** One petal, base at (0, 0), pointing up (−y), 1 long: rounded, notched at its tip. */
function petalPoints(rand, width = 1) {
  const j = () => rand.range(-0.025, 0.025);
  return [
    [0, 0],
    [-0.17 * width + j(), -0.16 + j()],
    [-0.36 * width + j(), -0.42 + j()],
    [-0.42 * width + j(), -0.68 + j()],
    [-0.33 * width + j(), -0.9 + j()],
    [-0.15 * width + j(), -1 + j()],
    [-0.04 * width, -0.95],
    [0, -0.85 + j()],
    [0.04 * width, -0.95],
    [0.15 * width + j(), -1 + j()],
    [0.33 * width + j(), -0.9 + j()],
    [0.42 * width + j(), -0.68 + j()],
    [0.36 * width + j(), -0.42 + j()],
    [0.17 * width + j(), -0.16 + j()],
  ];
}

const circlePoints = (radius, count = 14) =>
  Array.from({ length: count }, (_, i) => [
    Math.cos((i / count) * TAU) * radius,
    Math.sin((i / count) * TAU) * radius,
  ]);

/** Lines get thinner as things get smaller (further away). */
const strokeFor = (size, near = 46) => Math.max(2.6, Math.min(5.5, 2.4 + (size / near) * 3.1));

/** An open cherry flower: five overlapping notched petals, stamens, its heart. */
function flower(d, rand, { x, y, r, rotate = rand.range(0, TAU), tilt = 1, tiltAxis = 0 }) {
  const stroke = strokeFor(r);
  const view = { x, y, tilt, tiltAxis };
  for (let i = 0; i < 5; i++) {
    const angle = rotate + (i * TAU) / 5 + rand.range(-0.09, 0.09);
    const petal = place(petalPoints(rand, rand.range(1, 1.2)), {
      x: 0,
      y: 0,
      scale: r * rand.range(0.94, 1.06),
      rotate: angle,
    });
    d.shape(smooth(place(petal, view)), stroke);
  }
  // Stamens: fine lines from the heart, each ending in an anther (fewer on small flowers, so
  // they don't turn into a blot).
  const count = r > 32 ? 13 : r > 22 ? 9 : 6;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * TAU + rand.range(-0.15, 0.15);
    const length = r * rand.range(0.4, 0.56);
    const [start, middle, end] = place(
      [
        [Math.cos(a) * r * 0.12, Math.sin(a) * r * 0.12],
        [Math.cos(a + 0.08) * length * 0.6, Math.sin(a + 0.08) * length * 0.6],
        [Math.cos(a) * length, Math.sin(a) * length],
      ],
      view,
    );
    d.line(smooth([start, middle, end], false), Math.max(1.5, stroke * 0.42));
    if (r > 18) d.dot(end[0], end[1], Math.max(1.8, r * 0.045));
  }
  d.shape(smooth(place(circlePoints(r * 0.15), view)), stroke * 0.8);
}

/** A bud on its stalk's end: a closed teardrop, its fold, two sepals holding it. */
function bud(d, rand, { x, y, size, angle }) {
  const stroke = strokeFor(size * 1.6);
  const rotate = angle + Math.PI / 2;
  const body = [
    [0, 0],
    [-0.42, -0.3],
    [-0.44, -0.7],
    [-0.2, -1.02],
    [0, -1.1],
    [0.2, -1.02],
    [0.44, -0.7],
    [0.42, -0.3],
  ];
  d.shape(smooth(place(body, { x, y, scale: size, rotate })), stroke);
  d.line(
    smooth(
      place(
        [
          [0.05, -1.02],
          [0.16, -0.6],
          [0.08, -0.2],
        ],
        { x, y, scale: size, rotate },
      ),
      false,
    ),
    stroke * 0.6,
  );
  for (const side of [-1, 1]) {
    const sepal = [
      [0, 0.05],
      [side * 0.18, -0.08],
      [side * 0.34, -0.42],
      [side * 0.1, -0.16],
    ];
    d.shape(smooth(place(sepal, { x, y, scale: size, rotate })), stroke * 0.85);
  }
}

/** A young leaf: pointed, finely toothed, with its midrib. */
function leaf(d, rand, { x, y, size, angle }) {
  const stroke = strokeFor(size * 0.9);
  const rotate = angle + Math.PI / 2;
  const edge = [];
  const steps = 9;
  for (let side of [-1, 1]) {
    const half = [];
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const width = Math.sin(Math.PI * Math.pow(t, 0.8)) * 0.3;
      const tooth = i % 2 === 0 ? 0.03 : 0;
      half.push([side * (width + tooth), -t]);
    }
    edge.push(side < 0 ? half : half.reverse());
  }
  const points = [[0, 0], ...edge[0], [0, -1.02], ...edge[1]];
  d.shape(smooth(place(points, { x, y, scale: size, rotate })), stroke);
  d.line(
    smooth(
      place(
        [
          [0, -0.04],
          [0.02, -0.5],
          [0, -0.86],
        ],
        { x, y, scale: size, rotate },
      ),
      false,
    ),
    stroke * 0.6,
  );
  // Two side veins each way, kept off the edge.
  for (const t of [0.35, 0.6]) {
    for (const side of [-1, 1]) {
      d.line(
        smooth(
          place(
            [
              [0, -t],
              [side * 0.13, -t - 0.12],
            ],
            { x, y, scale: size, rotate },
          ),
          false,
        ),
        stroke * 0.45,
      );
    }
  }
}

/** A single petal drifting down. */
function fallingPetal(d, rand, { x, y, size }) {
  const points = place(petalPoints(rand, rand.range(1.05, 1.3)), {
    x,
    y,
    scale: size,
    rotate: rand.range(0, TAU),
    tilt: rand.range(0.45, 1),
    tiltAxis: rand.range(0, TAU),
  });
  d.shape(smooth(points), strokeFor(size * 2.2));
}

/**
 * A butterfly, body along its axis (`rotate`), wings open; `turn` < 1 narrows the far side's
 * wings (seen at an angle). Each wing has an inner band and spots to colour.
 */
function butterfly(d, rand, { x, y, size, rotate = 0, turn = 1 }) {
  const stroke = strokeFor(size * 0.55);
  // Right wings, head up (−y): the forewing's leading edge rises to a rounded tip, its outer
  // edge comes back down; the hindwing is rounder, scalloped, below it.
  const fore = [
    [0.06, -0.08],
    [0.22, -0.42],
    [0.48, -0.7],
    [0.78, -0.86],
    [0.96, -0.8],
    [0.98, -0.6],
    [0.86, -0.36],
    [0.66, -0.16],
    [0.36, -0.04],
    [0.08, 0.02],
  ];
  const hind = [
    [0.07, 0.04],
    [0.38, 0.0],
    [0.62, 0.08],
    [0.74, 0.26],
    [0.7, 0.46],
    [0.56, 0.6],
    [0.38, 0.68],
    [0.22, 0.6],
    [0.1, 0.4],
    [0.05, 0.18],
  ];
  const view = (side) => (points) =>
    place(
      points.map(([px, py]) => [px * side * (side < 0 ? turn : 1), py]),
      { x, y, scale: size, rotate },
    );
  /**
   * The wing's inner panel: its outline drawn in towards a point near the body, so the band
   * along the wing's outer edge (with its spots) is wider than at its root.
   */
  const inner = (points, k) => {
    const cx = points.reduce((s, p) => s + p[0], 0) / points.length;
    const cy = points.reduce((s, p) => s + p[1], 0) / points.length;
    const [ox, oy] = [cx * 0.55, cy * 0.75];
    return points.map(([px, py]) => [ox + (px - ox) * k, oy + (py - oy) * k]);
  };
  const spot = (cx, cy, radius) => circlePoints(radius, 10).map(([a, b]) => [a + cx, b + cy]);
  // The far wings first (hidden in part by the body and the near ones).
  for (const side of [-1, 1]) {
    const v = view(side);
    d.shape(smooth(v(hind)), stroke);
    d.shape(smooth(v(inner(hind, 0.6))), stroke * 0.65);
    d.shape(smooth(v(spot(0.56, 0.48, 0.045))), stroke * 0.55);
    d.shape(smooth(v(fore)), stroke);
    d.shape(smooth(v(inner(fore, 0.62))), stroke * 0.65);
    // Spots in the band along the forewing's tip.
    d.shape(smooth(v(spot(0.86, -0.7, 0.05))), stroke * 0.55);
    d.shape(smooth(v(spot(0.84, -0.48, 0.035))), stroke * 0.55);
  }
  // Body, head and antennae, in front.
  const body = [
    [0, -0.34],
    [-0.07, -0.2],
    [-0.075, 0.1],
    [-0.045, 0.5],
    [0, 0.6],
    [0.045, 0.5],
    [0.075, 0.1],
    [0.07, -0.2],
  ];
  const at = view(1);
  d.shape(smooth(at(body)), stroke);
  d.shape(smooth(at(circlePoints(0.075, 10).map(([a, b]) => [a, b - 0.4]))), stroke * 0.8);
  for (const side of [-1, 1]) {
    const antenna = view(side)([
      [0.02, -0.45],
      [0.1, -0.68],
      [0.26, -0.86],
    ]);
    d.line(smooth(antenna, false), stroke * 0.55);
    d.dot(antenna[2][0], antenna[2][1], Math.max(2, size * 0.035));
  }
}

// ------------------------------------------------------------------ branches

/**
 * A branch and its twigs (`depth` levels), drawn twigs first (their bases hidden under it).
 * Returns the spurs where blossom clusters grow: along the twigs and at their tips.
 */
function grow(d, rand, { points, base, tip, depth, bounds, spurs }) {
  const { d: outline, spine } = branchOutline(points, { base, tip, rand });
  const children = [];
  if (depth > 0) {
    const count = Math.max(1, Math.round(spine.length / rand.range(32, 48)));
    let side = rand.chance(0.5) ? 1 : -1;
    for (let i = 0; i < count; i++) {
      const s =
        spine[
          Math.floor(spine.length * rand.range(0.18 + (i / count) * 0.6, 0.24 + (i / count) * 0.62))
        ];
      if (!s || s.width < 7) continue;
      const angle = s.angle + side * rand.range(0.5, 1.05);
      side = -side;
      const length = rand.range(24, 34) * (depth === 1 ? 0.8 : 1);
      children.push({
        points: wander({
          x: s.x,
          y: s.y,
          angle,
          segments: rand.range(2, depth > 1 ? 6 : 4) | 0,
          length,
          bend: 0.45,
          pull: 0.15,
          rand,
          heading: angle + rand.range(-0.3, 0.3),
          bounds,
        }),
        base: s.width * rand.range(0.5, 0.62),
        tip: Math.max(5, s.width * 0.22),
        depth: depth - 1,
      });
    }
  }
  for (const child of children) grow(d, rand, { ...child, bounds, spurs });
  d.shape(outline, Math.max(3, Math.min(6, base * 0.22)));
  // Bark, kept off the edges: the cherry's lenticels (short marks across the wood, by twos at
  // times, slightly bowed) and, on the thick wood, a few long grain lines along it.
  const across = (s, off, half, bow) => {
    const nx = -Math.sin(s.angle);
    const ny = Math.cos(s.angle);
    const tx = Math.cos(s.angle) * bow;
    const ty = Math.sin(s.angle) * bow;
    return smooth(
      [
        [s.x + nx * (off - half), s.y + ny * (off - half)],
        [s.x + nx * off + tx, s.y + ny * off + ty],
        [s.x + nx * (off + half), s.y + ny * (off + half)],
      ],
      false,
    );
  };
  for (let i = 0; i < spine.length; i++) {
    const s = spine[i];
    if (s.width > 12 && rand.chance(0.06)) {
      const half = s.width * rand.range(0.1, 0.24);
      const off = rand.range(-0.12, 0.12) * s.width;
      d.line(across(s, off, half, rand.range(-2, 2)), 2);
      const twin = spine[i + 2];
      if (twin && rand.chance(0.4)) d.line(across(twin, off * 0.8, half * 0.7, 1), 2);
    }
  }
  if (base > 20) {
    for (let g = 0; g < 2; g++) {
      const from = Math.floor(spine.length * rand.range(0.05, 0.45));
      const to = Math.min(
        spine.length - 1,
        from + Math.floor(spine.length * rand.range(0.12, 0.3)),
      );
      const side = g === 0 ? 0.22 : -0.2;
      const grain = [];
      for (let i = from; i <= to; i += 3) {
        const s = spine[i];
        const fade = Math.sin(((i - from) / Math.max(1, to - from)) * Math.PI);
        const off = s.width * side * (0.6 + 0.4 * fade);
        grain.push([s.x - Math.sin(s.angle) * off, s.y + Math.cos(s.angle) * off]);
      }
      if (grain.length > 2) d.line(smooth(grain, false), 1.8);
    }
  }
  // Spurs: the tip, a few along the twigs and, now and then, on the old wood itself (cherries
  // bloom right on their branches), just off its edge.
  const end = spine.at(-1);
  spurs.push({ x: end.x, y: end.y, angle: end.angle, width: end.width, tip: true });
  for (const s of spine) {
    const side = rand.chance(0.5) ? 1 : -1;
    const normal = s.angle + (side * Math.PI) / 2;
    if (s.t > 0.2 && rand.chance(s.width < 16 ? 0.035 : 0.012)) {
      spurs.push({
        x: s.x + Math.cos(normal) * s.width * 0.35,
        y: s.y + Math.sin(normal) * s.width * 0.35,
        angle: normal,
        width: s.width,
      });
    }
  }
}

/**
 * Blossoms around a spur: a few flowers on stalks of different lengths, sizes and angles,
 * sometimes a bud or young leaves.
 */
function cluster(d, rand, spur, { sizes, inBounds, layerOf }) {
  const count = spur.tip ? rand.pick([2, 3, 3, 4]) : rand.pick([1, 2, 2, 3]);
  const items = [];
  for (let i = 0; i < count; i++) {
    const kind = rand.chance(0.2) ? 'bud' : 'flower';
    const angle = spur.angle + rand.range(-1.1, 1.1);
    const r =
      kind === 'bud' ? rand.range(sizes[0] * 0.5, sizes[0] * 0.9) : rand.range(sizes[0], sizes[1]);
    const stalk = r * rand.range(0.55, 1.1);
    // Near the band's edge, a smaller one on a shorter stalk rather than none.
    for (const k of [1, 0.65]) {
      const x = spur.x + Math.cos(angle) * stalk * k;
      const y = spur.y + Math.sin(angle) * stalk * k;
      if (!inBounds(x, y, r * k)) continue;
      items.push({ kind, angle, r: r * k, x, y });
      break;
    }
  }
  if (rand.chance(0.35)) {
    const angle = spur.angle + rand.range(-1.4, 1.4);
    const size = rand.range(sizes[1] * 0.8, sizes[1] * 1.3);
    if (
      inBounds(
        spur.x + Math.cos(angle) * size * 0.6,
        spur.y + Math.sin(angle) * size * 0.6,
        size * 0.6,
      )
    ) {
      items.unshift({ kind: 'leaf', angle, size });
    }
  }
  const stalks = [];
  const blooms = [];
  for (const item of items) {
    if (item.kind === 'leaf') {
      blooms.push(() =>
        leaf(d, rand, { x: spur.x, y: spur.y, size: item.size, angle: item.angle }),
      );
      continue;
    }
    const bend = rand.range(-0.25, 0.25);
    stalks.push(() =>
      d.line(
        smooth(
          [
            [spur.x, spur.y],
            [
              (spur.x + item.x) / 2 + Math.cos(item.angle + Math.PI / 2) * item.r * bend,
              (spur.y + item.y) / 2 + Math.sin(item.angle + Math.PI / 2) * item.r * bend,
            ],
            [item.x, item.y],
          ],
          false,
        ),
        Math.max(2, strokeFor(item.r) * 0.6),
      ),
    );
    blooms.push(() =>
      item.kind === 'bud'
        ? bud(d, rand, { x: item.x, y: item.y, size: item.r, angle: item.angle })
        : flower(d, rand, {
            x: item.x,
            y: item.y,
            r: item.r,
            // Some face us, others are seen at an angle.
            tilt: rand.chance(0.45) ? rand.range(0.45, 0.8) : rand.range(0.88, 1),
            tiltAxis: item.angle,
          }),
    );
  }
  layerOf(spur).push(...stalks, ...blooms);
}

// ------------------------------------------------------------------ scenes

/**
 * One band: its branches (`branches`, each a spine to grow), blossoms on them — the far ones
 * (smaller, thinner lines) behind the wood, the near ones in front —, drifting petals,
 * butterflies.
 */
function scene({ width, height, seed, branches, sizes, petals, butterflies, margin = 6 }) {
  const rand = random(seed);
  const d = new Drawing(width, height);
  const inBounds = (x, y, r) =>
    x - r > margin && x + r < width - margin && y - r > margin && y + r < height - margin;
  const back = [];
  const front = [];
  const spurs = [];
  // The wood, drawn into a buffer so the far blossoms can go behind it.
  const wood = new Drawing(width, height);
  for (const b of branches) grow(wood, rand, { ...b, spurs });
  for (const spur of spurs) {
    const far = rand.chance(0.3);
    cluster(d, rand, spur, {
      sizes: far ? [sizes[0] * 0.6, sizes[0] * 1.05] : sizes,
      inBounds,
      layerOf: () => (far ? back : front),
    });
  }
  for (const draw of back) draw();
  d.items.push(...wood.items);
  // Petals in the air: between the branches and the near blossoms.
  for (let i = 0; i < petals.count; i++) {
    const [x0, y0, x1, y1] = petals.area;
    const size = rand.range(petals.size[0], petals.size[1]);
    const x = rand.range(x0, x1);
    const y = rand.range(y0, y1);
    if (inBounds(x, y, size)) fallingPetal(d, rand, { x, y, size });
  }
  for (const draw of front) draw();
  for (const b of butterflies) butterfly(d, rand, b);
  return d.toString();
}

const H = 280;
const W = 2000;

const top = scene({
  width: W,
  height: H,
  seed: 11,
  sizes: [19, 48],
  branches: [
    {
      points: wander({
        x: -40,
        y: 70,
        angle: 0.08,
        segments: 26,
        length: 58,
        bend: 0.3,
        pull: 0.18,
        rand: random(1),
        heading: 0.04,
        bounds: [-60, 40, W + 60, 170],
      }),
      base: 44,
      tip: 5,
      depth: 2,
      bounds: [-60, 18, W + 60, H - 20],
    },
    {
      points: wander({
        x: W + 40,
        y: 78,
        angle: Math.PI - 0.1,
        segments: 12,
        length: 52,
        bend: 0.25,
        rand: random(2),
        heading: Math.PI + 0.12,
        bounds: [900, 30, W + 60, 200],
      }),
      base: 26,
      tip: 4,
      depth: 1,
      bounds: [-60, 18, W + 60, H - 20],
    },
  ],
  petals: { count: 14, area: [40, 150, W - 40, H - 14], size: [12, 22] },
  butterflies: [
    { x: 1640, y: 200, size: 78, rotate: -0.35, turn: 0.7 },
    { x: 760, y: 222, size: 34, rotate: 0.5, turn: 0.55 },
    { x: 1190, y: 214, size: 48, rotate: 0.2, turn: 0.85 },
  ],
});

const bottom = scene({
  width: W,
  height: H,
  seed: 23,
  sizes: [18, 46],
  branches: [
    {
      points: wander({
        x: W + 40,
        y: 225,
        angle: Math.PI + 0.06,
        segments: 24,
        length: 60,
        bend: 0.3,
        pull: 0.18,
        rand: random(3),
        heading: Math.PI - 0.02,
        bounds: [-60, 120, W + 60, 245],
      }),
      base: 42,
      tip: 5,
      depth: 2,
      bounds: [-60, 18, W + 60, H - 16],
    },
    {
      points: wander({
        x: -40,
        y: 250,
        angle: -0.25,
        segments: 10,
        length: 50,
        bend: 0.25,
        rand: random(4),
        heading: -0.18,
        bounds: [-60, 110, 1000, 255],
      }),
      base: 24,
      tip: 4,
      depth: 1,
      bounds: [-60, 18, W + 60, H - 16],
    },
  ],
  petals: { count: 14, area: [40, 16, W - 40, 130], size: [12, 22] },
  butterflies: [
    { x: 420, y: 74, size: 66, rotate: 0.4, turn: 0.75 },
    { x: 1480, y: 60, size: 30, rotate: -0.6, turn: 0.6 },
  ],
});

/** A side band: a branch coming down along it, twigs reaching across, butterflies on the way. */
function side(seed, mirror) {
  const SW = 300;
  const SH = 2200;
  const flip = (x) => (mirror ? SW - x : x);
  const a = (angle) => (mirror ? Math.PI - angle : angle);
  return scene({
    width: SW,
    height: SH,
    seed,
    sizes: [17, 40],
    branches: [
      {
        points: wander({
          x: flip(120),
          y: -40,
          angle: a(Math.PI / 2 - 0.12),
          segments: 40,
          length: 58,
          bend: 0.32,
          pull: 0.2,
          rand: random(seed + 1),
          heading: a(Math.PI / 2),
          bounds: [40, -60, SW - 40, SH + 60],
        }).map(([x, y]) => [x, y]),
        base: 36,
        tip: 5,
        depth: 2,
        bounds: [12, -60, SW - 12, SH + 60],
      },
      {
        points: wander({
          x: flip(-40),
          y: 1320,
          angle: a(0.5),
          segments: 8,
          length: 48,
          bend: 0.25,
          rand: random(seed + 2),
          heading: a(0.8),
          bounds: [-60, 1200, SW - 30, 1800],
        }),
        base: 22,
        tip: 4,
        depth: 1,
        bounds: [12, 1150, SW - 12, 1900],
      },
    ],
    petals: { count: 16, area: [20, 40, SW - 20, SH - 40], size: [11, 20] },
    butterflies: [
      { x: flip(200), y: 520, size: 62, rotate: a(0.3) - (mirror ? Math.PI : 0), turn: 0.7 },
      { x: flip(90), y: 1120, size: 30, rotate: mirror ? 0.6 : -0.6, turn: 0.6 },
      { x: flip(190), y: 1960, size: 44, rotate: mirror ? -0.3 : 0.3, turn: 0.85 },
    ],
  });
}

/** The picker's thumbnail: a twig in bloom and a butterfly. */
const thumb = scene({
  width: 400,
  height: 300,
  seed: 5,
  sizes: [30, 56],
  branches: [
    {
      points: wander({
        x: -30,
        y: 70,
        angle: 0.35,
        segments: 7,
        length: 62,
        bend: 0.2,
        rand: random(7),
        heading: 0.3,
        bounds: [-40, 40, 440, 220],
      }),
      base: 30,
      tip: 5,
      depth: 1,
      bounds: [-40, 10, 440, 290],
    },
  ],
  petals: { count: 5, area: [30, 180, 370, 290], size: [13, 20] },
  butterflies: [{ x: 320, y: 225, size: 60, rotate: -0.4, turn: 0.7 }],
});

writeFileSync(new URL('top.svg', OUT), top);
writeFileSync(new URL('bottom.svg', OUT), bottom);
writeFileSync(new URL('left.svg', OUT), side(41, false));
writeFileSync(new URL('right.svg', OUT), side(57, true));
writeFileSync(new URL('thumb.svg', OUT), thumb);
console.log('cerisier: top, bottom, left, right, thumb written');
