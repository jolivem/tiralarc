/**
 * Reads the FFTA national rankings (https://www.ffta.fr/vie-sportive/resultats/classements-nationaux,
 * which frames https://extranet.ffta.fr/iframe/classements.html): the list of a season's
 * rankings, then one ranking's page, where every archer has a row with their licence number.
 * Pure, so it is unit-tested against saved pages; anything unreadable is skipped.
 */
import { AgeCategory, BowType } from '../generated/prisma/client.js';
import { textOf } from './ffta-parser.js';

/** One ranking of a season: "Senior 2 Femme Arc Classique 2027", outdoor ones per distance. */
export interface FftaRankingInfo {
  id: string;
  name: string;
  /** Outdoor target archery only: "70m - 122cm". */
  distance: string | null;
  sex: 'H' | 'F' | null;
  bow: BowType | null;
  categories: AgeCategory[];
  /** Several categories ranked together ("Scratch"): not an archer's own category ranking. */
  scratch: boolean;
}

/** An archer's row in a ranking. */
export interface FftaRankingRow {
  rank: number;
  /** Archers in the ranking. */
  total: number;
  /** The best scores counted (zeros left out). */
  scores: number[];
  average: number | null;
}

const plain = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const BOWS: Record<string, BowType> = {
  'arc classique': BowType.RECURVE,
  'arc a poulies': BowType.COMPOUND,
  'arc nu': BowType.BAREBOW,
  'arc droit': BowType.LONGBOW,
  'arc chasse': BowType.HUNTING,
  'arc libre': BowType.FREE,
};

const CATEGORIES: Record<string, AgeCategory> = {
  u11: AgeCategory.U11,
  u13: AgeCategory.U13,
  u15: AgeCategory.U15,
  u18: AgeCategory.U18,
  u21: AgeCategory.U21,
  'senior 1': AgeCategory.S1,
  'senior 2': AgeCategory.S2,
  'senior 3': AgeCategory.S3,
};

const cellsOf = (row: string) =>
  [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => textOf(m[1]!));

/** The season the list opens on (its selected year, "2027"); null when unreadable. */
export function parseRankingSeason(html: string): string | null {
  const select = /<select id="search\[Annee\]"[\s\S]*?<\/select>/.exec(html)?.[0] ?? '';
  return /<option value="(\d{4})" selected/.exec(select)?.[1] ?? null;
}

/**
 * The rankings listed: name, [distance,] discipline, sex, bow, categories ("Senior 1 - Senior 2").
 */
export function parseRankingList(html: string): FftaRankingInfo[] {
  return html.split('<tr').flatMap((row) => {
    const id = /data-href="\/iframe\/classements\/(\d+)\.html"/.exec(row)?.[1];
    const cells = cellsOf(row);
    if (!id || cells.length < 5) return [];
    const [name, ...rest] = cells as [string, ...string[]];
    const distance = rest.length > 4 ? rest[0]! : null;
    const [, sex, bow, categories] = rest.slice(-4) as [string, string, string, string];
    return [
      {
        id,
        name,
        distance,
        sex: plain(sex) === 'homme' ? 'H' : plain(sex) === 'femme' ? 'F' : null,
        bow: BOWS[plain(bow)] ?? null,
        categories: categories
          .split(' - ')
          .flatMap((c) => (CATEGORIES[plain(c)] ? [CATEGORIES[plain(c)]!] : [])),
        scratch: /scratch/i.test(name),
      },
    ];
  });
}

const numberOf = (text: string): number | null => {
  const value = Number(text.replace(',', '.'));
  return text !== '' && Number.isFinite(value) ? value : null;
};

/**
 * The row of the archer holding `licence` ("0123456A") in a ranking's page: rank, scores
 * counted, average, and how many archers it ranks; null when they are not in it. Only that
 * row is read: the other archers' are left alone.
 */
export function findRankingRow(html: string, licence: string): FftaRankingRow | null {
  const table = /<table[^>]*class="[^"]*\bclmt\b[^"]*"[\s\S]*?<\/table>/.exec(html)?.[0] ?? '';
  const wanted = licence.trim().toUpperCase();
  let total = 0;
  let found: FftaRankingRow | null = null;
  for (const row of table.split('<tr').slice(1)) {
    // Inscr., Quota, Rang, licence, name, [Cat, when it ranks several,] club number, club,
    // S1, S2, S3, Moy., Préinscrire.
    const cells = cellsOf(row);
    const at = cells.findIndex((c) => /^\d{7}[A-Z]$/.test(c));
    if (at < 1 || cells.length < at + 8) continue;
    total += 1;
    if (cells[at] !== wanted) continue;
    found = {
      rank: numberOf(cells[at - 1]!) ?? 0,
      total: 0,
      scores: cells.slice(-5, -2).flatMap((c) => {
        const score = numberOf(c);
        return score ? [score] : [];
      }),
      average: numberOf(cells.at(-2)!),
    };
  }
  return found && { ...found, total };
}
