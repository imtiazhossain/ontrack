import { formatMuscleLabel } from '../format-muscle-label';

describe('formatMuscleLabel', () => {
  it('title-cases multi-word anatomy names', () => {
    expect(formatMuscleLabel('Biceps brachii')).toBe('Biceps Brachii');
    expect(formatMuscleLabel('anterior deltoid')).toBe('Anterior Deltoid');
    expect(formatMuscleLabel('Latissimus dorsi')).toBe('Latissimus Dorsi');
  });

  it('keeps separators while capitalizing words', () => {
    expect(formatMuscleLabel('Internal & external obliques')).toBe(
      'Internal & External Obliques',
    );
    expect(formatMuscleLabel('Lumbricals (hand)')).toBe('Lumbricals (Hand)');
  });
});
