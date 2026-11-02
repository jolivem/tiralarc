import type { Discipline, Feeling, JournalSession } from '@tiralarc/api-client';

/** What an event's Instagram summary can show, in the sheet's order (share-modal.tsx). */
export const SHARE_FIELDS = [
  'date',
  'location',
  'discipline',
  'distance',
  'duration',
  'arrows',
  'score',
  'objective',
  'satisfaction',
  'technique',
  'physical',
  'mental',
  'description',
  'wentWell',
  'toImprove',
  'nextTime',
] as const;
export type ShareField = (typeof SHARE_FIELDS)[number];

/** Ticked when the dialog opens (those the event has). */
export const DEFAULT_SHARE_FIELDS: ShareField[] = [
  'date',
  'location',
  'discipline',
  'distance',
  'arrows',
  'score',
];

/** One field of the summary: a value on the label's line, or a list below it. */
export interface ShareRow {
  field: ShareField;
  label: string;
  text?: string;
  items?: string[];
  /** The list's bullet: what went well, or what is to improve. */
  bullet?: 'well' | 'improve';
  /** A feeling: its face on the card (`text` names it in the caption). */
  feeling?: Feeling;
  /** A rating (0–10): a bar on the card (`text` gives it in the caption). */
  rating?: number;
}

/** How the dialog words the values (translations, date format). */
export interface ShareWording {
  label: (field: ShareField) => string;
  date: (date: string) => string;
  discipline: (discipline: Discipline) => string;
  feeling: (feeling: Feeling) => string;
  rating: (value: number) => string;
  meters: (value: number) => string;
  minutes: (value: number) => string;
}

/** The fields the event has filled (the date always), worded, in `SHARE_FIELDS` order. */
export function filledRows(session: JournalSession, w: ShareWording): ShareRow[] {
  const lines = (items: string[]) => items.map((line) => line.trim()).filter(Boolean);
  const values: Record<ShareField, string | string[] | null> = {
    date: w.date(session.date),
    location: session.location,
    discipline: session.discipline && w.discipline(session.discipline),
    distance: session.distanceMeters === null ? null : w.meters(session.distanceMeters),
    duration: session.durationMinutes === null ? null : w.minutes(session.durationMinutes),
    arrows: session.arrowCount === null ? null : String(session.arrowCount),
    score: session.score === null ? null : String(session.score),
    objective: session.objective,
    satisfaction: session.satisfaction === null ? null : w.rating(session.satisfaction),
    technique: session.technique === null ? null : w.rating(session.technique),
    physical: session.physicalFeeling && w.feeling(session.physicalFeeling),
    mental: session.mentalFeeling && w.feeling(session.mentalFeeling),
    description: session.description,
    wentWell: lines(session.wentWell),
    toImprove: lines(session.toImprove),
    nextTime: session.nextTime,
  };
  const feelings: Partial<Record<ShareField, Feeling | null>> = {
    physical: session.physicalFeeling,
    mental: session.mentalFeeling,
  };
  const ratings: Partial<Record<ShareField, number | null>> = {
    satisfaction: session.satisfaction,
    technique: session.technique,
  };
  return SHARE_FIELDS.flatMap((field): ShareRow[] => {
    const value = values[field];
    if (value === null || value.length === 0) return [];
    const label = w.label(field);
    const feeling = feelings[field];
    if (feeling) return [{ field, label, text: value as string, feeling }];
    const rating = ratings[field];
    if (rating != null) return [{ field, label, text: value as string, rating }];
    if (typeof value === 'string') return [{ field, label, text: value.trim() }];
    return [{ field, label, items: value, bullet: field === 'wentWell' ? 'well' : 'improve' }];
  });
}

const BULLETS = { well: '✓', improve: '→' } as const;

/**
 * A line of the card: a field's label (on its first line), then text (or a feeling's face);
 * lists indented.
 */
export interface CardLine extends Cell {
  /** The right column's part of the line (two fields side by side: `pairing`). */
  right?: Cell;
}

/** What a column of a line holds. */
interface Cell {
  label?: string;
  text: string;
  bullet?: 'well' | 'improve';
  indent?: boolean;
  feeling?: Feeling;
  rating?: number;
}

/** The sheet's Informations: short values, two side by side at the top of the card. */
const SHORT_FIELDS: ShareField[] = [
  'location',
  'discipline',
  'distance',
  'duration',
  'arrows',
  'score',
];

