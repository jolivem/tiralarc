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

/**
 * An SVG collector: shapes in drawing order (later ones in front). Each closed shape (and wire)
 * may carry the colour it has in real life (`color`, set before drawing it): the line art leaves
 * them white, its colour map (`toString(true)`) fills them, so that the web's automatic
 * colouring reads, inside each closed area, the colour of the shape on top there.
 */
export class Drawing {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.items = [];
    /** "#rrggbb" of the shapes drawn next, or null (left white). */
    this.color = null;
  }

  /** A closed shape, white inside (its colour in the map), outlined. */
  shape(d, stroke = 5) {
    const color = this.color;
    this.items.push(
      (colored) =>
        `<path d="${d}"${colored && color ? ` fill="${color}"` : ''} stroke-width="${r1(stroke)}"/>`,
    );
  }

  /**
   * A patch of colour in the colour map only (no outline, nothing in the line art): parts of a
   * shape that lines split into areas of different colours (a beach ball's segments, stripes).
   */
  tint(d, color) {
    this.items.push((colored) => (colored ? `<path d="${d}" fill="${color}" stroke="none"/>` : ''));
  }

  /** An open line (veins, stamens, bark marks): never closes an area by itself. */
  line(d, stroke = 3) {
    this.items.push(() => `<path d="${d}" fill="none" stroke-width="${r1(stroke)}"/>`);
  }

  /** A wire: a band of `width` outlined (strings, stems, straps), white inside. */
  wire(d, width, stroke = 3) {
    const color = this.color;
    this.items.push(
      (colored) =>
        `<path d="${d}" fill="none" stroke-width="${r1(width + stroke * 2)}"/>` +
        `<path d="${d}" fill="none" stroke="${colored && color ? color : '#fff'}" stroke-width="${r1(width)}"/>`,
    );
  }

  /** A small black dot (anthers, antennae tips). */
  dot(x, y, radius) {
    this.items.push(
      () => `<circle cx="${r1(x)}" cy="${r1(y)}" r="${r1(radius)}" fill="#000" stroke="none"/>`,
    );
  }

  /** A closed circle, white inside (its colour in the map). */
  circle(x, y, radius, stroke = 4) {
    const color = this.color;
    this.items.push(
      (colored) =>
        `<circle cx="${r1(x)}" cy="${r1(y)}" r="${r1(radius)}"${colored && color ? ` fill="${color}"` : ''} stroke-width="${r1(stroke)}"/>`,
    );
  }

  /** The line art, or (`colored`) its colour map. */
  toString(colored = false) {
    const { width: w, height: h } = this;
    return (
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">` +
      `<rect width="${w}" height="${h}" fill="#fff"/>` +
      `<g fill="#fff" stroke="#000" stroke-linejoin="round" stroke-linecap="round">` +
      this.items.map((item) => item(colored)).join('') +
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
    /** The real-life colour ("#rrggbb", null = none) of the shapes drawn next (colour map). */
    color: (value) => {
      d.color = value;
    },
    /** A closed smooth shape (corners where flagged). */
    shape: (points, k = 1) => d.shape(smooth(map(points)), stroke * k),
    /** A closed straight-sided shape. */
    poly: (points, k = 1) => d.shape(polyPath(map(points)), stroke * k),
    /** A patch of `color` in the colour map only (straight sides), over what is drawn. */
    tint: (points, color) => d.tint(polyPath(map(points)), color),
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
      tint: (points, color) => d.tint(polyPath(points), color),
    },
    /** A tapering limb (bow limb, antler, twig) along the points. */
    branch: (points, base, tip, k = 1) => {
      const b = branchOutline(map(points), { base: base * size, tip: tip * size, rand, knots: 0 });
      d.shape(b.d, stroke * k);
      return b;
    },
  };
}

/** At most this share of the smaller of two elements' boxes may lie under the other: none. */
export const MAX_OVERLAP = 0;

/** Room kept around each element's box (px): some drawings go slightly beyond it. */
const PAD = 5;

