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

  it('keeps Travel action cards arrow-free', () => {
    const actions = readFileSync(
      join(process.cwd(), 'src/features/travel/travel-list-actions.tsx'),
      'utf8',
    );

    expect(actions).not.toContain('chevron-right');
  });
});
