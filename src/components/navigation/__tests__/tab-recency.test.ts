import {
    compareTabsByRecency,
    DEFAULT_TAB_ORDER,
    fanOutAroundMostRecent,
    orderRoutesByRecency,
} from '../tab-recency';

describe('tab-recency', () => {
  it('keeps DEFAULT_TAB_ORDER aligned with the tabs layout cold-start sequence', () => {
    expect([...DEFAULT_TAB_ORDER]).toEqual([
      '(today)',
      'calendar',
      'to-do',
      'social',
      'insights',
      'profile',
      'workouts',
      'plants',
      'travel',
      'vision-board',
      'games',
      'vehicles',
      'health',
    ]);
  });

  it('fans never-focused tabs around Today so Health is not beside center', () => {
    const routes = DEFAULT_TAB_ORDER.map((name) => ({ name }));
    const ordered = orderRoutesByRecency(routes, {}).map((r) => r.name);
    expect(ordered[0]).toBe('(today)');
    // Left of center = [n-1], right = [1]
    expect(ordered[ordered.length - 1]).toBe('calendar');
    expect(ordered[1]).toBe('to-do');
    expect(ordered[1]).not.toBe('health');
    expect(ordered[ordered.length - 1]).not.toBe('health');
  });

  it('puts previous tab on the left and second-prior on the right of the active tab', () => {
    const lastFocusedAt = {
      'to-do': 400,
      travel: 300,
      calendar: 200,
    };
    const routes = DEFAULT_TAB_ORDER.map((name) => ({ name }));
    const ordered = orderRoutesByRecency(routes, lastFocusedAt).map((r) => r.name);
    expect(ordered[0]).toBe('to-do');
    // Left = most recent prior (travel); right = second-to-last (calendar)
    expect(ordered[ordered.length - 1]).toBe('travel');
    expect(ordered[1]).toBe('calendar');
    expect(ordered[1]).not.toBe('health');
    expect(ordered[ordered.length - 1]).not.toBe('health');
  });

  it('fanOutAroundMostRecent alternates left then right from rank order', () => {
    expect(fanOutAroundMostRecent(['a', 'b', 'c', 'd', 'e'])).toEqual([
      'a',
      'c',
      'e',
      'd',
      'b',
    ]);
  });

  it('places never-focused tabs after focused ones, still in default relative order', () => {
    const lastFocusedAt = { travel: 100 };
    expect(
      compareTabsByRecency('travel', '(today)', lastFocusedAt),
    ).toBeLessThan(0);
    expect(
      compareTabsByRecency('calendar', 'to-do', lastFocusedAt),
    ).toBeLessThan(0);
  });
});
