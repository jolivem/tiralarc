import type { StrengthStep } from '@tiralarc/api-client';

export type StrengthMeasure = StrengthStep['measure'];
export type StrengthLoad = StrengthStep['load'];

/** The catalogue's areas, in the guide's order. Names: `strength.zones.<zone>`. */
export const STRENGTH_ZONES = ['CORE', 'SHOULDERS', 'BACK', 'ARMS', 'LEGS', 'ARCHERY'] as const;
export type StrengthZone = (typeof STRENGTH_ZONES)[number];

export interface StrengthExercise {
  /** Stored with the step (`exercise`); its name: `strength.exercises.<id>`. */
  id: string;
  zone: StrengthZone;
  /** What the guide proposes first when it is picked. */
  measure: StrengthMeasure;
  amount: number;
  load: StrengthLoad;
  loadKg?: number;
}

/**
 * Exercises useful to an archer, by area (fixed: a new one = an entry here and its name in both
 * message files). The archer may also type one that isn't listed.
 */
export const STRENGTH_EXERCISES = [
  // Core
  { id: 'PLANK_FRONT', zone: 'CORE', measure: 'SECONDS', amount: 30, load: 'BODYWEIGHT' },
  { id: 'PLANK_SIDE', zone: 'CORE', measure: 'SECONDS', amount: 20, load: 'BODYWEIGHT' },
  { id: 'DEAD_BUG', zone: 'CORE', measure: 'REPS', amount: 10, load: 'BODYWEIGHT' },
  { id: 'BIRD_DOG', zone: 'CORE', measure: 'REPS', amount: 10, load: 'BODYWEIGHT' },
  { id: 'CRUNCH', zone: 'CORE', measure: 'REPS', amount: 15, load: 'BODYWEIGHT' },
  { id: 'SUPERMAN', zone: 'CORE', measure: 'REPS', amount: 12, load: 'BODYWEIGHT' },
  { id: 'PALLOF_PRESS', zone: 'CORE', measure: 'REPS', amount: 10, load: 'BAND_MEDIUM' },
  // Shoulders
  { id: 'EXTERNAL_ROTATION', zone: 'SHOULDERS', measure: 'REPS', amount: 15, load: 'BAND_LIGHT' },
  { id: 'INTERNAL_ROTATION', zone: 'SHOULDERS', measure: 'REPS', amount: 15, load: 'BAND_LIGHT' },
  { id: 'LATERAL_RAISE', zone: 'SHOULDERS', measure: 'REPS', amount: 12, load: 'KG', loadKg: 2 },
  { id: 'FRONT_RAISE', zone: 'SHOULDERS', measure: 'REPS', amount: 12, load: 'KG', loadKg: 2 },
  { id: 'FACE_PULL', zone: 'SHOULDERS', measure: 'REPS', amount: 15, load: 'BAND_MEDIUM' },
  { id: 'Y_T_W', zone: 'SHOULDERS', measure: 'REPS', amount: 10, load: 'BODYWEIGHT' },
  { id: 'SHOULDER_PRESS', zone: 'SHOULDERS', measure: 'REPS', amount: 10, load: 'KG', loadKg: 5 },
  // Back
  { id: 'BAND_ROW', zone: 'BACK', measure: 'REPS', amount: 15, load: 'BAND_MEDIUM' },
  { id: 'DUMBBELL_ROW', zone: 'BACK', measure: 'REPS', amount: 10, load: 'KG', loadKg: 8 },
  { id: 'BAND_PULL_APART', zone: 'BACK', measure: 'REPS', amount: 15, load: 'BAND_LIGHT' },
  { id: 'REVERSE_FLY', zone: 'BACK', measure: 'REPS', amount: 12, load: 'KG', loadKg: 2 },
  { id: 'PULL_UP', zone: 'BACK', measure: 'REPS', amount: 6, load: 'BODYWEIGHT' },
  // Arms
  { id: 'PUSH_UP', zone: 'ARMS', measure: 'REPS', amount: 10, load: 'BODYWEIGHT' },
  { id: 'TRICEPS_DIP', zone: 'ARMS', measure: 'REPS', amount: 10, load: 'BODYWEIGHT' },
  { id: 'BICEPS_CURL', zone: 'ARMS', measure: 'REPS', amount: 12, load: 'KG', loadKg: 5 },
  { id: 'WRIST_CURL', zone: 'ARMS', measure: 'REPS', amount: 15, load: 'KG', loadKg: 2 },
  { id: 'FARMER_CARRY', zone: 'ARMS', measure: 'SECONDS', amount: 30, load: 'KG', loadKg: 10 },
  // Legs
  { id: 'SQUAT', zone: 'LEGS', measure: 'REPS', amount: 15, load: 'BODYWEIGHT' },
  { id: 'LUNGE', zone: 'LEGS', measure: 'REPS', amount: 10, load: 'BODYWEIGHT' },
  { id: 'WALL_SIT', zone: 'LEGS', measure: 'SECONDS', amount: 45, load: 'BODYWEIGHT' },
  { id: 'CALF_RAISE', zone: 'LEGS', measure: 'REPS', amount: 20, load: 'BODYWEIGHT' },
  { id: 'GLUTE_BRIDGE', zone: 'LEGS', measure: 'REPS', amount: 15, load: 'BODYWEIGHT' },
  { id: 'SINGLE_LEG_BALANCE', zone: 'LEGS', measure: 'SECONDS', amount: 30, load: 'BODYWEIGHT' },
  // Archery
  { id: 'ANCHOR_HOLD', zone: 'ARCHERY', measure: 'SECONDS', amount: 20, load: 'BODYWEIGHT' },
  { id: 'BAND_DRAW', zone: 'ARCHERY', measure: 'REPS', amount: 15, load: 'BAND_MEDIUM' },
  { id: 'SCAPULAR_SETTING', zone: 'ARCHERY', measure: 'REPS', amount: 12, load: 'BAND_LIGHT' },
  { id: 'BOW_ARM_HOLD', zone: 'ARCHERY', measure: 'SECONDS', amount: 30, load: 'KG', loadKg: 2 },
] as const satisfies readonly StrengthExercise[];

