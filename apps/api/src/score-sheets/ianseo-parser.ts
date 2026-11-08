/** Pure readers of ianseo.net's pages and of the PDFs' text (unit-tested). */

export interface IanseoTour {
  id: number;
  /** First and last day (YYYY-MM-DD). */
  from: string;
  to: string;
  /** Title, club and address together. */
  text: string;
}

export interface IanseoFiles {
  /** The participants' list (with the licences), a site path. */
  participants: string | null;
  /** The PDFs of score sheets the organiser published, site paths. */
  sheets: string[];
}

/** What identifies the archer: the journal's profile. */
export interface ScoreSheetArcher {
  licenceNumber: string;
  lastName: string;
  firstName: string;
}

export interface ParticipantEntry {
  /** As written on the sheets. */
  name: string;
  /** The club's code, when the row has one. */
  club: string | null;
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const WEEKDAYS = ['DIMANCHE', 'LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAMEDI'];
/** The documents ianseo generates itself ("IC.pdf", "ENA.pdf"…), not the organiser's. */
const GENERATED = /^[A-Z]{2,4}\.pdf$/;

const plainText = (html: string) =>
  html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&([a-z])(?:acute|grave|circ|uml|cedil|tilde);/gi, '$1')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Upper case, no accents, words separated by one space. */
export const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .toUpperCase();

/** A licence as typed or printed: "0015639z", "15639 Z" and "0015639Z" are the same. */
export const sameLicence = (a: string, b: string) => {
  const clean = (licence: string) =>
    licence
      .toUpperCase()
      .replace(/[^0-9A-Z]/g, '')
      .replace(/^0+/, '');
  return clean(a) !== '' && clean(a) === clean(b);
};

const monthOf = (name: string | undefined) =>
  name ? MONTHS.indexOf(name.slice(0, 3).toLowerCase()) : -1;
const isoDay = (year: number, month: number, day: number) =>
  `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

/** "1 Nov", "8-10 May" or "31 Oct - 1 Nov" of `year`; null when it reads otherwise. */
export function parseDays(text: string, year: number): { from: string; to: string } | null {
  const match = text
    .trim()
    .match(/^(\d{1,2})(?:\s+([a-z]{3,}))?(?:\s*-\s*(\d{1,2})(?:\s+([a-z]{3,}))?)?$/i);
  if (!match) return null;
  const [, firstDay, firstMonth, lastDay, lastMonth] = match;
  const start = monthOf(firstMonth ?? lastMonth);
  const end = monthOf(lastMonth ?? firstMonth);
  if (start < 0 || end < 0) return null;
  return {
    from: isoDay(year, start, Number(firstDay)),
    to: isoDay(end < start ? year + 1 : year, end, Number(lastDay ?? firstDay)),
  };
}

/** The competitions of a year's list; each takes two table rows, with the same link. */
export function parseTours(html: string, year: number): IanseoTour[] {
  const tours = new Map<number, IanseoTour>();
  for (const row of html.split(/<tr\b/i).slice(1)) {
    const id = Number(row.match(/Details\.php\?toId=(\d+)/)?.[1]);
    if (!id) continue;
    const days = parseDays(row.match(/class="column7[^"]*"[^>]*>([^<]*)</)?.[1] ?? '', year);
    const tour = tours.get(id);
    const text = plainText(`<${row}`);
    if (tour) tour.text += ` ${text}`;
    else if (days) tours.set(id, { id, ...days, text });
  }
  return [...tours.values()];
}

/** The documents linked from a competition's page. */
export function parseFiles(html: string): IanseoFiles {
  const links = [
    ...html.matchAll(/(?:href|onclick)="[^"]*?(\/TourData\/\d+\/\d+\/[^"?']+\.pdf)/gi),
  ];
  const files: IanseoFiles = { participants: null, sheets: [] };
  links.forEach((link, i) => {
    const path = link[1]!;
    const file = path.slice(path.lastIndexOf('/') + 1);
    if (file === 'ENA.pdf') files.participants = path;
    if (GENERATED.test(file)) return;
    // The document's name follows its link, up to the next one.
    const label = plainText(html.slice(link.index, links[i + 1]?.index));
    if (/marque|score/i.test(`${file} ${label}`) && !files.sheets.includes(path)) {
      files.sheets.push(path);
    }
  });
  return files;
}

/** The archer's row in the participants' list: their licence, and their name to be sure. */
export function findParticipant(
  lines: string[][],
  archer: ScoreSheetArcher,
): ParticipantEntry | null {
  for (const cells of lines) {
    const at = cells.findIndex((cell) => sameLicence(cell, archer.licenceNumber));
    const name = cells[at + 1];
    if (at < 0 || !name) continue;
    const printed = ` ${normalize(name)} `;
    const known = [archer.lastName, archer.firstName].every((part) =>
      printed.includes(` ${normalize(part)} `),
    );
    if (known) {
      return { name, club: cells.slice(at + 2).find((cell) => /^\d{7}$/.test(cell)) ?? null };
    }
  }
  return null;
}

/**
 * Which of the pages are the archer's sheets on `date`: their name and club, a total. Someone
 * shooting on several days has a page each, the day written on it when the organiser named the
 * starts so.
 */
export function sheetPages(pages: string[], entry: ParticipantEntry, date: string): number[] {
  const name = ` ${normalize(entry.name)} `;
  const theirs = pages.flatMap((page, index) => {
    const text = ` ${normalize(page)} `;
    const own =
      text.includes(name) &&
      text.includes(' TOTAL ') &&
      (entry.club === null || text.includes(` ${entry.club} `));
    return own ? [{ index, text }] : [];
  });
  const weekday = WEEKDAYS[new Date(`${date}T00:00:00Z`).getUTCDay()]!;
  const thatDay = theirs.filter(({ text }) => text.includes(` ${weekday} `));
  return (thatDay.length > 0 ? thatDay : theirs).map(({ index }) => index);
}

/** The competitions to look in on `date`: those at the event's place first. */
export function candidateTours(
  tours: IanseoTour[],
  date: string,
  location: string | null,
): IanseoTour[] {
  const onThatDay = tours.filter((tour) => tour.from <= date && date <= tour.to);
  const words = normalize(location ?? '')
    .split(' ')
    .filter((word) => word.length >= 4);
  const atPlace = (tour: IanseoTour) => {
    const text = ` ${normalize(tour.text)} `;
    return words.some((word) => text.includes(` ${word} `));
  };
  return [...onThatDay.filter(atPlace), ...onThatDay.filter((tour) => !atPlace(tour))];
}
