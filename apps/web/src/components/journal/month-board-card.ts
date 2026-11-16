/**
 * The month's Instagram card, drawn like a blackboard written in chalk: a wooden frame, a slate
 * with the month's name (the archer's colouring, in coloured chalk; no decoration), the calendar
 * with each day's completed events (logos in their colours), the month summary (arrows,
 * satisfaction stars) in a chalk box,
 * the chalk tray at its foot, signed with the site's host. Instagram's portrait format (4:5).
 * The chalk is drawn on a layer of its own, then grained, so every stroke looks rubbed on.
 */
import type { MonthStars, ThemeFill } from '@tiralarc/api-client';
import { type Artwork, paint } from './coloring';
import { STAR_COUNT, starFill } from './month-stars';

export const MONTH_BOARD_WIDTH = 1080;
export const MONTH_BOARD_HEIGHT = 1350;

/** White chalk. */
export const CHALK = '#f3f0e6';
const CHALK_RGB: [number, number, number] = [243, 240, 230];
const STAR_CHALK = '#ffe08a';

const FRAME = 34;
const TRAY = 90;
const PAD = 28;

/** The month's days by week, Monday first; null for the cells of the months around it. */
export function monthWeeks(month: string): (string | null)[][] {
  const [year, m] = month.split('-').map(Number) as [number, number];
  const days = new Date(Date.UTC(year, m, 0)).getUTCDate();
  const lead = (new Date(Date.UTC(year, m - 1, 1)).getUTCDay() + 6) % 7;
  const cells: (string | null)[] = Array.from({ length: lead }, () => null);
  for (let d = 1; d <= days; d++) cells.push(`${month}-${String(d).padStart(2, '0')}`);
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/**
 * Where a day's icons go in its box (up to 4, as in the month view): one in the middle, two side
 * by side, three or four in a square (the third centred under the first two).
 */
export function iconSlots(
  count: number,
  box: { x: number; y: number; w: number; h: number },
): { x: number; y: number; size: number }[] {
  const n = Math.min(count, 4);
  if (n <= 0) return [];
  const cols = n === 1 ? 1 : 2;
  const rows = n <= 2 ? 1 : 2;
  const cell = Math.min(box.w / cols, box.h / rows);
  const size = cell * 0.96;
  const top = box.y + (box.h - cell * rows) / 2;
  return Array.from({ length: n }, (_, i) => {
    const row = Math.floor(i / 2);
    const inRow = row === 0 ? Math.min(n, cols) : n - 2;
    const left = box.x + (box.w - cell * inRow) / 2;
    return {
      x: left + (i % 2) * cell + (cell - size) / 2,
      y: top + row * cell + (cell - size) / 2,
      size,
    };
  });
}

/** Words of `text` in lines no wider than `width`. */
function wrap(text: string, width: number, measure: (t: string) => number) {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && measure(candidate) > width) {
      lines.push(line);
      line = word;
    } else line = candidate;
  }
  if (line) lines.push(line);
  return lines;
}

