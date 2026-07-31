import {
  canUseVisionBoardShowcase,
  categoryCover,
  countVisionBoardItems,
  hasCustomizedVisionBoardCategories,
  hasCustomizedVisionBoardItems,
  newestVisionBoardItem,
  splitMasonryColumns,
} from '../selectors';
import { createDefaultVisionBoardCategories } from '../defaults';
import { createSampleVisionBoardItems } from '../sample';
import type { VisionBoardCategory, VisionBoardItem } from '../types';

const frame = {
  x: 0,
  y: 0,
  width: 0.3,
  height: 0.3,
  rotation: 0,
  zIndex: 0,
};

const items: VisionBoardItem[] = [
  {
    id: 'image-old',
    categoryId: 'category-a',
    kind: 'image',
    uri: 'file:///old.jpg',
    aspectRatio: 1.4,
    frame,
    createdAt: '2026-07-29T08:00:00.000Z',
    updatedAt: '2026-07-29T08:00:00.000Z',
  },
  {
    id: 'affirmation',
    categoryId: 'category-a',
    kind: 'affirmation',
    text: 'Keep going.',
    frame,
    createdAt: '2026-07-29T09:00:00.000Z',
    updatedAt: '2026-07-29T09:00:00.000Z',
  },
  {
    id: 'goal',
    categoryId: 'category-a',
    kind: 'goal',
    title: 'Run a marathon',
    frame,
    createdAt: '2026-07-29T10:00:00.000Z',
    updatedAt: '2026-07-29T10:00:00.000Z',
  },
  {
    id: 'image-new',
    categoryId: 'category-a',
    kind: 'image',
    uri: 'file:///new.jpg',
    aspectRatio: 0.8,
    frame,
    createdAt: '2026-07-29T11:00:00.000Z',
    updatedAt: '2026-07-29T11:00:00.000Z',
  },
];

describe('vision board selectors', () => {
  it('derives item counts and the newest hero content', () => {
    expect(countVisionBoardItems(items)).toEqual({
      image: 2,
      affirmation: 1,
      goal: 1,
      total: 4,
    });
    expect(newestVisionBoardItem(items, 'affirmation')?.id).toBe('affirmation');
    expect(categoryCover(items, 'category-a')?.id).toBe('image-new');
  });

  it('balances every item into two masonry columns newest first', () => {
    const columns = splitMasonryColumns(items);
    expect(columns.flat()).toHaveLength(items.length);
    expect(new Set(columns.flat().map((item) => item.id)).size).toBe(items.length);
    expect(columns[0][0].id).toBe('image-new');
  });

  it('detects category-only changes for account conflict handling', () => {
    const categories = createDefaultVisionBoardCategories('2026-07-29T08:00:00.000Z');
    expect(hasCustomizedVisionBoardCategories(categories)).toBe(false);

    const renamed: VisionBoardCategory[] = categories.map((category, index) =>
      index === 0 ? { ...category, name: 'Inner Growth' } : category,
    );
    expect(hasCustomizedVisionBoardCategories(renamed)).toBe(true);
    expect(hasCustomizedVisionBoardCategories(categories.slice(1))).toBe(true);
  });

  it('treats the bundled example as default data until a user changes it', () => {
    const sample = createSampleVisionBoardItems('2026-07-29T08:00:00.000Z');
    expect(hasCustomizedVisionBoardItems(sample)).toBe(false);

    const moved = sample.map((item, index) =>
      index === 0
        ? { ...item, frame: { ...item.frame, x: item.frame.x - 0.05 } }
        : item,
    );
    expect(hasCustomizedVisionBoardItems(moved)).toBe(true);
    expect(hasCustomizedVisionBoardItems(sample.slice(1))).toBe(true);
  });

  it('keeps the consolidated showcase when an extra category is added', () => {
    const at = '2026-07-29T08:00:00.000Z';
    const categories = createDefaultVisionBoardCategories(at);
    const items = createSampleVisionBoardItems(at);
    expect(canUseVisionBoardShowcase(categories, items)).toBe(true);

    const withExtra: VisionBoardCategory[] = [
      ...categories,
      {
        id: 'vision-category-test',
        name: 'Test',
        intention: 'Try a new board.',
        icon: 'vision-board',
        accent: 'sage',
        background: 'linen',
        order: categories.length,
        createdAt: at,
        updatedAt: at,
      },
    ];
    expect(hasCustomizedVisionBoardCategories(withExtra)).toBe(true);
    expect(canUseVisionBoardShowcase(withExtra, items)).toBe(true);
    expect(
      canUseVisionBoardShowcase(categories.slice(1), items),
    ).toBe(false);
    expect(
      canUseVisionBoardShowcase(
        withExtra,
        items.map((item, index) =>
          index === 0
            ? { ...item, frame: { ...item.frame, x: item.frame.x - 0.05 } }
            : item,
        ),
      ),
    ).toBe(false);
  });
});
