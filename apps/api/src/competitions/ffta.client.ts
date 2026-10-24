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
  /** The site's department term ids (see DEPARTMENTS). */
  departmentIds: number[];
  /** The site's discipline term id (see FFTA_DISCIPLINES). */
  discipline: number;
  /** YYYY-MM-DD, both inclusive. */
  start: string;
  end: string;
}

/**
 * Reads the FFTA competition search and national rankings. There is no API: these are the
 * site's own pages, so a change of their layout shows as an empty list (see ffta-parser.ts,
 * ffta-rankings.ts).
 * The e2e tests replace it with a fake: they never reach the site.
 */
@Injectable()
export class FftaClient {
  private readonly logger = new Logger(FftaClient.name);

  /** Every page of the search; throws when a page cannot be read after a few attempts. */
  async search(search: FftaSearch): Promise<FftaCompetition[]> {
    const competitions: FftaCompetition[] = [];
    for (let page = 0; page < MAX_PAGES; page++) {
      const result = parseCompetitionPage(await this.fetchPage(search, page));
      competitions.push(...result.competitions);
      if (!result.hasNext) break;
    }
    return competitions;
  }

  /** A competition's own page: its place and published results. Throws when unreadable. */
  async details(id: string): Promise<FftaCompetitionDetails> {
    return parseCompetitionDetails(await this.fetchHtml(new URL(competitionUrl(id))));
  }

  /** The season the national rankings open on ("2027"); null when unreadable. */
  async rankingSeason(): Promise<string | null> {
    return parseRankingSeason(await this.fetchHtml(new URL(RANKINGS_URL)));
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
    return parseRankingList(await this.fetchHtml(new URL(RANKINGS_URL), form));
  }

  /** An archer's row in one ranking (its page lists every archer); null when not in it. */
  async rankingRow(id: string, licence: string): Promise<FftaRankingRow | null> {
    return findRankingRow(await this.fetchHtml(new URL(rankingUrl(id))), licence);
  }

  private fetchPage(search: FftaSearch, page: number): Promise<string> {
    const url = new URL(SEARCH_URL);
    url.searchParams.set('start', search.start);
    url.searchParams.set('end', search.end);
    for (const id of search.departmentIds) url.searchParams.append('dep[]', String(id));
    url.searchParams.set('discipline', String(search.discipline));
    url.searchParams.set('sort_by', 'start');
    url.searchParams.set('sort_order', 'ASC');
    url.searchParams.set('page', String(page));
    return this.fetchHtml(url);
  }

  /** A page, posting `form` when given (the rankings' filters). */
  private async fetchHtml(url: URL, form?: URLSearchParams): Promise<string> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
      try {
        const response = await fetch(url, {
          method: form ? 'POST' : 'GET',
          body: form,
          headers: { 'user-agent': USER_AGENT, accept: 'text/html' },
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        // The bot protection turns some requests away at random (403): worth another try.
        if (response.ok) return await response.text();
        lastError = new Error(`HTTP ${response.status}`);
      } catch (error) {
        lastError = error;
      }
      if (attempt < ATTEMPTS) await sleep(attempt * 1_000);
    }
    this.logger.warn(`FFTA page not read (${url.pathname}${url.search}): ${String(lastError)}`);
    throw lastError;
  }
}
