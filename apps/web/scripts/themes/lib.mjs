/**
 * Line-art helpers for the calendar decoration themes (public/themes/<id>/): black strokes on
 * white, every shape closed and filled white, so that what is drawn later hides what it overlaps
 * (depth) and the "paint bucket" (components/journal/coloring.ts) fills each visible area.
 * Pure geometry, written as SVG paths; the theme scripts compose them.
 */
import { writeFileSync } from 'node:fs';

/** A seeded random generator (mulberry32): the same drawing every run. */
export function random(seed) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  next.range = (min, max) => min + (max - min) * next();
  next.pick = (list) => list[Math.floor(next() * list.length)];
  next.chance = (p) => next() < p;
  return next;
}

const r1 = (v) => Math.round(v * 10) / 10;

/** A smooth path through `points` (Catmull-Rom as cubic Béziers); closed by default. */
export function smooth(points, closed = true, tension = 1) {
  const n = points.length;
  if (n < 2) return '';
  const at = (i) => (closed ? points[(i + n) % n] : points[Math.max(0, Math.min(n - 1, i))]);
  let d = `M${r1(points[0][0])} ${r1(points[0][1])}`;
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p1 = at(i);
    const p2 = at(i + 1);
    // A corner (third element true) keeps the curve straight on its side.
    const p0 = p1[2] ? p1 : at(i - 1);
    const p3 = p2[2] ? p2 : at(i + 2);
    const k = tension / 6;
    const c1 = [p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k];
    const c2 = [p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k];
    d += `C${r1(c1[0])} ${r1(c1[1])} ${r1(c2[0])} ${r1(c2[1])} ${r1(p2[0])} ${r1(p2[1])}`;
  }
  return closed ? `${d}Z` : d;
}

