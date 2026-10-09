'use client';

import { useComputedColorScheme } from '@mantine/core';
import type { ThemeFill } from '@tiralarc/api-client';
import { type MouseEvent, type ReactNode, useEffect, useRef, useState } from 'react';
import { type Artwork, inRegion, paint, regionAt, toArtwork } from './coloring';
import classes from './journal.module.css';
import { type ThemeBand, type ThemeId, themeImage, THEMES } from './themes';

/** Longest side, in pixels, the artwork is coloured at (larger images are scaled down). */
const MAX_WORK_SIZE = 2000;
/** "eraser", or the "#rrggbb" colour the next click paints with. Null = not colouring. */
export type ColoringTool = string | null;
export const ERASER = 'eraser';

/**
 * Surrounds the calendar with the month's decoration theme: a band on each
 * side on large screens, top and bottom on tablets, top only on phones.
 * The archer's colouring (`fills`) is painted on the bands; with a `tool`,
 * clicking a band colours or clears the closed area under the pointer.
 */
export function CalendarFrame({
  theme,
  fills,
  tool,
  onFillsChange,
  children,
}: {
  theme: ThemeId | null;
  fills: ThemeFill[];
  tool: ColoringTool;
  onFillsChange: (fills: ThemeFill[]) => void;
  children: ReactNode;
}) {
  if (!theme) return <>{children}</>;

  const bands: readonly ThemeBand[] = THEMES[theme].bands;
  const band = (name: ThemeBand) =>
    bands.includes(name) && (
      <Band
        // A new image means new artwork: start again from the plain picture.
        key={`${theme}/${name}`}
        src={themeImage(theme, name)}
        band={name}
        fills={fills}
        tool={tool}
        onFillsChange={onFillsChange}
      />
    );

  return (
    <div className={classes.frame}>
      {band('top')}
      {band('left')}
      <div className={classes.frameContent}>{children}</div>
      {band('right')}
      {band('bottom')}
    </div>
  );
}

/** One band: the plain image until its pixels are read, then a canvas with the colouring. */
function Band({
  src,
  band,
  fills,
  tool,
  onFillsChange,
}: {
  src: string;
  band: ThemeBand;
  fills: ThemeFill[];
  tool: ColoringTool;
  onFillsChange: (fills: ThemeFill[]) => void;
}) {
  const dark = useComputedColorScheme('light') === 'dark';
  const [art, setArt] = useState<Artwork | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;
    const image = new Image();
    image.onload = () => {
      if (cancelled) return;
      const scale = Math.min(1, MAX_WORK_SIZE / Math.max(image.naturalWidth, image.naturalHeight));
      const width = Math.max(1, Math.round(image.naturalWidth * scale));
      const height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = Object.assign(document.createElement('canvas'), { width, height }).getContext(
        '2d',
        { willReadFrequently: true },
      );
      if (!context) return;
      context.drawImage(image, 0, 0, width, height);
      setArt(toArtwork(context.getImageData(0, 0, width, height).data, width, height));
    };
    image.src = src;
    return () => {
      cancelled = true;
    };
  }, [src]);

  const own = fills.filter((fill) => fill.band === band);
  // Repaint when the colouring of this band changes, not on every render.
  const signature = JSON.stringify(own);
  useEffect(() => {
    const context = canvas.current?.getContext('2d');
    if (!art || !context) return;
    const line: [number, number, number] = dark ? [255, 255, 255] : [0, 0, 0];
    const pixels = paint(art, JSON.parse(signature) as ThemeFill[], line);
    context.putImageData(new ImageData(pixels, art.width, art.height), 0, 0);
  }, [art, signature, dark]);

  if (!art) {
    // Decorative, and static files of unknown size: a plain <img> rather than next/image.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" className={classes.frameBand} data-band={band} />;
  }

  const click = (event: MouseEvent<HTMLCanvasElement>) => {
    if (!tool) return;
    // The picture is fitted inside the element ("contain"): find the point in the picture itself.
    const box = event.currentTarget.getBoundingClientRect();
    const scale = Math.min(box.width / art.width, box.height / art.height);
    const x =
      (event.clientX - box.left - (box.width - art.width * scale) / 2) / (art.width * scale);
    const y =
      (event.clientY - box.top - (box.height - art.height * scale) / 2) / (art.height * scale);
    if (x < 0 || x > 1 || y < 0 || y > 1) return;
    const region = regionAt(art, x, y);
    if (!region) return; // on a stroke
    // Whatever was painted in this area is replaced, so the list doesn't grow with repaints.
    const kept = fills.filter((fill) => fill.band !== band || !inRegion(art, region, fill));
    const round = (value: number) => Math.round(value * 10_000) / 10_000;
    const next =
      tool === ERASER ? kept : [...kept, { band, x: round(x), y: round(y), color: tool }];
    if (next.length !== fills.length || tool !== ERASER) onFillsChange(next);
  };

  return (
    <canvas
      ref={canvas}
      width={art.width}
      height={art.height}
      className={classes.frameBand}
      data-band={band}
      data-painted
      data-coloring={tool ? true : undefined}
      onClick={click}
    />
  );
}
