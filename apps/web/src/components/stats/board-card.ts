/**
 * The season summary's Instagram card, drawn like its whiteboard (season-board.tsx): an
 * aluminium frame, a glossy white board with the title and the figures in marker, papers held by
 * magnets (ruled, squared, a yellow sticky note), the tray at its foot with two markers and an
 * eraser, signed with the site's host. Instagram's portrait format (4:5).
 */

export const BOARD_WIDTH = 1080;
export const BOARD_HEIGHT = 1350;

/** Marker colours, as on the board. */
export const BOARD_INKS = {
  blue: '#1f4fa8',
  red: '#c62828',
  green: '#2e7d32',
  black: '#26292d',
} as const;
export type BoardInk = keyof typeof BOARD_INKS;

/** A figure written in marker: the number large, its name under it. */
export interface BoardFigure {
  key: string;
  label: string;
  value: string;
  ink: BoardInk;
}

/** One line of a paper: a name in bold, a value in red marker, then a note in grey. */
export interface PaperLine {
  label?: string;
  big?: string;
  text?: string;
  /** The note's colour (e.g. a progression's green or red); grey by default. */
  color?: string;
}

export interface BoardPaper {
  key: string;
  title: string;
  kind: 'ruled' | 'squared' | 'sticky';
  magnet: 'red' | 'blue' | 'green' | 'yellow';
  lines: PaperLine[];
}

const MAGNETS = { red: '#e03131', blue: '#1c7ed6', green: '#2f9e44', yellow: '#fab005' };
const FRAME = 34;
const TRAY = 96;
const PAD = 56;
const RULE = 38;
/** The papers' tilts, in turn (degrees). */
const TILTS = [-2.2, 1.6, -1.2];

/** Fonts the card writes with (CSS families, loaded first by the caller). */
export interface BoardFonts {
  marker: string;
  hand: string;
}

/**
 * Words of `text` in lines no wider than `width` (the first `first` wide): a word wider than a
 * line gets one of its own.
 */
function wrap(text: string, first: number, width: number, measure: (t: string) => number) {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && measure(candidate) > (lines.length === 0 ? first : width)) {
      lines.push(line);
      line = word;
    } else line = candidate;
  }
  if (line) lines.push(line);
  return lines;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** A wavy marker underline from `x0` to `x1` at `y`. */
function wavy(ctx: CanvasRenderingContext2D, x0: number, x1: number, y: number, color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let x = x0; x <= x1; x += 4) {
    const dy = Math.sin((x - x0) / 9) * 4;
    if (x === x0) ctx.moveTo(x, y + dy);
    else ctx.lineTo(x, y + dy);
  }
  ctx.stroke();
  ctx.restore();
}

/** A round magnet centred on (x, y): glossy, its shadow on the paper. */
function magnet(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.filter = 'blur(4px)';
  ctx.beginPath();
  ctx.arc(x + 4, y + 7, 22, 0, 2 * Math.PI);
  ctx.fill();
  ctx.filter = 'none';
  const shine = ctx.createRadialGradient(x - 8, y - 9, 2, x, y, 24);
  shine.addColorStop(0, 'rgba(255,255,255,0.9)');
  shine.addColorStop(0.18, color);
  shine.addColorStop(1, '#00000099');
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, 22, 0, 2 * Math.PI);
  ctx.fill();
  ctx.fillStyle = shine;
  ctx.fill();
  ctx.restore();
}

/** A paper's lines laid out `width` wide: what each written line holds. */
function paperRows(
  ctx: CanvasRenderingContext2D,
  lines: PaperLine[],
  width: number,
  fonts: BoardFonts,
) {
  type Piece = { text: string; font: string; color: string };
  const rows: Piece[][] = [];
  const hand = (weight: number) => `${weight} 30px ${fonts.hand}`;
  const big = `400 38px ${fonts.marker}`;
  for (const line of lines) {
    const pieces: Piece[] = [];
    let used = 0;
    const add = (text: string, font: string, color: string) => {
      ctx.font = font;
      pieces.push({ text, font, color });
      used += ctx.measureText(`${text} `).width;
    };
    if (line.label) add(line.label, hand(700), '#2f3a4a');
    if (line.big) add(line.big, big, BOARD_INKS.red);
    // A line with only a note starts with it (no blank line before).
    if (pieces.length > 0) rows.push(pieces);
    if (line.text) {
      ctx.font = hand(400);
      const color = line.color ?? '#6b7280';
      const measure = (t: string) => ctx.measureText(t).width;
      // On the same line when it fits whole; else on the lines below, never cut mid-phrase
      // beside the value (a progression "8,56 → 9,10" stays together).
      if (pieces.length > 0 && used + measure(line.text) <= width) {
        pieces.push({ text: line.text, font: hand(400), color });
      } else {
        for (const part of wrap(line.text, width, width, measure)) {
          rows.push([{ text: part, font: hand(400), color }]);
        }
      }
    }
  }
  return rows;
}

