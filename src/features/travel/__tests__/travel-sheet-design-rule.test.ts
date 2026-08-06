import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

function travelSheetFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return travelSheetFiles(path);
    if (!entry.name.endsWith('-sheet.tsx') || entry.name === 'travel-sheet.tsx') {
      return [];
    }
    return [path];
  });
}

function travelTsxFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return travelTsxFiles(path);
    return entry.name.endsWith('.tsx') ? [path] : [];
  });
}

describe('canonical travel sheet design', () => {
  it('keeps every rendered travel sheet on the shared scaffold or header', () => {
    const directory = join(process.cwd(), 'src/features/travel');
    const sheets = travelSheetFiles(directory);

    expect(sheets.length).toBeGreaterThan(0);
    for (const path of sheets) {
      const source = readFileSync(path, 'utf8');
      // Some `*-sheet` modules only launch a native system surface and render no UI.
      if (/return null;/.test(source)) continue;
      expect({ path, source }).toEqual(
        expect.objectContaining({
          source: expect.stringMatching(
            /@\/features\/travel\/travel-sheet|@\/components\/primitives/,
          ),
        }),
      );
    }
  });

  it('uses the travel sheet header for chat instead of the default stack bar', () => {
    const chat = readFileSync(
      join(process.cwd(), 'src/features/travel/travel-chat-screen.tsx'),
      'utf8',
    );
    const layout = readFileSync(join(process.cwd(), 'src/app/_layout.tsx'), 'utf8');

    expect(chat).toContain('<TravelSheetHeader');
    expect(layout).toMatch(
      /name="travel"[\s\S]*?headerShown: false/,
    );
  });

  it('keeps full-screen Travel headers on the shared small top inset', () => {
    const chat = readFileSync(
      join(process.cwd(), 'src/features/travel/travel-chat-screen.tsx'),
      'utf8',
    );
    const detail = readFileSync(
      join(process.cwd(), 'src/features/travel/travel-plan-detail.tsx'),
      'utf8',
    );

    expect(chat).not.toContain('paddingTop={rs.md}');
    expect(chat.match(/paddingTop=\{rs\.sm\}/g)).toHaveLength(3);
    expect(detail).not.toMatch(/screen:\s*\{[^}]*paddingTop:\s*0/);
  });

  it('keeps Travel action buttons compact and arrow-free', () => {
    const actions = readFileSync(
      join(process.cwd(), 'src/features/travel/travel-list-actions.tsx'),
      'utf8',
    );

    expect(actions).not.toContain('chevron-right');
    expect(actions).toContain('variant="secondary"');
    expect(actions).toContain('shape="rounded"');
    expect(actions).toContain('borderWidth: StyleSheet.hairlineWidth');
    expect(actions).toContain('backgroundColor: iconTone.bg');
    // Grid tiles left-align icon+label; full-width itinerary CTA stays centered.
    expect(actions).toMatch(/action:\s*\{[^}]*justifyContent:\s*['"]flex-start['"]/s);
    expect(actions).toMatch(/actionWide:\s*\{[^}]*justifyContent:\s*['"]center['"]/s);
    // Icon+label share one centered row (not Button leading/label split).
    expect(actions).toMatch(/actionContent:\s*\{[^}]*alignItems:\s*['"]center['"]/s);
    expect(actions).toContain('{null}');
    expect(actions).not.toContain('translateY');
  });

  it('marks the trip Calendar action as a sync and refreshes its schedule entries', () => {
    const grid = readFileSync(
      join(process.cwd(), 'src/features/travel/travel-trip-action-grid.tsx'),
      'utf8',
    );
    const travelTab = readFileSync(
      join(process.cwd(), 'src/app/(tabs)/travel.tsx'),
      'utf8',
    );

    expect(grid).toContain('icon="calendar"');
    expect(grid).toContain('badgeIcon="repeat"');
    expect(grid).toContain('Sync changes for ${tripTitle} with Calendar');
    expect(travelTab).toMatch(
      /onOpenCalendar=\{\(\) => \{\s*(?:(?:recordPlanInteraction|interactWithPlan)\(plan\.id\);\s*)?addTripToCalendar\(plan\);\s*\}\}/,
    );
  });

  it('keeps Travel CTA buttons at the shared default size', () => {
    const files = travelTsxFiles(join(process.cwd(), 'src/features/travel'));

    for (const path of files) {
      const source = readFileSync(path, 'utf8');
      expect({ path, source }).toEqual(
        expect.objectContaining({
          source: expect.not.stringMatching(/<Button\b[^>]*\bsize="lg"/s),
        }),
      );
    }
  });

  it('edits both trip-date endpoints in the canonical Travel sheet', () => {
    const row = readFileSync(
      join(process.cwd(), 'src/features/travel/travel-trip-dates-row.tsx'),
      'utf8',
    );
    const sheet = readFileSync(
      join(process.cwd(), 'src/features/travel/travel-trip-dates-sheet.tsx'),
      'utf8',
    );

    expect(row).toContain('accessibilityRole="button"');
    expect(sheet).toContain('<TravelSheetModal');
    expect(sheet).toContain('<DateFieldCalendar');
    expect(sheet).toContain('rangeStart={fromDateKey(draftStart)}');
    expect(sheet).toContain('rangeEnd={fromDateKey(draftEnd)}');
    expect(sheet).toContain('AgentUiIds.travel.dates.start');
    expect(sheet).toContain('AgentUiIds.travel.dates.end');
  });

  it('wraps trip titles to two lines then ellipsizes at a fixed size', () => {
    const tripCardHeader = readFileSync(
      join(process.cwd(), 'src/features/travel/travel-trip-card-header.tsx'),
      'utf8',
    );
    const detailHero = readFileSync(
      join(process.cwd(), 'src/features/travel/travel-plan-hero.tsx'),
      'utf8',
    );
    const title = readFileSync(
      join(process.cwd(), 'src/features/travel/travel-plan-title.tsx'),
      'utf8',
    );

    for (const source of [tripCardHeader, detailHero]) {
      expect(source).toContain('<TravelPlanTitle');
    }
    expect(tripCardHeader).toContain('styles.content');
    expect(tripCardHeader).toMatch(
      /content:[\s\S]*?flex: 1,[\s\S]*?minWidth: 0,[\s\S]*?position: "relative"/,
    );
    expect(tripCardHeader).toContain('Math.max(22, s(24))');
    expect(tripCardHeader).toContain('paddingRight: controlsWidth + rs.sm');
    expect(title).toContain('numberOfLines={2}');
    expect(title).toContain('ellipsizeMode="tail"');
    expect(title).toContain("width: '100%'");
    expect(title).not.toContain('adjustsFontSizeToFit');
    expect(title).not.toContain('fitMinimumScale');
    expect(title).not.toContain('MINIMUM_SCALE');
  });
});
