import { describe, expect, it } from 'vitest';
import en from '../../messages/en.json';
import fr from '../../messages/fr.json';
import {
  durationLabel,
  exerciseById,
  moveItem,
  programmeMinutes,
  programmeSeconds,
  STRENGTH_EXERCISES,
  STRENGTH_ZONES,
  stepFor,
  volumeLabel,
} from './strength';

describe('strength guide', () => {
  it('words durations and volumes', () => {
    expect(durationLabel(45)).toBe('45 s');
    expect(durationLabel(60)).toBe('1 min');
    expect(durationLabel(90)).toBe('1 min 30');
    expect(durationLabel(125)).toBe('2 min 05');
    expect(volumeLabel({ sets: 3, measure: 'REPS', amount: 12 })).toBe('3 × 12');
    expect(volumeLabel({ sets: 4, measure: 'SECONDS', amount: 30 })).toBe('4 × 30 s');
  });

  it('starts a step with the exercise’s usual figures', () => {
    const plank = exerciseById('PLANK_FRONT')!;
    expect(stepFor(plank, 'Gainage face')).toEqual({
      exercise: 'PLANK_FRONT',
      name: 'Gainage face',
      sets: 3,
      measure: 'SECONDS',
      amount: 30,
      load: 'BODYWEIGHT',
      loadKg: null,
      restSeconds: 60,
      note: '',
      done: false,
    });
    expect(stepFor(exerciseById('BICEPS_CURL')!, 'Curl').loadKg).toBe(5);
  });

  it('names and explains every exercise in both languages', () => {
    for (const messages of [fr, en]) {
      const { exercises, howTo } = messages.strength as {
        exercises: Record<string, string>;
        howTo: Record<string, { description: string; tips: string }>;
      };
      for (const { id } of STRENGTH_EXERCISES) {
        expect(exercises[id], id).toBeTruthy();
        expect(howTo[id]?.description, id).toBeTruthy();
        // At least two tips, one a line.
        expect(howTo[id]?.tips.split('\n').length, id).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('has a unique id and a known area for every exercise', () => {
    const ids = STRENGTH_EXERCISES.map((exercise) => exercise.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const exercise of STRENGTH_EXERCISES) {
      expect(STRENGTH_ZONES).toContain(exercise.zone);
      expect(exercise.id).toMatch(/^[A-Z][A-Z0-9_]{1,39}$/);
    }
  });

  it('times a programme: the sets, 3 s a repetition, the rests between sets', () => {
    const plank = stepFor(exerciseById('PLANK_FRONT')!, 'Gainage');
    const curl = { ...stepFor(exerciseById('BICEPS_CURL')!, 'Curl'), restSeconds: null };
    // Plank: 3 × 30 s + 2 rests of 60 s; curl: 3 × 12 reps × 3 s, no rest given.
    expect(programmeSeconds([plank, curl])).toBe(90 + 120 + 108);
    expect(programmeMinutes([plank, curl])).toBe(6);
    expect(programmeMinutes([])).toBeNull();
    // Never 0 minutes for a programme.
    expect(programmeMinutes([{ ...curl, sets: 1, amount: 1 }])).toBe(1);
  });

  it('moves an item within the list only', () => {
    expect(moveItem(['a', 'b', 'c'], 0, 1)).toEqual(['b', 'a', 'c']);
    expect(moveItem(['a', 'b', 'c'], 0, -1)).toEqual(['a', 'b', 'c']);
    expect(moveItem(['a', 'b', 'c'], 2, 1)).toEqual(['a', 'b', 'c']);
  });
});
