import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { ApiException, ErrorCode } from '../common/errors.js';
import { type Journal, type JournalSession, SessionType } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  type CreateJournalDto,
  type CreateSessionDto,
  type EventColor,
  type EventIcon,
  type FillDto,
  type JournalDto,
  type JournalStatsDto,
  MONTH,
  type MonthThemeDto,
  MAX_LIST_ITEMS,
  type SessionDto,
  type SessionSuggestionsDto,
  type SessionSummaryDto,
  type UpdateJournalDto,
  type UpdateSessionDto,
} from './dto/journal.dto.js';
import { PhotosService } from './photos.service.js';

const MAX_RANGE_DAYS = 366;
/** Sessions scanned for suggestions, and suggestions returned per field. */
const SUGGESTION_SOURCE_SESSIONS = 300;
const MAX_SUGGESTIONS = 15;

/**
 * Distinct values, most frequent first; ties go to the most recent.
 * `values` must be ordered from the most recent session.
 */
function rank<T extends string | number>(values: T[]): T[] {
  const stats = new Map<string, { value: T; count: number; firstSeen: number }>();
  values.forEach((value, index) => {
    // Case-insensitive for text ("Gymnase" = "gymnase"); the most recent spelling wins.
    const key = typeof value === 'string' ? value.toLocaleLowerCase('fr') : String(value);
    const entry = stats.get(key);
    if (entry) entry.count += 1;
    else stats.set(key, { value, count: 1, firstSeen: index });
  });
  return [...stats.values()]
    .sort((a, b) => b.count - a.count || a.firstSeen - b.firstSeen)
    .slice(0, MAX_SUGGESTIONS)
    .map(({ value }) => value);
}

/** "YYYY-MM-DD" ↔ DATE column (stored as UTC midnight, read back as the same calendar day). */
const toDbDate = (day: string) => new Date(`${day}T00:00:00.000Z`);
const fromDbDate = (date: Date) => date.toISOString().slice(0, 10);

/** Trims, drops empty lines and caps the list (the sheet has 3 lines). */
function cleanList(items: string[] | undefined): string[] | undefined {
  return items
    ?.map((item) => item.trim())
    .filter(Boolean)
    .slice(0, MAX_LIST_ITEMS);
}

function asList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}

/**
 * Stored as { "YYYY-MM": { theme, fills } } (a bare theme id in older rows);
 * anything else in the column is ignored.
 */
function monthThemesOf(j: Journal): MonthThemeDto[] {
  const stored = j.monthThemes;
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return [];
  return Object.entries(stored)
    .flatMap(([month, value]): MonthThemeDto[] => {
      if (typeof value === 'string') return [{ month, theme: value, fills: [] }];
      if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
      const { theme, fills } = value;
      if (typeof theme !== 'string') return [];
      return [{ month, theme, fills: Array.isArray(fills) ? (fills as unknown as FillDto[]) : [] }];
    })
    .sort((a, b) => a.month.localeCompare(b.month));
}

/** What `monthThemesOf` reads back. */
const toStoredThemes = (months: MonthThemeDto[]) =>
  Object.fromEntries(
    months.map(({ month, theme, fills }) => [
      month,
      { theme, fills: fills.map(({ band, x, y, color }) => ({ band, x, y, color })) },
    ]),
  );

/** The events of a journal: its owner's sessions dated within its period. */
const eventsOf = (journal: Journal) => ({
  userId: journal.userId,
  date: { gte: journal.startDate, lte: journal.endDate },
});

function assertPeriod(startDate: Date, endDate: Date): void {
  if (endDate < startDate) {
    throw new ApiException(
      HttpStatus.BAD_REQUEST,
      ErrorCode.VALIDATION_FAILED,
      '"endDate" must not be before "startDate"',
    );
  }
}

function assertMonthOf(journal: Journal, month: string): void {
  const inPeriod =
    MONTH.test(month) &&
    month >= fromDbDate(journal.startDate).slice(0, 7) &&
    month <= fromDbDate(journal.endDate).slice(0, 7);
  if (!inPeriod) {
    throw new ApiException(
      HttpStatus.BAD_REQUEST,
      ErrorCode.VALIDATION_FAILED,
      '"month" must be a YYYY-MM month of the journal\'s period',
    );
  }
}

function toSummary(s: JournalSession): SessionSummaryDto {
  return {
    id: s.id,
    type: s.type,
    date: fromDbDate(s.date),
    startTime: s.startTime,
    durationMinutes: s.durationMinutes,
    location: s.location,
    discipline: s.discipline,
    score: s.score,
    description: s.description,
    title: s.title,
    color: s.color as EventColor | null,
    icon: s.icon as EventIcon | null,
  };
}

