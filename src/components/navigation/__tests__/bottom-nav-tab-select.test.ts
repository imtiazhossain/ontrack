import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('bottom nav direct tab select', () => {
  const source = readFileSync(
    join(process.cwd(), 'src/components/navigation/bottom-nav-bar.tsx'),
    'utf8',
  );

  it('does not reshuffle recency during selectTab (avoids stalling tab loads)', () => {
    const selectStart = source.indexOf('const selectTab = () => {');
    expect(selectStart).toBeGreaterThanOrEqual(0);
    const selectBody = source.slice(
      selectStart,
      source.indexOf('const onLongPress', selectStart),
    );
    expect(selectBody).toContain('carouselPendingRouteName: route.name');
    expect(selectBody).toContain('canonicalPositionForRoute(0, routeCount)');
    expect(selectBody).not.toContain('recordTabFocus');
    expect(selectBody).not.toContain('shortestTargetPosition');
  });

  it('runs rail chrome only after page load (settle + idle)', () => {
    expect(source).toContain('deferAfterPageLoad');
    expect(source).toMatch(
      /deferAfterPageLoad\(\(\) => \{[\s\S]*?recordTabFocus\(routeName\)/,
    );
    expect(source).toMatch(
      /deferAfterPageLoad\(\(\) => \{[\s\S]*?navigation\.preload/,
    );
    expect(source).toContain('centerIndexForRail');
  });
});
