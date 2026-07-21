import {
  calculateNutritionTargets,
  createTargetVersion,
  NutritionTargetError,
  sumKnownNutrient,
} from '@/utils/nutrition';
import type { NutritionProfile } from '@/types/models';

const adult: NutritionProfile = {
  id: 'adult',
  displayName: 'Adult',
  dateOfBirth: '1996-01-01',
  equationSex: 'female',
  heightCm: 165,
  weightKg: 65,
  activityLevel: 'active',
  goal: 'maintain',
  unitSystem: 'metric',
  dietaryPreferences: [],
  allergies: [],
};

describe('nutrition targets', () => {
  it('calculates adult targets and applies manual overrides', () => {
    const calculated = calculateNutritionTargets(adult, new Date('2026-07-21T12:00:00Z'));
    expect(calculated.calories).toBeGreaterThan(1800);
    expect(calculated.proteinG).toBe(52);
    expect(createTargetVersion(adult, calculated, { proteinG: 110 }).targets.proteinG).toBe(110);
  });

  it('requires guardian acknowledgment for youth', () => {
    expect(() => calculateNutritionTargets({ ...adult, dateOfBirth: '2016-01-01' }))
      .toThrow(expect.objectContaining({ code: 'GUARDIAN_ACK_REQUIRED' }));
  });

  it('requires a clinician for infant targets', () => {
    try {
      calculateNutritionTargets({ ...adult, dateOfBirth: '2025-08-01' });
      throw new Error('expected failure');
    } catch (error) {
      expect(error).toBeInstanceOf(NutritionTargetError);
      expect((error as NutritionTargetError).code).toBe('CLINICAL_APPROVAL_REQUIRED');
    }
  });

  it('does not convert unknown nutrients to zero', () => {
    expect(sumKnownNutrient([undefined, 10, undefined])).toEqual({ amount: 10, coverage: 1 / 3 });
    expect(sumKnownNutrient([undefined])).toEqual({ amount: undefined, coverage: 0 });
  });
});