/** A seeded random generator (mulberry32): the same grain on every drawing. */
function random(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const canvasOf = (width: number, height: number) =>
  Object.assign(document.createElement('canvas'), {
    width: Math.max(1, Math.round(width)),
    height: Math.max(1, Math.round(height)),
  });

/**
 * An event's logo in its own colours, outlined in white (a sticker's edge) so it stands out on
 * the slate, black outlines included. `size`: its box.
 */
export function haloIcon(image: CanvasImageSource & { width: number; height: number }, size = 160) {
  const canvas = canvasOf(size, size);
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  // The outline's thickness: room is kept for it around the logo.
  const edge = Math.max(2, Math.round(size * 0.035));
  const box = size - 2 * edge - 2;
  const iw = image.width || box;
  const ih = image.height || box;
  const scale = Math.min(box / iw, box / ih);
  const w = iw * scale;
  const h = ih * scale;
  const x = (size - w) / 2;
  const y = (size - h) / 2;
  // The logo's silhouette in white…
  const silhouette = canvasOf(size, size);
  const s = silhouette.getContext('2d');
  if (s) {
    s.drawImage(image, x, y, w, h);
    s.globalCompositeOperation = 'source-in';
    s.fillStyle = '#ffffff';
    s.fillRect(0, 0, size, size);
    // …stamped all around it, then the logo on top.
    for (let i = 0; i < 16; i++) {
      const angle = (i * Math.PI) / 8;
      ctx.drawImage(silhouette, Math.cos(angle) * edge, Math.sin(angle) * edge);
    }
    ctx.drawImage(silhouette, 0, 0);
  }
  ctx.drawImage(image, x, y, w, h);
  return canvas;
}

/**
 * A drawing redrawn in chalk: its dark strokes turn white, its colours are kept (the summary's
 * quiver and target). `size`: its box, the picture fitted inside.
 */
export function chalkIcon(
  image: CanvasImageSource & { width: number; height: number },
  size = 160,
) {
  const canvas = canvasOf(size, size);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return canvas;
  // A drawing without a size of its own (an SVG with a viewBox only) fills the box.
  const iw = image.width || size;
  const ih = image.height || size;
  const scale = Math.min(size / iw, size / ih);
  const w = iw * scale;
  const h = ih * scale;
  ctx.drawImage(image, (size - w) / 2, (size - h) / 2, w, h);
  const data = ctx.getImageData(0, 0, size, size);
  const px = data.data;
  for (let i = 0; i < px.length; i += 4) {
    const luminance = 0.299 * px[i]! + 0.587 * px[i + 1]! + 0.114 * px[i + 2]!;
    if (px[i + 3]! > 0 && luminance < 110) {
      [px[i], px[i + 1], px[i + 2]] = CHALK_RGB;
    }
  }
  ctx.putImageData(data, 0, 0);
  return canvas;
}

/** Line art with its colouring (`fills` of `band`), the strokes in white chalk. */
function chalkArt(art: Artwork, fills: ThemeFill[], band: ThemeFill['band'], enclosedOnly = false) {
  const canvas = canvasOf(art.width, art.height);
  const pixels = paint(
    art,
    fills.filter((fill) => fill.band === band),
    CHALK_RGB,
    { enclosedOnly },
  );
  canvas.getContext('2d')?.putImageData(new ImageData(pixels, art.width, art.height), 0, 0);
  return canvas;
}

/** Draws `source` fitted inside the box ("contain"), centred. */
function contain(
  ctx: CanvasRenderingContext2D,
  source: HTMLCanvasElement,
  box: { x: number; y: number; w: number; h: number },
) {
  const scale = Math.min(box.w / source.width, box.h / source.height);
  const w = source.width * scale;
  const h = source.height * scale;
  ctx.drawImage(source, box.x + (box.w - w) / 2, box.y + (box.h - h) / 2, w, h);
}

/** A five-pointed star centred on (x, y). */
function starPath(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? r : r * 0.45;
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const px = x + Math.cos(angle) * radius;
    const py = y + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

/** One completed event of a day: its logo, in its own colours. */
export interface BoardEvent {
  day: string;
  icon: HTMLCanvasElement | null;
  /** Its colour, drawn as a dot when it has no icon. */
  color: string;
}

export interface MonthBoardData {
  /** "Novembre": written when its lettering isn't drawn. */
  monthName: string;
  /** "2026 · Saison 2026-2027", under the name. */
  subtitle: string;
  /** The name's hollow letters (`useLettering`), coloured by the `title` fills. */
  lettering: Artwork | null;
  /** The month's colouring (only the `title` fills are drawn). */
  fills: ThemeFill[];
  /** Monday first. */
  weekdays: string[];
  month: string;
  events: BoardEvent[];
  summary: {
    arrowsLabel: string;
    arrows: string;
    satisfactionLabel: string;
    stars: MonthStars | null;
    quiver: HTMLCanvasElement | null;
    target: HTMLCanvasElement | null;
  };
  font: string;
  site: string;
}

/** The wooden frame, the slate and its rubbed-out chalk dust. */
function drawBoard(ctx: CanvasRenderingContext2D, rand: () => number) {
  const W = MONTH_BOARD_WIDTH;
  const H = MONTH_BOARD_HEIGHT;
  const wood = ctx.createLinearGradient(0, 0, W, H);
  wood.addColorStop(0, '#8a5a34');
  wood.addColorStop(0.5, '#6e4426');
  wood.addColorStop(1, '#8f603a');
  ctx.fillStyle = wood;
  ctx.fillRect(0, 0, W, H);
  // The wood's grain.
  ctx.strokeStyle = 'rgba(40, 20, 8, 0.25)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 60; i++) {
    const y = rand() * H;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(W / 3, y + rand() * 10 - 5, (2 * W) / 3, y + rand() * 10 - 5, W, y);
    ctx.stroke();
  }

  const board = { x: FRAME, y: FRAME, w: W - 2 * FRAME, h: H - FRAME - TRAY };
  const slate = ctx.createRadialGradient(W / 2, H / 2.4, 100, W / 2, H / 2.4, H * 0.75);
  slate.addColorStop(0, '#2f4038');
  slate.addColorStop(1, '#1c2620');
  ctx.fillStyle = slate;
  ctx.fillRect(board.x, board.y, board.w, board.h);
  ctx.save();
  ctx.beginPath();
  ctx.rect(board.x, board.y, board.w, board.h);
  ctx.clip();
  // Wiped chalk: wide pale smears, then fine dust.
  for (let i = 0; i < 9; i++) {
    const x = board.x + rand() * board.w;
    const y = board.y + rand() * board.h;
    const r = 120 + rand() * 220;
    const smear = ctx.createRadialGradient(x, y, 0, x, y, r);
    smear.addColorStop(0, `rgba(230, 235, 225, ${0.035 + rand() * 0.04})`);
    smear.addColorStop(1, 'rgba(230, 235, 225, 0)');
    ctx.fillStyle = smear;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1.8, 0.7);
    ctx.translate(-x, -y);
    ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
    ctx.restore();
  }
  for (let i = 0; i < 2500; i++) {
    ctx.fillStyle = `rgba(235, 238, 230, ${rand() * 0.08})`;
    ctx.fillRect(board.x + rand() * board.w, board.y + rand() * board.h, 1.5, 1.5);
  }
  ctx.restore();
  // The frame's inner edge, in shade.
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.lineWidth = 4;
  ctx.strokeRect(board.x, board.y, board.w, board.h);
  return board;
}

