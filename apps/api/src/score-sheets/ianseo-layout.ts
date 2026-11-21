/**
 * Tells a page of ianseo.net whose layout changed from one that merely lists little. There is no
 * ianseo API: the parsers (ianseo-parser.ts) read the site's own pages, and a redesign makes them
 * read nothing — which would look like "no score sheet published". Pure, like ffta-layout.ts.
 */
import type { IanseoTour } from './ianseo-parser.js';

/** The pages read from ianseo.net that are checked. */
export type IanseoPageKind = 'tours';

/** How each page is named in the alert email (in French). */
export const IANSEO_PAGE_NAMES: Record<IanseoPageKind, string> = {
  tours: "la liste des compétitions françaises de l'année (TourList.php)",
};

export interface LayoutProblem {
  problem: string;
  /** Nothing on the page can be trusted. */
  fatal: boolean;
}

/**
 * A year's list of competitions, with what the parser made of it. It is read for a competition
 * already past, so the year has some: none listed means the page changed (early January aside,
 * when ianseo may not list any yet — three readings in a row are needed for an alert).
 */
export function toursProblem(html: string, parsed: IanseoTour[]): LayoutProblem | null {
  const listed = new Set([...html.matchAll(/Details\.php\?toId=(\d+)/g)].map((m) => m[1])).size;
  if (listed === 0) {
    return {
      problem: "Aucun lien vers une compétition (« Details.php?toId= ») dans la liste de l'année.",
      fatal: true,
    };
  }
  if (parsed.length === 0) {
    return {
      problem:
        `${listed} compétition(s) listée(s), mais aucune date lisible ` +
        '(cellule « column7 » absente ou dates écrites autrement).',
      fatal: true,
    };
  }
  // Each competition takes two rows; a few without readable days are normal (odd dates).
  if (parsed.length < listed / 2) {
    return {
      problem: `Seules ${parsed.length} compétition(s) sur ${listed} ont des dates lisibles.`,
      fatal: false,
    };
  }
  return null;
}
