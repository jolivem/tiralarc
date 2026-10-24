/**
 * Reads the result pages of the FFTA competition search (https://www.ffta.fr/competitions), a
 * Drupal view: one `<article class="competition_item">` per competition. Pure, so it is
 * unit-tested against a saved page; anything it cannot read is skipped rather than guessed.
 */

export type FftaStatus = 'SCHEDULED' | 'POSTPONED' | 'CANCELLED';

export interface FftaCompetition {
  /** The FFTA's id: https://www.ffta.fr/epreuve/{id}. */
  id: string;
  title: string;
  /** YYYY-MM-DD, both inclusive. */
  startDate: string;
  endDate: string;
  city: string | null;
  organizer: string | null;
  /** "Uniquement équipe": no individual ranking. */
  teamOnly: boolean;
  status: FftaStatus;
  mandateUrl: string | null;
}

export interface FftaPage {
  competitions: FftaCompetition[];
  hasNext: boolean;
}

const ORIGIN = 'https://www.ffta.fr';

const MONTHS = [
  'janvier',
  'fevrier',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'aout',
  'septembre',
  'octobre',
  'novembre',
  'decembre',
];

const STATUSES: Record<string, FftaStatus> = {
  valid: 'SCHEDULED',
  report: 'POSTPONED',
  cancel: 'CANCELLED',
};

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

/** Text of an HTML fragment: tags dropped, entities decoded, spaces collapsed. */
export function textOf(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, name: string) => {
      if (name[0] === '#') {
        const code =
          name[1] === 'x' || name[1] === 'X' ? parseInt(name.slice(2), 16) : +name.slice(1);
        return code === 160 ? ' ' : String.fromCodePoint(code);
      }
      return ENTITIES[name.toLowerCase()] ?? entity;
    })
    .replace(/\s+/g, ' ')
    .trim();
}

const monthOf = (name: string): number => {
  const plain = name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
  return MONTHS.indexOf(plain) + 1;
};

const iso = (year: number, month: number, day: number): string | null => {
  const date = new Date(Date.UTC(year, month - 1, day));
  // Rejects "31 novembre" and the like.
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date.toISOString().slice(0, 10);
};

/**
 * "Le 24 octobre 2026", "Du 24 au 25 octobre 2026", "Du 31 octobre au 01 novembre 2026",
 * "Du 31 décembre 2026 au 02 janvier 2027" → first and last days; null when unreadable.
 */
export function parseFrenchDates(text: string): { startDate: string; endDate: string } | null {
  const value = text.replace(/\s+/g, ' ').trim();
  const single = /^le (\d{1,2}) (\p{L}+) (\d{4})$/iu.exec(value);
  if (single) {
    const day = iso(+single[3]!, monthOf(single[2]!), +single[1]!);
    return day ? { startDate: day, endDate: day } : null;
  }
  const span = /^du (\d{1,2})(?: (\p{L}+)(?: (\d{4}))?)? au (\d{1,2}) (\p{L}+) (\d{4})$/iu.exec(
    value,
  );
  if (!span) return null;
  const endMonth = monthOf(span[5]!);
  const endYear = +span[6]!;
  const startMonth = span[2] ? monthOf(span[2]) : endMonth;
  // "Du 30 décembre au 02 janvier 2027": the start is in the year before.
  const startYear = span[3] ? +span[3] : startMonth > endMonth ? endYear - 1 : endYear;
  if (!startMonth || !endMonth) return null;
  const startDate = iso(startYear, startMonth, +span[1]!);
  const endDate = iso(endYear, endMonth, +span[4]!);
  if (!startDate || !endDate || endDate < startDate) return null;
  return { startDate, endDate };
}

const first = (pattern: RegExp, html: string): string | undefined => pattern.exec(html)?.[1];

