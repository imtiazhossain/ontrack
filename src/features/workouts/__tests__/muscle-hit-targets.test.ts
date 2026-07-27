import { muscleAtPoint } from '../muscle-hit-targets';

describe('muscleAtPoint', () => {
  it.each([
    ['shoulders', 77, 79],
    ['chest', 100, 100],
    ['biceps', 64, 124],
    ['core', 110, 150],
    ['quadriceps', 90, 230],
  ] as const)('maps a front body tap to %s', (muscle, x, y) => {
    expect(muscleAtPoint('front', x, y)).toBe(muscle);
  });

  it.each([
    ['upper-back', 110, 80],
    ['triceps', 63, 127],
    ['lats', 90, 140],
    ['lower-back', 110, 175],
    ['glutes', 95, 210],
    ['hamstrings', 90, 250],
    ['calves', 90, 310],
  ] as const)('maps a back body tap to %s', (muscle, x, y) => {
    expect(muscleAtPoint('back', x, y)).toBe(muscle);
  });

  it('ignores taps outside the body regions', () => {
    expect(muscleAtPoint('front', 10, 10)).toBeUndefined();
  });
});