/** Whether the box { x0, y0, x1, y1 } meets one of `boxes`. */
export function hits(box, boxes) {
  return boxes.some((b) => box.x0 < b.x1 && b.x0 < box.x1 && box.y0 < b.y1 && b.y0 < box.y1);
}

/** How much of the smaller box two boxes { x0, y0, x1, y1 } share (0 to 1). */
export function overlap(a, b) {
  const w = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
  const h = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
  if (w <= 0 || h <= 0) return 0;
  const area = (r) => (r.x1 - r.x0) * (r.y1 - r.y0);
  return (w * h) / Math.min(area(a), area(b));
}

/**
 * A band of a theme as one scene: big elements spaced out along it, medium ones in the gaps
 * they leave, then the holes left filled. An element shows once in a band, unless a hole needs
 * it again far from the first (a theme's `once` ones: only in one band of the four, `unique`);
 * elements never overlap (`MAX_OVERLAP`, boxes `PAD` apart), so they stay easy to colour.
 * Each layer: `kinds` (elements { w, h, draw(pen), tilt?, flip?, scale? }, w and h ≤ 1 their
 * box), `size` (range, fraction of the band's thickness), `gap` (fraction of an element).
 */
export function compose({
  width,
  height,
  seed,
  front,
  middle,
  unique = [],
  before,
  after,
  margin = 10,
  inset = [0, 0],
}) {
  const rand = random(seed);
  const d = new Drawing(width, height);
  const vertical = height > width;
  const length = vertical ? height : width;
  // `inset`: room kept free across the band (its top / left side, its bottom / right side),
  // for what goes behind (a garland).
  const room = (vertical ? width : height) - margin * 2 - inset[0] - inset[1];
  const edge0 = margin + inset[0];
  const used = new Set();
  /** The kinds still unused in this band, shuffled (`first` ahead of them). */
  const deck = (kinds, first = []) => {
    const bag = [...shuffle(rand, [...new Set(kinds)]), ...shuffle(rand, first.slice())];
    const next = () => {
      while (bag.length) {
        const kind = bag.pop();
        if (!used.has(kind)) {
          used.add(kind);
          return kind;
        }
      }
      return undefined;
    };
    /** Not placed after all: back into the bag, to be tried after the others. */
    next.putBack = (kind) => {
      used.delete(kind);
      bag.unshift(kind);
    };
    return next;
  };
  /** An element of `kind`, `size` px, turned: its box's extent along and across the band. */
  const make = (kind, size) => {
    const rotate = (kind.tilt ?? 0.12) * rand.range(-1, 1);
    const [cr, sr] = [Math.abs(Math.cos(rotate)), Math.abs(Math.sin(rotate))];
    const wx = (kind.w * cr + kind.h * sr) * size;
    const hy = (kind.w * sr + kind.h * cr) * size;
    const [along, across] = vertical ? [hy, wx] : [wx, hy];
    // Never thicker than the band.
    const k = Math.min(1, room / across);
    return { kind, rotate, size: size * k, along: along * k, across: across * k };
  };
  const sized = (kind, layer) => make(kind, room * rand.range(...layer.size) * (kind.scale ?? 1));
  const box = (item) => {
    const [x, y] = vertical ? [item.offset, item.at] : [item.at, item.offset];
    const [w, h] = vertical ? [item.across, item.along] : [item.along, item.across];
    return { x0: x - w / 2, y0: y - h / 2, x1: x + w / 2, y1: y + h / 2 };
  };
  const placed = [];
  const padded = (item) => {
    const b = box(item);
    return { x0: b.x0 - PAD, y0: b.y0 - PAD, x1: b.x1 + PAD, y1: b.y1 + PAD };
  };
  const fits = (item) => placed.every((other) => overlap(padded(item), box(other)) <= MAX_OVERLAP);

  // The big ones: a row along the band, spaces shared out evenly.
  const fronts = [];
  {
    const next = deck(front.kinds);
    let total = 0;
    for (let kind = next(); kind; kind = next()) {
      const item = sized(kind, front);
      if (total + item.along > length - 2 * margin) break;
      fronts.push(item);
      total += item.along * (1 + front.gap * rand.range(0.7, 1.3));
    }
    const sum = fronts.reduce((s, i) => s + i.along, 0);
    const slot = (length - 2 * margin - sum) / Math.max(1, fronts.length);
    let cursor = margin + slot / 2;
    for (const item of fronts) {
      item.at = cursor + item.along / 2 + rand.range(-0.12, 0.12) * slot;
      item.at = Math.max(
        margin + item.along / 2,
        Math.min(length - margin - item.along / 2, item.at),
      );
      const [lo, hi] = front.across ?? [0, 1];
      item.offset = edge0 + item.across / 2 + (room - item.across) * rand.range(lo, hi);
      cursor += item.along + slot;
      placed.push(item);
    }
  }

  // The medium ones in the gaps between them (this band's unique ones first), as large as
  // the room left allows; a gap too narrow stays empty.
  const middles = [];
  if (middle) {
    const next = deck(middle.kinds, unique);
    const edges = [
      margin,
      ...fronts.flatMap((f) => [f.at - f.along / 2, f.at + f.along / 2]),
      length - margin,
    ];
    const gaps = [];
    for (let i = 0; i < edges.length; i += 2) {
      gaps.push({ start: edges[i], end: edges[i + 1], count: 0 });
    }
    let high = rand.chance(0.5);
    /** One more element in `gap`, if one fits there. */
    const fill = (gap) => {
      const { start, end } = gap;
      if (end - start < room * middle.size[0] * 0.6) return false;
      const kind = next();
      if (!kind) return false;
      let best;
      for (let attempt = 0; attempt < 60 && !best; attempt++) {
        // Larger first, then smaller, down to the layer's smallest size.
        const t = Math.min(1, attempt / 40);
        const scale = middle.size[1] - (middle.size[1] - middle.size[0]) * t;
        const item = make(kind, room * scale * rand.range(0.94, 1) * (kind.scale ?? 1));
        const lo = start + item.along / 2;
        const hi = end - item.along / 2;
        const mid = (start + end) / 2;
        // Alone in its gap: near its middle; a second one: wherever there is room.
        const along =
          hi < lo
            ? mid
            : gap.count
              ? rand.range(lo, hi)
              : mid + (rand() - 0.5) * Math.min(hi - lo, item.along * 0.5);
        item.at = Math.max(
          margin + item.along / 2,
          Math.min(length - margin - item.along / 2, along),
        );
        const side = attempt % 3 === 2 ? rand() : high ? rand.range(0, 0.3) : rand.range(0.7, 1);
        item.offset = edge0 + item.across / 2 + (room - item.across) * side;
        if (fits(item)) best = item;
      }
      if (!best) {
        // Not this one here: it may fit in another gap.
        next.putBack(kind);
        return false;
      }
      placed.push(best);
      middles.push(best);
      gap.count++;
      high = !high;
      return true;
    };
    // The widest gaps first, one element each, then a second one where there is room.
    for (let round = 0; round < 3; round++) {
      const order = gaps
        .slice()
        .sort((a, b) => (b.end - b.start) / (b.count + 1) - (a.end - a.start) / (a.count + 1));
      for (const gap of order) if (gap.count === round) fill(gap);
    }
  }

  // The holes left are filled with whatever fits there: kinds not yet in the band first, then
  // (the theme's `once` ones aside) one already in it, but far from where it shows.
  const fillers = [];
  if (middle) {
    const spread = length * 0.35;
    const seen = new Map();
    for (const item of placed) seen.set(item.kind, [...(seen.get(item.kind) ?? []), item.at]);
    const repeatable = new Set([...front.kinds, ...middle.kinds]);
    const pool = [...new Set([...front.kinds, ...middle.kinds, ...unique])];
    const [lo, hi] = [middle.size[0], middle.size[1]];
    const across = [0, 0.5, 1, 0.25, 0.75];
    for (let pass = 0; pass < 2; pass++) {
      for (let at = margin; at < length - margin; at += 16) {
        const near = (kind) => (seen.get(kind) ?? []).some((p) => Math.abs(p - at) < spread);
        const candidates = shuffle(rand, pool.slice())
          .filter((kind) => !seen.has(kind) || (repeatable.has(kind) && !near(kind)))
          .sort((a, b) => Number(seen.has(a)) - Number(seen.has(b)));
        let done = false;
        for (const kind of candidates) {
          for (let s = 0; s <= 6 && !done; s++) {
            const item = make(kind, room * (hi - ((hi - lo) * s) / 6) * (kind.scale ?? 1));
            item.at = at + item.along / 2;
            if (item.at + item.along / 2 > length - margin) continue;
            for (const side of across) {
              item.offset = edge0 + item.across / 2 + (room - item.across) * side;
              if (fits(item)) {
                placed.push(item);
                fillers.push(item);
                seen.set(kind, [...(seen.get(kind) ?? []), item.at]);
                used.add(kind);
                at = item.at + item.along / 2;
                done = true;
                break;
              }
            }
          }
          if (done) break;
        }
      }
    }
  }
  // What goes behind (a garland, icicles) is told where the elements are, to keep clear of them.
  before?.(d, rand, placed.map(box));
  d.color = null;
  for (const item of [...middles, ...fronts, ...fillers]) {
    const [x, y] = vertical ? [item.offset, item.at] : [item.at, item.offset];
    // Each element starts with its own colours (`kind.color`, else none).
    d.color = item.kind.color ?? null;
    item.kind.draw(
      pen(d, rand, {
        x,
        y,
        size: item.size,
        rotate: item.rotate,
        flip: (item.kind.flip ?? true) && rand.chance(0.5),
      }),
    );
  }
  after?.(d, rand);
  return { svg: d.toString(), colors: d.toString(true), kinds: used };
}

