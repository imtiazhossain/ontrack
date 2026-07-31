import type {
  VisionBoardCategory,
  VisionBoardImageItem,
  VisionBoardItem,
} from './types';
import { DEFAULT_VISION_BOARD_CATEGORY_DATA } from './defaults';
import { hasCustomizedVisionBoardItems } from './sample';
export { hasCustomizedVisionBoardItems } from './sample';

export interface VisionBoardItemCounts {
  image: number;
  affirmation: number;
  goal: number;
  total: number;
}

export function itemsForCategory(items: VisionBoardItem[], categoryId: string) {
  return items.filter((item) => item.categoryId === categoryId);
}

export function countVisionBoardItems(items: VisionBoardItem[]): VisionBoardItemCounts {
  const counts: VisionBoardItemCounts = { image: 0, affirmation: 0, goal: 0, total: 0 };
  items.forEach((item) => {
    counts[item.kind] += 1;
    counts.total += 1;
  });
  return counts;
}

export function newestVisionBoardItem<T extends VisionBoardItem>(
  items: VisionBoardItem[],
  kind: T['kind'],
): T | undefined {
  return [...items]
    .filter((item): item is T => item.kind === kind)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}

export function categoryCover(items: VisionBoardItem[], categoryId: string) {
  return newestVisionBoardItem<VisionBoardImageItem>(
    items.filter((item) => item.categoryId === categoryId),
    'image',
  );
}

export function orderedVisionBoardCategories(categories: VisionBoardCategory[]) {
  return [...categories].sort((a, b) => a.order - b.order);
}

export function hasCustomizedVisionBoardCategories(
  categories: VisionBoardCategory[],
) {
  const ordered = orderedVisionBoardCategories(categories);
  if (ordered.length !== DEFAULT_VISION_BOARD_CATEGORY_DATA.length) return true;
  return ordered.some((category, index) => {
    const defaultCategory = DEFAULT_VISION_BOARD_CATEGORY_DATA[index];
    return (
      category.id !== defaultCategory.id ||
      category.name !== defaultCategory.name ||
      category.intention !== defaultCategory.intention ||
      category.icon !== defaultCategory.icon ||
      category.accent !== defaultCategory.accent ||
      category.background !== defaultCategory.background ||
      category.order !== index
    );
  });
}

/** Showcase all-view stays until sample items change or a default category is removed. */
export function canUseVisionBoardShowcase(
  categories: VisionBoardCategory[],
  items: VisionBoardItem[],
) {
  if (hasCustomizedVisionBoardItems(items)) return false;
  const ids = new Set(categories.map((category) => category.id));
  return DEFAULT_VISION_BOARD_CATEGORY_DATA.every((category) =>
    ids.has(category.id),
  );
}

export function newestFirst(items: VisionBoardItem[]) {
  return [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function splitMasonryColumns(items: VisionBoardItem[]) {
  const columns: [VisionBoardItem[], VisionBoardItem[]] = [[], []];
  const heights = [0, 0];
  newestFirst(items).forEach((item) => {
    const index = heights[0] <= heights[1] ? 0 : 1;
    columns[index].push(item);
    heights[index] += masonryWeight(item);
  });
  return columns;
}

function masonryWeight(item: VisionBoardItem) {
  if (item.kind === 'image') return Math.min(1.55, Math.max(0.8, 1 / item.aspectRatio));
  if (item.kind === 'affirmation') return 1.05;
  return 0.9;
}
