import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.js';
import { SessionType } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ScoreSheetFinder, SearchCache } from './score-sheet-finder.js';

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;
/** A competition's sheet is looked for during the week after it, then no more. */
const SEARCH_DAYS = 7;

const dayStart = (now: Date) => new Date(now.toISOString().slice(0, 10));
const iso = (date: Date) => date.toISOString().slice(0, 10);

/**
 * Looks on ianseo.net for the score sheets of past competitions: once a day each, during the
 * week after the competition, for archers practising in France whose licence, last and first
 * names are known (filled in later that week, they still count).
 */
@Injectable()
export class ScoreSheetsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ScoreSheetsService.name);
  private timer: NodeJS.Timeout | undefined;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly finder: ScoreSheetFinder,
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

  /** One round: the competitions not looked at yet today. */
  async run(now = new Date()): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const today = dayStart(now);
      const sessions = await this.prisma.journalSession.findMany({
        where: {
          type: SessionType.COMPETITION,
          date: { gte: new Date(today.getTime() - SEARCH_DAYS * DAY_MS), lt: today },
          scoreSheet: { is: null },
          OR: [{ scoreSheetCheckedOn: null }, { scoreSheetCheckedOn: { lt: today } }],
        },
        select: {
          id: true,
          date: true,
          location: true,
          user: { select: { archerProfile: true } },
        },
      });
      const cache = new SearchCache();
      for (const session of sessions) {
        const profile = session.user.archerProfile;
        if (profile?.practisesInFrance === false) continue;
        const { licenceNumber, lastName, firstName } = profile ?? {};
        if (!licenceNumber || !lastName || !firstName) continue;
        try {
          const archer = { licenceNumber, lastName, firstName };
          const pdf = await this.finder.find(archer, iso(session.date), session.location, cache);
          if (pdf) {
            await this.prisma.scoreSheet.create({
              data: { sessionId: session.id, pdf: new Uint8Array(pdf) },
            });
          }
        } catch (error) {
          this.logger.warn(`No score sheet search for ${session.id}: ${String(error)}`);
        }
        await this.prisma.journalSession.update({
          where: { id: session.id },
          data: { scoreSheetCheckedOn: today },
        });
      }
    } finally {
      this.running = false;
    }
  }
}