/** Points along a smooth open curve through `points`, every `step` units or so. */
export function sample(points, step = 6) {
  const out = [];
  const n = points.length;
  const at = (i) => points[Math.max(0, Math.min(n - 1, i))];
  for (let i = 0; i < n - 1; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    const length = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    const count = Math.max(2, Math.ceil(length / step));
    for (let s = 0; s < count; s++) {
      const t = s / count;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a, b, c, d) =>
        0.5 *
        (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(points[n - 1]);
  return out;
}

/** Rotates, then squashes along `tiltAxis` (a flower seen at an angle), then moves `points`. */
export function place(points, { x, y, scale = 1, rotate = 0, tilt = 1, tiltAxis = 0 }) {
  const cr = Math.cos(rotate);
  const sr = Math.sin(rotate);
  const ca = Math.cos(tiltAxis);
  const sa = Math.sin(tiltAxis);
  return points.map(([px, py, corner]) => {
    let qx = (px * cr - py * sr) * scale;
    let qy = (px * sr + py * cr) * scale;
    // Into the tilt's axes, squashed across it, and back.
    const u = qx * ca + qy * sa;
    const v = (-qx * sa + qy * ca) * tilt;
    qx = u * ca - v * sa;
    qy = u * sa + v * ca;
    return corner ? [x + qx, y + qy, true] : [x + qx, y + qy];
  });
}

/** An SVG collector: shapes in drawing order (later ones in front). */
export class Drawing {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.items = [];
  }

  /** A closed shape, white inside, outlined. */
  shape(d, stroke = 5) {
    this.items.push(`<path d="${d}" stroke-width="${r1(stroke)}"/>`);
  }

  /** An open line (veins, stamens, bark marks): never closes an area by itself. */
  line(d, stroke = 3) {
    this.items.push(`<path d="${d}" fill="none" stroke-width="${r1(stroke)}"/>`);
  }

  /** A wire: a band of `width` outlined (strings, stems, straps), white inside. */
  wire(d, width, stroke = 3) {
    this.items.push(`<path d="${d}" fill="none" stroke-width="${r1(width + stroke * 2)}"/>`);
    this.items.push(`<path d="${d}" fill="none" stroke="#fff" stroke-width="${r1(width)}"/>`);
  }

  /** A small black dot (anthers, antennae tips). */
  dot(x, y, radius) {
    this.items.push(
      `<circle cx="${r1(x)}" cy="${r1(y)}" r="${r1(radius)}" fill="#000" stroke="none"/>`,
    );
  }

  /** A closed circle, white inside. */
  circle(x, y, radius, stroke = 4) {
    this.items.push(
      `<circle cx="${r1(x)}" cy="${r1(y)}" r="${r1(radius)}" stroke-width="${r1(stroke)}"/>`,
    );
  }

  toString() {
    const { width: w, height: h } = this;
    return (
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">` +
      `<rect width="${w}" height="${h}" fill="#fff"/>` +
      `<g fill="#fff" stroke="#000" stroke-linejoin="round" stroke-linecap="round">` +
      this.items.join('') +
      `</g></svg>\n`
    );
  }
}

/**
 * A branch as a closed outline around its spine (`points`, base first): `base` wide at its
 * start, tapering to `tip`, with small knots; returns its outline and the spine samples (with
 * the width there and the direction), for what grows on it.
 */
export function branchOutline(points, { base, tip, rand, knots = 0.25 }) {
  const spine = sample(points, 5);
  const n = spine.length;
  // Knots: a few bulges along it.
  const bumps = [];
  for (let i = 0; i < n * 0.02 * knots * 10; i++) {
    bumps.push({
      at: rand.range(0.08, 0.9),
      width: rand.range(0.02, 0.05),
      height: rand.range(0.12, 0.3),
    });
  }
  const info = spine.map((p, i) => {
    const t = i / (n - 1);
    const prev = spine[Math.max(0, i - 1)];
    const next = spine[Math.min(n - 1, i + 1)];
    const angle = Math.atan2(next[1] - prev[1], next[0] - prev[0]);
    let width = base + (tip - base) * Math.pow(t, 0.85);
    for (const b of bumps) width *= 1 + b.height * Math.exp(-(((t - b.at) / b.width) ** 2));
    return { x: p[0], y: p[1], t, angle, width };
  });
  const left = [];
  const right = [];
  for (const s of info) {
    const nx = -Math.sin(s.angle);
    const ny = Math.cos(s.angle);
    left.push([s.x + (nx * s.width) / 2, s.y + (ny * s.width) / 2]);
    right.push([s.x - (nx * s.width) / 2, s.y - (ny * s.width) / 2]);
  }
  // A rounded tip, a little beyond the last point.
  const end = info[n - 1];
  const tipPoint = [
    end.x + Math.cos(end.angle) * tip * 0.6,
    end.y + Math.sin(end.angle) * tip * 0.6,
  ];
  const every = (list) => list.filter((_, i) => i % 3 === 0 || i === list.length - 1);
  const outline = [...every(left), tipPoint, ...every(right).reverse()];
  return { d: smooth(outline), spine: info };
}

// ------------------------------------------------------------------ shapes (local units)

export const TAU = Math.PI * 2;

/** A corner: the smooth path stays sharp there. */
export const c = (x, y) => [x, y, true];

/** A straight-sided path (sharp everywhere). */
export function polyPath(points, closed = true) {
  return (
    points.map((p, i) => `${i ? 'L' : 'M'}${r1(p[0])} ${r1(p[1])}`).join('') + (closed ? 'Z' : '')
  );
}

export function ellipse(cx, cy, rx, ry = rx, n = 16, rot = 0) {
  const cr = Math.cos(rot);
  const sr = Math.sin(rot);
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * TAU;
    const ex = Math.cos(a) * rx;
    const ey = Math.sin(a) * ry;
    return [cx + ex * cr - ey * sr, cy + ex * sr + ey * cr];
  });
}

/** Points along an elliptic arc from angle a0 to a1 (both included). */
export function arc(cx, cy, rx, ry, a0, a1, n = 10) {
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = a0 + ((a1 - a0) * i) / n;
    return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry];
  });
}

/** A star of `n` points (sharp). */
export function star(cx, cy, r, inner = 0.45, n = 5, rot = -Math.PI / 2) {
  return Array.from({ length: n * 2 }, (_, i) => {
    const a = rot + (i * Math.PI) / n;
    const radius = i % 2 ? r * inner : r;
    return c(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius);
  });
}

/** A four-pointed sparkle with curved sides. */
export function sparkle(cx, cy, r, waist = 0.17) {
  const points = [];
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 - Math.PI / 2;
    points.push(c(cx + Math.cos(a) * r, cy + Math.sin(a) * r));
    points.push([
      cx + Math.cos(a + Math.PI / 4) * r * waist,
      cy + Math.sin(a + Math.PI / 4) * r * waist,
    ]);
  }
  return points;
}

/** A heart `h` tall, centred on (cx, cy). */
export function heart(cx, cy, h, n = 36) {
  const k = h / 29;
  return Array.from({ length: n }, (_, i) => {
    const t = (i / n) * TAU;
    const x = 16 * Math.sin(t) ** 3;
    const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    const p = [cx + x * k, cy + (y - 2.5) * k];
    return i === 0 || i === n / 2 ? c(p[0], p[1]) : p;
  });
}

