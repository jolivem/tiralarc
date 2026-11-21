import { Injectable, Logger } from '@nestjs/common';
import { Role } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { type DemoLocale, demoSeason } from './demo-season.js';

/** The example accounts, one per language (`.invalid`: no mail can ever reach them). */
const DEMO_EMAILS: Record<DemoLocale, string> = {
  fr: 'exemple@myarcherydiary.invalid',
  en: 'example@myarcherydiary.invalid',
};
/** The season is made again (around the new today) once it is this old. */
const REFRESH_MS = 7 * 86_400_000;

const toDbDate = (day: string) => new Date(`${day}T00:00:00.000Z`);

/**
 * The visitors' example journal: an account per language (`isDemo`, read-only through the API's
 * guard), its made-up season (`demoSeason`) kept around today — made again once a week, when
 * someone opens it.
 */
@Injectable()
export class DemoService {
  private readonly logger = new Logger(DemoService.name);
  /** One refresh at a time per language (visitors arriving together). */
  private readonly refreshing = new Map<DemoLocale, Promise<string>>();

  constructor(private readonly prisma: PrismaService) {}

  /** The example account of that language, its season fresh; its id. */
  ensure(locale: DemoLocale, now = new Date()): Promise<string> {
    let pending = this.refreshing.get(locale);
    if (!pending) {
      pending = this.refresh(locale, now).finally(() => this.refreshing.delete(locale));
      this.refreshing.set(locale, pending);
    }
    return pending;
  }

  private async refresh(locale: DemoLocale, now: Date): Promise<string> {
    const email = DEMO_EMAILS[locale];
    const user =
      (await this.prisma.user.findUnique({
        where: { email },
        include: { journals: { select: { createdAt: true } } },
      })) ??
      (await this.prisma.user.create({
        data: {
          email,
          isDemo: true,
          displayName: 'Camille',
          locale,
          emailVerifiedAt: now,
          roles: { create: [{ role: Role.ARCHER }] },
        },
        include: { journals: { select: { createdAt: true } } },
      }));
    const made = user.journals[0]?.createdAt;
    if (made && now.getTime() - made.getTime() < REFRESH_MS) return user.id;

    const today = now.toISOString().slice(0, 10);
    const season = demoSeason(today, locale);
    await this.prisma.$transaction([
      this.prisma.journalSession.deleteMany({ where: { userId: user.id } }),
      this.prisma.journal.deleteMany({ where: { userId: user.id } }),
      this.prisma.goal.deleteMany({ where: { userId: user.id } }),
      this.prisma.archerProfile.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          bowType: 'RECURVE',
          category: 'S1',
          disciplines: ['INDOOR', 'TAE_INTERNATIONAL'],
          departments: [],
          // Nothing read from the FFTA for the example.
          practisesInFrance: false,
          calendarFont: 'dancing-script',
          favoriteIndicator: 'ARROW_AVERAGES',
          coachEmails: false,
          competitionReminders: false,
        },
        update: {},
      }),
      this.prisma.journal.create({
        data: {
          userId: user.id,
          title: season.journal.title,
          startDate: toDbDate(season.journal.startDate),
          endDate: toDbDate(season.journal.endDate),
          monthThemes: season.journal.monthThemes,
          monthSatisfactions: season.journal.monthSatisfactions,
          isDefault: true,
        },
      }),
      this.prisma.journalSession.createMany({
        data: season.sessions.map((s) => ({
          ...s,
          userId: user.id,
          date: toDbDate(s.date),
          steps: s.steps ?? undefined,
        })),
      }),
      this.prisma.goal.createMany({
        data: season.goals.map((g) => ({
          ...g,
          userId: user.id,
          createdOn: toDbDate(g.createdOn),
          achievedOn: g.achievedOn ? toDbDate(g.achievedOn) : null,
        })),
      }),
    ]);
    this.logger.log(`Example journal (${locale}) made again: ${season.sessions.length} events`);
    return user.id;
  }
}
