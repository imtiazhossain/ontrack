import {
  formatActiveDuration,
  resolveAnalyticsSurface,
} from '../surfaces';

describe('resolveAnalyticsSurface', () => {
  it('maps primary tabs and nested routes', () => {
    expect(resolveAnalyticsSurface('/')).toBe('today');
    expect(resolveAnalyticsSurface('/travel/abc')).toBe('travel');
    expect(resolveAnalyticsSurface('/to-do/list-1')).toBe('checklists');
    expect(resolveAnalyticsSurface('/health/mood-check-in')).toBe('health');
    expect(resolveAnalyticsSurface('/developer')).toBe('profile');
  });
});

describe('formatActiveDuration', () => {
  it('formats hours and minutes', () => {
    expect(formatActiveDuration(90_000)).toBe('1m 30s');
    expect(formatActiveDuration(3_600_000)).toBe('1h 0m');
  });
});