/** A field's label then its value, wrapped `width` wide: one cell of the two columns. */
function cellLines(row: ShareRow, width: number, measure: (text: string) => number) {
  const label = `${row.label} : `;
  return wrapText(row.text ?? '', width - measure(label), width, measure).map((text, i) =>
    i === 0 ? { label, text } : { text },
  );
}

/**
 * Words of `text` (its own line breaks kept) in lines no wider than `width`, the first one
 * `first` wide (what the label leaves). A word wider than a line gets a line of its own.
 */
export function wrapText(
  text: string,
  first: number,
  width: number,
  measure: (text: string) => number,
): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split('\n')) {
    let line = '';
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;
      const room = lines.length === 0 ? first : width;
      if (line && measure(candidate) > room) {
        lines.push(line);
        line = word;
      } else line = candidate;
    }
    lines.push(line);
  }
  return lines;
}

/** A field's lines `width` wide: its label, then its value, face, bar or list. */
function rowLines(row: ShareRow, width: number, measure: (text: string) => number): Cell[] {
  const label = `${row.label} : `;
  // The face, on the label's line (its name if the drawing is missing).
  if (row.feeling) return [{ label, text: row.text ?? '', feeling: row.feeling }];
  // A rating: its bar, on the label's line.
  if (row.rating !== undefined) return [{ label, text: row.text ?? '', rating: row.rating }];
  if (row.items) {
    const indent = measure('mm');
    const bullet = row.bullet ?? 'well';
    return [
      // Its label on lines of its own (wrapped if longer than half the width).
      ...wrapText(`${row.label} :`, width, width, measure).map((line) => ({
        label: line,
        text: '',
      })),
      ...row.items.flatMap((item) =>
        wrapText(item, width - indent, width - indent, measure).map((text, i) => ({
          text,
          indent: true,
          bullet: i === 0 ? bullet : undefined,
        })),
      ),
    ];
  }
  return cellLines(row, width, measure);
}

/**
 * What goes two side by side: the short fields (left to right, then down), the two feelings,
 * the two lists. Ratings and texts take the whole width.
 */
function pairing(row: ShareRow | undefined) {
  if (!row) return null;
  if (SHORT_FIELDS.includes(row.field)) return 'short';
  if (row.feeling) return 'feeling';
  return row.items ? 'list' : null;
}

/**
 * The card's lines for `rows`, at most `width` wide (`measure` in the card's font): two
 * fields side by side when they pair (`pairing`), each wrapped in its column; one field
 * after another otherwise.
 */
export function cardLines(
  rows: ShareRow[],
  width: number,
  measure: (text: string) => number,
): CardLine[] {
  const column = (width - columnGap(measure)) / 2;
  const lines: CardLine[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] as ShareRow;
    const kind = pairing(row);
    if (kind && pairing(rows[i + 1]) === kind) {
      const left = rowLines(row, column, measure);
      const right = rowLines(rows[++i] as ShareRow, column, measure);
      for (let line = 0; line < Math.max(left.length, right.length); line++) {
        lines.push({ ...(left[line] ?? { text: '' }), ...(right[line] && { right: right[line] }) });
      }
    } else {
      // A short field alone keeps to its column, as the others above it.
      lines.push(...rowLines(row, kind === 'short' ? column : width, measure));
    }
  }
  return lines;
}

/** Between the two columns. */
const columnGap = (measure: (text: string) => number) => measure('mmm');

/** Instagram's portrait format (4:5): the card leads the carousel, the photos follow it. */
export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1350;

const DESK = '#000000';
const PAPER = '#fffdf6';
const RULING = '#a9c8e8';
const MARGIN = '#e06666';
const INK = '#27313f';
const LABEL_INK = '#1c4f8f';
const HIGHLIGHT = '#bfe0ff';
const BULLET_INK = { well: '#0ca678', improve: '#f76707' } as const;
/** The leaf on the desk: this far from the card's top, right and bottom. */
const PAPER_INSET = 26;
/**
 * Its left side, torn along the spiral's holes: their centres, half-height, depth into the
 * paper (wider than high) and spacing.
 */
const TORN_X = 52;
const HOLE_RADIUS = 12;
const HOLE_DEPTH = 20;
const HOLE_PITCH = 54;
/** The double red margin line (its two strokes), then the text's left edge. */
const MARGIN_X = 160;
const MARGIN_GAP = 7;
const TEXT_X = 195;
const TEXT_RIGHT = CARD_WIDTH - 70;
const BODY_TOP = 330;
const BODY_BOTTOM = CARD_HEIGHT - 120;
/** Ruling pitches tried, widest first, until every line fits; the writing follows it. */
const PITCHES = [56, 52, 48, 44, 40];
const WRITING = 0.8;
/** The type's drawing, top right; the title keeps clear of it. */
const LOGO_SIZE = 180;
const LOGO_TOP = 70;

