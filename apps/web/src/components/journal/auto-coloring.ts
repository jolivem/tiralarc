import type { ThemeFill } from '@tiralarc/api-client';
import { readArtwork, readPixels } from './calendar-frame';
import { realisticFills } from './coloring';
import { themeColorMap, themeImage, THEMES, type ThemeId } from './themes';

/** Fills a month may hold (the API's `MAX_FILLS`). */
export const MAX_FILLS = 500;

/**
 * The month's decoration coloured in real-life colours: every closed area of each band takes
 * its colour in the band's colour map (`themeColorMap`), largest areas first while room is left.
 * Replaces the bands' colouring; the month's name (`title`) keeps its own. Null when the images
 * can't be read.
 */
export async function automaticColoring(
  theme: ThemeId,
  fills: ThemeFill[],
): Promise<ThemeFill[] | null> {
  const title = fills.filter((fill) => fill.band === 'title');
  const room = MAX_FILLS - title.length;
  const bands = await Promise.all(
    THEMES[theme].bands.map(async (band) => {
      const [art, colors] = await Promise.all([
        readArtwork(themeImage(theme, band)),
        readPixels(themeColorMap(theme, band)),
      ]);
      return art && colors ? realisticFills(art, colors, band, room) : null;
    }),
  );
  if (bands.some((band) => band === null)) return null;
  const chosen = bands
    .flatMap((band) => band ?? [])
    .sort((a, b) => b.pixels - a.pixels)
    .slice(0, room)
    .map(({ band, x, y, color }) => ({ band, x, y, color }));
  return [...title, ...chosen];
}
