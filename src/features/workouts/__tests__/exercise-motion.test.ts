import { movementPatternForExercise, muscleHitsForExercise } from '../exercise-motion';
import { MUSCLE_GROUPS, MUSCLE_TARGETS_BY_GROUP } from '../muscle-data';

describe('exercise anatomy motion', () => {
  it('assigns every targeted exercise a specific movement pattern', () => {
    for (const group of MUSCLE_GROUPS) {
      for (const target of MUSCLE_TARGETS_BY_GROUP[group.key]) {
        for (const exercise of target.exercises) {
          expect(movementPatternForExercise(exercise)).not.toBe('isolation');
        }
      }
    }
  });

  it('keeps the selected muscle primary and removes duplicate supporting hits', () => {
    for (const group of MUSCLE_GROUPS) {
      for (const target of MUSCLE_TARGETS_BY_GROUP[group.key]) {
        for (const exercise of target.exercises) {
          const hits = muscleHitsForExercise(exercise, group.key);

          expect(hits[0]).toBe(group.key);
          expect(new Set(hits).size).toBe(hits.length);
        }
      }
    }
  });

  it.each([
    ['bench-press', 'chest', ['chest', 'triceps', 'shoulders', 'core']],
    ['romanian-deadlift', 'hamstrings', ['hamstrings', 'glutes', 'lower-back', 'core']],
    ['lat-pulldown', 'lats', ['lats', 'upper-back', 'biceps', 'core']],
  ] as const)('highlights the expected groups for %s', (id, primaryGroup, expected) => {
    expect(muscleHitsForExercise({ id }, primaryGroup)).toEqual(expected);
  });
});
