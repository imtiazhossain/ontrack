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
    ]) {
      expect(barrel).toContain(name);
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
    expect(actions).toContain('numberOfLines={2}');
    expect(actions).not.toMatch(/variant="callout"\s+fit/);
  });

  it('makes the Travel path obvious instead of presenting equal-weight actions', () => {
    const actions = read('src/features/travel/travel-list-actions.tsx');
    const grid = read('src/features/travel/travel-trip-action-grid.tsx');
    expect(actions).toContain('<Card');
    expect(grid).toContain('label="Open Trip Itinerary"');
    expect(grid).toContain('title="Book & organize"');
    expect(grid).toContain('title="At your destination"');
    expect(grid).toContain('title="Travel together"');
    expect(grid.indexOf('TravelSheetPrimaryAction')).toBeLessThan(
      grid.indexOf('<ActionGroup'),
    );
  });

  it('uses the shared contextual Travel gradient instead of a flat wash', () => {
    const surface = read('src/features/travel/travel-surface.tsx');
    const travelTab = read('src/app/(tabs)/travel.tsx');
    const rootLayout = read('src/app/_layout.tsx');
    expect(surface).toContain('travelPageGradient');
    expect(surface).toContain('travelSafeAreaStyle');
    expect(surface).toContain('radial-gradient');
    expect(surface).toContain('linear-gradient');
    expect(travelTab).toContain('style={travelStyle}');
    expect(travelTab).toContain('useTravelPageStyle(theme)');
    expect(rootLayout).toMatch(
      /name="travel"[\s\S]*?headerShown: false/,
    );
    expect(rootLayout).toContain('travelRoute ? travelSafeAreaStyle(theme, atmosphere)');
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
    expect(read('src/app/design-system.tsx')).toContain('__DEV__');
    expect(read('src/features/design-system/design-system-gallery.tsx')).toContain(
      'SheetScaffold',
    );
    expect(read('src/app/(tabs)/profile.tsx')).toContain('AgentUiIds.profile.designSystem');
    expect(read('docs/design-system.md')).toContain('Consistency wins');
    expect(read('docs/design-system.md')).toContain('## Intuitive path');
  });
});