/** A rounded rectangle, for `poly`. */
export function rrect(x0, y0, x1, y1, r = 0) {
  if (r <= 0) return [c(x0, y0), c(x1, y0), c(x1, y1), c(x0, y1)];
  const corners = [
    [x1 - r, y0 + r, -Math.PI / 2],
    [x1 - r, y1 - r, 0],
    [x0 + r, y1 - r, Math.PI / 2],
    [x0 + r, y0 + r, Math.PI],
  ];
  return corners.flatMap(([cx, cy, a]) => arc(cx, cy, r, r, a, a + Math.PI / 2, 5));
}

/** A straight bar `width` wide from (x0, y0) to (x1, y1), for `poly`. */
export function bar(x0, y0, x1, y1, width) {
  const a = Math.atan2(y1 - y0, x1 - x0);
  const nx = (-Math.sin(a) * width) / 2;
  const ny = (Math.cos(a) * width) / 2;
  return [c(x0 + nx, y0 + ny), c(x1 + nx, y1 + ny), c(x1 - nx, y1 - ny), c(x0 - nx, y0 - ny)];
}

/** A symmetric outline from its right half (top centre down to bottom centre, on its axis). */
export function sym(half) {
  const axis = half[0][0] * 2;
  const mirror = half
    .slice(1, -1)
    .reverse()
    .map(([x, y, corner]) => (corner ? [axis - x, y, true] : [axis - x, y]));
  return [...half, ...mirror];
}

/** A bumpy circle (pompom, cloud puff, fluffy cuff). */
export function scallop(cx, cy, r, count = 10, depth = 0.18, phase = 0) {
  const points = [];
  for (let i = 0; i < count; i++) {
    const a = phase + (i / count) * TAU;
    const b = phase + ((i + 0.5) / count) * TAU;
    points.push(c(cx + Math.cos(a) * r * (1 - depth), cy + Math.sin(a) * r * (1 - depth)));
    points.push([cx + Math.cos(b) * r, cy + Math.sin(b) * r]);
  }
  return points;
}

/** Local axes: u along `angle` from (x, y), v across it. */
export function frame(x, y, angle) {
  const ca = Math.cos(angle);
  const sa = Math.sin(angle);
  return (u, v, corner) => {
    const p = [x + u * ca - v * sa, y + u * sa + v * ca];
    return corner ? [p[0], p[1], true] : p;
  };
}

/** Points turned by `angle` around (cx, cy). */
export function turn(points, angle, cx = 0, cy = 0) {
  const ca = Math.cos(angle);
  const sa = Math.sin(angle);
  return points.map(([x, y, corner]) => {
    const p = [cx + (x - cx) * ca - (y - cy) * sa, cy + (x - cx) * sa + (y - cy) * ca];
    return corner ? [p[0], p[1], true] : p;
  });
}

/**
 * Parallel lines across a convex polygon, heading `angle`, `step` apart (a waffle, a lattice
 * when crossed with another set): segments ending on its edges.
 */
export function hatch(polygon, angle, step) {
  const d = [Math.cos(angle), Math.sin(angle)];
  const n = [-d[1], d[0]];
  const cross = (a, b) => a[0] * b[1] - a[1] * b[0];
  const offsets = polygon.map((v) => v[0] * n[0] + v[1] * n[1]);
  const lo = Math.min(...offsets);
  const hi = Math.max(...offsets);
  const segments = [];
  for (let o = lo + step / 2; o < hi; o += step) {
    const ts = [];
    for (let i = 0; i < polygon.length; i++) {
      const a = polygon[i];
      const b = polygon[(i + 1) % polygon.length];
      const e = [b[0] - a[0], b[1] - a[1]];
      const denom = cross(d, e);
      if (Math.abs(denom) < 1e-9) continue;
      const w = [a[0] - n[0] * o, a[1] - n[1] * o];
      const t = cross(w, e) / denom;
      const s = cross(w, d) / denom;
      if (s >= 0 && s <= 1) ts.push(t);
    }
    if (ts.length < 2) continue;
    const [t0, t1] = [Math.min(...ts), Math.max(...ts)];
    if (t1 - t0 < step * 0.3) continue;
    segments.push([
      [n[0] * o + d[0] * t0, n[1] * o + d[1] * t0],
      [n[0] * o + d[0] * t1, n[1] * o + d[1] * t1],
    ]);
  }
  return segments;
}

export function shuffle(rand, list) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

// ------------------------------------------------------------------ composition

/** Lines get thinner as things get smaller (further away). */
export function strokeFor(size) {
  return Math.max(2.2, Math.min(5.2, 1.8 + size * 0.016));
}