/** Draws the whiteboard card on `ctx` (BOARD_WIDTH × BOARD_HEIGHT). */
export function drawBoardCard(
  ctx: CanvasRenderingContext2D,
  {
    title,
    subtitle,
    figures,
    papers,
    fonts,
    site,
  }: {
    title: string;
    subtitle: string;
    figures: BoardFigure[];
    papers: BoardPaper[];
    fonts: BoardFonts;
    site: string;
  },
) {
  const W = BOARD_WIDTH;
  const H = BOARD_HEIGHT;
  ctx.save();
  ctx.textBaseline = 'alphabetic';

  // The aluminium frame, then the board inside it.
  const metal = ctx.createLinearGradient(0, 0, W, H);
  metal.addColorStop(0, '#e9ecef');
  metal.addColorStop(0.45, '#adb5bd');
  metal.addColorStop(0.7, '#dee2e6');
  metal.addColorStop(1, '#868e96');
  ctx.fillStyle = metal;
  ctx.fillRect(0, 0, W, H);
  const board = { x: FRAME, y: FRAME, w: W - 2 * FRAME, h: H - FRAME - TRAY };
  ctx.fillStyle = '#fbfcfd';
  roundRect(ctx, board.x, board.y, board.w, board.h, 6);
  ctx.fill();
  // Its sheen, across it.
  ctx.save();
  roundRect(ctx, board.x, board.y, board.w, board.h, 6);
  ctx.clip();
  const sheen = ctx.createLinearGradient(
    board.x,
    board.y,
    board.x + board.w,
    board.y + board.h * 0.6,
  );
  sheen.addColorStop(0.2, 'rgba(255,255,255,0)');
  sheen.addColorStop(0.33, 'rgba(230,236,243,0.7)');
  sheen.addColorStop(0.46, 'rgba(255,255,255,0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(board.x, board.y, board.w, board.h);
  ctx.restore();
  ctx.strokeStyle = 'rgba(0,0,0,0.12)';
  ctx.lineWidth = 2;
  roundRect(ctx, board.x, board.y, board.w, board.h, 6);
  ctx.stroke();

  // The title in blue marker, underlined in red; the journal under it.
  const left = board.x + PAD;
  const right = board.x + board.w - PAD;
  ctx.font = `400 84px ${fonts.marker}`;
  ctx.fillStyle = BOARD_INKS.blue;
  ctx.fillText(title, left, board.y + 120, right - left);
  const titleWidth = Math.min(ctx.measureText(title).width, right - left);
  wavy(ctx, left, left + titleWidth, board.y + 142, BOARD_INKS.red);
  ctx.font = `400 40px ${fonts.marker}`;
  ctx.fillStyle = BOARD_INKS.black;
  ctx.fillText(subtitle, left, board.y + 205, right - left);

  // The figures, two by two, in their colours.
  const figureTop = board.y + 250;
  const columns = 2;
  const cell = (right - left) / columns;
  figures.slice(0, 4).forEach((f, i) => {
    const cx = left + cell * (i % columns) + cell / 2;
    const y = figureTop + Math.floor(i / columns) * 170;
    ctx.textAlign = 'center';
    ctx.fillStyle = BOARD_INKS[f.ink];
    ctx.font = `400 92px ${fonts.marker}`;
    ctx.fillText(f.value, cx, y + 90, cell - 20);
    ctx.font = `400 34px ${fonts.marker}`;
    ctx.fillText(f.label, cx, y + 136, cell - 20);
    ctx.textAlign = 'left';
  });
  const rowsOfFigures = Math.ceil(Math.min(figures.length, 4) / columns);

  // The papers: side by side (one, two or three), each tilted, its magnet at the top.
  const papersTop = figureTop + rowsOfFigures * 170 + (rowsOfFigures ? 50 : 0);
  const shown = papers.slice(0, 3);
  const gap = 34;
  const paperWidth = shown.length ? (right - left - gap * (shown.length - 1)) / shown.length : 0;
  const maxBottom = board.y + board.h - 60;
  shown.forEach((paper, i) => {
    const x = left + i * (paperWidth + gap);
    const inner = paperWidth - (paper.kind === 'ruled' ? 76 : 48);
    const rows = paperRows(ctx, paper.lines, inner, fonts);
    ctx.font = `400 30px ${fonts.marker}`;
    const titleLines = wrap(paper.title, inner, inner, (t) => ctx.measureText(t).width);
    const height = Math.min(
      maxBottom - papersTop,
      56 + titleLines.length * 40 + 14 + Math.max(rows.length, 1) * RULE + 30,
    );
    ctx.save();
    ctx.translate(x + paperWidth / 2, papersTop + height / 2);
    ctx.rotate(((TILTS[i] ?? 0) * Math.PI) / 180);
    ctx.translate(-paperWidth / 2, -height / 2);
    // Its shadow on the board, then the paper.
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 8;
    ctx.fillStyle = paper.kind === 'sticky' ? '#fff3a0' : '#ffffff';
    ctx.fillRect(0, 0, paperWidth, height);
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, paperWidth, height);
    ctx.clip();
    if (paper.kind === 'ruled') {
      ctx.strokeStyle = 'rgba(90,135,190,0.35)';
      ctx.lineWidth = 1.5;
      for (let y = 40; y < height; y += RULE) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(paperWidth, y);
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(212,80,80,0.55)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(52, 0);
      ctx.lineTo(52, height);
      ctx.stroke();
    } else if (paper.kind === 'squared') {
      ctx.strokeStyle = 'rgba(90,135,190,0.22)';
      ctx.lineWidth = 1;
      for (let v = 0; v < Math.max(paperWidth, height); v += 17) {
        ctx.beginPath();
        ctx.moveTo(v, 0);
        ctx.lineTo(v, height);
        ctx.moveTo(0, v);
        ctx.lineTo(paperWidth, v);
        ctx.stroke();
      }
    }
    ctx.restore();

    const textX = paper.kind === 'ruled' ? 66 : 24;
    let y = 72;
    ctx.font = `400 30px ${fonts.marker}`;
    ctx.fillStyle = BOARD_INKS.blue;
    for (const line of titleLines) {
      ctx.fillText(line, textX, y);
      y += 40;
    }
    y += 14;
    for (const row of rows) {
      if (y > height - 16) break;
      let rx = textX;
      for (const piece of row) {
        ctx.font = piece.font;
        ctx.fillStyle = piece.color;
        ctx.fillText(piece.text, rx, y);
        rx += ctx.measureText(`${piece.text} `).width;
      }
      y += RULE;
    }
    magnet(ctx, paperWidth / 2, 2, MAGNETS[paper.magnet]);
    ctx.restore();
  });

  // The tray: a ledge, two markers and an eraser; the site's host on the right.
  const trayY = H - TRAY;
  const ledge = ctx.createLinearGradient(0, trayY, 0, H);
  ledge.addColorStop(0, '#868e96');
  ledge.addColorStop(0.3, '#ced4da');
  ledge.addColorStop(1, '#adb5bd');
  ctx.fillStyle = ledge;
  ctx.fillRect(0, trayY, W, TRAY);
  const pen = (x: number, cap: string) => {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 3;
    ctx.fillStyle = '#f8f9fa';
    roundRect(ctx, x, trayY + 34, 150, 26, 8);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = cap;
    roundRect(ctx, x, trayY + 34, 44, 26, 6);
    ctx.fill();
    ctx.fillStyle = '#495057';
    ctx.fillRect(x + 140, trayY + 40, 10, 14);
  };
  pen(FRAME + 30, BOARD_INKS.blue);
  pen(FRAME + 210, BOARD_INKS.red);
  ctx.fillStyle = '#343a40';
  roundRect(ctx, FRAME + 400, trayY + 26, 140, 26, 5);
  ctx.fill();
  ctx.fillStyle = '#adb5bd';
  roundRect(ctx, FRAME + 400, trayY + 48, 140, 16, 4);
  ctx.fill();
  ctx.font = `400 34px ${fonts.marker}`;
  ctx.fillStyle = '#495057';
  ctx.textAlign = 'right';
  ctx.fillText(`Tiralarc · ${site}`, W - FRAME - 20, trayY + 62, 420);
  ctx.textAlign = 'left';
  ctx.restore();
}
