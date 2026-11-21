import { Injectable, Logger } from '@nestjs/common';
import { PDFDocument } from 'pdf-lib';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import {
  candidateTours,
  findParticipant,
  type IanseoFiles,
  type IanseoTour,
  parseFiles,
  parseTours,
  type ScoreSheetArcher,
  sheetPages,
} from './ianseo-parser.js';
import { IanseoClient, ianseoUrl, tourListPath } from './ianseo.client.js';
import { toursProblem } from './ianseo-layout.js';
import { IanseoWatch } from './ianseo-watch.service.js';

interface PdfPage {
  /** The page's text in reading order. */
  text: string;
  /** Row after row, its pieces of text from left to right. */
  lines: string[][];
}
interface Sheets {
  bytes: Uint8Array;
  pages: string[];
}
interface Tour {
  files: IanseoFiles;
  participants: string[][];
}

/** Two pieces of text this close in height (points) are on the same row. */
const SAME_ROW = 2;
/** Enough for the busiest weekend. */
const MAX_TOURS = 80;

async function readPdf(bytes: Uint8Array): Promise<PdfPage[]> {
  // pdf.js takes the buffer over: a copy, the bytes serve again for the extraction.
  const doc = await getDocument({ data: bytes.slice(), verbosity: 0 }).promise;
  const pages: PdfPage[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const { items } = await (await doc.getPage(n)).getTextContent();
    const rows = new Map<number, { x: number; text: string }[]>();
    const pieces: string[] = [];
    for (const item of items) {
      if (!('str' in item) || !item.str.trim()) continue;
      pieces.push(item.str);
      const y = Math.round(item.transform[5] as number);
      const row = [...rows.keys()].find((key) => Math.abs(key - y) <= SAME_ROW) ?? y;
      rows.set(row, [
        ...(rows.get(row) ?? []),
        { x: item.transform[4] as number, text: item.str.trim() },
      ]);
    }
    pages.push({
      text: pieces.join(' '),
      lines: [...rows.values()].map((row) =>
        row.toSorted((a, b) => a.x - b.x).map((piece) => piece.text),
      ),
    });
  }
  await doc.destroy();
  return pages;
}

/** What one round of searches has read already: archers often shoot the same competitions. */
export class SearchCache {
  readonly lists = new Map<number, Promise<IanseoTour[]>>();
  readonly tours = new Map<number, Promise<Tour>>();
  readonly sheets = new Map<string, Promise<Sheets>>();
}

/**
 * Finds an archer's score sheet on ianseo.net: the competitions held that day (those at the
 * event's place first), the one whose participants' list has their licence and name, then
 * their page(s) in the PDFs of score sheets the organiser published, alone in a new PDF.
 */
@Injectable()
export class ScoreSheetFinder {
  private readonly logger = new Logger(ScoreSheetFinder.name);

  constructor(
    private readonly ianseo: IanseoClient,
    private readonly watch: IanseoWatch,
  ) {}

  async find(
    archer: ScoreSheetArcher,
    date: string,
    location: string | null,
    cache = new SearchCache(),
  ): Promise<Uint8Array | null> {
    const year = Number(date.slice(0, 4));
    const tours = await remember(cache.lists, year, async () => {
      const html = await this.ianseo.tours(year);
      const parsed = parseTours(html, year);
      // Checked once per round and year: a redesign would otherwise read as "no sheet yet".
      const problem = toursProblem(html, parsed);
      if (problem) this.watch.anomaly('tours', ianseoUrl(tourListPath(year)), problem.problem);
      else this.watch.ok('tours');
      return problem?.fatal ? [] : parsed;
    });
    for (const { id } of candidateTours(tours, date, location).slice(0, MAX_TOURS)) {
      try {
        const sheet = await this.inTour(id, archer, date, cache);
        if (sheet) return sheet;
      } catch (error) {
        // One unreadable competition doesn't stop the others.
        this.logger.warn(`Could not read ianseo competition ${id}: ${String(error)}`);
      }
    }
    return null;
  }

  private async inTour(
    id: number,
    archer: ScoreSheetArcher,
    date: string,
    cache: SearchCache,
  ): Promise<Uint8Array | null> {
    const { files, participants } = await remember(cache.tours, id, () => this.readTour(id));
    const entry = findParticipant(participants, archer);
    if (!entry) return null;
    const found: { sheets: Sheets; pages: number[] }[] = [];
    for (const path of files.sheets) {
      const sheets = await remember(cache.sheets, path, async () => {
        const bytes = await this.ianseo.file(path);
        return { bytes, pages: (await readPdf(bytes)).map((page) => page.text) };
      });
      found.push({ sheets, pages: [] });
    }
    // Numbered through all the PDFs: a day's page is chosen among those of every start.
    const all = found.flatMap(({ sheets }) => sheets.pages);
    const chosen = new Set(sheetPages(all, entry, date));
    if (chosen.size === 0) return null;

    let offset = 0;
    const result = await PDFDocument.create();
    for (const { sheets } of found) {
      const indices = sheets.pages.flatMap((_, i) => (chosen.has(offset + i) ? [i] : []));
      offset += sheets.pages.length;
      if (indices.length === 0) continue;
      const source = await PDFDocument.load(sheets.bytes);
      for (const page of await result.copyPages(source, indices)) result.addPage(page);
    }
    return result.save();
  }

  private async readTour(id: number): Promise<Tour> {
    const files = parseFiles(await this.ianseo.details(id));
    if (!files.participants || files.sheets.length === 0) return { files, participants: [] };
    const pages = await readPdf(await this.ianseo.file(files.participants));
    return { files, participants: pages.flatMap((page) => page.lines) };
  }
}

function remember<K, V>(cache: Map<K, Promise<V>>, key: K, read: () => Promise<V>): Promise<V> {
  let value = cache.get(key);
  if (!value) {
    value = read();
    cache.set(key, value);
  }
  return value;
}
