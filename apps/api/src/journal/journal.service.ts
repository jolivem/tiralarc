import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { ApiException, ErrorCode } from '../common/errors.js';
import type { JournalSession } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  type CreateSessionDto,
  MAX_LIST_ITEMS,
  type SessionDto,
  type SessionSuggestionsDto,
  type SessionSummaryDto,
  type UpdateSessionDto,
} from './dto/journal.dto.js';

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
    description: s.description,
    physicalFeeling: s.physicalFeeling,
    mentalFeeling: s.mentalFeeling,
    wentWell: asList(s.wentWell),
    toImprove: asList(s.toImprove),
    nextTime: s.nextTime,
    updatedAt: s.updatedAt,
  };
}

/** Archers' journal. Every query is scoped to the owner: someone else's session is a 404. */
@Injectable()
export class JournalService {
  constructor(private readonly prisma: PrismaService) {}

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
    const { date, wentWell, toImprove, location, ...rest } = dto;
    const session = await this.prisma.journalSession.update({
      where: { id },
      data: {
        ...rest,
        ...(date !== undefined && { date: toDbDate(date) }),
        ...(location !== undefined && { location: location?.trim() || null }),
        ...(wentWell !== undefined && { wentWell: cleanList(wentWell) }),
        ...(toImprove !== undefined && { toImprove: cleanList(toImprove) }),
      },
    });
    return toDto(session);
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.findOwned(userId, id);
    await this.prisma.journalSession.delete({ where: { id } });
  }

  private async findOwned(userId: string, id: string): Promise<JournalSession> {
    const session = await this.prisma.journalSession.findFirst({ where: { id, userId } });
    if (!session) throw new NotFoundException('Session not found');
    return session;
  }
}
