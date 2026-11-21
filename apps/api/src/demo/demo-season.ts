/**
 * The example journal's made-up season, around today (pure, deterministic, unit-tested): from
 * September to August, trainings on Wednesdays and Saturdays, strength work on Fridays, a coaching
 * the first Monday of the month and a competition every other Sunday in the indoor and outdoor
 * seasons. Days gone have their review (scores slowly getting better), those to come their plan;
 * the last week's trainings are left to complete. Written in the visitor's language.
 */

export type DemoLocale = 'fr' | 'en';

export interface DemoSession {
  type: 'TRAINING' | 'COACHING' | 'COMPETITION' | 'STRENGTH';
  /** "YYYY-MM-DD". */
  date: string;
  durationMinutes: number | null;
  location: string | null;
  discipline: 'INDOOR' | 'TAE_INTERNATIONAL' | null;
  distanceMeters: number | null;
  arrowCount: number | null;
  score: number | null;
  objective: string | null;
  steps:
    | {
        unit: 'MINUTES' | 'ARROWS';
        amount: number;
        target: 'STRAW' | 'VISUAL' | 'FACE';
        description: string;
        done: boolean;
      }[]
    | null;
  sky: 'SUNNY' | 'PARTLY_CLOUDY' | 'CLOUDY' | 'RAINY' | null;
  wind: 'CALM' | 'LIGHT' | 'MODERATE' | 'STRONG' | null;
  temperatureC: number | null;
  satisfaction: number | null;
  technique: number | null;
  description: string | null;
  physicalFeeling: 'GREAT' | 'OK' | 'BAD' | 'EXHAUSTED' | null;
  mentalFeeling: 'GREAT' | 'OK' | 'BAD' | 'EXHAUSTED' | null;
  wentWell: string[];
  toImprove: string[];
  nextTime: string | null;
}

export interface DemoGoal {
  type: 'SPORT' | 'TECHNIQUE' | 'PHYSICAL' | 'PERSONAL';
  description: string;
  createdOn: string;
  achievedOn: string | null;
  metric: 'SCORE' | 'ARROWS' | null;
  target: number | null;
  discipline: 'INDOOR' | null;
  distanceMeters: number | null;
}

export interface DemoSeason {
  journal: {
    title: string;
    startDate: string;
    endDate: string;
    monthThemes: Record<string, string>;
    monthSatisfactions: Record<string, number>;
  };
  sessions: DemoSession[];
  goals: DemoGoal[];
}

const DAY_MS = 86_400_000;
/** How far the plan goes beyond today. */
const PLANNED_DAYS = 28;
/** The last days' trainings left without a review ("À compléter"). */
const TO_COMPLETE_DAYS = 5;
/** A decoration per month of the season (the web's theme ids). */
const THEMES: Record<number, string> = {
  9: 'rentree',
  10: 'halloween',
  11: 'automne',
  12: 'noel',
  1: 'nouvelan',
  2: 'valentin',
  3: 'printemps',
  4: 'cerisier',
  5: 'fruits',
  6: 'ete',
  7: 'ete',
  8: 'archery',
};