/**
 * Draws an element's shapes given in its own units (its box's largest side is 1, centred on 0),
 * placed at (x, y), `size` px, turned and maybe mirrored. `k` scales the line width.
 */
export function pen(d, rand, { x, y, size, rotate = 0, flip = false, weight = 1 }) {
  const stroke = strokeFor(size) * weight;
  const map = (points) =>
    place(flip ? points.map(([a, b, corner]) => [-a, b, corner]) : points, {
      x,
      y,
      scale: size,
      rotate,
    });
  return {
    rand,
    size,
    stroke,
    map,
    /** A closed smooth shape (corners where flagged). */
    shape: (points, k = 1) => d.shape(smooth(map(points)), stroke * k),
    /** A closed straight-sided shape. */
    poly: (points, k = 1) => d.shape(polyPath(map(points)), stroke * k),
    /** An open smooth line. */
    line: (points, k = 0.6) => d.line(smooth(map(points), false), stroke * k),
    /** An open straight line. */
    seg: (points, k = 0.6) => d.line(polyPath(map(points), false), stroke * k),
    /** A band `width` wide along the points (a string, a strap, a stem). */
    wire: (points, width, k = 0.75) =>
      d.wire(smooth(map(points), false), Math.max(1.5, width * size), stroke * k),
    dot: (cx, cy, r) => {
      const [[px, py]] = map([[cx, cy]]);
      d.dot(px, py, Math.max(1.6, r * size));
    },
    /** The same, in the band's pixels (along a branch's `spine`). */
    raw: {
      line: (points, k = 0.6) => d.line(smooth(points, false), stroke * k),
      shape: (points, k = 1) => d.shape(smooth(points), stroke * k),
    },
    /** A tapering limb (bow limb, antler, twig) along the points. */
    branch: (points, base, tip, k = 1) => {
      const b = branchOutline(map(points), { base: base * size, tip: tip * size, rand, knots: 0 });
      d.shape(b.d, stroke * k);
      return b;
    },
  };
}

/**
 * A band of a theme as one scene: big elements in front, spaced out; medium ones behind them,
 * in the gaps they leave (partly hidden, so they belong together); small ones further back.
 * Each layer: `kinds` (elements { w, h, draw(pen), tilt?, flip?, scale? }, w and h ≤ 1 their
 * box), `size` (range, fraction of the band's thickness), `gap` (fraction of an element).
 */
export function compose({ width, height, seed, front, middle, back, before, after, margin = 10 }) {
  const rand = random(seed);
  const d = new Drawing(width, height);
  const vertical = height > width;
  const length = vertical ? height : width;
  const room = (vertical ? width : height) - margin * 2;
  const along = (kind, size) => size * (vertical ? kind.h : kind.w);
  const across = (kind, size) => size * (vertical ? kind.w : kind.h);
  const fit = (kind, size) => Math.min(size, room / (vertical ? kind.w : kind.h));
  const deck = (kinds) => {
    let bag = [];
    let last;
    return () => {
      if (!bag.length) bag = shuffle(rand, kinds.slice());
      let kind = bag.pop();
      if (kind === last && kinds.length > 1) {
        if (!bag.length)
          bag = shuffle(
            rand,
            kinds.filter((k) => k !== kind),
          );
        const other = bag.pop();
        bag.push(kind);
        kind = other;
      }
      last = kind;
      return kind;
    };
  };
  const sized = (kind, layer) => fit(kind, room * rand.range(...layer.size) * (kind.scale ?? 1));
  /** A row along the band: elements as they come, spaces shared out evenly. */
  const row = (layer) => {
    const next = deck(layer.kinds);
    const items = [];
    let used = 0;
    for (let guard = 0; guard < 200; guard++) {
      const kind = next();
      const size = sized(kind, layer);
      const extent = along(kind, size);
      if (used + extent > length - 2 * margin) break;
      items.push({ kind, size, extent });
      used += extent * (1 + layer.gap * rand.range(0.7, 1.3));
    }
    const total = items.reduce((s, i) => s + i.extent, 0);
    const slot = (length - 2 * margin - total) / Math.max(1, items.length);
    let cursor = margin + slot / 2;
    for (const item of items) {
      item.at = cursor + item.extent / 2 + rand.range(-0.25, 0.25) * slot;
      item.at = Math.max(
        margin + item.extent / 2,
        Math.min(length - margin - item.extent / 2, item.at),
      );
      cursor += item.extent + slot;
    }
    return items;
  };
  const fronts = row(front);
  const backs = back ? row(back) : [];
  // The middle row fills the gaps between the front elements, overlapping them a little.
  const middles = [];
  if (middle) {
    const next = deck(middle.kinds);
    const edges = [
      margin,
      ...fronts.flatMap((f) => [f.at - f.extent / 2, f.at + f.extent / 2]),
      length - margin,
    ];
    let high = rand.chance(0.5);
    for (let i = 0; i < edges.length; i += 2) {
      const [start, end] = [edges[i], edges[i + 1]];
      const gap = end - start;
      const outer = i === 0 || i === edges.length - 2;
      const kind = next();
      const size = sized(kind, middle);
      const extent = along(kind, size);
      if (gap < extent * (outer ? 0.55 : 0.3)) continue;
      const count = gap > extent * 2.1 ? 2 : 1;
      for (let n = 0; n < count; n++) {
        const k = n === 0 ? kind : next();
        const s = n === 0 ? size : sized(k, middle);
        const e = along(k, s);
        let at = start + (gap * (n + 1)) / (count + 1) + rand.range(-0.12, 0.12) * gap;
        at = Math.max(margin + e / 2, Math.min(length - margin - e / 2, at));
        middles.push({ kind: k, size: s, extent: e, at, side: high ? [0, 0.3] : [0.7, 1] });
        high = !high;
      }
    }
  }
  before?.(d, rand);
  const draw = (items, layer, weight) => {
    for (const item of items) {
      const { kind, size } = item;
      const cross = across(kind, size);
      const [lo, hi] = item.side ?? layer.across ?? [0, 1];
      const offset = margin + cross / 2 + (room - cross) * rand.range(lo, hi);
      const [x, y] = vertical ? [offset, item.at] : [item.at, offset];
      kind.draw(
        pen(d, rand, {
          x,
          y,
          size,
          rotate: (kind.tilt ?? 0.12) * rand.range(-1, 1),
          flip: (kind.flip ?? true) && rand.chance(0.5),
          weight,
        }),
      );
    }
  };
  draw(backs, back, 0.85);
  draw(middles, middle, 1);
  draw(fronts, front, 1);
  after?.(d, rand);
  return d.toString();
}

