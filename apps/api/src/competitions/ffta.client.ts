import { setTimeout as sleep } from 'node:timers/promises';
import { Injectable, Logger } from '@nestjs/common';
import {
  competitionUrl,
  type FftaCompetition,
  type FftaCompetitionDetails,
  parseCompetitionDetails,
  parseCompetitionPage,
} from './ffta-parser.js';
import {
  competitionProblem,
  type FftaPageKind,
  isBotChallenge,
  type LayoutProblem,
  rankingProblem,
  rankingsProblem,
  searchProblem,
} from './ffta-layout.js';
import { FftaWatch } from './ffta-watch.service.js';
import {
  type FftaRankingInfo,
  type FftaRankingRow,
  findRankingRow,
  parseRankingList,
  parseRankingSeason,
} from './ffta-rankings.js';

const SEARCH_URL = 'https://www.ffta.fr/competitions';
/** The national rankings, framed by https://www.ffta.fr/vie-sportive/resultats/classements-nationaux. */
const RANKINGS_URL = 'https://extranet.ffta.fr/iframe/classements.html';
export const rankingUrl = (id: string) => `https://extranet.ffta.fr/iframe/classements/${id}.html`;
/** Says who reads the pages; the site's bot protection lets an honest client through. */
const USER_AGENT = 'Tiralarc/1.0 (calendrier des concours)';
/** 30 competitions per page: a department and a discipline rarely need more than one. */
const MAX_PAGES = 10;
const ATTEMPTS = 3;
const TIMEOUT_MS = 15_000;

export interface FftaSearch {
  /** The site's department term ids (see DEPARTMENTS); none = the whole of France. */
  departmentIds: number[];
  /** Words the competitions' titles must have (the form's free text, e.g. "championnat de france"). */
  text?: string;
  /** The site's discipline term id (see FFTA_DISCIPLINES). */
  discipline: number;
  /** YYYY-MM-DD, both inclusive. */
  start: string;
  end: string;
}

/** A page whose layout is no longer the one the parsers read: its reading is dropped. */
export class FftaLayoutError extends Error {}

/**
 * Reads the FFTA competition search and national rankings. There is no API: these are the
 * site's own pages, so each is checked against its layout (ffta-layout.ts) before it is
 * trusted. A page no longer recognised is reported to `FftaWatch` (an alert email once it
 * keeps happening) and, when nothing on it can be read, throws: the callers then keep their
 * last good reading instead of showing empty lists.
 * The e2e tests replace it with a fake: they never reach the site.
 */
@Injectable()
export class FftaClient {
  private readonly logger = new Logger(FftaClient.name);

  constructor(private readonly watch: FftaWatch) {}

  /** Every page of the search; throws when a page cannot be read after a few attempts. */
  async search(search: FftaSearch): Promise<FftaCompetition[]> {
    const competitions: FftaCompetition[] = [];
    for (let page = 0; page < MAX_PAGES; page++) {
      const url = this.searchUrl(search, page);
      const html = await this.fetchHtml('search', url);
      const result = parseCompetitionPage(html);
      this.check('search', url, searchProblem(html, result));
      competitions.push(...result.competitions);
      if (!result.hasNext) break;
    }
    return competitions;
  }

  /** A competition's own page: its place and published results. Throws when unreadable. */
  async details(id: string): Promise<FftaCompetitionDetails> {
    const url = new URL(competitionUrl(id));
    const html = await this.fetchHtml('competition', url);
    this.check('competition', url, competitionProblem(html));
    return parseCompetitionDetails(html);
  }

  /** The season the national rankings open on ("2027"); throws when unreadable. */
  async rankingSeason(): Promise<string | null> {
    const url = new URL(RANKINGS_URL);
    const html = await this.fetchHtml('rankings', url);
    const season = parseRankingSeason(html);
    this.check('rankings', url, rankingsProblem(html, season));
    return season;
  }

  /** The national rankings of a season in one discipline (the site's code: "S" = 18 m…). */
  async rankingList(season: string, discipline: string): Promise<FftaRankingInfo[]> {
    const form = new URLSearchParams({
      operation: 'search',
      'search[Annee]': season,
      'search[Type]': 'I',
      'search[Sexe]': 'all',
      'search[Discipline]': discipline,
      'search[Catage]': 'all',
      'search[Arme]': 'all',
    });
    const url = new URL(RANKINGS_URL);
    const html = await this.fetchHtml('rankings', url, form);
    this.check('rankings', url, rankingsProblem(html));
    return parseRankingList(html);
  }

  /** An archer's row in one ranking (its page lists every archer); null when not in it. */
  async rankingRow(id: string, licence: string): Promise<FftaRankingRow | null> {
    const url = new URL(rankingUrl(id));
    const html = await this.fetchHtml('ranking', url);
    this.check('ranking', url, rankingProblem(html));
    return findRankingRow(html, licence);
  }

  /** Reports how the page looked; throws when nothing on it can be trusted. */
  private check(kind: FftaPageKind, url: URL, found: LayoutProblem | null): void {
    if (!found) return this.watch.ok(kind);
    this.watch.anomaly(kind, url.href, found.problem);
    if (found.fatal) throw new FftaLayoutError(found.problem);
  }

  private searchUrl(search: FftaSearch, page: number): URL {
    const url = new URL(SEARCH_URL);
    if (search.text) url.searchParams.set('search', search.text);
    url.searchParams.set('start', search.start);
    url.searchParams.set('end', search.end);
    for (const id of search.departmentIds) url.searchParams.append('dep[]', String(id));
    url.searchParams.set('discipline', String(search.discipline));
    url.searchParams.set('sort_by', 'start');
    url.searchParams.set('sort_order', 'ASC');
    url.searchParams.set('page', String(page));
    return url;
  }

  /** A page, posting `form` when given (the rankings' filters). */
  private async fetchHtml(kind: FftaPageKind, url: URL, form?: URLSearchParams): Promise<string> {
    let lastError: unknown;
    let gone = false;
    for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
      try {
        const response = await fetch(url, {
          method: form ? 'POST' : 'GET',
          body: form,
          headers: { 'user-agent': USER_AGENT, accept: 'text/html' },
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        // The bot protection turns some requests away at random (403), or answers with its
        // check page: worth another try, not a new layout.
        if (response.ok) {
          const html = await response.text();
          if (!isBotChallenge(html)) return html;
          lastError = new Error('bot check');
        } else {
          lastError = new Error(`HTTP ${response.status}`);
          gone = response.status === 404 || response.status === 410;
        }
      } catch (error) {
        lastError = error;
      }
      if (attempt < ATTEMPTS) await sleep(attempt * 1_000);
    }
    this.logger.warn(`FFTA page not read (${url.pathname}${url.search}): ${String(lastError)}`);
    // The address itself is no longer served: the site was reorganised.
    if (gone) {
      this.watch.anomaly(kind, url.href, `L'adresse n'existe plus (${String(lastError)}).`);
    }
    throw lastError;
  }
}
