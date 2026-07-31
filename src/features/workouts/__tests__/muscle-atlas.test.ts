import {
  MUSCLE_ATLAS,
  MUSCLE_ATLAS_CATEGORIES,
  musclesInCategory,
} from '../muscle-atlas';
import { hasHighlightImage } from '../muscle-highlight-images';
import { resolveAtlasWorkoutSelection } from '../atlas-workout-selection';

describe('muscle atlas', () => {
  it('lists only muscles with body-plate highlight art', () => {
    expect(MUSCLE_ATLAS_CATEGORIES.length).toBe(9);
    expect(MUSCLE_ATLAS.length).toBeGreaterThan(20);

    const ids = MUSCLE_ATLAS.map((muscle) => muscle.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const category of MUSCLE_ATLAS_CATEGORIES) {
      const muscles = musclesInCategory(category.id);
      expect(muscles.length).toBeGreaterThan(0);
      for (const muscle of muscles) {
        expect(muscle.function.length).toBeGreaterThan(20);
        expect(muscle.categoryId).toBe(category.id);
        expect(muscle.highlightId).toBeTruthy();
        expect(hasHighlightImage(muscle.highlightId)).toBe(true);
      }
    }
  });

  it('resolves workout suggestions for training-linked muscles', () => {
    const pecs = resolveAtlasWorkoutSelection(
      MUSCLE_ATLAS.find((muscle) => muscle.id === 'pectoralis-major')!,
    );
    expect(pecs.exercises.length).toBe(3);
    expect(pecs.functionText.toLowerCase()).toContain('arm');
    expect(pecs.highlightMuscleId).toBe('pectoralis-major');
    expect(pecs.highlightIsProxy).toBe(false);
  });

  it('uses exact plate art for every listed muscle', () => {
    for (const muscle of MUSCLE_ATLAS) {
      const selection = resolveAtlasWorkoutSelection(muscle);
      expect(selection.highlightMuscleId).toBe(muscle.highlightId);
      expect(selection.highlightIsProxy).toBe(false);
    }
  });
});
