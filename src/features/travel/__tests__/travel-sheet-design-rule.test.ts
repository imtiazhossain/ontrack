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
  it('keeps every travel sheet on the shared editorial frame or header', () => {
    const directory = join(process.cwd(), 'src/features/travel');
    const sheets = travelSheetFiles(directory);

    expect(sheets.length).toBeGreaterThan(0);
    for (const path of sheets) {
      const source = readFileSync(path, 'utf8');
      expect({ path, source }).toEqual(
        expect.objectContaining({
          source: expect.stringContaining("@/features/travel/travel-sheet"),
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
      /name="travel\/\[id\]\/chat" options=\{\{ headerShown: false \}\}/,
    );
  });
});