const TEXT = {
  fr: {
    title: (from: number) => `Saison ${from}-${from + 1}`,
    club: 'Gymnase du club',
    field: 'Terrain du club',
    towns: ['Rennes', 'Vitré', 'Saint-Malo', 'Fougères', 'Lorient', 'Vannes'],
    objectives: {
      TRAINING: [
        'Travailler la tenue en fin de volée',
        'Régularité du lâcher',
        'Volume : tenir 90 flèches',
        'Placement du dos',
      ],
      COACHING: ['Vidéo de la ligne de tir', 'Réglage du viseur', 'Routine de tir'],
      COMPETITION: ['Rester dans ma routine', 'Gérer les deux premières volées'],
    },
    steps: [
      'Échauffement et élastique',
      'Volées courtes à la paille',
      'Volées de 3 flèches au blason',
      'Tir compté',
      'Étirements',
    ],
    wentWell: [
      'Bonne routine',
      'Lâcher détendu',
      'Groupements serrés',
      'Bonne concentration',
      'Ancrage régulier',
    ],
    toImprove: [
      'Fin de volée plus tenue',
      'Respiration avant le tir',
      'Suivi du bras d’arc',
      'Patience au viseur',
    ],
    descriptions: [
      'Bonne séance, les sensations reviennent.',
      'Un peu fatigué(e) au début, mieux sur la fin.',
      'Les groupements se resserrent, à confirmer.',
      'Séance technique, peu de score mais de bonnes sensations.',
    ],
    nextTime: [
      'Garder la même routine.',
      'Travailler le placement du dos.',
      'Plus de volées comptées.',
    ],
    goals: {
      score: '560 points à 18 m',
      arrows: '10 000 flèches cette saison',
      technique: 'Une routine de tir stable',
      personal: 'Participer au championnat départemental',
    },
  },
  en: {
    title: (from: number) => `Season ${from}-${from + 1}`,
    club: 'Club hall',
    field: 'Club field',
    towns: ['Rennes', 'Vitré', 'Saint-Malo', 'Fougères', 'Lorient', 'Vannes'],
    objectives: {
      TRAINING: [
        'Hold through the end of each end',
        'A steady release',
        'Volume: 90 arrows',
        'Back tension',
      ],
      COACHING: ['Video of the shooting line', 'Sight adjustments', 'Shot routine'],
      COMPETITION: ['Stick to my routine', 'Handle the first two ends'],
    },
    steps: [
      'Warm-up and band',
      'Short ends at the straw',
      'Ends of 3 arrows at the face',
      'Scored round',
      'Stretching',
    ],
    wentWell: ['Good routine', 'Relaxed release', 'Tight groups', 'Good focus', 'Steady anchor'],
    toImprove: [
      'Hold the end better',
      'Breathing before the shot',
      'Bow arm follow-through',
      'Patience on the sight',
    ],
    descriptions: [
      'Good session, the feeling is coming back.',
      'A bit tired at first, better at the end.',
      'Groups getting tighter, to confirm.',
      'Technical session: not much score but a good feeling.',
    ],
    nextTime: ['Keep the same routine.', 'Work on back tension.', 'More scored ends.'],
    goals: {
      score: '560 points at 18 m',
      arrows: '10,000 arrows this season',
      technique: 'A steady shot routine',
      personal: 'Take part in the county championship',
    },
  },
} as const;

/** Deterministic pseudo-random numbers (mulberry32): the same season for the same day. */
function random(seed: number) {
  let state = seed;
  const next = () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
  return {
    int: (min: number, max: number) => min + Math.floor(next() * (max - min + 1)),
    pick: <T>(items: readonly T[]): T => items[Math.floor(next() * items.length)] as T,
    chance: (p: number) => next() < p,
  };
}

const iso = (time: number) => new Date(time).toISOString().slice(0, 10);
const parse = (day: string) => Date.parse(`${day}T00:00:00Z`);

