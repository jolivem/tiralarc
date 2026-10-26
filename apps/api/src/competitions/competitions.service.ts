import { Injectable } from '@nestjs/common';
import { Discipline } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ProfileService } from '../profile/profile.service.js';
import { type Department, DEPARTMENTS, departmentByCode } from './departments.js';
import type {
  CompetitionDto,
  CompetitionListDto,
  CompetitionResultsDto,
  DepartmentDto,
} from './dto/competition.dto.js';
import {
  competitionUrl,
  type FftaCompetition,
  type FftaCompetitionDetails,
} from './ffta-parser.js';
import { FftaClient } from './ffta.client.js';

/**
 * The FFTA's discipline term ids (search form of https://www.ffta.fr/competitions) for each of
 * the archer's disciplines; `para` = its para-archery counterpart, searched when the profile
 * asks for it. Outdoor target archery (102) covers both TAE disciplines.
 */
const FFTA_DISCIPLINES: Record<Discipline, { id: number; para?: number }> = {
  INDOOR: { id: 103, para: 118 },
  TAE_NATIONAL: { id: 102, para: 117 },
  TAE_INTERNATIONAL: { id: 102, para: 117 },
  FIELD: { id: 107 },
  THREE_D: { id: 108 },
  BEURSAULT: { id: 110 },
  NATURE: { id: 109 },
  RUN_ARCHERY: { id: 116 },
};
const PARA_IDS = new Set(Object.values(FFTA_DISCIPLINES).flatMap((d) => (d.para ? [d.para] : [])));

/** A search is read again after this long. */
const FRESH_MS = 12 * 60 * 60 * 1000;
/** After a failure, the site is left alone this long (the last list read, if any, is kept). */
const RETRY_MS = 15 * 60 * 1000;
/** A competition page without results yet is read again after this long. */
const RESULTS_PENDING_MS = 60 * 60 * 1000;
/** How far ahead the calendar is read. */
const HORIZON_DAYS = 366;

interface CachedSearch {
  competitions: FftaCompetition[] | null;
  /** When to read the site again. */
  refreshAt: number;
}

const toDepartmentDto = (d: Department): DepartmentDto => ({ code: d.code, name: d.name });

const isoDay = (date: Date) => date.toISOString().slice(0, 10);

/**
 * The FFTA competitions of the archer's departments in their disciplines. The site is read on
 * demand, one search per department and discipline, and kept in memory: archers of one
 * department share it, and a failed reading falls back on the last one.
 */
@Injectable()
export class CompetitionsService {
  private readonly cache = new Map<string, CachedSearch>();
  private readonly pending = new Map<string, Promise<FftaCompetition[] | null>>();
  private readonly details = new Map<
    string,
    { details: FftaCompetitionDetails | null; refreshAt: number }
  >();