/** A steady pseudo-random number in [0, 1) for `n`: the torn edge is the same every time. */
function noise(n: number): number {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * The leaf's outline: straight top, right and bottom; the left side torn off a spiral
 * notebook, through the holes (half-holes cut into the paper), ragged between them.
 */
function leafPath(ctx: CanvasRenderingContext2D) {
  const top = PAPER_INSET;
  const bottom = CARD_HEIGHT - PAPER_INSET;
  const holes = Math.floor((bottom - top - HOLE_PITCH / 2) / HOLE_PITCH);
  const first = top + (bottom - top - (holes - 1) * HOLE_PITCH) / 2;
  const torn = (seed: number) => TORN_X + (noise(seed) - 0.5) * 7;
  ctx.beginPath();
  ctx.moveTo(CARD_WIDTH - PAPER_INSET, top);
  ctx.lineTo(torn(0), top);
  // Down the torn side: ragged paper up to each hole, then the half-hole it tore through.
  let y = top;
  for (let i = 0; i < holes; i++) {
    const cy = first + i * HOLE_PITCH;
    for (let step = 1; y + 8 < cy - HOLE_RADIUS; step++) {
      y = Math.min(y + 6 + noise(i * 31 + step) * 6, cy - HOLE_RADIUS);
      ctx.lineTo(torn(i * 17 + step), y);
    }
    ctx.lineTo(TORN_X, cy - HOLE_RADIUS);
    ctx.ellipse(TORN_X, cy, HOLE_DEPTH, HOLE_RADIUS, 0, -Math.PI / 2, Math.PI / 2);
    y = cy + HOLE_RADIUS;
  }
  for (let step = 1; y + 8 < bottom; step++) {
    y += 6 + noise(999 + step) * 6;
    ctx.lineTo(torn(500 + step), Math.min(y, bottom));
  }
  ctx.lineTo(torn(1), bottom);
  ctx.lineTo(CARD_WIDTH - PAPER_INSET, bottom);
  ctx.closePath();
}
const RATING_TRACK = '#e9ecef';
/** A rating's bar at most; its "n/10" right after it. */
const RATING_BAR_WIDTH = 380;
/** The leaf leans left (radians), a little smaller than the card so its corners stay in. */
const TILT = (-2 * Math.PI) / 180;
const TILT_SCALE = 0.955;

/** A rating's colour, as the sheet's sliders: red up to 3, orange from 4 to 6, green from 7. */
function ratingInk(value: number): string {
  if (value <= 3) return '#fa5252';
  return value < 7 ? '#fd7e14' : '#40c057';
}

/**
 * The summary card on a leaf torn off a spiral notebook, lying on a desk (ruled, a double
 * red margin line): the event's type highlighted, its
 * day below, then the fields on the ruled lines (smaller writing when they don't fit, the
 * last line cut otherwise), signed at the bottom with the website (`site`, its host name).
 * `font` is the CSS family of the
 * archer's calligraphy font (Profile page), already loaded; `faces` the feelings' drawings (loaded), each
 * drawn on its pastel as on the sheet; `logo` the type's drawing, top right. Ratings are bars.
 */
export function drawCard(
  ctx: CanvasRenderingContext2D,
  {
    title,
    date,
    rows,
    font,
    faces,
    logo,
    site,
  }: {
    title: string;
    date: string | null;
    rows: ShareRow[];
    font: string;
    logo: CanvasImageSource | null;
    site: string;
    faces: Partial<Record<Feeling, { image: CanvasImageSource; color: string }>>;
  },
) {
  // The desk, then the leaf torn off the spiral notebook, its shadow on the desk.
  ctx.fillStyle = DESK;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
  // Everything on the leaf leans with it, around the card's centre.
  ctx.save();
  ctx.translate(CARD_WIDTH / 2, CARD_HEIGHT / 2);
  ctx.rotate(TILT);
  ctx.scale(TILT_SCALE, TILT_SCALE);
  ctx.translate(-CARD_WIDTH / 2, -CARD_HEIGHT / 2);
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.22)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 5;
  leafPath(ctx);
  ctx.fillStyle = PAPER;
  ctx.fill();
  ctx.restore();

  // The largest writing whose lines fit between the header and the signature.
  let step = PITCHES[0] as number;
  let size = 0;
  let lines: CardLine[] = [];
  for (step of PITCHES) {
    size = Math.round(step * WRITING);
    ctx.font = `700 ${size}px ${font}`;
    lines = cardLines(rows, TEXT_RIGHT - TEXT_X, (text) => ctx.measureText(text).width);
    if (lines.length * step <= BODY_BOTTOM - BODY_TOP) break;
  }
  const room = Math.floor((BODY_BOTTOM - BODY_TOP) / step);
  if (lines.length > room) {
    lines = lines.slice(0, room);
    const last = lines.at(-1);
    if (last) last.text = `${last.text} …`;
  }

  // On the leaf only: the ruling from near its top to the bottom (through the header, as on
  // a notebook's page; the fields' lines are among them), the double red margin line.
  ctx.save();
  leafPath(ctx);
  ctx.clip();
  ctx.strokeStyle = RULING;
  ctx.lineWidth = 2;
  const firstLine = BODY_TOP - Math.floor((BODY_TOP - PAPER_INSET - 40) / step) * step;
  for (let y = firstLine; y < CARD_HEIGHT - PAPER_INSET; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(CARD_WIDTH, y);
    ctx.stroke();
  }
  ctx.strokeStyle = MARGIN;
  ctx.lineWidth = 3;
  for (const x of [MARGIN_X, MARGIN_X + MARGIN_GAP]) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, CARD_HEIGHT);
    ctx.stroke();
  }
  ctx.restore();

  // The type's drawing top right (its shape kept), the type highlighted (as the PDF's
  // titles) on its left, and the day below.
  const headerWidth = TEXT_RIGHT - TEXT_X - (logo ? LOGO_SIZE + 20 : 0);
  if (logo) {
    const { width, height } = logo as { width: number; height: number };
    const scale = LOGO_SIZE / Math.max(width, height, 1);
    const [w, h] = [width * scale, height * scale];
    ctx.drawImage(
      logo,
      TEXT_RIGHT - LOGO_SIZE + (LOGO_SIZE - w) / 2,
      LOGO_TOP + (LOGO_SIZE - h) / 2,
      w,
      h,
    );
  }
  ctx.textBaseline = 'alphabetic';
  ctx.font = `700 120px ${font}`;
  const titleWidth = Math.min(ctx.measureText(title).width, headerWidth);
  ctx.fillStyle = HIGHLIGHT;
  ctx.fillRect(TEXT_X - 16, 120, titleWidth + 32, 60);
  ctx.fillStyle = INK;
  ctx.fillText(title, TEXT_X, 170, headerWidth);
  if (date) {
    ctx.font = `700 60px ${font}`;
    ctx.fillStyle = LABEL_INK;
    ctx.fillText(date, TEXT_X, 260, headerWidth);
  }

  // The fields, each line on a ruled line.
  const indent = (() => {
    ctx.font = `700 ${size}px ${font}`;
    return ctx.measureText('mm').width;
  })();
  const gap = columnGap((text) => ctx.measureText(text).width);
  const ratingLabels = Math.max(
    0,
    ...lines.flatMap((line) =>
      line.rating !== undefined && line.label ? [ctx.measureText(line.label).width] : [],
    ),
  );
  lines.forEach((line, i) => {
    const baseline = BODY_TOP + (i + 1) * step - Math.round(size * 0.18);
    /**
     * One column of the line from `start`: a list's bullet, the label, then the value (a
     * feeling's face: a pastel disc around the line's middle, its strokes on it); gives where
     * it ends.
     */
    const cell = (part: Cell, start: number) => {
      let x = start + (part.indent ? indent : 0);
      ctx.font = `700 ${size}px ${font}`;
      if (part.bullet) {
        ctx.fillStyle = BULLET_INK[part.bullet];
        ctx.fillText(BULLETS[part.bullet], x - indent * 0.9, baseline);
      }
      if (part.label) {
        ctx.fillStyle = LABEL_INK;
        ctx.fillText(part.label, x, baseline);
        x += ctx.measureText(part.label).width;
      }
      const face = part.feeling && faces[part.feeling];
      if (face) {
        const radius = size * 0.62;
        const centerY = baseline - size * 0.35;
        ctx.fillStyle = face.color;
        ctx.beginPath();
        ctx.arc(x + radius, centerY, radius, 0, 2 * Math.PI);
        ctx.fill();
        const side = radius * 1.5;
        ctx.drawImage(face.image, x + radius - side / 2, centerY - side / 2, side, side);
        return x + 2 * radius;
      }
      ctx.font = `400 ${size}px ${font}`;
      ctx.fillStyle = INK;
      ctx.fillText(part.text, x, baseline);
      return x + ctx.measureText(part.text).width;
    };
    if (line.rating !== undefined) {
      // The label, then a rounded bar to the "n/10" at the line's end, filled up to the
      // rating. The bars line up, after the longest of their labels.
      cell({ label: line.label, text: '' }, TEXT_X);
      const barX = TEXT_X + ratingLabels + size * 0.2;
      const barWidth = Math.min(RATING_BAR_WIDTH, TEXT_RIGHT - barX - size * 2.4);
      const barHeight = size * 0.32;
      const barY = baseline - size * 0.35 - barHeight / 2;
      ctx.fillStyle = RATING_TRACK;
      ctx.beginPath();
      ctx.roundRect(barX, barY, barWidth, barHeight, barHeight / 2);
      ctx.fill();
      if (line.rating > 0) {
        ctx.fillStyle = ratingInk(line.rating);
        ctx.beginPath();
        ctx.roundRect(barX, barY, (barWidth * line.rating) / 10, barHeight, barHeight / 2);
        ctx.fill();
      }
      ctx.fillStyle = INK;
      ctx.fillText(line.text, barX + barWidth + size * 0.4, baseline);
      return;
    }
    const end = cell(line, TEXT_X);
    // The right column, half the width plus half the gap from the left edge (further if the
    // left part, a face after a long label, reaches it).
    if (line.right) cell(line.right, Math.max(TEXT_X + (TEXT_RIGHT - TEXT_X + gap) / 2, end + gap));
  });

  ctx.font = `700 44px ${font}`;
  ctx.fillStyle = '#868e96';
  ctx.textAlign = 'right';
  ctx.fillText(`Tiralarc · ${site}`, TEXT_RIGHT, CARD_HEIGHT - 50, TEXT_RIGHT - TEXT_X);
  ctx.textAlign = 'left';
  drawPin(ctx, CARD_WIDTH / 2, PIN_Y);
  ctx.restore();
}