function toDto(s: JournalSession): SessionDto {
  return {
    ...toSummary(s),
    distanceMeters: s.distanceMeters,
    arrowCount: s.arrowCount,
    objective: s.objective,
    satisfaction: s.satisfaction,
    technique: s.technique,
    physicalFeeling: s.physicalFeeling,
    mentalFeeling: s.mentalFeeling,
    wentWell: asList(s.wentWell),
    toImprove: asList(s.toImprove),
    nextTime: s.nextTime,
    updatedAt: s.updatedAt,
  };
}

/**
 * Archers' journals and events. A journal is a period: its events are the archer's
 * sessions dated within it. Every query is scoped to the owner: someone else's
 * journal or session is a 404.
 */
@Injectable()
export class JournalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly photos: PhotosService,
  ) {}

  /** Most recent season first. */
  async listJournals(userId: string): Promise<JournalDto[]> {
    const journals = await this.prisma.journal.findMany({
      where: { userId },
      orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
    });
    return Promise.all(journals.map((journal) => this.toJournalDto(journal)));
  }

  async createJournal(userId: string, dto: CreateJournalDto): Promise<JournalDto> {
    const startDate = toDbDate(dto.startDate);
    const endDate = toDbDate(dto.endDate);
    assertPeriod(startDate, endDate);
    await this.assertNoOverlap(userId, startDate, endDate);
    const journal = await this.prisma.journal.create({
      data: { userId, title: dto.title.trim(), startDate, endDate },
    });
    return this.toJournalDto(journal);
  }

  /** Events follow their dates: moving the period changes which ones the journal shows. */
  async updateJournal(userId: string, id: string, dto: UpdateJournalDto): Promise<JournalDto> {
    const current = await this.findOwnedJournal(userId, id);
    const startDate = dto.startDate !== undefined ? toDbDate(dto.startDate) : current.startDate;
    const endDate = dto.endDate !== undefined ? toDbDate(dto.endDate) : current.endDate;
    assertPeriod(startDate, endDate);
    await this.assertNoOverlap(userId, startDate, endDate, id);
    const journal = await this.prisma.journal.update({
      where: { id },
      data: { title: dto.title?.trim(), startDate, endDate },
    });
    return this.toJournalDto(journal);
  }

  /**
   * Sets (or, with null, removes) the decoration of one month of the journal.
   * The colouring belongs to the artwork: it is dropped when the theme changes.
   */
  async setMonthTheme(
    userId: string,
    id: string,
    month: string,
    theme: string | null,
  ): Promise<JournalDto> {
    const journal = await this.findOwnedJournal(userId, id);
    assertMonthOf(journal, month);
    const current = monthThemesOf(journal);
    const kept = current.filter((m) => m.month !== month);
    const previous = current.find((m) => m.month === month);
    if (theme !== null) {
      kept.push({ month, theme, fills: previous?.theme === theme ? previous.fills : [] });
    }
    return this.saveMonthThemes(id, kept);
  }

  /** Replaces the archer's colouring of a month's decoration. */
  async setMonthColoring(
    userId: string,
    id: string,
    month: string,
    fills: FillDto[],
  ): Promise<JournalDto> {
    const journal = await this.findOwnedJournal(userId, id);
    assertMonthOf(journal, month);
    const months = monthThemesOf(journal);
    const target = months.find((m) => m.month === month);
    if (!target) {
      throw new ApiException(
        HttpStatus.CONFLICT,
        ErrorCode.MONTH_HAS_NO_THEME,
        'Choose a decoration for that month before colouring it',
      );
    }
    target.fills = fills;
    return this.saveMonthThemes(id, months);
  }

  private async saveMonthThemes(id: string, months: MonthThemeDto[]): Promise<JournalDto> {
    const updated = await this.prisma.journal.update({
      where: { id },
      data: { monthThemes: toStoredThemes(months) },
    });
    return this.toJournalDto(updated);
  }

  /** Deletes the journal only: the events of its period are kept. */
  async removeJournal(userId: string, id: string): Promise<void> {
    await this.findOwnedJournal(userId, id);
    await this.prisma.journal.delete({ where: { id } });
  }

  async list(userId: string, from: string, to: string): Promise<SessionSummaryDto[]> {
    const start = toDbDate(from);
    const end = toDbDate(to);
    const days = (end.getTime() - start.getTime()) / 86_400_000;
    if (days < 0 || days > MAX_RANGE_DAYS) {
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        ErrorCode.VALIDATION_FAILED,
        `"to" must be between "from" and ${MAX_RANGE_DAYS} days later`,
      );
    }
    const sessions = await this.prisma.journalSession.findMany({
      where: { userId, date: { gte: start, lte: end } },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });
    return sessions.map(toSummary);
  }

  /**
   * Figures behind the archer's indicators, between two days (inclusive). Either bound
   * can be left out: no bound at all means every event the archer ever recorded.
   */
  async stats(userId: string, from?: string, to?: string): Promise<JournalStatsDto> {
    const period = {
      userId,
      date: { gte: from ? toDbDate(from) : undefined, lte: to ? toDbDate(to) : undefined },
    };
    const [competitions, arrows] = await Promise.all([
      this.prisma.journalSession.findMany({
        where: { ...period, type: SessionType.COMPETITION },
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
        select: {
          id: true,
          date: true,
          discipline: true,
          arrowCount: true,
          score: true,
          location: true,
        },
      }),
      this.prisma.journalSession.groupBy({
        by: ['date'],
        where: { ...period, arrowCount: { gt: 0 } },
        _sum: { arrowCount: true },
        orderBy: { date: 'asc' },
      }),
    ]);
    return {
      competitions: competitions.map((c) => ({ ...c, date: fromDbDate(c.date) })),
      arrowsByDay: arrows.map((day) => ({
        date: fromDbDate(day.date),
        arrows: day._sum.arrowCount ?? 0,
      })),
    };
  }

  async suggestions(userId: string): Promise<SessionSuggestionsDto> {
    const recent = await this.prisma.journalSession.findMany({
      where: { userId },
      orderBy: [{ date: 'desc' }, { updatedAt: 'desc' }],
      take: SUGGESTION_SOURCE_SESSIONS,
      select: { location: true, distanceMeters: true, wentWell: true, toImprove: true },
    });
    return {
      locations: rank(recent.flatMap((s) => (s.location ? [s.location] : []))),
      distances: rank(recent.flatMap((s) => (s.distanceMeters !== null ? [s.distanceMeters] : []))),
      wentWell: rank(recent.flatMap((s) => asList(s.wentWell))),
      toImprove: rank(recent.flatMap((s) => asList(s.toImprove))),
    };
  }

  async create(userId: string, dto: CreateSessionDto): Promise<SessionDto> {
    const session = await this.prisma.journalSession.create({
      data: {
        userId,
        type: dto.type,
        date: toDbDate(dto.date),
        startTime: dto.startTime ?? null,
        wentWell: [],
        toImprove: [],
      },
    });
    return toDto(session);
  }

  async get(userId: string, id: string): Promise<SessionDto> {
    return toDto(await this.findOwned(userId, id));
  }

  async update(userId: string, id: string, dto: UpdateSessionDto): Promise<SessionDto> {
    await this.findOwned(userId, id);
    const { date, wentWell, toImprove, location, title, ...rest } = dto;
    const session = await this.prisma.journalSession.update({
      where: { id },
      data: {
        ...rest,
        ...(date !== undefined && { date: toDbDate(date) }),
        ...(location !== undefined && { location: location?.trim() || null }),
        ...(title !== undefined && { title: title?.trim() || null }),
        ...(wentWell !== undefined && { wentWell: cleanList(wentWell) }),
        ...(toImprove !== undefined && { toImprove: cleanList(toImprove) }),
      },
    });
    return toDto(session);
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.findOwned(userId, id);
    const photos = await this.photos.findBySession(id);
    await this.prisma.journalSession.delete({ where: { id } });
    await this.photos.removeFiles(photos);
  }

  private async toJournalDto(journal: Journal): Promise<JournalDto> {
    return {
      id: journal.id,
      title: journal.title,
      startDate: fromDbDate(journal.startDate),
      endDate: fromDbDate(journal.endDate),
      monthThemes: monthThemesOf(journal),
      sessionCount: await this.prisma.journalSession.count({ where: eventsOf(journal) }),
    };
  }

  /** An archer's journals never share a day, so an event is in one journal at most. */
  private async assertNoOverlap(
    userId: string,
    startDate: Date,
    endDate: Date,
    exceptId?: string,
  ): Promise<void> {
    const other = await this.prisma.journal.findFirst({
      where: {
        userId,
        id: exceptId ? { not: exceptId } : undefined,
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
    });
    if (other) {
      throw new ApiException(
        HttpStatus.CONFLICT,
        ErrorCode.JOURNAL_OVERLAP,
        `The period overlaps the journal "${other.title}"`,
      );
    }
  }

  private async findOwnedJournal(userId: string, id: string): Promise<Journal> {
    const journal = await this.prisma.journal.findFirst({ where: { id, userId } });
    if (!journal) throw new NotFoundException('Journal not found');
    return journal;
  }

  private async findOwned(userId: string, id: string): Promise<JournalSession> {
    const session = await this.prisma.journalSession.findFirst({ where: { id, userId } });
    if (!session) throw new NotFoundException('Session not found');
    return session;
  }
}
