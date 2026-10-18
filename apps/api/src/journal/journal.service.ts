import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { ApiException, ErrorCode } from '../common/errors.js';
import {
  type CustomEventType,
  type Journal,
  type JournalSession,
  SessionType,
} from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  type CreateJournalDto,
  type CreateSessionDto,
  type CustomEventTypeDto,
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
  TITLE_BAND,
  type UpdateJournalDto,
  type UpdateSessionDto,
} from './dto/journal.dto.js';
import { PhotosService } from './photos.service.js';

const MAX_RANGE_DAYS = 366;
/** Events on one day of the calendar (the calendar shows one badge each). */
export const MAX_EVENTS_PER_DAY = 4;
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
 * Stored as { "YYYY-MM": { theme, fills } } (a bare theme id in older rows); theme is null
 * for a month without decoration whose name is coloured. Anything else is ignored.
 */
function monthThemesOf(j: Journal): MonthThemeDto[] {
  const stored = j.monthThemes;
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return [];
  return Object.entries(stored)
    .flatMap(([month, value]): MonthThemeDto[] => {
      if (typeof value === 'string') return [{ month, theme: value, fills: [] }];
      if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
      const { theme, fills } = value;
      if (typeof theme !== 'string' && theme !== null) return [];
      return [{ month, theme, fills: Array.isArray(fills) ? (fills as unknown as FillDto[]) : [] }];
    })
    .sort((a, b) => a.month.localeCompare(b.month));
}

/** What `monthThemesOf` reads back; a month with neither decoration nor colouring is dropped. */
const toStoredThemes = (months: MonthThemeDto[]) =>
  Object.fromEntries(
    months
      .filter(({ theme, fills }) => theme !== null || fills.length > 0)
      .map(({ month, theme, fills }) => [
        month,
        { theme, fills: fills.map(({ band, x, y, color }) => ({ band, x, y, color })) },
      ]),
  );

/** The colouring of the month's name (band `title`): it doesn't depend on the decoration. */
const titleOnly = (fills: FillDto[]) => fills.filter((fill) => fill.band === TITLE_BAND);

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

/** Types whose sheet ends with a review, written after the session. */
const REVIEWED_TYPES: SessionType[] = [
  SessionType.TRAINING,
  SessionType.COACHING,
  SessionType.COMPETITION,
];

/** The review is written once any of its fields is (see `SessionSummaryDto.completed`). */
function isCompleted(s: JournalSession): boolean {
  if (!REVIEWED_TYPES.includes(s.type)) return true;
  const values = [
    s.arrowCount,
    s.score,
    s.satisfaction,
    s.technique,
    s.description,
    s.physicalFeeling,
    s.mentalFeeling,
    s.nextTime,
  ];
  return (
    values.some((value) => value !== null) ||
    asList(s.wentWell).length > 0 ||
    asList(s.toImprove).length > 0
  );
}

export function toCustomTypeDto(type: CustomEventType): CustomEventTypeDto {
  return {
    id: type.id,
    title: type.title,
    color: type.color as EventColor,
    icon: type.icon as EventIcon,
  };
}

/** A session as read back: with its custom type (`CUSTOM` events), which the DTOs embed. */
type SessionRow = JournalSession & { customType: CustomEventType | null };
const WITH_TYPE = { customType: true } as const;

function toSummary(s: SessionRow): SessionSummaryDto {
  return {
    id: s.id,
    type: s.type,
    date: fromDbDate(s.date),
    durationMinutes: s.durationMinutes,
    location: s.location,
    discipline: s.discipline,
    score: s.score,
    description: s.description,
    title: s.title,
    color: s.color as EventColor | null,
    icon: s.icon as EventIcon | null,
    customType: s.customType ? toCustomTypeDto(s.customType) : null,
    completed: isCompleted(s),
  };
}

