import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.js';
import { SessionType } from '../generated/prisma/client.js';
import { MailService } from '../mail/mail.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;
/** Competitions are reminded of when they are this many days away, or fewer. */
export const REMINDER_DAYS = 7;
/** A competition added this recently is not reminded of yet: the archer has it in mind. */
const JUST_ADDED_MS = 2 * DAY_MS;
/** What the coach did longer ago than this (before the emails existed, say) is not told. */
const NEWS_HORIZON_MS = 7 * DAY_MS;
/** No email before this hour (UTC) of the day. */
const FIRST_HOUR_UTC = 7;

const iso = (date: Date) => date.toISOString().slice(0, 10);
const dayStart = (now: Date) => new Date(`${iso(now)}T00:00:00.000Z`);

/**
 * The archers' emails, checked every hour (like the score sheets): what their coach proposed or
 * commented (at most one email a day, `coachNotifiedAt`), and their competitions of the coming
 * week (`reminderSentAt`, once each). Each can be turned off in the profile (`coachEmails`,
 * `competitionReminders`); the example journal's account gets none.
 */
@Injectable()
export class NotificationsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationsService.name);
  private timer: NodeJS.Timeout | undefined;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  onModuleInit() {
    if (this.config.get('NODE_ENV', { infer: true }) === 'test') return;
    this.timer = setInterval(() => void this.run(), HOUR_MS);
    this.timer.unref();
  }

  onModuleDestroy() {
    clearInterval(this.timer);
  }

  /** One round of both; tests call it with their own `now`. */
  async run(now = new Date()): Promise<void> {
    if (this.running || now.getUTCHours() < FIRST_HOUR_UTC) return;
    this.running = true;
    try {
      await this.coachNews(now);
      await this.competitionReminders(now);
    } catch (error) {
      this.logger.error(`Notifications round failed: ${String(error)}`);
    } finally {
      this.running = false;
    }
  }

  /** What each archer's coaches proposed (still to come, unseen) or commented (unread). */
  private async coachNews(now: Date): Promise<void> {
    const since = new Date(now.getTime() - NEWS_HORIZON_MS);
    const archer = {
      select: {
        id: true,
        email: true,
        locale: true,
        isDemo: true,
        archerProfile: { select: { coachEmails: true, coachNotifiedAt: true } },
      },
    } as const;
    const [events, comments] = await Promise.all([
      this.prisma.journalSession.findMany({
        where: {
          plannedById: { not: null },
          seenAt: null,
          date: { gte: dayStart(now) },
          createdAt: { gt: since },
        },
        select: {
          date: true,
          type: true,
          createdAt: true,
          user: archer,
          plannedBy: { select: { displayName: true, email: true } },
        },
        orderBy: { date: 'asc' },
      }),
      this.prisma.sessionComment.findMany({
        where: { seenAt: null, updatedAt: { gt: since } },
        select: {
          updatedAt: true,
          coach: { select: { displayName: true, email: true } },
          session: { select: { date: true, user: archer } },
        },
        orderBy: { updatedAt: 'asc' },
      }),
    ]);

    type Archer = (typeof events)[number]['user'];
    type News = {
      archer: Archer;
      events: { day: string; type: string }[];
      comments: { day: string; coach: string }[];
      coach: string;
      latest: number;
    };
    const byArcher = new Map<string, News>();
    const newsOf = (user: Archer) => {
      let news = byArcher.get(user.id);
      if (!news) {
        news = { archer: user, events: [], comments: [], coach: '', latest: 0 };
        byArcher.set(user.id, news);
      }
      return news;
    };
    const newer = (user: Archer, at: Date) =>
      !user.archerProfile?.coachNotifiedAt || at > user.archerProfile.coachNotifiedAt;
    const nameOf = (coach: { displayName: string | null; email: string } | null) =>
      coach?.displayName ?? coach?.email ?? '';

    for (const e of events) {
      if (!newer(e.user, e.createdAt)) continue;
      const news = newsOf(e.user);
      news.events.push({ day: iso(e.date), type: e.type });
      if (e.createdAt.getTime() >= news.latest) {
        news.latest = e.createdAt.getTime();
        news.coach = nameOf(e.plannedBy);
      }
    }
    for (const c of comments) {
      if (!newer(c.session.user, c.updatedAt)) continue;
      const news = newsOf(c.session.user);
      news.comments.push({ day: iso(c.session.date), coach: nameOf(c.coach) });
      if (c.updatedAt.getTime() >= news.latest) {
        news.latest = c.updatedAt.getTime();
        news.coach = nameOf(c.coach);
      }
    }

    for (const news of byArcher.values()) {
      const { archer: user } = news;
      const profile = user.archerProfile;
      if (user.isDemo || profile?.coachEmails === false) continue;
      // Once a day at most: the rest waits for tomorrow's email.
      if (profile?.coachNotifiedAt && now.getTime() - profile.coachNotifiedAt.getTime() < DAY_MS) {
        continue;
      }
      try {
        await this.mail.sendCoachNews(user.email, user.locale, news);
        await this.prisma.archerProfile.upsert({
          where: { userId: user.id },
          create: { userId: user.id, disciplines: [], departments: [], coachNotifiedAt: now },
          update: { coachNotifiedAt: now },
        });
      } catch (error) {
        this.logger.warn(`Coach news not sent to ${user.id}: ${String(error)}`);
      }
    }
  }

  /** Each archer's competitions of the coming week not reminded of yet: one email each. */
  private async competitionReminders(now: Date): Promise<void> {
    const today = dayStart(now);
    const sessions = await this.prisma.journalSession.findMany({
      where: {
        type: SessionType.COMPETITION,
        reminderSentAt: null,
        date: { gt: today, lte: new Date(today.getTime() + REMINDER_DAYS * DAY_MS) },
        createdAt: { lt: new Date(now.getTime() - JUST_ADDED_MS) },
        user: { isDemo: false },
      },
      select: {
        id: true,
        date: true,
        location: true,
        fftaCompetitionId: true,
        user: {
          select: {
            id: true,
            email: true,
            locale: true,
            archerProfile: { select: { competitionReminders: true } },
          },
        },
      },
      orderBy: { date: 'asc' },
    });
    const byArcher = new Map<string, typeof sessions>();
    for (const s of sessions) byArcher.set(s.user.id, [...(byArcher.get(s.user.id) ?? []), s]);

    for (const list of byArcher.values()) {
      const user = list[0]!.user;
      const ids = list.map((s) => s.id);
      try {
        if (user.archerProfile?.competitionReminders !== false) {
          await this.mail.sendCompetitionReminder(
            user.email,
            user.locale,
            list.map((s) => ({
              day: iso(s.date),
              place: s.location ?? '',
              fftaUrl: s.fftaCompetitionId
                ? `https://www.ffta.fr/epreuve/${s.fftaCompetitionId}`
                : null,
            })),
            list[0]!.id,
          );
        }
        // Reminders turned off count as sent: turning them on again doesn't bring old ones back.
        await this.prisma.journalSession.updateMany({
          where: { id: { in: ids } },
          data: { reminderSentAt: now },
        });
      } catch (error) {
        this.logger.warn(`Competition reminder not sent to ${user.id}: ${String(error)}`);
      }
    }
  }
}
