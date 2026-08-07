// Token budget test: Enforces file length < 700 lines and no hard‑coded pixel values
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '../../..'); // project root

function* walk(dir: string): IterableIterator<string> {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const res = path.resolve(dir, entry.name);
    // Skip large, version‑control, or generated directories
    if (['node_modules', '.git', 'android', 'ios', '.expo', 'dist', 'build'].includes(entry.name)) continue;
    if (entry.isDirectory()) {
      yield* walk(res);
    } else if (entry.isFile()) {
      if (/\.(tsx?|jsx?)$/i.test(entry.name)) yield res;
    }
  }
}

describe('Token budget enforcement', () => {
  // Exclude any files inside .expo generated output
  const files = Array.from(walk(ROOT)).filter(f => !f.includes('.expo'));

  // Whitelist known large travel files
  const largeFileWhitelist = [
    '/src/app/(tabs)/travel.tsx',
    '/src/features/travel/flights/flight-search-screen.tsx',
    '/src/features/travel/share.ts',
    '/src/features/travel/travel-friends-sheet.tsx',
    '/src/features/travel/travel-plan-detail.tsx',
  ];
  // Whitelist files that intentionally contain pixel values
  const pixelWhitelist = [
    '/src/components/navigation/bottom-nav-bar.tsx',
    '/src/components/primitives/app-prompt.tsx',
    '/src/design-system/__tests__/token-budget.test.ts',
    '/src/design-system/shadows.ts',
    '/src/features/auth/auth-screen.tsx',
    '/src/features/todos/empty-checklists.tsx',
    '/src/features/todos/todo-list-header.tsx',
    '/src/features/travel/__tests__/destination-cover.test.ts',
    '/src/features/travel/flights/flight-search-screen.tsx',
    '/src/features/travel/stays/stay-provider-screen.tsx',
    '/src/features/travel/travel-chat-chrome.tsx',
    '/src/features/travel/travel-chat-screen.tsx',
    '/src/features/travel/travel-collapsible-section.tsx',
    '/src/features/travel/travel-currency-sheet.tsx',
    '/src/features/travel/travel-itinerary-sheet-fields.tsx',
    '/src/features/travel/travel-list-actions.tsx',
    '/src/features/travel/travel-sheet.tsx',
    '/src/features/travel/travel-surface.tsx',
    '/src/features/travel/travel-timeline-add-modal.tsx',
    '/src/features/travel/travel-timeline-node.tsx',
    '/src/features/travel/travel-trip-dates-row.tsx',
    '/src/features/travel/weather/travel-weather-card.tsx',
    '/src/features/travel/weather/travel-weather-sheet.tsx',
    '/src/features/vision-board/consolidated-card.tsx',
    '/src/features/vision-board/vision-board-canvas-item.tsx',
    '/src/features/vision-board/vision-board-category-screen.tsx',
    '/src/features/vision-board/vision-board-consolidated.tsx',
    '/src/features/vision-board/vision-board-dashboard.tsx',
    '/src/features/vision-board/vision-board-gallery.tsx',
    '/src/features/workouts/exercise-anatomy-demo.tsx',
    '/src/features/workouts/muscle-explorer.tsx',
    '/src/features/workouts/muscle-focus-exercises.tsx',
    '/src/features/workouts/muscle-summary-panel.tsx',
    '/src/features/workouts/workouts-screen-header.tsx',
    '/src/utils/__tests__/bottom-nav-bar-rule.test.ts',
  ];

  test('no source file exceeds 700 lines', () => {
    const offenders = files.filter(f =>
      fs.readFileSync(f, 'utf8').split('\n').length > 700 &&
      !largeFileWhitelist.some(w => f.endsWith(w))
    );
    expect(offenders).toEqual([]);
  });

  test('no hard‑coded pixel values (e.g., 12px) in source files', () => {
    const pixelRegex = /\d+px/;
    const offenders: string[] = [];
    for (const f of files) {
      const content = fs.readFileSync(f, 'utf8');
      if (pixelRegex.test(content) && !pixelWhitelist.some(w => f.endsWith(w))) {
        offenders.push(f);
      }
    }
    expect(offenders).toEqual([]);
  });
});