/** The ledge: chalk sticks, a felt eraser, the site's host. */
function drawTray(ctx: CanvasRenderingContext2D, font: string, site: string) {
  const W = MONTH_BOARD_WIDTH;
  const top = MONTH_BOARD_HEIGHT - TRAY;
  const ledge = ctx.createLinearGradient(0, top, 0, MONTH_BOARD_HEIGHT);
  ledge.addColorStop(0, '#4a2c16');
  ledge.addColorStop(0.25, '#8a5a34');
  ledge.addColorStop(1, '#6a4124');
  ctx.fillStyle = ledge;
  ctx.fillRect(0, top, W, TRAY);
  const stick = (x: number, w: number, color: string) => {
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 3;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x, top + 36, w, 20, 9);
    ctx.fill();
    ctx.restore();
  };
  stick(FRAME + 30, 120, CHALK);
  stick(FRAME + 170, 70, '#f7b6c8');
  stick(FRAME + 260, 90, STAR_CHALK);
  // The eraser: a wooden back on grey felt.
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
  ctx.shadowBlur = 5;
  ctx.shadowOffsetY = 3;
  ctx.fillStyle = '#c8a06a';
  ctx.beginPath();
  ctx.roundRect(FRAME + 390, top + 22, 160, 26, 6);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#8d8f8c';
  ctx.beginPath();
  ctx.roundRect(FRAME + 390, top + 46, 160, 16, 4);
  ctx.fill();
  ctx.font = `700 34px ${font}`;
  ctx.fillStyle = 'rgba(243, 240, 230, 0.85)';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(`Tiralarc · ${site}`, W - FRAME - 20, top + 60, 420);
  ctx.textAlign = 'left';
}