function parseItem(html: string): FftaCompetition | null {
  const id = first(/href="\/epreuve\/(\d+)"/, html);
  const dates = parseFrenchDates(
    textOf(first(/competition_item__dates">([\s\S]*?)<\/div>/, html) ?? ''),
  );
  const title = textOf(first(/competition_item__title">([\s\S]*?)<\/h2>/, html) ?? '');
  if (!id || !dates || !title) return null;
  const status = STATUSES[first(/competition_item__head--(\w+)/, html) ?? 'valid'] ?? 'SCHEDULED';
  const kind = textOf(
    first(/field--name-field-type-championnat[^>]*>([\s\S]*?)<\/div>/, html) ?? '',
  );
  // "<span>CIE D'ARC DE VILLEPREUX <small>(VILLEPREUX)</small></span>", the town left out at times.
  const club = [...html.matchAll(/<span>([^<]*)(?:<small>\(([^<]*)\)<\/small>)?\s*<\/span>/g)].find(
    (m) => textOf(m[1]!) !== '',
  );
  const mandate = first(/href="([^"]+)"[^>]*class="[^"]*competition_item__mandat_btn/, html);
  return {
    id,
    title,
    ...dates,
    city: textOf(club?.[2] ?? '') || null,
    organizer: textOf(club?.[1] ?? '') || null,
    teamOnly: /^uniquement/i.test(kind),
    status,
    mandateUrl: mandate ? new URL(textOf(mandate), ORIGIN).href : null,
  };
}

/** One result page: its competitions, and whether the pager offers a next page. */
export function parseCompetitionPage(html: string): FftaPage {
  const competitions = html
    .split('<article class="competition_item"')
    .slice(1)
    .map((part) => parseItem(part.split('</article>')[0]!))
    .filter((c): c is FftaCompetition => c !== null);
  return { competitions, hasNext: html.includes('pager__item--next') };
}

export const competitionUrl = (id: string) => `${ORIGIN}/epreuve/${id}`;

/** What a competition's own page (https://www.ffta.fr/epreuve/{id}) adds to the search's rows. */
export interface FftaCompetitionDetails {
  place: string | null;
  /** The results (PDF on the FFTA extranet) once the organiser published them; null before. */
  resultsUrl: string | null;
}

export function parseCompetitionDetails(html: string): FftaCompetitionDetails {
  const results = /href="([^"]*\/pdfresultats\/[^"]+)"/.exec(html)?.[1];
  return {
    place: parseCompetitionPlace(html),
    resultsUrl: results ? new URL(textOf(results), ORIGIN).href : null,
  };
}

/**
 * The place on a competition's page (https://www.ffta.fr/epreuve/{id}): "Lieu : <town>" then,
 * when given, the venue, its street and postcode, each in its own paragraph ("FRANCE" left out).
 * "Gymnase de l'Ardente, 13 Rue de Verdun, 78420 CARRIERES SUR SEINE", or the town alone;
 * null when the page has no place.
 */
export function parseCompetitionPlace(html: string): string | null {
  const start = html.search(/<p>\s*Lieu\s*:/);
  if (start < 0) return null;
  const block = html.slice(start, html.indexOf('</div>', start) >>> 0);
  // Some names come escaped twice ("l&amp;apos;Ardente").
  const lines = [...block.matchAll(/<p>([\s\S]*?)<\/p>/g)].map((m) => textOf(textOf(m[1]!)));
  const town = lines.shift()?.replace(/^Lieu\s*:\s*/, '') ?? '';
  const venue = lines.filter((line) => line && line.toUpperCase() !== 'FRANCE');
  // "78600 MAISONS LAFFITTE" names the town "MAISONS-LAFFITTE" already.
  const plain = (text: string) =>
    text
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/[^\p{L}\d]+/gu, ' ')
      .trim()
      .toUpperCase();
  if (town && !venue.some((line) => plain(line).includes(plain(town)))) venue.push(town);
  return venue.join(', ').slice(0, 200) || null;
}
