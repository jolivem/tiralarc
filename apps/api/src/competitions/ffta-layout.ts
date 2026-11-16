/**
 * Tells a FFTA page whose layout changed from one that merely has nothing to show. There is no
 * FFTA API: the parsers (ffta-parser.ts, ffta-rankings.ts) read the site's own pages, and a
 * redesign makes them read nothing — which would look like "no competition" or "not ranked".
 * Each page is checked for a landmark that every version of it has had (with or without
 * results), and the competitions it lists for items the parser could not read. Pure.
 */
import type { FftaPage } from './ffta-parser.js';

/** The pages read from the FFTA website. */
export type FftaPageKind = 'search' | 'competition' | 'rankings' | 'ranking';

/** How each page is named in the alert email (in French, like the moderators' emails). */
export const FFTA_PAGE_NAMES: Record<FftaPageKind, string> = {
  search: 'la recherche des compétitions (www.ffta.fr/competitions)',
  competition: "la page d'une épreuve (lieu, résultats)",
  rankings: 'la liste des classements nationaux (extranet.ffta.fr)',
  ranking: "la page d'un classement national (extranet.ffta.fr)",
};

/**
 * What is wrong with a page: `fatal` when nothing on it can be trusted (the reading is then
 * dropped and the last good one kept), otherwise what was read is still used.
 */
export interface LayoutProblem {
  problem: string;
  fatal: boolean;
}

/** Cloudflare's bot check instead of the page: a failed reading, not a new layout. */
export function isBotChallenge(html: string): boolean {
  return /<title>\s*Just a moment/i.test(html);
}

const ARTICLE = '<article class="competition_item"';

/** A page of the competition search, with what the parser made of it. */
export function searchProblem(html: string, parsed: FftaPage): LayoutProblem | null {
  // The Drupal view the results are listed in: there whether or not anything is found.
  if (!html.includes('view-id-competitions')) {
    return {
      problem: "La liste des compétitions (vue « view-id-competitions ») n'est plus dans la page.",
      fatal: true,
    };
  }
  const items = html.split(ARTICLE).length - 1;
  if (items === 0 && html.includes('competition_item')) {
    return {
      problem:
        'Des éléments « competition_item » sont dans la page, mais plus dans une balise ' +
        '<article class="competition_item"> : aucune compétition ne peut être lue.',
      fatal: true,
    };
  }
  const unreadable = items - parsed.competitions.length;
  if (unreadable > 0) {
    return {
      problem:
        `${unreadable} compétition(s) sur ${items} illisible(s) dans la page ` +
        '(lien /epreuve/, titre ou dates introuvables) : elles ne sont plus affichées.',
      fatal: unreadable === items,
    };
  }
  return null;
}

/** A competition's own page (https://www.ffta.fr/epreuve/{id}). */
export function competitionProblem(html: string): LayoutProblem | null {
  return html.includes('path-epreuve')
    ? null
    : {
        problem: "La page n'est plus reconnue comme une épreuve (classe « path-epreuve » absente).",
        fatal: true,
      };
}

/** The list of the national rankings (the season's filter, then the rankings). */
export function rankingsProblem(html: string, season?: string | null): LayoutProblem | null {
  if (!/<select id="search\[Annee\]"/.test(html)) {
    return {
      problem: "Le choix de la saison (liste « search[Annee] ») n'est plus dans la page.",
      fatal: true,
    };
  }
  if (season === null) {
    return { problem: "La saison sélectionnée n'est plus lisible dans la page.", fatal: true };
  }
  return null;
}

/** One national ranking's page: the table every archer is listed in. */
export function rankingProblem(html: string): LayoutProblem | null {
  return /<table[^>]*class="[^"]*\bclmt\b/.test(html)
    ? null
    : {
        problem: "Le tableau du classement (classe « clmt ») n'est plus dans la page.",
        fatal: true,
      };
}
