import {
  BASE_WIDTH,
  MAX_SCALE,
  MIN_SCALE,
  moderateScale,
  scaleSize,
  scaleTypographyToken,
  windowScale,
} from '@/design-system/responsive';

describe('responsive scale', () => {
  it('is 1 at the design base width', () => {
    expect(windowScale(BASE_WIDTH)).toBe(1);
    expect(scaleSize(20, BASE_WIDTH)).toBe(20);
  });

  it('shrinks on compact widths and never below MIN_SCALE', () => {
    expect(windowScale(300)).toBe(MIN_SCALE);
    expect(windowScale(320)).toBeCloseTo(320 / BASE_WIDTH, 5);
    expect(scaleSize(100, 300)).toBe(82);
  });

  it('grows modestly on large phones and never above MAX_SCALE', () => {
    expect(windowScale(410)).toBeCloseTo(410 / BASE_WIDTH, 5);
    expect(windowScale(430)).toBe(MAX_SCALE);
    expect(windowScale(500)).toBe(MAX_SCALE);
  });

  it('moderates spacing more gently than linear scale', () => {
    const linear = scaleSize(20, 300);
    const moderate = moderateScale(20, 300, 0.45);
    expect(moderate).toBeGreaterThan(linear);
    expect(moderate).toBeLessThan(20);
  });

  it('scales typography fontSize and lineHeight together', () => {
    const scaled = scaleTypographyToken(
      { fontSize: 20, lineHeight: 26, letterSpacing: -0.4, fontWeight: '400' as const },
      300,
    );
    expect(scaled.fontSize).toBe(scaleSize(20, 300));
    expect(scaled.lineHeight).toBe(scaleSize(26, 300));
  });
});
