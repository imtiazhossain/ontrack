import {
  canonicalPositionForRoute,
  centerIndexForRail,
  rebasePosition,
  routeIndexForPosition,
  shortestTargetPosition,
} from '../bottom-nav-bar-motion';

describe('bottom nav bar motion', () => {
  const n = 12;

  it('centers the expected route at the canonical position', () => {
    for (let index = 0; index < n; index += 1) {
      const position = canonicalPositionForRoute(index, n);
      expect(routeIndexForPosition(position, n)).toBe(index);
    }
  });

  it('takes the short step when moving to an adjacent route', () => {
    // P ≡ -R: from route 0 @0 → route 1 @-1, route 11 @+1
    expect(shortestTargetPosition(0, 1, n)).toBe(-1);
    expect(shortestTargetPosition(0, 11, n)).toBe(1);
    // route 7 @5 → route 8 @4, route 6 @6
    expect(shortestTargetPosition(5, 8, n)).toBe(4);
    expect(shortestTargetPosition(5, 6, n)).toBe(6);
  });

  it('never springs more than half the track for a direct selection', () => {
    for (let from = 0; from < n; from += 1) {
      const current = canonicalPositionForRoute(from, n);
      for (let to = 0; to < n; to += 1) {
        const target = shortestTargetPosition(current, to, n);
        expect(Math.abs(target - Math.round(current))).toBeLessThanOrEqual(
          n / 2,
        );
        expect(routeIndexForPosition(target, n)).toBe(to);
      }
    }
  });

  it('rebases by whole circles only so the visible route stays put', () => {
    expect(rebasePosition(13, 11, n)).toBe(1);
    expect(routeIndexForPosition(13, n)).toBe(
      routeIndexForPosition(rebasePosition(13, 11, n), n),
    );
    expect(rebasePosition(-7, 7, n)).toBe(5);
  });

  it('prefers pending over still-focused prior tab after a reshuffle', () => {
    // After tapping Travel: fan-out puts Travel at 0, Profile (still selected
    // for a frame) at left (n-1). Centering Profile would scroll +1.
    const routes = [
      { name: 'travel' },
      { name: 'today' },
      { name: 'profile' },
    ];
    expect(centerIndexForRail(routes, 'travel', 'profile')).toBe(0);
    expect(centerIndexForRail(routes, null, 'profile')).toBe(2);
    expect(centerIndexForRail(routes, null, 'travel')).toBe(0);
  });
});
