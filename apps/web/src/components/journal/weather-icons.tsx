import type { Sky, Wind } from '@tiralarc/api-client';

/**
 * The weather of an outdoor session, drawn: the sky (sun, sunny spells, clouds, rain) and the
 * wind (a red and white windsock on its pole). Written as SVG text, so the same drawings go on
 * the sheet and the PDF (`SkyIcon`, `Windsock`) and on the Instagram card's canvas
 * (`weatherImageUrl`).
 */

/** Colours of the drawings (the same in light and dark mode: they are pictures). */
const SUN = '#f5b301';
const CLOUD = '#c3cad5';
const CLOUD_BEHIND = '#e2e6ec';
const CLOUD_EDGE = '#6b7686';
const RAIN = '#3b82f6';
const SOCK_RED = '#e03131';
const SOCK_WHITE = '#ffffff';
const SOCK_EDGE = '#5c2a2a';

/** A cloud, its flat bottom from x 10 to 23 on y 22 (viewBox 32). */
const CLOUD_PATH = 'M10 22H23A5 5 0 0 0 23.5 12.05A7 7 0 0 0 10.2 13.5A4.3 4.3 0 0 0 10 22Z';

/** Coordinates written short (the markup stays small). */
const n = (value: number) => String(Math.round(value * 100) / 100);

function sun(cx: number, cy: number, r: number): string {
  const rays = Array.from({ length: 8 }, (_, i) => {
    const angle = (i * Math.PI) / 4;
    const [from, to] = [r * 1.45, r * 2.05];
    return (
      `<line x1="${n(cx + from * Math.cos(angle))}" y1="${n(cy + from * Math.sin(angle))}" ` +
      `x2="${n(cx + to * Math.cos(angle))}" y2="${n(cy + to * Math.sin(angle))}" ` +
      `stroke="${SUN}" stroke-width="2" stroke-linecap="round"/>`
    );
  });
  return `${rays.join('')}<circle cx="${cx}" cy="${cy}" r="${r}" fill="${SUN}"/>`;
}

const cloud = (transform: string, fill = CLOUD) =>
  `<path d="${CLOUD_PATH}" transform="${transform}" fill="${fill}" stroke="${CLOUD_EDGE}" ` +
  'stroke-width="1.3" stroke-linejoin="round"/>';

const svg = (body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 32 32">${body}</svg>`;

/** The sky's drawing, as SVG markup. */
export function skySvg(sky: Sky): string {
  switch (sky) {
    case 'SUNNY':
      return svg(sun(16, 16, 6));
    case 'PARTLY_CLOUDY':
      return svg(sun(11, 11, 4.5) + cloud('translate(3 5)'));
    case 'CLOUDY':
      // A paler one behind.
      return svg(cloud('translate(-4 -4) scale(0.95)', CLOUD_BEHIND) + cloud('translate(1 4)'));
    case 'RAINY':
      return svg(
        cloud('translate(0 -3)') +
          [11, 16, 21]
            .map(
              (x) =>
                `<line x1="${x}" y1="22" x2="${x - 2}" y2="28" stroke="${RAIN}" ` +
                'stroke-width="2" stroke-linecap="round"/>',
            )
            .join(''),
      );
  }
}

/** How far the sock drops below the horizontal, in degrees: limp when calm, straight when strong. */
export const SOCK_DROP: Record<Wind, number> = { CALM: 78, LIGHT: 48, MODERATE: 22, STRONG: 0 };

/** The sock's length and its mouth's / tail's half-heights (viewBox 32), in five bands. */
const SOCK_LENGTH = 22;
const MOUTH = 4;
const TAIL = 2;
const BANDS = 5;

/**
 * The windsock's drawing, as SVG markup: five red and white bands, hanging down when calm,
 * raised a little more at each force, straight out when strong. `pole`: its colour (the page's
 * ink by default).
 */
export function windsockSvg(wind: Wind, pole = 'currentColor'): string {
  const half = (x: number) => MOUTH - ((MOUTH - TAIL) * x) / SOCK_LENGTH;
  const band = SOCK_LENGTH / BANDS;
  const bands = Array.from({ length: BANDS }, (_, i) => {
    const [x0, x1] = [i * band, (i + 1) * band];
    return (
      `<polygon points="${n(x0)},${n(-half(x0))} ${n(x1)},${n(-half(x1))} ` +
      `${n(x1)},${n(half(x1))} ${n(x0)},${n(half(x0))}" ` +
      `fill="${i % 2 === 0 ? SOCK_RED : SOCK_WHITE}"/>`
    );
  });
  const outline = `0,${-MOUTH} ${SOCK_LENGTH},${-TAIL} ${SOCK_LENGTH},${TAIL} 0,${MOUTH}`;
  return svg(
    `<line x1="5" y1="30" x2="5" y2="3" stroke="${pole}" stroke-width="1.8" stroke-linecap="round"/>` +
      `<g transform="translate(5.5 6) rotate(${SOCK_DROP[wind]})">${bands.join('')}` +
      `<polygon points="${outline}" fill="none" stroke="${SOCK_EDGE}" stroke-width="0.9" ` +
      'stroke-linejoin="round"/></g>',
  );
}

/** A drawing as an image URL (the Instagram card draws it on its canvas). */
export const weatherImageUrl = (markup: string) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;

/** A drawing inline, `size` px square; what it shows is said by its caller (label, title). */
function Drawing({ markup, size }: { markup: string; size: number }) {
  return (
    <span
      aria-hidden
      style={{ display: 'inline-flex', width: size, height: size, flex: 'none' }}
      // Our own drawings (fixed shapes and colours), never user content.
      dangerouslySetInnerHTML={{
        __html: markup.replace('width="64" height="64"', 'width="100%" height="100%"'),
      }}
    />
  );
}

export function SkyIcon({ sky, size = 28 }: { sky: Sky; size?: number }) {
  return <Drawing markup={skySvg(sky)} size={size} />;
}

export function Windsock({ wind, size = 28 }: { wind: Wind; size?: number }) {
  return <Drawing markup={windsockSvg(wind)} size={size} />;
}