  constructor(
    private readonly ffta: FftaClient,
    private readonly profiles: ProfileService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * The place of an FFTA competition, read from its own page (venue, street, postcode, town);
   * null when it could not be read or gives none.
   */
  async place(id: string): Promise<string | null> {
    return (await this.detailsOf(id))?.place ?? null;
  }

  /** The results the organiser published on the FFTA website (a PDF); null until then. */
  async results(id: string): Promise<CompetitionResultsDto> {
    return { url: (await this.detailsOf(id))?.resultsUrl ?? null };
  }

  /**
   * A competition's own page, kept a while: half a day once its results are out, an hour
   * until then (they come in the days after it), a quarter after a failure.
   */
  private async detailsOf(id: string): Promise<FftaCompetitionDetails | null> {
    const cached = this.details.get(id);
    if (cached && Date.now() < cached.refreshAt) return cached.details;
    try {
      const details = await this.ffta.details(id);
      const keep = details.resultsUrl ? FRESH_MS : RESULTS_PENDING_MS;
      this.details.set(id, { details, refreshAt: Date.now() + keep });
      return details;
    } catch {
      const details = cached?.details ?? null;
      this.details.set(id, { details, refreshAt: Date.now() + RETRY_MS });
      return details;
    }
  }

  /** The archer will not take part: out of their competitions to plan. Idempotent. */
  async dismiss(userId: string, fftaCompetitionId: string): Promise<void> {
    await this.prisma.dismissedCompetition.upsert({
      where: { userId_fftaCompetitionId: { userId, fftaCompetitionId } },
      create: { userId, fftaCompetitionId },
      update: {},
    });
  }

  /** Back among the competitions to plan. Idempotent. */
  async undismiss(userId: string, fftaCompetitionId: string): Promise<void> {
    await this.prisma.dismissedCompetition.deleteMany({ where: { userId, fftaCompetitionId } });
  }

  departments(): DepartmentDto[] {
    return DEPARTMENTS.map(toDepartmentDto);
  }

  async list(userId: string, from?: string, to?: string): Promise<CompetitionListDto> {
    const profile = await this.profiles.get(userId);
    const departments = profile.departments.flatMap((code) => departmentByCode(code) ?? []);
    if (departments.length === 0) return { departments: [], competitions: [], complete: true };

    // The FFTA id searched → the archer's discipline it shows as.
    const searched = new Map<number, Discipline>();
    const tae = profile.disciplines.includes(Discipline.TAE_NATIONAL)
      ? Discipline.TAE_NATIONAL
      : Discipline.TAE_INTERNATIONAL;
    for (const discipline of profile.disciplines) {
      const ffta = FFTA_DISCIPLINES[discipline];
      const shownAs = ffta.id === FFTA_DISCIPLINES.TAE_NATIONAL.id ? tae : discipline;
      searched.set(ffta.id, shownAs);
      if (ffta.para && profile.paraCompetitions) searched.set(ffta.para, shownAs);
    }

    const today = isoDay(new Date());
    const first = from && from > today ? from : today;
    const [results, dismissals] = await Promise.all([
      // One search per department and discipline (each shared with the other archers).
      Promise.all(
        departments.flatMap((department) =>
          [...searched.keys()].map(async (id) => ({
            id,
            competitions: await this.search(department, id),
          })),
        ),
      ),
      this.prisma.dismissedCompetition.findMany({
        where: { userId },
        select: { fftaCompetitionId: true },
      }),
    ]);
    const dismissed = new Set(dismissals.map((d) => d.fftaCompetitionId));
    const seen = new Set<string>();
    const competitions: CompetitionDto[] = [];
    for (const { id, competitions: found } of results) {
      for (const c of found ?? []) {
        if (seen.has(c.id) || c.endDate < first || (to && c.startDate > to)) continue;
        seen.add(c.id);
        competitions.push({
          ...c,
          discipline: searched.get(id)!,
          para: PARA_IDS.has(id),
          url: competitionUrl(c.id),
          dismissed: dismissed.has(c.id),
        });
      }
    }
    competitions.sort(
      (a, b) => a.startDate.localeCompare(b.startDate) || a.title.localeCompare(b.title),
    );
    return {
      departments: departments.map(toDepartmentDto),
      competitions,
      complete: results.every((r) => r.competitions !== null),
    };
  }

  /** One department and discipline, from the cache while fresh; null if never read. */
  private async search(department: Department, discipline: number) {
    const key = `${department.code}:${discipline}`;
    const cached = this.cache.get(key);
    if (cached && Date.now() < cached.refreshAt) return cached.competitions;
    // Archers asking at the same time share one reading.
    let reading = this.pending.get(key);
    if (!reading) {
      reading = this.read(department, discipline, cached).finally(() => this.pending.delete(key));
      this.pending.set(key, reading);
    }
    return reading;
  }

  private async read(department: Department, discipline: number, cached?: CachedSearch) {
    const now = new Date();
    const key = `${department.code}:${discipline}`;
    try {
      const competitions = await this.ffta.search({
        departmentIds: department.fftaIds,
        discipline,
        start: isoDay(now),
        end: isoDay(new Date(now.getTime() + HORIZON_DAYS * 24 * 60 * 60 * 1000)),
      });
      this.cache.set(key, { competitions, refreshAt: Date.now() + FRESH_MS });
      return competitions;
    } catch {
      const competitions = cached?.competitions ?? null;
      this.cache.set(key, { competitions, refreshAt: Date.now() + RETRY_MS });
      return competitions;
    }
  }
}
