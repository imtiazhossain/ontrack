import {
    arrangeRecentsLeftRestRight,
    compareTabsByRecency,
    DEFAULT_TAB_ORDER,
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

  it('puts never-focused catalog on the right of Today (browse-through)', () => {
    const routes = DEFAULT_TAB_ORDER.map((name) => ({ name }));
    const ordered = orderRoutesByRecency(routes, {}).map((r) => r.name);
    expect(ordered[0]).toBe('(today)');
    // No recents → right walks DEFAULT order; left wraps to last catalog tab.
    expect(ordered[1]).toBe('calendar');
    expect(ordered[2]).toBe('to-do');
    expect(ordered[ordered.length - 1]).toBe('health');
  });

  it('puts prior tabs on the left (most recent closest) and the rest on the right', () => {
    const lastFocusedAt = {
      'to-do': 400,
      travel: 300,
      calendar: 200,
    };
    const routes = DEFAULT_TAB_ORDER.map((name) => ({ name }));
    const ordered = orderRoutesByRecency(routes, lastFocusedAt).map((r) => r.name);
    expect(ordered[0]).toBe('to-do');
    // Left = most recent prior (travel), then older (calendar)
    expect(ordered[ordered.length - 1]).toBe('travel');
    expect(ordered[ordered.length - 2]).toBe('calendar');
    // Right = never-focused catalog starting at Today
    expect(ordered[1]).toBe('(today)');
    expect(ordered[2]).toBe('social');
    expect(ordered[1]).not.toBe('health');
  });

  it('arrangeRecentsLeftRestRight keeps most-recent prior closest left of center', () => {
    const ranked = ['a', 'b', 'c', 'd', 'e'].map((name) => ({ name }));
    const lastFocusedAt = { a: 5, b: 4, c: 3 };
    expect(
      arrangeRecentsLeftRestRight(ranked, lastFocusedAt).map((r) => r.name),
    ).toEqual(['a', 'd', 'e', 'c', 'b']);
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
