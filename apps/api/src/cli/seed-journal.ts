/**
 * Fills an archer's journal with test data: a competition every Saturday, a
 * training session every Wednesday, strength work every Sunday and a coaching
 * session on the first Monday of each month, sheets filled in.
 *   pnpm --filter @tiralarc/api db:seed-journal jane@example.com [--replace]
 *
 * Target: the archer's journal whose period contains today (the most recent
 * one if several), otherwise a new "Saison 2026-2027 (test)" journal.
 * A journal's events are the archer's sessions dated within its period. A journal
 * that already has events is left alone unless --replace is given, which deletes
 * all the events of that period first.
 */
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import {
  Discipline,
  Feeling,
  type Prisma,
  PrismaClient,
  Role,
  SessionType,
} from '../generated/prisma/client.js';

const DAY_MS = 86_400_000;
const MONDAY = 1;
const WEDNESDAY = 3;
const SATURDAY = 6;
const SUNDAY = 0;
const DEFAULT_JOURNAL = {
  title: 'Saison 2026-2027 (test)',
  startDate: new Date('2026-09-01T00:00:00.000Z'),
  endDate: new Date('2027-06-30T00:00:00.000Z'),
};
const INDOOR_LOCATIONS = ['Gymnase du club', 'Complexe sportif', 'Salle des Archers de la Vallée'];
const OUTDOOR_LOCATIONS = ['Terrain du club', 'Stade municipal', 'Pas de tir de la Vallée'];

/** Deterministic pseudo-random numbers (mulberry32): the same data on every run. */
function createRandom(seed: number) {
  let state = seed;
  const next = () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
  return {
    /** Integer in [min, max]. */
    int: (min: number, max: number) => min + Math.floor(next() * (max - min + 1)),
    pick: <T>(items: readonly T[]): T => items[Math.floor(next() * items.length)] as T,
    chance: (probability: number) => next() < probability,
  };
}

const args = process.argv.slice(2);
const email = args
  .find((arg) => !arg.startsWith('--'))
  ?.trim()
  .toLowerCase();
