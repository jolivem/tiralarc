import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { ApiException, ErrorCode } from '../common/errors.js';
import type { Journal, JournalSession } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  type CreateJournalDto,
  type CreateSessionDto,
  type EventColor,
  type EventIcon,
  type JournalDto,
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

/** Stored as { "YYYY-MM": themeId }; anything else in the column is ignored. */
function monthThemesOf(j: Journal): MonthThemeDto[] {
  const stored = j.monthThemes;
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return [];
  return Object.entries(stored)
    .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
    .map(([month, theme]) => ({ month, theme }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

function toJournalDto(j: Journal, sessionCount: number): JournalDto {
  return {
    id: j.id,
    title: j.title,
    startDate: fromDbDate(j.startDate),
    endDate: fromDbDate(j.endDate),
    monthThemes: monthThemesOf(j),
    sessionCount,
  };
}

function assertInJournal(journal: Journal, date: Date): void {
  if (date < journal.startDate || date > journal.endDate) {
    throw new ApiException(
      HttpStatus.BAD_REQUEST,
      ErrorCode.SESSION_OUTSIDE_JOURNAL,
      "The session date is outside the journal's period",
    );
  }
}

function assertPeriod(startDate: Date, endDate: Date): void {
  if (endDate < startDate) {
    throw new ApiException(
      HttpStatus.BAD_REQUEST,
      ErrorCode.VALIDATION_FAILED,
      '"endDate" must not be before "startDate"',
    );
  }
}

function toSummary(s: JournalSession): SessionSummaryDto {
  return {
    id: s.id,
    journalId: s.journalId,
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

/** Archers' journals. Every query is scoped to the owner: someone else's journal or session is a 404. */
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
      include: { _count: { select: { sessions: true } } },
    });
    return journals.map((j) => toJournalDto(j, j._count.sessions));
  }

  async createJournal(userId: string, dto: CreateJournalDto): Promise<JournalDto> {
    const startDate = toDbDate(dto.startDate);
    const endDate = toDbDate(dto.endDate);
    assertPeriod(startDate, endDate);
    const journal = await this.prisma.journal.create({
      data: { userId, title: dto.title.trim(), startDate, endDate },
    });
    return toJournalDto(journal, 0);
  }

  /** The period can only change while it still covers every session of the journal. */
  async updateJournal(userId: string, id: string, dto: UpdateJournalDto): Promise<JournalDto> {
    const current = await this.findOwnedJournal(userId, id);
    const startDate = dto.startDate !== undefined ? toDbDate(dto.startDate) : current.startDate;
    const endDate = dto.endDate !== undefined ? toDbDate(dto.endDate) : current.endDate;
    assertPeriod(startDate, endDate);
    const outside = await this.prisma.journalSession.count({
      where: { journalId: id, OR: [{ date: { lt: startDate } }, { date: { gt: endDate } }] },
    });
    if (outside > 0) {
      throw new ApiException(
        HttpStatus.CONFLICT,
        ErrorCode.JOURNAL_PERIOD_EXCLUDES_SESSIONS,
        `${outside} session(s) of the journal would be outside the new period`,
      );
    }
    const journal = await this.prisma.journal.update({
      where: { id },
      data: { title: dto.title?.trim(), startDate, endDate },
      include: { _count: { select: { sessions: true } } },
    });
    return toJournalDto(journal, journal._count.sessions);
  }

  /** Sets (or, with null, removes) the decoration of one month of the journal. */
  async setMonthTheme(
    userId: string,
    id: string,
    month: string,
    theme: string | null,
  ): Promise<JournalDto> {
    const journal = await this.findOwnedJournal(userId, id);
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
    const themes = Object.fromEntries(monthThemesOf(journal).map((m) => [m.month, m.theme]));
    if (theme === null) delete themes[month];
    else themes[month] = theme;
    const updated = await this.prisma.journal.update({
      where: { id },
      data: { monthThemes: themes },
      include: { _count: { select: { sessions: true } } },
    });
    return toJournalDto(updated, updated._count.sessions);
  }

  /** Deletes the journal, its sessions and their photos. */
  async removeJournal(userId: string, id: string): Promise<void> {
    await this.findOwnedJournal(userId, id);
    const photos = await this.photos.findByJournal(id);
    await this.prisma.journal.delete({ where: { id } });
    await this.photos.removeFiles(photos);
  }

  async list(
    userId: string,
    journalId: string,
    from: string,
    to: string,
  ): Promise<SessionSummaryDto[]> {
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
    await this.findOwnedJournal(userId, journalId);
    const sessions = await this.prisma.journalSession.findMany({
      where: { userId, journalId, date: { gte: start, lte: end } },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });
    return sessions.map(toSummary);
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
    const journal = await this.findOwnedJournal(userId, dto.journalId);
    const date = toDbDate(dto.date);
    assertInJournal(journal, date);
    const session = await this.prisma.journalSession.create({
      data: {
        userId,
        journalId: journal.id,
        type: dto.type,
        date,
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
    const { journalId } = await this.findOwned(userId, id);
    const { date, wentWell, toImprove, location, title, ...rest } = dto;
    if (date !== undefined) {
      assertInJournal(await this.findOwnedJournal(userId, journalId), toDbDate(date));
    }
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