/**
 * The bands of a theme and its thumbnail, written to public/themes/<id>/. `once`: elements that
 * show only once in the whole decoration (shared out between the four bands). `inset(band)`:
 * room kept free across a band ([top / left, bottom / right] px) for a backdrop of its own.
 */
export function writeTheme(
  id,
  { seed, front, middle, once = [], before, after, thumb, inset, layers = {} },
) {
  const out = new URL(`../../public/themes/${id}/`, import.meta.url);
  const bands = {
    top: [2000, 280],
    bottom: [2000, 280],
    left: [300, 2200],
    right: [300, 2200],
    thumb: [400, 300],
  };
  const sides = ['top', 'bottom', 'left', 'right'];
  const shared = shuffle(random(seed * 7 + 3), once.slice());
  let n = seed;
  for (const [band, [width, height]] of Object.entries(bands)) {
    const side = sides.indexOf(band);
    const unique = side < 0 ? [] : shared.filter((_, i) => i % sides.length === side);
    const { svg, colors, kinds } = compose({
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
      middle:
        band === 'thumb'
          ? undefined
          : middle && { size: [0.55, 0.74], ...layers.middle, kinds: middle },
      unique,
      inset: inset?.(band) ?? [0, 0],
      before: before && ((d, rand, boxes) => before(d, rand, { band, width, height, boxes })),
      after: after && ((d, rand) => after(d, rand, { band, width, height })),
    });
    const missing = unique.filter((kind) => !kinds.has(kind)).length;
    if (missing) console.warn(`${id} ${band}: ${missing} unique element(s) found no room`);
    writeFileSync(new URL(`${band}.svg`, out), svg);
    // The real-life colours, for the web's automatic colouring (not for the picker's thumbnail).
    if (band !== 'thumb') writeFileSync(new URL(`${band}.colors.svg`, out), colors);
  }
  console.log(`${id}: top, bottom, left, right, thumb (+ colour maps) written`);
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
