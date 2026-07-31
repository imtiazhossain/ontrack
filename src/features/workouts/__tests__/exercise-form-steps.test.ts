import { formStepsForExercise } from '../exercise-form-steps';
import { EXERCISES_BY_ID, MUSCLE_TARGETS_BY_GROUP } from '../muscle-data';

describe('exercise form steps', () => {
  it('returns form cues for every catalogued exercise', () => {
    const seen = new Set<string>();
    for (const targets of Object.values(MUSCLE_TARGETS_BY_GROUP)) {
      for (const target of targets) {
        for (const exercise of target.exercises) {
          if (seen.has(exercise.id)) continue;
          seen.add(exercise.id);
          const steps = formStepsForExercise(exercise, target);
          expect(steps.length).toBeGreaterThanOrEqual(4);
          expect(steps.every((step) => step.title && step.cue)).toBe(true);
        }
      }
    }
    expect(seen.size).toBeGreaterThan(30);
  });

  it('keeps bench-press overrides', () => {
    const bench = EXERCISES_BY_ID['bench-press'];
    const pec = MUSCLE_TARGETS_BY_GROUP.chest.find((t) => t.id === 'pectoralis-major')!;
    const steps = formStepsForExercise(bench, pec);
    expect(steps.map((s) => s.id)).toEqual(['setup', 'unrack', 'lower', 'bottom', 'press']);
  });
});
