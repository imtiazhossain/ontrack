import { hitBoxAtPoint, muscleAtPoint } from '../muscle-hit-targets';

describe('muscle hit boxes', () => {
  it.each([
    ['shoulders', 32, 44],
    ['shoulders', 68, 44],
    ['chest', 50, 46],
    ['biceps', 30, 56],
    ['biceps', 70, 56],
    ['core', 50, 68],
    ['quadriceps', 38, 106],
    ['quadriceps', 60, 106],
    ['calves', 38, 132],
    ['calves', 60, 132],
  ] as const)('maps a front body tap to %s', (muscle, x, y) => {
    expect(muscleAtPoint('front', x, y)).toBe(muscle);
  });

  it.each([
    ['upper-back', 50, 40],
    ['upper-back', 32, 46],
    ['upper-back', 66, 46],
    ['triceps', 30, 56],
    ['triceps', 70, 56],
    ['lats', 50, 58],
    ['lower-back', 50, 72],
    ['glutes', 50, 84],
    ['hamstrings', 40, 106],
    ['hamstrings', 58, 106],
    ['calves', 38, 130],
    ['calves', 60, 130],
  ] as const)('maps a back body tap to %s', (muscle, x, y) => {
    expect(muscleAtPoint('back', x, y)).toBe(muscle);
  });

  it.each([
    ['shoulders', 44, 40],
    ['chest', 54, 44],
    ['biceps', 48, 56],
    ['triceps', 40, 56],
    ['core', 50, 68],
    ['glutes', 42, 82],
    ['quadriceps', 52, 106],
    ['hamstrings', 44, 108],
    ['calves', 44, 134],
  ] as const)('maps a side body tap to %s', (muscle, x, y) => {
    expect(muscleAtPoint('side', x, y)).toBe(muscle);
  });

  it('prefers chest over shoulders when tapping the pec belly', () => {
    expect(muscleAtPoint('front', 50, 46)).toBe('chest');
    expect(muscleAtPoint('front', 42, 48)).toBe('chest');
  });

  it('prefers outer deltoid when tapping the shoulder cap', () => {
    expect(muscleAtPoint('front', 30, 44)).toBe('shoulders');
    expect(muscleAtPoint('front', 70, 44)).toBe('shoulders');
  });

  it('resolves the highlight JPG id for a chest tap', () => {
    expect(hitBoxAtPoint('front', 50, 46)?.highlightId).toBe('pectoralis-major');
  });

  it('resolves the highlight JPG id for a biceps tap', () => {
    expect(hitBoxAtPoint('front', 30, 56)?.highlightId).toBe('biceps-brachii');
  });

  it('resolves calf and shoulder highlight ids on back', () => {
    expect(hitBoxAtPoint('back', 38, 130)?.highlightId).toBe('gastrocnemius');
    expect(hitBoxAtPoint('back', 32, 46)?.highlightId).toBe('posterior-deltoid');
  });
});