/** Where the push pin goes into the leaf: at its top, in the middle. */
const PIN_Y = 92;

/**
 * A red push pin stuck in slanted, its head up and to the left of where it goes in, so the
 * start of its needle shows: the pin's shadow cast on the paper (down to the right), the
 * needle, the collar, then the domed head lit from the top left. `x`, `y`: the needle's
 * point in the paper.
 */
export function drawPin(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const [hx, hy] = [x - 30, y - 46];
  ctx.save();
  // The shadow on the paper: the needle's, then the head's, further from the point.
  ctx.filter = 'blur(5px)';
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.28)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + 34, y - 14);
  ctx.stroke();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.ellipse(x + 46, y - 18, 26, 18, -Math.PI / 8, 0, 2 * Math.PI);
  ctx.fill();
  ctx.filter = 'none';
  // The hole the point makes in the paper.
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.beginPath();
  ctx.ellipse(x, y, 3, 2, 0, 0, 2 * Math.PI);
  ctx.fill();
  // The needle: steel, lit along one side.
  const steel = ctx.createLinearGradient(x - 3, y, x + 3, y);
  steel.addColorStop(0, '#6c737a');
  steel.addColorStop(0.5, '#e9ecef');
  steel.addColorStop(1, '#868e96');
  ctx.strokeStyle = steel;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(hx + 4, hy + 8);
  ctx.stroke();
  // The collar: a wider, darker disc under the dome, toward the needle.
  ctx.fillStyle = '#a61e1e';
  ctx.beginPath();
  ctx.ellipse(hx + 4, hy + 6, 29, 24, Math.PI / 6, 0, 2 * Math.PI);
  ctx.fill();
  // The dome.
  const dome = ctx.createRadialGradient(hx - 8, hy - 10, 2, hx, hy, 26);
  dome.addColorStop(0, '#ff9b9b');
  dome.addColorStop(0.45, '#e03131');
  dome.addColorStop(1, '#8f1717');
  ctx.fillStyle = dome;
  ctx.beginPath();
  ctx.arc(hx, hy, 24, 0, 2 * Math.PI);
  ctx.fill();
  // The light's reflection.
  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.beginPath();
  ctx.ellipse(hx - 9, hy - 10, 7, 4.5, -Math.PI / 4, 0, 2 * Math.PI);
  ctx.fill();
  ctx.restore();
}