const replace = args.includes('--replace');
if (process.env.NODE_ENV === 'production') {
  console.error('db:seed-journal writes test data: it does not run in production.');
  process.exit(1);
}
if (!email || !process.env.DATABASE_URL) {
  console.error('Usage: db:seed-journal <email> [--replace]   (DATABASE_URL must be set)');
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaMariaDb(process.env.DATABASE_URL) });
try {
  const user = await prisma.user.findUnique({ where: { email }, include: { roles: true } });
  if (!user) {
    throw new Error(`No account with email ${email}. The person must sign up first.`);
  }
  if (!user.roles.some(({ role }) => role === Role.ARCHER)) {
    throw new Error(`${email} is not an archer: only archers have a journal.`);
  }

  // Dates are stored as UTC midnight of the calendar day (see journal.service.ts).
  const today = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`);
  let journal = await prisma.journal.findFirst({
    where: { userId: user.id, startDate: { lte: today }, endDate: { gte: today } },
    orderBy: { startDate: 'desc' },
  });
  if (!journal) {
    // An archer's journals don't overlap (the API enforces it; this script writes to the database).
    const overlapping = await prisma.journal.findFirst({
      where: {
        userId: user.id,
        startDate: { lte: DEFAULT_JOURNAL.endDate },
        endDate: { gte: DEFAULT_JOURNAL.startDate },
      },
    });
    if (overlapping) {
      throw new Error(
        `No journal contains today, and "${DEFAULT_JOURNAL.title}" would overlap the journal ` +
          `"${overlapping.title}". Change that journal's dates (or delete it) and run again.`,
      );
    }
    journal = await prisma.journal.create({ data: { userId: user.id, ...DEFAULT_JOURNAL } });
  }

  // A journal's events are the archer's sessions dated within its period.
  const inJournal = {
    userId: user.id,
    date: { gte: journal.startDate, lte: journal.endDate },
  };
  const existing = await prisma.journalSession.count({ where: inJournal });
  if (existing > 0 && !replace) {
    throw new Error(
      `The journal "${journal.title}" already has ${existing} event(s). ` +
        'Run again with --replace to delete them all and seed it.',
    );
  }

  const random = createRandom(20_260_901);
  const span = journal.endDate.getTime() - journal.startDate.getTime();
  const feeling = () =>
    random.pick([
      Feeling.GREAT,
      Feeling.GREAT,
      Feeling.GREAT,
      Feeling.OK,
      Feeling.OK,
      Feeling.BAD,
      Feeling.EXHAUSTED,
    ]);
  /** Session sheet: indoor from October to March, outdoor otherwise; marks improve over the season. */
  const sheet = (date: Date, withScore: boolean, arrows?: number) => {
    const indoor = [9, 10, 11, 0, 1, 2].includes(date.getUTCMonth());
    const progress = span > 0 ? (date.getTime() - journal.startDate.getTime()) / span : 0;
    const mark = () => Math.min(10, Math.max(0, Math.round(4 + 3 * progress) + random.int(-1, 2)));
    const arrowCount = arrows ?? (indoor ? 60 : 72);
    // Around 85 % of the maximum (10 points per arrow), rising slightly through the season.
    const average = 8.2 + 0.6 * progress + random.int(-6, 6) / 10;
    return {
      location: random.pick(indoor ? INDOOR_LOCATIONS : OUTDOOR_LOCATIONS),
      discipline: indoor ? Discipline.INDOOR : Discipline.TAE_INTERNATIONAL,
      distanceMeters: indoor ? 18 : 70,
      arrowCount,
      score: withScore ? Math.round(arrowCount * average) : null,
      satisfaction: mark(),
      technique: mark(),
      physicalFeeling: feeling(),
      mentalFeeling: feeling(),
    };
  };

  const base = { userId: user.id, wentWell: [], toImprove: [] };
  const events: Prisma.JournalSessionCreateManyInput[] = [];
  const coachingMonths = new Set<string>();
  for (let time = journal.startDate.getTime(); time <= journal.endDate.getTime(); time += DAY_MS) {
    const date = new Date(time);
    switch (date.getUTCDay()) {
      case SATURDAY:
        events.push({
          ...base,
          ...sheet(date, true),
          type: SessionType.COMPETITION,
          date,
          startTime: '09:00',
          durationMinutes: 240,
        });
        break;
      case WEDNESDAY:
        events.push({
          ...base,
          // Training volume varies more than a competition round; scored one time out of two.
          ...sheet(date, random.chance(0.5), random.int(8, 20) * 6),
          type: SessionType.TRAINING,
          date,
          startTime: '18:30',
          durationMinutes: 90,
        });
        break;
      case SUNDAY:
        // Strength work has no sheet: a slot in the calendar.
        events.push({
          ...base,
          type: SessionType.STRENGTH,
          date,
          startTime: '10:00',
          durationMinutes: 45,
        });
        break;
      case MONDAY: {
        // First Monday of each month.
        const month = date.toISOString().slice(0, 7);
        if (coachingMonths.has(month)) break;
        coachingMonths.add(month);
        events.push({
          ...base,
          ...sheet(date, false),
          type: SessionType.COACHING,
          date,
          startTime: '18:00',
          durationMinutes: 60,
        });
        break;
      }
    }
  }

  const [deleted] = await prisma.$transaction([
    prisma.journalSession.deleteMany({ where: inJournal }),
    prisma.journalSession.createMany({ data: events }),
  ]);

  const day = (date: Date) => date.toISOString().slice(0, 10);
  console.log(
    `Journal "${journal.title}" (${day(journal.startDate)} → ${day(journal.endDate)}) of ${email}`,
  );
  if (deleted.count > 0) console.log(`  ${deleted.count} existing event(s) deleted`);
  for (const type of Object.values(SessionType)) {
    const count = events.filter((event) => event.type === type).length;
    if (count > 0) console.log(`  ${String(count).padStart(3)} ${type}`);
  }
  console.log(`  ${events.length} events created`);
} catch (error) {
  console.error((error as Error).message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