/** The bands of a theme and its thumbnail, written to public/themes/<id>/. */
export function writeTheme(id, { seed, front, middle, back, before, after, thumb, layers = {} }) {
  const out = new URL(`../../public/themes/${id}/`, import.meta.url);
  const bands = {
    top: [2000, 280],
    bottom: [2000, 280],
    left: [300, 2200],
    right: [300, 2200],
    thumb: [400, 300],
  };
  let n = seed;
  for (const [band, [width, height]] of Object.entries(bands)) {
    const svg = compose({
      width,
      height,
      seed: n++,
      // The picker's thumbnail shows the theme's emblem (`thumb`) when it has one.
      front: {
        size: [0.8, 1],
        gap: 0.75,
        ...layers.front,
        kinds: band === 'thumb' && thumb ? [thumb] : front,
      },
      middle: middle && { size: [0.44, 0.62], ...layers.middle, kinds: middle },
      back: back && { size: [0.16, 0.28], gap: 0.9, ...layers.back, kinds: back },
      before: before && ((d, rand) => before(d, rand, { band, width, height })),
      after: after && ((d, rand) => after(d, rand, { band, width, height })),
    });
    writeFileSync(new URL(`${band}.svg`, out), svg);
  }
  console.log(`${id}: top, bottom, left, right, thumb written`);
}

/**
 * A wandering spine from (x, y) heading `angle` (radians): `segments` steps of `length`, bending
 * by up to `bend` each step, pulled back towards `heading` (when given) and kept inside `bounds`.
 */
export function wander({
  x,
  y,
  angle,
  segments,
  length,
  bend,
  rand,
  heading,
  bounds,
  pull = 0.25,
}) {
  const points = [[x, y]];
  let a = angle;
  let px = x;
  let py = y;
  for (let i = 0; i < segments; i++) {
    a += rand.range(-bend, bend);
    if (heading !== undefined) a += (heading - a) * pull;
    const step = length * rand.range(0.75, 1.25);
    let nx = px + Math.cos(a) * step;
    let ny = py + Math.sin(a) * step;
    if (bounds) {
      // Near an edge, the branch turns away from it (squeezed against it, it would flatten).
      const [minX, minY, maxX, maxY] = bounds;
      if (nx < minX || nx > maxX) a = Math.PI - a;
      if (ny < minY || ny > maxY) a = -a;
      nx = px + Math.cos(a) * step;
      ny = py + Math.sin(a) * step;
      nx = Math.max(minX, Math.min(maxX, nx));
      ny = Math.max(minY, Math.min(maxY, ny));
    }
    points.push([nx, ny]);
    px = nx;
    py = ny;
  }
  return points;
}
