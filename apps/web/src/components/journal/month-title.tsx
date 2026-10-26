'use client';

import { ActionIcon } from '@mantine/core';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import type { ThemeFill } from '@tiralarc/api-client';
import { useEffect, useState } from 'react';
import { type ColoringTool, ColorableCanvas } from './calendar-frame';
import { type Artwork, letterSeeds, toArtwork } from './coloring';
import classes from './journal.module.css';

/**
 * The month's name is drawn on a canvas of this size, so a fill's position (fractions of
 * it) finds the same letter again. Long names are scaled down to fit; the others keep one size.
 */
const WIDTH = 1600;
const HEIGHT = 260;
const FONT_SIZE = 200;
/** Only the letters' outline is drawn (hollow letters), thick enough to stay crisp once scaled down. */
const OUTLINE_WIDTH = 6;

/** Colours the whole name can take (Décor du mois dialog). Keys name them in the message files. */
export const PASTELS = {
  rose: '#f9c6d6',
  coral: '#ffc9b9',
  peach: '#ffdcb5',
  lemon: '#fff1a6',
  mint: '#c9efcf',
  aqua: '#bdeae3',
  sky: '#c4e0fb',
  periwinkle: '#cdd3f7',
  lavender: '#dccdf3',
  lilac: '#f0cdef',
  sand: '#ecdfc6',
  pearl: '#e3e6eb',
} as const;

/** All the letters of the name in `color`: one fill per letter (none for the holes in them). */
export function titleFills(art: Artwork, color: string): ThemeFill[] {
  const round = (value: number) => Math.round(value * 10_000) / 10_000;
  return letterSeeds(art).map(({ x, y }) => ({ band: 'title', x: round(x), y: round(y), color }));
}

/** The name in `--font-month` (Ribeye), outlined only (hollow letters), as line art. */
export function useLettering(text: string): Artwork | null {
  const [drawn, setDrawn] = useState<{ text: string; art: Artwork } | null>(null);

  useEffect(() => {
    let cancelled = false;
    // next/font's generated family names (with their fallback), set on <html> by the layout.
    const family = getComputedStyle(document.documentElement)
      .getPropertyValue('--font-month')
      .trim();
    if (!family) return;
    // Drawing before the font arrives would draw the fallback's letters. A failed load
    // (e.g. the fallback face's local() font missing, as on a bare Linux) still draws.
    void document.fonts
      .load(`${FONT_SIZE}px ${family}`, text)
      .catch(() => [])
      .then(() => {
        if (cancelled) return;
        const context = Object.assign(document.createElement('canvas'), {
          width: WIDTH,
          height: HEIGHT,
        }).getContext('2d', { willReadFrequently: true });
        if (!context) return;
        context.fillStyle = '#fff';
        context.fillRect(0, 0, WIDTH, HEIGHT);
        context.font = `${FONT_SIZE}px ${family}`;
        const fit = Math.min(1, (WIDTH * 0.96) / context.measureText(text).width);
        context.font = `${Math.floor(FONT_SIZE * fit)}px ${family}`;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.strokeStyle = '#000';
        context.lineWidth = OUTLINE_WIDTH;
        context.lineJoin = 'round';
        context.strokeText(text, WIDTH / 2, HEIGHT / 2);
        setDrawn({
          text,
          art: toArtwork(context.getImageData(0, 0, WIDTH, HEIGHT).data, WIDTH, HEIGHT),
        });
      });
    return () => {
      cancelled = true;
    };
  }, [text]);

  return drawn?.text === text ? drawn.art : null;
}

/**
 * The calendar's heading: the month's name, centred in large hollow letters the archer
 * colours in like the decoration (band `title` of the month's colouring), between two
 * frameless arrows.
 */
export function MonthTitle({
  label,
  art,
  fills,
  tool,
  onFillsChange,
  onPrevious,
  onNext,
  labels,
}: {
  /** "Octobre 2026", for screen readers: the drawing shows the month's name alone. */
  label: string;
  /** `useLettering("Octobre")`; null while the font loads. */
  art: Artwork | null;
  fills: ThemeFill[];
  tool: ColoringTool;
  onFillsChange: (fills: ThemeFill[]) => void;
  onPrevious: () => void;
  onNext: () => void;
  labels: { previous: string; next: string };
}) {
  return (
    <div className={classes.monthHeader}>
      <ActionIcon
        variant="transparent"
        size={56}
        className={classes.monthArrow}
        aria-label={labels.previous}
        title={labels.previous}
        onClick={onPrevious}
      >
        <IconChevronLeft size={48} stroke={1.5} />
      </ActionIcon>
      <div className={classes.monthHeading}>
        <h2 className={classes.srOnly}>{label}</h2>
        {art ? (
          <ColorableCanvas
            art={art}
            band="title"
            fills={fills}
            tool={tool}
            onFillsChange={onFillsChange}
            className={classes.monthLettering}
            enclosedOnly
          />
        ) : (
          // The same room while the font loads, so the calendar doesn't jump.
          <div className={classes.monthLettering} aria-hidden />
        )}
      </div>
      <ActionIcon
        variant="transparent"
        size={56}
        className={classes.monthArrow}
        aria-label={labels.next}
        title={labels.next}
        onClick={onNext}
      >
        <IconChevronRight size={48} stroke={1.5} />
      </ActionIcon>
    </div>
  );
}
