import { exerciseLoadKind, filterExercisesByLoadKind } from '../exercise-load';
import type { ExerciseTemplate } from '../muscle-data';

function stub(equipment: string): ExerciseTemplate {
  return {
    id: equipment,
    name: equipment,
    icon: 'dumbbell.fill',
    equipment,
    sets: 3,
    reps: 10,
    restSeconds: 60,
  };
}

describe('exerciseLoadKind', () => {
  it('classifies bodyweight equipment', () => {
    expect(exerciseLoadKind(stub('Bodyweight'))).toBe('bodyweight');
    expect(exerciseLoadKind(stub('Pull-up bar'))).toBe('bodyweight');
    expect(exerciseLoadKind(stub('Jump rope'))).toBe('bodyweight');
    expect(exerciseLoadKind(stub('Sliders'))).toBe('bodyweight');
  });

  it('classifies loaded equipment as weighted', () => {
    expect(exerciseLoadKind(stub('Barbell'))).toBe('weighted');
    expect(exerciseLoadKind(stub('Dumbbells'))).toBe('weighted');
    expect(exerciseLoadKind(stub('Cable'))).toBe('weighted');
    expect(exerciseLoadKind(stub('Machine'))).toBe('weighted');
    expect(exerciseLoadKind(stub('Resistance band'))).toBe('weighted');
    expect(exerciseLoadKind(stub('Dip station'))).toBe('weighted');
  });
});

describe('filterExercisesByLoadKind', () => {
  const catalog = [
    stub('Bodyweight'),
    stub('Barbell'),
    stub('Pull-up bar'),
    stub('Cable'),
  ];

  it('filters bodyweight and weighted lists', () => {
    expect(filterExercisesByLoadKind(catalog, 'bodyweight').map((e) => e.equipment)).toEqual([
      'Bodyweight',
      'Pull-up bar',
    ]);
    expect(filterExercisesByLoadKind(catalog, 'weighted').map((e) => e.equipment)).toEqual([
      'Barbell',
      'Cable',
    ]);
  });
});
