import { createHash, randomBytes } from 'node:crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { calendarFile, type FeedEvent } from './ics.js';

const DAY_MS = 86_400_000;
/** The feed's days: some months back, a season ahead. */
const PAST_DAYS = 180;
const FUTURE_DAYS = 400;

const hash = (token: string) => createHash('sha256').update(token).digest('hex');

const TYPE_NAMES: Record<string, Record<string, string>> = {
  fr: {
    TRAINING: 'Entraînement',
    COACHING: 'Coaching',
    COMPETITION: 'Compétition',
    STRENGTH: 'Renfo musculaire',
    OTHER: 'Divers',
  },
  en: {
    TRAINING: 'Training',
    COACHING: 'Coaching',
    COMPETITION: 'Competition',
    STRENGTH: 'Strength',
    OTHER: 'Other',
  },
};

/**
 * The archer's calendar subscription: a secret link (only its hash is kept) that calendar apps
 * read without signing in, listing the journal's events as whole days. A new link replaces the
 * old one, which stops working.
 */
@Injectable()
export class CalendarFeedService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  /** A new link (the previous one, if any, stops working). Shown once: only its hash is kept. */
  async create(userId: string): Promise<string> {
    const token = randomBytes(32).toString('base64url');
    await this.prisma.archerProfile.upsert({
      where: { userId },
      create: { userId, disciplines: [], departments: [], calendarFeedTokenHash: hash(token) },
      update: { calendarFeedTokenHash: hash(token) },
    });
    const base =
      this.config.get('API_PUBLIC_URL', { infer: true }) ??
      this.config.get('WEB_URL', { infer: true });
    return new URL(`/api/v1/calendar/${token}.ics`, base).toString();
  }

  async remove(userId: string): Promise<void> {
    await this.prisma.archerProfile.updateMany({
      where: { userId },
      data: { calendarFeedTokenHash: null },
    });
  }

  /** The calendar file of the link's archer; unknown link: 404. */
  async file(token: string, now = new Date()): Promise<string> {
    const profile = await this.prisma.archerProfile.findUnique({
      where: { calendarFeedTokenHash: hash(token) },
      select: { user: { select: { id: true, displayName: true, locale: true } } },
    });
    if (!profile) throw new NotFoundException('Unknown calendar link');
    const { user } = profile;
    const names = TYPE_NAMES[user.locale === 'en' ? 'en' : 'fr']!;
    const sessions = await this.prisma.journalSession.findMany({
      where: {
        userId: user.id,
        date: {
          gte: new Date(now.getTime() - PAST_DAYS * DAY_MS),
          lte: new Date(now.getTime() + FUTURE_DAYS * DAY_MS),
        },
      },
      select: {
        id: true,
        date: true,
        type: true,
        title: true,
        location: true,
        objective: true,
        updatedAt: true,
        customType: { select: { title: true } },
      },
      orderBy: { date: 'asc' },
    });
    const events: FeedEvent[] = sessions.map((s) => {
      const name =
        s.customType?.title ?? (s.type === 'OTHER' ? s.title : null) ?? names[s.type] ?? s.type;
      return {
        id: s.id,
        day: s.date.toISOString().slice(0, 10),
        summary: s.location ? `${name} · ${s.location}` : name,
        location: s.location,
        description: s.objective,
        updatedAt: s.updatedAt,
      };
    });
    const title = user.displayName ? `MyArcheryDiary — ${user.displayName}` : 'MyArcheryDiary';
    return calendarFile(title, events);
  }
}
