import { Injectable } from '@nestjs/common';
import { type AgeCategory, BowType, Discipline } from '../generated/prisma/client.js';
import { ProfileService } from '../profile/profile.service.js';
import type { RankingDto, RankingField, RankingListDto } from './dto/ranking.dto.js';
import { FftaClient, rankingUrl } from './ffta.client.js';
import type { FftaRankingInfo, FftaRankingRow } from './ffta-rankings.js';

/**
 * The rankings' discipline codes (the list's filter) of the archer's disciplines. Beursault
 * and Run Archery have no national ranking.
 */
const RANKED: Partial<Record<Discipline, string>> = {
  INDOOR: 'S',
  TAE_NATIONAL: 'T',
  TAE_INTERNATIONAL: 'T',
  FIELD: 'C',
  THREE_D: '3',
  NATURE: 'N',
};

/** Age categories, youngest first: a season earlier, an archer may have been one step back. */
const AGE_ORDER: AgeCategory[] = ['U11', 'U13', 'U15', 'U18', 'U21', 'S1', 'S2', 'S3'];

/** The rankings are updated daily. */
const FRESH_MS = 12 * 60 * 60 * 1000;
/** After a failure, the site is left alone this long. */
const RETRY_MS = 15 * 60 * 1000;

/**
 * The archer's discipline a ranking of `code` stands for: the one discipline of that code,
 * except outdoor target archery when they shoot both TAE — then by its distance (70 m, or a
 * compound's 50 m on an 80 cm face, is TAE International).
 */
function disciplineOf(code: string, info: FftaRankingInfo, disciplines: Discipline[]): Discipline {
  const ofCode = disciplines.filter((d) => RANKED[d] === code);
  if (ofCode.length === 1 || !info.distance) return ofCode[0]!;
  const international =
    info.distance.startsWith('70m') ||
    (info.bow === BowType.COMPOUND && info.distance === '50m - 80cm');
  return international ? Discipline.TAE_INTERNATIONAL : Discipline.TAE_NATIONAL;
}

interface Cached<T> {
  value: T;
  refreshAt: number;
}

/**
 * The archer's places in the FFTA national rankings of their category and bow (profile), in
 * their disciplines, found by licence number. Read on demand and kept a few hours in memory:
 * the season's list of rankings, and for each ranking only the archers' own rows (a ranking
 * page lists everyone; the others are not kept).
 */
@Injectable()
export class RankingsService {
  private readonly cache = new Map<string, Cached<unknown>>();

  constructor(
    private readonly ffta: FftaClient,
    private readonly profiles: ProfileService,
  ) {}

  async list(userId: string): Promise<RankingListDto> {
    const profile = await this.profiles.get(userId);
    const licence = profile.licenceNumber?.trim().toUpperCase() ?? '';
    const { category, bowType } = profile;
    const missing: RankingField[] = [
      ...(licence ? [] : (['licenceNumber'] as const)),
      ...(category ? [] : (['category'] as const)),
      ...(bowType ? [] : (['bowType'] as const)),
    ];
    if (!category || !bowType || !licence) {
      return { season: null, missing, rankings: [], complete: true };
    }
    const current = await this.cached('season', () => this.ffta.rankingSeason());
    if (!current.ok || !current.value)
      return { season: null, missing, rankings: [], complete: false };
    // This season, then the one before, when the archer may have been one category younger.
    const younger = AGE_ORDER[AGE_ORDER.indexOf(category) - 1];
    const seasons = [
      { season: current.value, categories: [category] },
      {
        season: String(Number(current.value) - 1),
        categories: younger ? [category, younger] : [category],
      },
    ];

    let complete = true;
    const codes = [...new Set(profile.disciplines.flatMap((d) => RANKED[d] ?? []))];
    const searches = seasons.flatMap((s) => codes.map((code) => ({ ...s, code })));
    const found = await Promise.all(
      searches.map(async ({ season, categories, code }) => {
        const list = await this.cached(`list:${season}:${code}`, () =>
          this.ffta.rankingList(season, code),
        );
        if (!list.ok) complete = false;
        // The archer's own category and bow, either sex: the licence tells.
        const candidates = (list.value ?? []).filter(
          (r) =>
            !r.scratch && r.bow === bowType && r.categories.some((c) => categories.includes(c)),
        );
        const rows: { season: string; code: string; info: FftaRankingInfo; row: FftaRankingRow }[] =
          [];
        // One ranking page after another: a few hundred kilobytes each.
        for (const info of candidates) {
          const row = await this.cached(`row:${info.id}:${licence}`, () =>
            this.ffta.rankingRow(info.id, licence),
          );
          if (!row.ok) complete = false;
          if (row.value) rows.push({ season, code, info, row: row.value });
        }
        return rows;
      }),
    );

    // By season (this one first), then discipline, as searched.
    const rankings: RankingDto[] = found.flat().map(({ season, code, info, row }) => ({
      season,
      discipline: disciplineOf(code, info, profile.disciplines),
      name: info.name.trim(),
      distance: info.distance,
      rank: row.rank,
      total: row.total,
      average: row.average,
      scores: row.scores,
      url: rankingUrl(info.id),
    }));
    return { season: current.value, missing, rankings, complete };
  }

  /** A reading kept a while; on failure, the last one (if any) and `ok: false`. */
  private async cached<T>(
    key: string,
    read: () => Promise<T>,
  ): Promise<{ ok: boolean; value: T | null }> {
    const entry = this.cache.get(key) as Cached<T> | undefined;
    if (entry && Date.now() < entry.refreshAt) return { ok: true, value: entry.value };
    try {
      const value = await read();
      this.cache.set(key, { value, refreshAt: Date.now() + FRESH_MS });
      return { ok: true, value };
    } catch {
      if (entry) entry.refreshAt = Date.now() + RETRY_MS;
      return { ok: false, value: entry?.value ?? null };
    }
  }
}
