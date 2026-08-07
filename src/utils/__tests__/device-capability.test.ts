import {
  degradePerformanceTier,
  minPerformanceTier,
  performanceGatesFor,
  resolvePerformanceTier,
} from '@/utils/device-capability';

describe('resolvePerformanceTier', () => {
  it('keeps simulators on full', () => {
    expect(
      resolvePerformanceTier({
        isDevice: false,
        deviceYearClass: 2014,
        totalMemory: 1024 ** 3,
      }),
    ).toBe('full');
  });

  it('maps Reduce Motion to minimal', () => {
    expect(
      resolvePerformanceTier({
        isDevice: true,
        reduceMotion: true,
        deviceYearClass: 2024,
        totalMemory: 8 * 1024 ** 3,
      }),
    ).toBe('minimal');
  });

  it('maps very low RAM to static', () => {
    expect(
      resolvePerformanceTier({
        isDevice: true,
        deviceYearClass: 2015,
        totalMemory: 2 * 1024 ** 3,
      }),
    ).toBe('static');
  });
});

describe('performanceGatesFor', () => {
  it('disables blur and loops on minimal/static', () => {
    expect(performanceGatesFor('minimal').allowsBlur).toBe(false);
    expect(performanceGatesFor('minimal').allowsLoopMotion).toBe(false);
    expect(performanceGatesFor('static').allowsSharedElement).toBe(false);
  });

  it('allows iOS blur on reduced but not Android', () => {
    expect(performanceGatesFor('reduced', 'ios').allowsBlur).toBe(true);
    expect(performanceGatesFor('reduced', 'android').allowsBlur).toBe(false);
  });

  it('keeps sensors only on full', () => {
    expect(performanceGatesFor('full').allowsSensors).toBe(true);
    expect(performanceGatesFor('reduced').allowsSensors).toBe(false);
  });
});

describe('degrade helpers', () => {
  it('steps down and never below static', () => {
    expect(degradePerformanceTier('full')).toBe('reduced');
    expect(degradePerformanceTier('static')).toBe('static');
    expect(minPerformanceTier('full', 'minimal')).toBe('minimal');
  });
});
