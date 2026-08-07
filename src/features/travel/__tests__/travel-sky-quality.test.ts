import {
  degradeTravelSkyQuality,
  minTravelSkyQuality,
  planTravelSkyFx,
  resolveTravelSkyCapability,
} from '@/features/travel/travel-sky-quality';

describe('resolveTravelSkyCapability', () => {
  it('keeps simulators on full so agent-ui can exercise the live plate', () => {
    expect(
      resolveTravelSkyCapability({
        isDevice: false,
        deviceYearClass: 2015,
        totalMemory: 1 * 1024 ** 3,
      }),
    ).toBe('full');
  });

  it('honors Reduce Motion with a static SVG (no loops) tier', () => {
    expect(
      resolveTravelSkyCapability({
        isDevice: true,
        reduceMotion: true,
        deviceYearClass: 2024,
        totalMemory: 8 * 1024 ** 3,
      }),
    ).toBe('minimal');
  });

  it('maps low RAM / old year-class down to static chrome wash', () => {
    expect(
      resolveTravelSkyCapability({
        isDevice: true,
        deviceYearClass: 2015,
        totalMemory: 2 * 1024 ** 3,
      }),
    ).toBe('static');
  });

  it('maps mid devices to reduced motion budgets', () => {
    expect(
      resolveTravelSkyCapability({
        isDevice: true,
        deviceYearClass: 2020,
        totalMemory: 4 * 1024 ** 3,
        platformOs: 'ios',
      }),
    ).toBe('reduced');
  });
});

describe('planTravelSkyFx', () => {
  it('turns off all loops for static and minimal', () => {
    expect(planTravelSkyFx('static').liveFx).toBe(false);
    expect(planTravelSkyFx('static').ground).toBe(false);
    expect(planTravelSkyFx('minimal').liveFx).toBe(false);
    expect(planTravelSkyFx('minimal').ground).toBe(true);
    expect(planTravelSkyFx('minimal').birds).toBe(false);
  });

  it('keeps a thinned but live set on reduced', () => {
    const plan = planTravelSkyFx('reduced');
    expect(plan.liveFx).toBe(true);
    expect(plan.twinkleMax).toBeLessThan(planTravelSkyFx('full').twinkleMax);
    expect(plan.birds).toBe(false);
    expect(plan.meteors).toBe(false);
    expect(plan.rainDropMax).toBeLessThan(planTravelSkyFx('full').rainDropMax);
  });
});

describe('degrade helpers', () => {
  it('steps full → reduced → minimal → static', () => {
    expect(degradeTravelSkyQuality('full')).toBe('reduced');
    expect(degradeTravelSkyQuality('reduced')).toBe('minimal');
    expect(degradeTravelSkyQuality('minimal')).toBe('static');
    expect(degradeTravelSkyQuality('static')).toBe('static');
  });

  it('picks the weaker of two tiers', () => {
    expect(minTravelSkyQuality('full', 'minimal')).toBe('minimal');
    expect(minTravelSkyQuality('static', 'reduced')).toBe('static');
  });
});
