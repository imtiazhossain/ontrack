import {
  EXERCISES_BY_ID,
  MUSCLE_GROUPS,
  MUSCLE_TARGETS_BY_GROUP,
} from '../muscle-data';

describe('muscle map data', () => {
  it('provides unique body regions with detailed muscles and exercise options', () => {
    const keys = MUSCLE_GROUPS.map((group) => group.key);

    expect(new Set(keys).size).toBe(keys.length);
    expect(MUSCLE_GROUPS.some((group) => group.view === 'front')).toBe(true);
    expect(MUSCLE_GROUPS.some((group) => group.view === 'back')).toBe(true);

    for (const group of MUSCLE_GROUPS) {
      expect(group.muscles.length).toBeGreaterThan(0);
      expect(group.exercises).toHaveLength(3);

      const targets = MUSCLE_TARGETS_BY_GROUP[group.key];
      expect(targets.length).toBeGreaterThan(0);
      for (const target of targets) {
        expect(target.highlightAreas.length).toBeGreaterThan(0);
        expect(target.exercises).toHaveLength(3);
        expect(target.description.length).toBeGreaterThan(20);
        expect(target.cue.length).toBeGreaterThan(20);
      }
    }
  });

  it('keeps a complete exercise catalog for every individual muscle target', () => {
    const exerciseIds = Object.keys(EXERCISES_BY_ID);

    expect(new Set(exerciseIds).size).toBe(exerciseIds.length);

    for (const targets of Object.values(MUSCLE_TARGETS_BY_GROUP)) {
      for (const target of targets) {
        for (const exercise of target.exercises) {
          expect(EXERCISES_BY_ID[exercise.id]).toBe(exercise);
        }
      }
    }
  });
});