/** Grains the chalk layer: the strokes thin out and break up, as chalk on slate does. */
function grain(layer: HTMLCanvasElement, rand: () => number) {
  const ctx = layer.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;
  const data = ctx.getImageData(0, 0, layer.width, layer.height);
  const px = data.data;
  for (let i = 3; i < px.length; i += 4) {
    if (px[i] === 0) continue;
    const r = rand();
    px[i] = px[i]! * (r < 0.14 ? 0.12 : 0.68 + 0.32 * rand());
  }
  ctx.putImageData(data, 0, 0);
}

/** Draws the month's blackboard on `ctx` (MONTH_BOARD_WIDTH × MONTH_BOARD_HEIGHT). */
export function drawMonthBoard(ctx: CanvasRenderingContext2D, data: MonthBoardData) {
  const W = MONTH_BOARD_WIDTH;
  const H = MONTH_BOARD_HEIGHT;
  const rand = random(Number(data.month.replace('-', '')));
  ctx.save();
  const board = drawBoard(ctx, rand);
  const left = board.x + PAD;
  const right = board.x + board.w - PAD;
  const width = right - left;

  // Everything in chalk goes on its own layer, grained before it is laid on the slate.
  const layer = canvasOf(W, H);
  const c = layer.getContext('2d');
  if (!c) return;
  c.textBaseline = 'alphabetic';
  c.fillStyle = CHALK;
  c.strokeStyle = CHALK;
  c.lineCap = 'round';
  c.lineJoin = 'round';

  // The month's name (no decoration around it) and the year.
  const lettering = {
    x: left + (width - 860) / 2,
    y: board.y + 26,
    w: 860,
    h: (860 * 260) / 1600,
  };
  if (data.lettering) {
    contain(c, chalkArt(data.lettering, data.fills, 'title', true), lettering);
  } else {
    c.font = `700 96px ${data.font}`;
    c.textAlign = 'center';
    c.fillText(data.monthName, W / 2, lettering.y + lettering.h * 0.75, width);
    c.textAlign = 'left';
  }
  c.font = `700 34px ${data.font}`;
  c.textAlign = 'center';
  c.fillText(data.subtitle, W / 2, lettering.y + lettering.h + 34, width - 40);
  c.textAlign = 'left';

  // The summary box at the foot of the board; the calendar, the whole width, fills the room
  // left above it.
  const summary = { x: left + 110, y: board.y + board.h - 26 - 172, w: width - 220, h: 172 };
  const cal = { x: left, y: lettering.y + lettering.h + 62, w: width };
  const weeks = monthWeeks(data.month);
  const headHeight = 40;
  const room = summary.y - 22 - cal.y - headHeight;
  const rowHeight = Math.min(130, room / weeks.length);
  const colWidth = cal.w / 7;
  const calBottom = cal.y + headHeight + rowHeight * weeks.length;

  // The calendar: the weekdays, a faint grid, each day's number and events.
  c.font = `700 28px ${data.font}`;
  c.textAlign = 'center';
  data.weekdays.forEach((name, i) => {
    c.fillText(name, cal.x + colWidth * (i + 0.5), cal.y + 30, colWidth - 6);
  });
  c.textAlign = 'left';
  c.save();
  c.globalAlpha = 0.45;
  c.lineWidth = 2;
  for (let r = 0; r <= weeks.length; r++) {
    const y = cal.y + headHeight + r * rowHeight;
    c.beginPath();
    c.moveTo(cal.x, y + (rand() - 0.5) * 2);
    c.lineTo(cal.x + cal.w, y + (rand() - 0.5) * 2);
    c.stroke();
  }
  for (let i = 0; i <= 7; i++) {
    const x = cal.x + i * colWidth;
    c.beginPath();
    c.moveTo(x + (rand() - 0.5) * 2, cal.y + headHeight);
    c.lineTo(x + (rand() - 0.5) * 2, calBottom);
    c.stroke();
  }
  c.restore();
  const byDay = new Map<string, BoardEvent[]>();
  for (const event of data.events) byDay.set(event.day, [...(byDay.get(event.day) ?? []), event]);
  const numberSize = Math.round(Math.min(28, rowHeight * 0.32));
  // The events' logos keep their colours: drawn on the slate after the chalk, not grained.
  const placed: { event: BoardEvent; slot: { x: number; y: number; size: number } }[] = [];
  weeks.forEach((week, r) => {
    week.forEach((day, i) => {
      if (!day) return;
      const x = cal.x + i * colWidth;
      const y = cal.y + headHeight + r * rowHeight;
      c.font = `700 ${numberSize}px ${data.font}`;
      c.fillStyle = CHALK;
      c.fillText(String(Number(day.slice(8))), x + 8, y + numberSize + 2);
      const events = byDay.get(day) ?? [];
      // The logos as large as the cell allows, just under the day's number.
      const box = {
        x: x + 3,
        y: y + numberSize * 0.6,
        w: colWidth - 6,
        h: rowHeight - numberSize * 0.6 - 3,
      };
      iconSlots(events.length, box).forEach((slot, k) => placed.push({ event: events[k]!, slot }));
    });
  });

  // The summary: a chalk box with the quiver, the arrows, the stars and the target.
  c.lineWidth = 4;
  c.beginPath();
  c.roundRect(summary.x, summary.y, summary.w, summary.h, 18);
  c.stroke();
  const drawing = 110;
  if (data.summary.quiver) {
    c.drawImage(
      data.summary.quiver,
      summary.x + 10,
      summary.y + (summary.h - drawing) / 2,
      drawing,
      drawing,
    );
  }
  if (data.summary.target) {
    c.drawImage(
      data.summary.target,
      summary.x + summary.w - 10 - drawing,
      summary.y + (summary.h - drawing) / 2,
      drawing,
      drawing,
    );
  }
  const inner = { x: summary.x + drawing + 20, w: summary.w - 2 * (drawing + 20) };
  const half = inner.w / 2;
  const label = (text: string, cx: number) => {
    c.font = `700 24px ${data.font}`;
    c.textAlign = 'center';
    const lines = wrap(text, half - 24, (t) => c.measureText(t).width).slice(0, 2);
    lines.forEach((line, i) => c.fillText(line, cx, summary.y + 40 + i * 28));
    c.textAlign = 'left';
  };
  const arrowsX = inner.x + half / 2;
  label(data.summary.arrowsLabel, arrowsX);
  c.font = `700 64px ${data.font}`;
  c.textAlign = 'center';
  c.fillText(data.summary.arrows, arrowsX, summary.y + summary.h - 26, half - 20);
  c.textAlign = 'left';
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(inner.x + half, summary.y + 24);
  c.lineTo(inner.x + half + 2, summary.y + summary.h - 24);
  c.stroke();
  const starsX = inner.x + half + half / 2;
  label(data.summary.satisfactionLabel, starsX);
  const radius = Math.min(22, (half - 30) / (STAR_COUNT * 2.2));
  const step = radius * 2.3;
  const starsY = summary.y + summary.h - 48;
  for (let n = 1; n <= STAR_COUNT; n++) {
    const sx = starsX + (n - (STAR_COUNT + 1) / 2) * step;
    const fill = starFill(data.summary.stars, n);
    if (fill !== 'empty') {
      c.save();
      starPath(c, sx, starsY, radius);
      c.clip();
      c.fillStyle = STAR_CHALK;
      c.fillRect(sx - radius, starsY - radius, fill === 'full' ? 2 * radius : radius, 2 * radius);
      c.restore();
    }
    c.lineWidth = 3;
    starPath(c, sx, starsY, radius);
    c.stroke();
  }

  grain(layer, rand);
  // Laid on the slate with a soft halo of dust.
  ctx.save();
  ctx.shadowColor = 'rgba(243, 240, 230, 0.35)';
  ctx.shadowBlur = 3;
  ctx.drawImage(layer, 0, 0);
  ctx.restore();

  for (const { event, slot } of placed) {
    ctx.save();
    if (event.icon) ctx.drawImage(event.icon, slot.x, slot.y, slot.size, slot.size);
    else {
      ctx.fillStyle = event.color;
      ctx.beginPath();
      ctx.arc(slot.x + slot.size / 2, slot.y + slot.size / 2, slot.size * 0.35, 0, 2 * Math.PI);
      ctx.fill();
    }
    ctx.restore();
  }

  drawTray(ctx, data.font, data.site);
  ctx.restore();
}
