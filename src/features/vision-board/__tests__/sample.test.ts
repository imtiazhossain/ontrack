import { createDefaultVisionBoardCategories } from '../defaults';
import {
  createSampleVisionBoardItems,
  upgradeVisionBoardSample,
  VISION_BOARD_SAMPLE_CATEGORY_ID,
  VISION_BOARD_SAMPLE_VERSION,
} from '../sample';
import type { VisionBoardAffirmationItem } from '../types';

const timestamp = '2026-07-29T10:00:00.000Z';

describe('vision board sample', () => {
  it('adds the example to an older empty Mindset board', () => {
    const categories = createDefaultVisionBoardCategories(timestamp);
    const upgraded = upgradeVisionBoardSample(categories, [], 0, timestamp);

    expect(upgraded.sampleVersion).toBe(VISION_BOARD_SAMPLE_VERSION);
    expect(upgraded.items).toEqual(createSampleVisionBoardItems(timestamp));
  });

  it('does not mix the example into a Mindset board that already has content', () => {
    const categories = createDefaultVisionBoardCategories(timestamp);
    const item: VisionBoardAffirmationItem = {
      id: 'personal-affirmation',
      categoryId: VISION_BOARD_SAMPLE_CATEGORY_ID,
      kind: 'affirmation',
      text: 'This board is already mine.',
      frame: {
        x: 0.1,
        y: 0.1,
        width: 0.4,
        height: 0.2,
        rotation: 0,
        zIndex: 0,
      },
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    expect(upgradeVisionBoardSample(categories, [item], 0, timestamp)).toEqual({
      items: [item],
      sampleVersion: VISION_BOARD_SAMPLE_VERSION,
    });
  });

  it('refreshes an older untouched sample without replacing personal content', () => {
    const categories = createDefaultVisionBoardCategories(timestamp);
    const olderSample = createSampleVisionBoardItems(timestamp).map((item) =>
      item.id === 'vision-sample-future-affirmation' &&
      item.kind === 'affirmation'
        ? {
            ...item,
            text: 'I am becoming the person my future needs.',
            attribution: 'Daily intention',
          }
        : item,
    );

    expect(
      upgradeVisionBoardSample(categories, olderSample, 2, timestamp),
    ).toEqual({
      items: createSampleVisionBoardItems(timestamp),
      sampleVersion: VISION_BOARD_SAMPLE_VERSION,
    });
  });

  it('does not restore an example the user already removed', () => {
    const categories = createDefaultVisionBoardCategories(timestamp);
    expect(
      upgradeVisionBoardSample(
        categories,
        [],
        VISION_BOARD_SAMPLE_VERSION,
        timestamp,
      ),
    ).toEqual({
      items: [],
      sampleVersion: VISION_BOARD_SAMPLE_VERSION,
    });
  });
});
