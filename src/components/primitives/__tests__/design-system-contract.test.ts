import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (relative: string) => readFileSync(join(root, relative), 'utf8');

describe('canonical design-system contract', () => {
  it('exports the shared composition primitives', () => {
    const barrel = read('src/components/primitives/index.ts');
    for (const name of [
      'ScreenHeader',
      'SegmentedControl',
      'FormSection',
      'SheetScaffold',
      'DestructiveSection',
      'DangerZone',
      'StackedFieldLabel',
      'PanelTitle',
      'StatusBadge',
      'MetaList',
      'CollapsibleSection',
      'ToolbarRow',
      'ActionChip',
      'ActionChipRow',
      'Dropdown',
      'fieldTitleCase',
    ]) {
      expect(barrel).toContain(name);
    }
  });

  it('title-cases chrome titles in shared header primitives', () => {
    for (const relative of [
      'src/components/primitives/screen-header.tsx',
      'src/components/primitives/section-header.tsx',
      'src/components/primitives/form-section.tsx',
      'src/components/primitives/panel-title.tsx',
      'src/components/primitives/stacked-field-label.tsx',
      'src/components/primitives/settings-row.tsx',
    ]) {
      expect(read(relative)).toContain('fieldTitleCase');
    }
  });

  it('routes stacked field titles through StackedFieldLabel', () => {
    for (const relative of [
      'src/components/primitives/input.tsx',
      'src/components/primitives/date-field.tsx',
      'src/components/primitives/time-field.ios.tsx',
      'src/components/android/material-time-field.tsx',
    ]) {
      const source = read(relative);
      expect(source).toContain('StackedFieldLabel');
      expect(source).not.toMatch(
        /variant="caption"[\s\S]{0,120}\{stackedLabel\}/,
      );
    }
  });

  it('keeps canonical primitives semantic and responsive', () => {
    const files = [
      'src/components/primitives/screen-header.tsx',
      'src/components/primitives/segmented-control.tsx',
      'src/components/primitives/form-section.tsx',
      'src/components/primitives/sheet-scaffold.tsx',
      'src/components/primitives/destructive-section.tsx',
    ];
    for (const relative of files) {
      const source = read(relative);
      expect(source).not.toMatch(/#[0-9a-f]{3,8}\b/i);
      expect(source).not.toMatch(/font(?:Size|Family|Weight)\s*:/);
      expect(source).toMatch(/useResponsive|AppText|Button|ScreenHeader/);
    }
  });

  it('routes Travel sheets and actions through shared primitives', () => {
    const sheet = read('src/features/travel/travel-sheet.tsx');
    const actions = read('src/features/travel/travel-list-actions.tsx');
    const photos = read('src/features/travel/travel-add-photos-modal.tsx');
    const calendar = read('src/features/travel/travel-calendar-updated-modal.tsx');
    const importResult = read('src/features/travel/travel-import-result-modal.tsx');
    const removeConfirm = read('src/features/travel/travel-remove-confirm-modal.tsx');
    expect(sheet).toContain('SheetScaffold');
    expect(sheet).not.toMatch(/\bModal\b/);
    expect(actions).toContain('<Button');
    expect(actions).toContain('<IconButton');
    expect(photos).toContain('SheetScaffold');
    expect(calendar).toContain('SheetScaffold');
    expect(importResult).toContain('SheetScaffold');
    expect(removeConfirm).toContain('SheetScaffold');
    expect(removeConfirm).not.toMatch(/\bModal\b/);
    expect(actions).toContain('variant="secondary"');
    expect(actions).not.toContain('<Card');
    expect(actions).not.toContain('numberOfLines={2}');
  });

  it('makes the Travel path obvious instead of presenting equal-weight actions', () => {
    const actions = read('src/features/travel/travel-list-actions.tsx');
    const grid = read('src/features/travel/travel-trip-action-grid.tsx');
    expect(actions).toContain('variant="secondary"');
    expect(grid).toContain('label="Trip Itinerary"');
    expect(grid).toContain('title="Book & Organize"');
    expect(grid).toContain('title="At Your Destination"');
    expect(grid).toContain('title="Travel Together"');
    expect(grid.indexOf('TravelSheetPrimaryAction')).toBeLessThan(
      grid.indexOf('<ActionGroup'),
    );
  });

  it('uses a single blue-to-neutral background across Travel routes', () => {
    const surface = read('src/features/travel/travel-surface.tsx');
    const travelTab = read('src/app/(tabs)/travel.tsx');
    const travelLayout = read('src/app/travel/_layout.tsx');
    const rootLayout = read('src/app/_layout.tsx');
    const safeAreaChrome = read('src/components/primitives/safe-area-chrome.tsx');
    expect(surface).toContain('travelSafeAreaBackground');
    expect(surface).toContain('travelPagePaper');
    expect(surface).toContain('lightTravelTheme.backgroundPrimary');
    expect(surface).toContain('darkTravelTheme.backgroundPrimary');
    expect(surface).toContain('experimental_backgroundImage');
    expect(surface).not.toContain('radial-gradient');
    expect(travelTab).toContain('style={travelStyle}');
    expect(travelTab).toContain('useTravelPageStyle(theme)');
    expect(travelTab).toContain('useSafeAreaChrome(travelSafeAreaBackground(theme))');
    expect(travelLayout).toContain('useSafeAreaChrome(travelSafeAreaBackground(theme))');
    expect(safeAreaChrome).toContain('useSafeAreaChrome');
    expect(rootLayout).toMatch(
      /name="travel"[\s\S]*?headerShown: false/,
    );
    expect(rootLayout).toContain('<AppSafeArea>');
    expect(rootLayout).not.toContain('travelRoute ? travelSafeAreaStyle');
  });

  it('paints Today status-bar chrome from the time-of-day wash', () => {
    const dayHeader = read('src/features/daily-tracking/day-header.tsx');
    const themes = read('src/design-system/themes.ts');
    expect(themes).toContain('timeOfDaySafeAreaBackground');
    expect(dayHeader).toContain('useSafeAreaChrome(timeOfDaySafeAreaBackground(theme, hour))');
  });

  it('uses X dismissal instead of full-width Cancel actions on migrated surfaces', () => {
    const files = [
      'src/app/(tabs)/travel.tsx',
      'src/features/travel/travel-plan-details-editor.tsx',
      'src/features/travel/travel-details-card-actions.tsx',
      'src/features/travel/travel-add-photos-modal.tsx',
      'src/features/travel/travel-remove-confirm-modal.tsx',
      'src/features/travel/trip-people.tsx',
      'src/features/travel/trip-friend-row.tsx',
    ];
    for (const relative of files) {
      expect(read(relative)).not.toMatch(/>\s*Cancel\s*</);
    }
    expect(read('src/features/travel/travel-remove-confirm-modal.tsx')).toContain(
      'closeTestID={AgentUiIds.travel.removeConfirm.close}',
    );
  });

  it('keeps destructive actions standardized and confirmed', () => {
    expect(read('src/features/travel/travel-remove-confirm-modal.tsx')).toContain(
      'variant="danger"',
    );
    expect(read('src/features/travel/travel-add-photos-modal.tsx')).toContain(
      'confirmDestructiveAction',
    );
    expect(read('src/features/travel/travel-plan-details-editor.tsx')).toContain(
      'DestructiveSection',
    );
    expect(read('src/components/primitives/index.ts')).toContain('DangerZone');
    expect(read('src/app/(tabs)/profile.tsx')).toContain('DangerZone');
    expect(read('src/app/(tabs)/profile.tsx')).toContain('flush');
  });

  it('keeps the Travel chat composer cohesive and full width', () => {
    const input = read('src/components/primitives/input.tsx');
    const chat = read('src/features/travel/travel-chat-screen.tsx');
    expect(input).toContain('containerStyle?: StyleProp<ViewStyle>');
    expect(chat).toContain('styles.composerDock');
    expect(chat).toContain('containerStyle={styles.composerInput}');
    expect(chat).toMatch(/paddingTop=\{rs\.(?:sm|md)\}/);
    expect(chat).not.toContain('paddingTop={0}');
  });

  it('ships a development-only gallery and canonical guide', () => {
    expect(read('src/app/design-system.tsx')).toContain('DevAccessGate');
    expect(read('src/features/design-system/design-system-gallery.tsx')).toContain(
      'SheetScaffold',
    );
    expect(read('src/features/account/developer-hub.tsx')).toContain(
      'AgentUiIds.developer.designSystem',
    );
    expect(read('docs/design-system.md')).toContain('Consistency wins');
    expect(read('docs/design-system.md')).toContain('## Intuitive path');
    expect(read('docs/design-system.md')).toContain('fieldTitleCase');
  });

  it('keeps product UI on the UI font (no AppText mono outside design-system)', () => {
    const { readdirSync, statSync } = require('node:fs') as typeof import('node:fs');
    const { join } = require('node:path') as typeof import('node:path');
    const roots = ['src/features', 'src/app', 'src/components'];
    const skip = (relative: string) =>
      relative.includes('/design-system/') ||
      relative.includes('/__tests__/') ||
      relative.includes('/primitives/');

    const walk = (dir: string, out: string[] = []): string[] => {
      for (const name of readdirSync(dir)) {
        const full = join(dir, name);
        const relative = full.replace(`${root}/`, '');
        if (statSync(full).isDirectory()) {
          if (name === 'node_modules' || name === '.git') continue;
          walk(full, out);
          continue;
        }
        if (!/\.(tsx|ts)$/.test(name) || skip(relative)) continue;
        out.push(relative);
      }
      return out;
    };

    const offenders: string[] = [];
    for (const base of roots) {
      for (const relative of walk(join(root, base))) {
        const source = read(relative);
        if (/variant\s*=\s*["']mono["']/.test(source)) offenders.push(relative);
      }
    }
    expect(offenders).toEqual([]);
  });
});
