import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (relative: string) => readFileSync(join(root, relative), 'utf8');

describe('glass plate contract', () => {
  it('keeps TravelHomeGlass as a thin alias of GlassPlate', () => {
    const alias = read('src/features/travel/travel-home-glass.tsx');
    expect(alias).toContain('GlassPlate as TravelHomeGlass');
    expect(alias).toContain('@/components/primitives/glass-plate');
  });

  it('gates IconButton and GlassPlate blur with allowsBlur', () => {
    const button = read('src/components/primitives/button.tsx');
    const plate = read('src/components/primitives/glass-plate.tsx');
    expect(button).toContain('usePerformanceTier');
    expect(button).toContain('allowsBlur');
    expect(button).toContain('appearance = \'glass\'');
    expect(plate).toContain('allowsBlur');
    expect(plate).toContain('intensity={');
    expect(plate).toContain(': 0');
  });

  it('defaults Card and SettingsGroup to glass surfaces', () => {
    const card = read('src/components/primitives/card.tsx');
    const settings = read('src/components/primitives/settings-group.tsx');
    expect(card).toContain("surface = 'glass'");
    expect(card).toContain('GlassPlate');
    expect(settings).toContain("surface = 'glass'");
    expect(settings).toContain('GlassPlate');
  });

  it('defaults Button and SegmentedControl to GlassPlate chrome', () => {
    const button = read('src/components/primitives/button.tsx');
    const segments = read('src/components/primitives/segmented-control.tsx');
    expect(button).toContain("appearance = 'glass'");
    expect(button).toContain('GlassPlate');
    expect(segments).toContain('GlassPlate');
    expect(segments).not.toContain('theme.backgroundSunken');
  });

  it('keeps checklist hub cards and composer on GlassPlate', () => {
    const card = read('src/features/todos/todo-list-card.tsx');
    const overview = read('src/features/todos/todo-lists-overview.tsx');
    expect(card).toContain('GlassPlate');
    expect(card).not.toContain('backgroundColor: theme.backgroundElevated');
    expect(overview).toContain('GlassPlate');
    expect(overview).not.toContain('backgroundColor: theme.backgroundSunken');
  });

  it('keeps Home location sheet and Add Event assistant on glass atmosphere', () => {
    const home = read('src/features/daily-tracking/home-location-sheet.tsx');
    const activity = read('src/app/activity-form.tsx');
    const scaffold = read('src/components/primitives/sheet-scaffold.tsx');
    expect(home).toContain('SheetScaffold');
    expect(home).toContain("surface=\"glass\"");
    expect(home).toContain('GlassPrimaryAction');
    expect(home).toContain('glassFieldBackground');
    expect(home).not.toContain('presentationStyle="pageSheet"');
    expect(home).not.toContain('backgroundColor: theme.backgroundPrimary');
    expect(scaffold).toContain('ScreenAtmosphere');
    expect(activity).toContain('GlassPlate');
    expect(activity).not.toContain('backgroundColor: theme.backgroundSunken');
  });

  it('ships shared field and atmosphere tokens with visible wash chroma', () => {
    const glass = read('src/design-system/glass.ts');
    const atmosphere = read('src/components/primitives/screen-atmosphere.tsx');
    expect(glass).toContain('glassFieldBackground');
    expect(glass).toContain('atmosphere');
    expect(glass).toContain('accentGreen');
    expect(glass).toContain('lightOrb');
    expect(atmosphere).toContain('orb');
    expect(atmosphere).toContain('LinearGradient');
    expect(atmosphere).toContain('radial-gradient');
    expect(atmosphere).toContain('useScreenAtmosphereChrome');
    expect(atmosphere).toContain('useSafeAreaChromeOverlay');
  });

  it('keeps Vision Board consolidated chips and cards on airy glass', () => {
    const card = read('src/features/vision-board/consolidated-card.tsx');
    const consolidated = read(
      'src/features/vision-board/vision-board-consolidated.tsx',
    );
    expect(card).toContain('GlassPlate');
    expect(card).toContain('airy');
    expect(card).not.toContain("backgroundColor: '#303636'");
    expect(card).not.toContain("backgroundColor: selected ? '#9A7654'");
    expect(card).not.toContain('LinearGradient');
    expect(consolidated).not.toContain('background="transparent"');
    expect(consolidated).toContain('consolidatedSearch');
  });

  it('keeps Vision Board dashboard categories on airy GlassPlate', () => {
    const dashboard = read('src/features/vision-board/vision-board-dashboard.tsx');
    expect(dashboard).toContain('<Card');
    expect(dashboard).toContain('airy');
    expect(dashboard).toContain('GlassPlate');
    expect(dashboard).not.toContain('categoryCardWrap');
    expect(dashboard).not.toContain('background={theme.backgroundPrimary}');
    expect(dashboard).not.toContain('background={theme.success}');
  });

  it('keeps Calendar on frosted GlassPlate chrome', () => {
    const calendar = read('src/app/(tabs)/calendar.tsx');
    expect(calendar).toContain('GlassPlate');
    expect(calendar).not.toContain('backgroundColor: theme.backgroundSunken');
  });

  it('keeps Today weather/empty CTA/FAB on frosted glass', () => {
    const header = read('src/features/daily-tracking/day-header.tsx');
    const dayView = read('src/features/daily-tracking/day-view.tsx');
    const empty = read('src/components/primitives/empty-state.tsx');
    expect(header).toContain('airy');
    expect(header).toContain("'transparent'");
    expect(header).not.toContain('background="transparent"');
    expect(empty).toContain('GlassPlate');
    expect(empty).not.toContain('variant="secondary"');
    expect(dayView).not.toContain('background={theme.accentPrimary}');
    expect(dayView).not.toContain('shadows.raised');
  });
});
