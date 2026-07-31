import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

import { createDefaultVisionBoardCategories } from '@/features/vision-board/defaults';
import {
  VISION_BOARD_SAMPLE_CATEGORY_ID,
  VISION_BOARD_SAMPLE_ITEM_PREFIX,
  VISION_BOARD_SAMPLE_VERSION,
} from '@/features/vision-board/sample';
import type { VisionBoardAffirmationItem } from '@/features/vision-board/types';
import { STORAGE_KEYS } from '@/services/storage';
import { useVisionBoard } from '@/store/vision-board';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

function affirmation(categoryId: string): VisionBoardAffirmationItem {
  return {
    id: 'affirmation-1',
    categoryId,
    kind: 'affirmation',
    text: 'I can build this.',
    frame: {
      x: 0.1,
      y: 0.1,
      width: 0.38,
      height: 0.24,
      rotation: 0,
      zIndex: 0,
    },
    createdAt: '2026-07-29T10:00:00.000Z',
    updatedAt: '2026-07-29T10:00:00.000Z',
  };
}

describe('vision board store', () => {
  beforeEach(async () => {
    await mockAsyncStorage.clear();
    useVisionBoard.getState().reset();
  });

  it('seeds five categories with a complete editable Mindset example', () => {
    const state = useVisionBoard.getState();
    expect(state.categories.map((category) => category.name)).toEqual([
      'Mindset',
      'Health',
      'Travel',
      'Career',
      'Home',
    ]);
    expect(state.sampleVersion).toBe(VISION_BOARD_SAMPLE_VERSION);
    expect(state.items).toHaveLength(6);
    expect(
      state.items.every(
        (item) =>
          item.categoryId === VISION_BOARD_SAMPLE_CATEGORY_ID &&
          item.id.startsWith(VISION_BOARD_SAMPLE_ITEM_PREFIX),
      ),
    ).toBe(true);
    expect(new Set(state.items.map((item) => item.kind))).toEqual(
      new Set(['image', 'affirmation', 'goal']),
    );
  });

  it('persists a newly created category across rehydrate', async () => {
    const at = '2026-07-30T12:00:00.000Z';
    const categories = [
      ...createDefaultVisionBoardCategories(at),
      {
        id: 'vision-category-test',
        name: 'Test',
        intention: 'Try a new board.',
        icon: 'vision-board' as const,
        accent: 'sage' as const,
        background: 'linen' as const,
        order: 5,
        createdAt: at,
        updatedAt: at,
      },
    ];
    await mockAsyncStorage.setItem(
      STORAGE_KEYS.visionBoard,
      JSON.stringify({
        state: {
          categories,
          items: [],
          sampleVersion: VISION_BOARD_SAMPLE_VERSION,
          updatedAt: at,
        },
        version: 0,
      }),
    );

    await useVisionBoard.persist.rehydrate();

    expect(
      useVisionBoard.getState().categories.some((category) => category.id === 'vision-category-test'),
    ).toBe(true);
  });

  it('upgrades an older persisted empty board with the example once', async () => {
    const updatedAt = '2026-07-29T09:00:00.000Z';
    await mockAsyncStorage.setItem(
      STORAGE_KEYS.visionBoard,
      JSON.stringify({
        state: {
          categories: createDefaultVisionBoardCategories(updatedAt),
          items: [],
          updatedAt,
        },
        version: 0,
      }),
    );

    await useVisionBoard.persist.rehydrate();

    expect(useVisionBoard.getState().items).toHaveLength(6);
    expect(useVisionBoard.getState().sampleVersion).toBe(
      VISION_BOARD_SAMPLE_VERSION,
    );
  });

  it('adds, edits, removes, undoes, and redoes category items', () => {
    const categoryId = useVisionBoard.getState().categories[0].id;
    const item = affirmation(categoryId);

    useVisionBoard.getState().addItem(item);
    useVisionBoard.getState().updateItem(item.id, { text: 'I am building this.' });
    expect(useVisionBoard.getState().items.find((entry) => entry.id === item.id)).toMatchObject({
      text: 'I am building this.',
    });

    useVisionBoard.getState().removeItem(item.id);
    expect(useVisionBoard.getState().items.some((entry) => entry.id === item.id)).toBe(false);
    useVisionBoard.getState().undoCategory(categoryId);
    expect(useVisionBoard.getState().items.find((entry) => entry.id === item.id)).toMatchObject({
      id: item.id,
      text: 'I am building this.',
    });
    useVisionBoard.getState().redoCategory(categoryId);
    expect(useVisionBoard.getState().items.some((entry) => entry.id === item.id)).toBe(false);
  });

  it('clamps transforms to the finite poster', () => {
    const categoryId = useVisionBoard.getState().categories[0].id;
    const item = affirmation(categoryId);
    useVisionBoard.getState().addItem(item);

    useVisionBoard.getState().updateItemFrame(item.id, {
      x: -2,
      y: 4,
      width: 2,
      height: 0.01,
      rotation: 725,
      zIndex: -4,
    });

    expect(useVisionBoard.getState().items.find((entry) => entry.id === item.id)?.frame).toEqual({
      x: 0,
      y: 0.88,
      width: 0.72,
      height: 0.12,
      rotation: 5,
      zIndex: 0,
    });
  });

  it('does not add history for a no-op frame update', () => {
    const categoryId = useVisionBoard.getState().categories[0].id;
    const item = affirmation(categoryId);
    useVisionBoard.getState().addItem(item);
    const historyLength = useVisionBoard.getState().history[categoryId].past.length;

    useVisionBoard.getState().updateItemFrame(item.id, item.frame);

    expect(useVisionBoard.getState().history[categoryId].past).toHaveLength(historyLength);
  });

  it('replaces local data with a cloud payload and clears editing history', () => {
    const categories = createDefaultVisionBoardCategories('2026-07-29T09:00:00.000Z');
    const item = affirmation(categories[1].id);
    useVisionBoard.getState().addItem(item);

    useVisionBoard.getState().replaceVisionBoardData(
      categories,
      [item],
      '2026-07-29T11:00:00.000Z',
      VISION_BOARD_SAMPLE_VERSION,
    );

    expect(useVisionBoard.getState()).toMatchObject({
      categories,
      items: [item],
      sampleVersion: VISION_BOARD_SAMPLE_VERSION,
      updatedAt: '2026-07-29T11:00:00.000Z',
      history: {},
    });
  });

  it('reorders and deletes categories with their contents', () => {
    const state = useVisionBoard.getState();
    const first = state.categories[0];
    const second = state.categories[1];
    state.addItem(affirmation(first.id));
    state.reorderCategories([second.id, first.id, ...state.categories.slice(2).map((item) => item.id)]);

    expect(
      [...useVisionBoard.getState().categories]
        .sort((a, b) => a.order - b.order)
        .slice(0, 2)
        .map((item) => item.id),
    ).toEqual([second.id, first.id]);

    useVisionBoard.getState().removeCategory(first.id);
    expect(useVisionBoard.getState().categories.some((item) => item.id === first.id)).toBe(false);
    expect(useVisionBoard.getState().items).toEqual([]);
  });
});