function toDto(s: SessionRow): SessionDto {
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
    const journal = await this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        // One default journal per archer: choosing this one unsets the other.
        await tx.journal.updateMany({
          where: { userId, isDefault: true, id: { not: id } },
          data: { isDefault: false },
        });
      }
      return tx.journal.update({
        where: { id },
        data: { title: dto.title?.trim(), startDate, endDate, isDefault: dto.isDefault },
      });
    });
    return this.toJournalDto(journal);
  }

  /**
   * Sets (or, with null, removes) the decoration of one month of the journal.
   * The bands' colouring belongs to the artwork: it is dropped when the theme changes or
   * goes, except the month name's (`title`), which doesn't depend on it.
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
    const fills = previous?.fills ?? [];
    kept.push({ month, theme, fills: previous?.theme === theme ? fills : titleOnly(fills) });
    return this.saveMonthThemes(id, kept);
  }

  /**
   * Replaces the archer's colouring of a month: its decoration's bands and its name. A month
   * without decoration can only have its name coloured.
   */
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
    if ((target?.theme ?? null) === null && titleOnly(fills).length !== fills.length) {
      throw new ApiException(
        HttpStatus.CONFLICT,
        ErrorCode.MONTH_HAS_NO_THEME,
        "Choose a decoration for that month before colouring it (only the month's name can be coloured without one)",
      );
    }
    if (target) target.fills = fills;
    else months.push({ month, theme: null, fills });
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
      // A day's events in the order they were entered.
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
      include: WITH_TYPE,
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
    const [competitions, scores, arrows, durations, events, physical, mental] = await Promise.all([
      this.prisma.journalSession.findMany({
        where: { ...period, type: SessionType.COMPETITION },
        orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
        select: {
          id: true,
          date: true,
          discipline: true,
          arrowCount: true,
          score: true,
          location: true,
        },
      }),
      this.prisma.journalSession.findMany({
        where: {
          ...period,
          type: { in: REVIEWED_TYPES },
          score: { not: null },
          discipline: { not: null },
        },
        orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
        select: { id: true, date: true, type: true, discipline: true, score: true },
      }),
      this.prisma.journalSession.groupBy({
        by: ['date'],
        where: { ...period, arrowCount: { gt: 0 } },
        _sum: { arrowCount: true },
        orderBy: { date: 'asc' },
      }),
      this.prisma.journalSession.groupBy({
        by: ['date'],
        where: { ...period, durationMinutes: { gt: 0 } },
        _sum: { durationMinutes: true },
        orderBy: { date: 'asc' },
      }),
      this.prisma.journalSession.groupBy({
        by: ['date', 'type'],
        where: period,
        _count: { _all: true },
        orderBy: [{ date: 'asc' }, { type: 'asc' }],
      }),
      this.prisma.journalSession.groupBy({
        by: ['date', 'physicalFeeling'],
        where: { ...period, physicalFeeling: { not: null } },
        _count: { _all: true },
        orderBy: [{ date: 'asc' }, { physicalFeeling: 'asc' }],
      }),
      this.prisma.journalSession.groupBy({
        by: ['date', 'mentalFeeling'],
        where: { ...period, mentalFeeling: { not: null } },
        _count: { _all: true },
        orderBy: [{ date: 'asc' }, { mentalFeeling: 'asc' }],
      }),
    ]);
    return {
      competitions: competitions.map((c) => ({ ...c, date: fromDbDate(c.date) })),
      // The query leaves neither field null; checked again for the types.
      scores: scores.flatMap(({ date, discipline, score, ...s }) =>
        discipline && score !== null ? [{ ...s, date: fromDbDate(date), discipline, score }] : [],
      ),
      arrowsByDay: arrows.map((day) => ({
        date: fromDbDate(day.date),
        arrows: day._sum.arrowCount ?? 0,
      })),
      durationsByDay: durations.map((day) => ({
        date: fromDbDate(day.date),
        minutes: day._sum.durationMinutes ?? 0,
      })),
      eventsByDay: events.map((day) => ({
        date: fromDbDate(day.date),
        type: day.type,
        count: day._count._all,
      })),
      // The queries leave no null feeling; checked again for the types.
      physicalFeelingsByDay: physical.flatMap(({ date, physicalFeeling, _count }) =>
        physicalFeeling
          ? [{ date: fromDbDate(date), feeling: physicalFeeling, count: _count._all }]
          : [],
      ),
      mentalFeelingsByDay: mental.flatMap(({ date, mentalFeeling, _count }) =>
        mentalFeeling
          ? [{ date: fromDbDate(date), feeling: mentalFeeling, count: _count._all }]
          : [],
      ),
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
    const custom = dto.type === SessionType.CUSTOM;
    if (custom) await this.assertOwnedType(userId, dto.customTypeId);
    await this.assertDayHasRoom(userId, toDbDate(dto.date));
    const session = await this.prisma.journalSession.create({
      data: {
        userId,
        type: dto.type,
        customTypeId: custom ? dto.customTypeId : null,
        date: toDbDate(dto.date),
        wentWell: [],
        toImprove: [],
      },
      include: WITH_TYPE,
    });
    return toDto(session);
  }

  async get(userId: string, id: string): Promise<SessionDto> {
    return toDto(await this.findOwned(userId, id));
  }

  async update(userId: string, id: string, dto: UpdateSessionDto): Promise<SessionDto> {
    const current = await this.findOwned(userId, id);
    const { date, wentWell, toImprove, location, title, ...rest } = dto;
    // A custom event gets its type when created: there is no type id to switch to here.
    if (rest.type === SessionType.CUSTOM && current.type !== SessionType.CUSTOM) {
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        ErrorCode.VALIDATION_FAILED,
        'An event becomes CUSTOM only when created (with its "customTypeId")',
      );
    }
    // Moved to another day: that day must have room for it.
    if (date !== undefined && date !== fromDbDate(current.date)) {
      await this.assertDayHasRoom(userId, toDbDate(date));
    }
    const session = await this.prisma.journalSession.update({
      where: { id },
      include: WITH_TYPE,
      data: {
        ...rest,
        ...(rest.type !== undefined && rest.type !== SessionType.CUSTOM && { customTypeId: null }),
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
      isDefault: journal.isDefault,
    };
  }

  /** At most `MAX_EVENTS_PER_DAY` events on one day of the archer's calendar. */
  private async assertDayHasRoom(userId: string, date: Date): Promise<void> {
    const count = await this.prisma.journalSession.count({ where: { userId, date } });
    if (count >= MAX_EVENTS_PER_DAY) {
      throw new ApiException(
        HttpStatus.CONFLICT,
        ErrorCode.DAY_FULL,
        `At most ${MAX_EVENTS_PER_DAY} events per day`,
      );
    }
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

  private async findOwned(userId: string, id: string): Promise<SessionRow> {
    const session = await this.prisma.journalSession.findFirst({
      where: { id, userId },
      include: WITH_TYPE,
    });
    if (!session) throw new NotFoundException('Session not found');
    return session;
  }

  /** A `CUSTOM` event needs one of the archer's own types (someone else's is as good as unknown). */
  private async assertOwnedType(userId: string, id: string | undefined): Promise<void> {
    const type = id && (await this.prisma.customEventType.findFirst({ where: { id, userId } }));
    if (!type) {
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        ErrorCode.VALIDATION_FAILED,
        'A CUSTOM event needs "customTypeId": one of your event types',
      );
    }
  }
}