/** The season (September to August) that today belongs to, and its sessions. */
export function demoSeason(today: string, locale: DemoLocale): DemoSeason {
  const t = TEXT[locale];
  const year = Number(today.slice(0, 4));
  const from = Number(today.slice(5, 7)) >= 9 ? year : year - 1;
  const startDate = `${from}-09-01`;
  const endDate = `${from + 1}-08-31`;
  const r = random(from);
  const start = parse(startDate);
  const end = Math.min(parse(endDate), parse(today) + PLANNED_DAYS * DAY_MS);
  const todayTime = parse(today);
  const seasonLength = parse(endDate) - start;

  const sessions: DemoSession[] = [];
  let sundays = 0;
  for (let time = start; time <= end; time += DAY_MS) {
    const date = new Date(time);
    const day = iso(time);
    const weekday = date.getUTCDay();
    const month = date.getUTCMonth() + 1;
    const indoor = month >= 9 || month <= 3;
    const past = time < todayTime;
    // How far into the season: the scores get better along it.
    const progress = (time - start) / seasonLength;
    if (weekday === 0) sundays += 1;

    let type: DemoSession['type'] | null = null;
    if (weekday === 3 || weekday === 6) type = 'TRAINING';
    else if (weekday === 5) type = 'STRENGTH';
    else if (weekday === 1 && date.getUTCDate() <= 7) type = 'COACHING';
    else if (
      weekday === 0 &&
      sundays % 2 === 0 &&
      (month >= 11 || month <= 2 || (month >= 5 && month <= 7))
    ) {
      type = 'COMPETITION';
    }
    if (!type) continue;

    if (type === 'STRENGTH') {
      sessions.push(blank(type, day, { durationMinutes: 45 }));
      continue;
    }
    const discipline = indoor ? 'INDOOR' : 'TAE_INTERNATIONAL';
    const distanceMeters = indoor ? 18 : 70;
    const location = type === 'COMPETITION' ? r.pick(t.towns) : indoor ? t.club : t.field;
    const arrows = type === 'COMPETITION' ? (indoor ? 60 : 72) : r.int(5, 15) * 6;
    const plan = {
      durationMinutes: type === 'COMPETITION' ? 240 : r.int(6, 10) * 15,
      location,
      discipline,
      distanceMeters,
      objective: r.pick(t.objectives[type]),
    } as const;
    const steps =
      type === 'COMPETITION'
        ? null
        : t.steps.map((description, i) => ({
            unit: (i === 2 || i === 3 ? 'ARROWS' : 'MINUTES') as 'ARROWS' | 'MINUTES',
            amount: i === 2 ? 36 : i === 3 ? 30 : 15,
            target: (i === 1 ? 'STRAW' : i === 0 || i === 4 ? 'VISUAL' : 'FACE') as
              'STRAW' | 'VISUAL' | 'FACE',
            description,
            done: past,
          }));
    const toComplete = past && type === 'TRAINING' && todayTime - time <= TO_COMPLETE_DAYS * DAY_MS;
    if (!past || toComplete) {
      sessions.push({
        ...blank(type, day, plan),
        steps: steps?.map((s) => ({ ...s, done: false })) ?? null,
      });
      continue;
    }
    // A score per arrow from ~8.7 to ~9.4 indoors (60 arrows at 18 m), lower outdoors at 70 m.
    const perArrow = (indoor ? 8.7 : 8.1) + progress * 0.8 + r.int(-20, 20) / 100;
    sessions.push({
      ...blank(type, day, plan),
      steps,
      arrowCount: arrows,
      // Every arrow scored: the average per arrow (score / arrows) stays as made up above.
      score: Math.min(Math.round(perArrow * arrows), arrows * 10),
      sky: indoor ? null : r.pick(['SUNNY', 'PARTLY_CLOUDY', 'CLOUDY', 'RAINY'] as const),
      wind: indoor ? null : r.pick(['CALM', 'LIGHT', 'LIGHT', 'MODERATE'] as const),
      temperatureC: indoor ? null : r.int(12, 27),
      satisfaction: r.int(5, 9),
      technique: r.int(5, 9),
      description: r.pick(t.descriptions),
      physicalFeeling: r.pick(['GREAT', 'OK', 'OK', 'BAD'] as const),
      mentalFeeling: r.pick(['GREAT', 'GREAT', 'OK', 'BAD'] as const),
      wentWell: [r.pick(t.wentWell), r.pick(t.wentWell)].filter(
        (v, i, all) => all.indexOf(v) === i,
      ),
      toImprove: [r.pick(t.toImprove)],
      nextTime: r.pick(t.nextTime),
    });
  }

  const monthThemes: Record<string, string> = {};
  const monthSatisfactions: Record<string, number> = {};
  for (let m = 0; m < 12; m++) {
    const month = ((8 + m) % 12) + 1;
    const key = `${month >= 9 ? from : from + 1}-${String(month).padStart(2, '0')}`;
    if (`${key}-01` > iso(end)) break;
    monthThemes[key] = THEMES[month]!;
    if (`${key}-31` < today) monthSatisfactions[key] = r.int(6, 9) / 2;
  }

  const achieved = iso(start + 50 * DAY_MS);
  return {
    journal: { title: t.title(from), startDate, endDate, monthThemes, monthSatisfactions },
    sessions,
    goals: [
      {
        type: 'SPORT',
        description: t.goals.score,
        createdOn: startDate,
        achievedOn: null,
        metric: 'SCORE',
        target: 560,
        discipline: 'INDOOR',
        distanceMeters: 18,
      },
      {
        type: 'PHYSICAL',
        description: t.goals.arrows,
        createdOn: startDate,
        achievedOn: null,
        metric: 'ARROWS',
        target: 10_000,
        discipline: null,
        distanceMeters: null,
      },
      {
        type: 'TECHNIQUE',
        description: t.goals.technique,
        createdOn: startDate,
        achievedOn: achieved < today ? achieved : null,
        metric: null,
        target: null,
        discipline: null,
        distanceMeters: null,
      },
      {
        type: 'PERSONAL',
        description: t.goals.personal,
        createdOn: startDate,
        achievedOn: null,
        metric: null,
        target: null,
        discipline: null,
        distanceMeters: null,
      },
    ],
  };
}

/** A session without review (its plan only). */
function blank(type: DemoSession['type'], date: string, plan: Partial<DemoSession>): DemoSession {
  return {
    type,
    date,
    durationMinutes: null,
    location: null,
    discipline: null,
    distanceMeters: null,
    arrowCount: null,
    score: null,
    objective: null,
    steps: null,
    sky: null,
    wind: null,
    temperatureC: null,
    satisfaction: null,
    technique: null,
    description: null,
    physicalFeeling: null,
    mentalFeeling: null,
    wentWell: [],
    toImprove: [],
    nextTime: null,
    ...plan,
  };
}
