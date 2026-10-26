import 'server-only';
import type {
  Journal,
  JournalSession,
  JournalSessionSummary,
  JournalStats,
  RankingList,
  SessionPhoto,
  SessionType,
} from '@tiralarc/api-client';
import { getAuthedApi } from './api';
import type { ExportOptions } from './export-options';
import { getJournals } from './journals';

/** The events that get a sheet of their own in the extract. */
export const SHEET_TYPES: readonly SessionType[] = ['TRAINING', 'COACHING', 'COMPETITION'];
/** Sheets read from the API at once. */
const PARALLEL = 6;

export interface ExportSheet {
  session: JournalSession;
  /** Empty unless the photos were asked for. */
  photos: SessionPhoto[];
}

export interface ExportData {
  journals: Journal[];
  /** Every event of the days, for the month calendars. */
  sessions: JournalSessionSummary[];
  /** By day, when asked for. */
  sheets: ExportSheet[];
  /** Null when not asked for, or the API could not be reached. */
  stats: JournalStats | null;
  rankings: RankingList | null;
}

/** `task` on each item, `PARALLEL` at a time, results in the items' order. */
async function inBatches<T, R>(items: T[], task: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += PARALLEL) {
    results.push(...(await Promise.all(items.slice(i, i + PARALLEL).map(task))));
  }
  return results;
}

/** Everything the printed extract shows, read as the signed-in archer. */
export async function getExportData(options: ExportOptions): Promise<ExportData> {
  const api = await getAuthedApi();
  const range = { from: options.from, to: options.to };
  const [journals, { data: sessions }, stats, rankings] = await Promise.all([
    getJournals(),
    api.GET('/api/v1/journal/sessions', { params: { query: range } }),
    options.stats
      ? api.GET('/api/v1/journal/sessions/stats', { params: { query: range } }).then((r) => r.data)
      : undefined,
    options.rankings ? api.GET('/api/v1/rankings').then((r) => r.data) : undefined,
  ]);

  const sheeted = options.sheets
    ? (sessions ?? []).filter((s) => SHEET_TYPES.includes(s.type))
    : [];
  const sheets = await inBatches(sheeted, async ({ id }) => {
    const params = { params: { path: { id } } };
    const [{ data: session }, photos] = await Promise.all([
      api.GET('/api/v1/journal/sessions/{id}', params),
      options.photos
        ? api
            .GET('/api/v1/journal/sessions/{sessionId}/photos', {
              params: { path: { sessionId: id } },
            })
            .then((r) => r.data ?? [])
        : [],
    ]);
    return session ? { session, photos } : null;
  });

  return {
    journals,
    sessions: sessions ?? [],
    sheets: sheets.filter((s): s is ExportSheet => s !== null),
    stats: stats ?? null,
    rankings: rankings ?? null,
  };
}

/**
 * The decoration and colouring of a month: those the journal covering its first day (or,
 * failing that, any day of it) keeps for it.
 */
export function monthDecoration(journals: Journal[], month: string) {
  const first = `${month}-01`;
  const last = `${month}-31`;
  const journal =
    journals.find((j) => j.startDate <= first && first <= j.endDate) ??
    journals.find((j) => j.startDate <= last && first <= j.endDate);
  const entry = journal?.monthThemes.find((m) => m.month === month);
  return { theme: entry?.theme ?? null, fills: entry?.fills ?? [] };
}
