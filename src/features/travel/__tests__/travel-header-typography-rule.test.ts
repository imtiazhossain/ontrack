import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('travel section header typography', () => {
  const source = readFileSync(
    join(process.cwd(), 'src/features/travel/travel-collapsible-section.tsx'),
    'utf8',
  );

  it('keeps compact nested labels at readable overline sizing', () => {
    expect(source).toContain("variant={compact && nested ? 'overline' : titleVariant}");
    expect(source).toContain('fit={Boolean(compact && nested) || !compact}');
    expect(source).toContain('fitMinimumScale={compact && nested ? 0.9 : undefined}');
    expect(source).not.toMatch(/compactNestedTitle:\s*\{[^}]*fontSize/s);
  });

  it('shows expand and collapse affordances on compact nested sections', () => {
    expect(source).toContain("name={expanded ? 'chevron-up' : 'chevron-right'}");
    expect(source).not.toContain('{compact && nested ? null : (');
  });

  it('keeps compact card titles from shrink-to-fit crushing', () => {
    expect(source).toContain('compact && !nested ? styles.compactCardTitle');
    // Parent titles are short — never allow adjustsFontSizeToFit on them.
    expect(source).toContain('fit={Boolean(compact && nested) || !compact}');
    expect(source).not.toMatch(/compactCardTitle:\s*\{[^}]*fontSize/s);
  });

  it('uses the shared mock icon→title gap for parent and nested headers', () => {
    expect(source).toContain('TRAVEL_TITLE_ICON_GAP');
    expect(source).toContain(
      'const titleIconGap = Math.max(TRAVEL_TITLE_ICON_GAP, s(TRAVEL_TITLE_ICON_GAP))',
    );
    expect(source).toContain('const headerGap = titleIconGap');
  });

  it('defaults to theme-aware travel blue for dark-mode contrast', () => {
    expect(source).toContain('travelAccent(theme)');
    expect(source).not.toContain('TRAVEL_EDITORIAL_ACCENT');
  });
});

describe('transport board section header', () => {
  const source = readFileSync(
    join(process.cwd(), 'src/features/travel/travel-transport-sections.tsx'),
    'utf8',
  );

  it('uses the suitcase glyph and subheading title for Transportation, Stays & Events', () => {
    expect(source).toContain('title="Transportation, Stays & Events"');
    expect(source).toContain('icon="suitcase"');
    expect(source).toContain('tightHeader');
    expect(source).toContain('titleVariant="subheading"');
  });
});

describe('timeline section header', () => {
  const source = readFileSync(
    join(process.cwd(), 'src/features/travel/travel-plan-detail-body.tsx'),
    'utf8',
  );

  it('matches the transport board title treatment', () => {
    expect(source).toContain('title="Timeline"');
    expect(source).toContain('icon="clock"');
    expect(source).toContain('titleVariant="subheading"');
    expect(source).toContain('tightHeader');
    expect(source).toContain('travelAccent(theme)');
    expect(source).toContain('timelineSection');
  });
});

describe('trip tools section header', () => {
  it('uses subheading so the title stays readable on the glass card', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/features/travel/travel-plan-trip-tools.tsx'),
      'utf8',
    );
    expect(source).toContain('title="Trip Tools"');
    expect(source).toContain('titleVariant="subheading"');
    expect(source).toContain('travelAccent(theme)');
  });
});

describe('travel title icon gap token', () => {
  it('is shared at 8pt for mock-matched logo+title rows', () => {
    const chrome = readFileSync(
      join(process.cwd(), 'src/features/travel/travel-chrome.ts'),
      'utf8',
    );
    expect(chrome).toMatch(/export const TRAVEL_TITLE_ICON_GAP = 8/);
    for (const file of [
      'travel-timeline-node.tsx',
      'travel-trip-notes-card.tsx',
      'travel-trip-dates-row.tsx',
    ]) {
      const source = readFileSync(
        join(process.cwd(), `src/features/travel/${file}`),
        'utf8',
      );
      expect(source).toContain('TRAVEL_TITLE_ICON_GAP');
    }
  });
});