/** A catalogue exercise's id (its name: `strength.exercises.<id>`). */
export type ExerciseId = (typeof STRENGTH_EXERCISES)[number]['id'];

/** What the guide offers in one click, for each choice (any other value can be typed). */
export const SUGGESTIONS = {
  sets: [1, 2, 3, 4, 5],
  REPS: [5, 8, 10, 12, 15, 20],
  SECONDS: [10, 15, 20, 30, 45, 60, 90],
  kg: [1, 2, 3, 5, 8, 10, 15, 20],
  /** Seconds between two sets. */
  rest: [30, 45, 60, 90, 120],
} as const;

export const STRENGTH_LOADS: readonly StrengthLoad[] = [
  'BODYWEIGHT',
  'KG',
  'BAND_LIGHT',
  'BAND_MEDIUM',
  'BAND_STRONG',
];
export const MEASURES: readonly StrengthMeasure[] = ['REPS', 'SECONDS'];
/** As many as the API takes. */
export const MAX_STRENGTH_STEPS = 30;

export const exerciseById = (id: string | null) =>
  STRENGTH_EXERCISES.find((exercise) => exercise.id === id) as
    ((typeof STRENGTH_EXERCISES)[number] & StrengthExercise) | undefined;

/** A new step for `exercise`, with its usual figures (3 sets, 60 s rest). */
export function stepFor(exercise: StrengthExercise, name: string): StrengthStep {
  return {
    exercise: exercise.id,
    name,
    sets: 3,
    measure: exercise.measure,
    amount: exercise.amount,
    load: exercise.load,
    loadKg: exercise.load === 'KG' ? (exercise.loadKg ?? 5) : null,
    restSeconds: 60,
    note: '',
    done: false,
  };
}

/** 45 → "45 s", 60 → "1 min", 90 → "1 min 30". */
export function durationLabel(seconds: number): string {
  if (seconds < 60) return `${seconds} s`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest === 0 ? `${minutes} min` : `${minutes} min ${String(rest).padStart(2, '0')}`;
}

/** "3 × 12" or "3 × 30 s": the sets and what each counts. */
export function volumeLabel(step: Pick<StrengthStep, 'sets' | 'measure' | 'amount'>): string {
  return `${step.sets} × ${step.measure === 'SECONDS' ? durationLabel(step.amount) : step.amount}`;
}

/** How long a repetition takes, roughly (lowering and lifting): to time an exercise in reps. */
export const SECONDS_PER_REP = 3;

/**
 * A programme's length, in seconds: each exercise's sets (timed ones as written, the others at
 * `SECONDS_PER_REP` a repetition) and the rests between them (none after the last set).
 */
export function programmeSeconds(steps: StrengthStep[]): number {
  return steps.reduce(
    (sum, step) =>
      sum +
      step.sets * (step.measure === 'SECONDS' ? step.amount : step.amount * SECONDS_PER_REP) +
      (step.restSeconds ?? 0) * Math.max(0, step.sets - 1),
    0,
  );
}

/** The programme's length in whole minutes (rounded up); null for an empty one. */
export function programmeMinutes(steps: StrengthStep[]): number | null {
  return steps.length === 0 ? null : Math.max(1, Math.ceil(programmeSeconds(steps) / 60));
}

/** `steps` with the one at `index` moved by `by` places (-1 up, 1 down); unchanged at an end. */
export function moveItem<T>(items: T[], index: number, by: -1 | 1): T[] {
  const target = index + by;
  if (target < 0 || target >= items.length) return items;
  const moved = [...items];
  [moved[index], moved[target]] = [moved[target]!, moved[index]!];
  return moved;
}
