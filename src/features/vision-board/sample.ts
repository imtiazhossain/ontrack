import type {
  VisionBoardCategory,
  VisionBoardItem,
} from './types';

export const VISION_BOARD_SAMPLE_VERSION = 3;
export const VISION_BOARD_SAMPLE_CATEGORY_ID = 'vision-mindset';
export const VISION_BOARD_SAMPLE_ITEM_PREFIX = 'vision-sample-';

export const VISION_BOARD_DASHBOARD_PREVIEWS = {
  'vision-mindset': {
    source: require('../../../assets/images/vision-board/preview-mindset.jpg'),
    progress: 75,
  },
  'vision-health': {
    source: require('../../../assets/images/vision-board/preview-health.jpg'),
    progress: 60,
  },
  'vision-travel': {
    source: require('../../../assets/images/vision-board/preview-travel.jpg'),
    progress: 40,
  },
  'vision-career': {
    source: require('../../../assets/images/vision-board/preview-career.jpg'),
    progress: 80,
  },
  'vision-home': {
    source: require('../../../assets/images/vision-board/preview-home.jpg'),
    progress: 65,
  },
} as const;

export const VISION_BOARD_SAMPLE_IMAGE_URIS = {
  mountain: 'sample://vision-board/mountain-meditation',
  journal: 'sample://vision-board/journal',
  forest: 'sample://vision-board/forest-path',
} as const;

export function visionBoardImageSource(uri: string) {
  switch (uri) {
    case VISION_BOARD_SAMPLE_IMAGE_URIS.mountain:
      return require('../../../assets/images/vision-board/sample-mountain-meditation.jpg');
    case VISION_BOARD_SAMPLE_IMAGE_URIS.journal:
      return require('../../../assets/images/vision-board/sample-journal.jpg');
    case VISION_BOARD_SAMPLE_IMAGE_URIS.forest:
      return require('../../../assets/images/vision-board/sample-forest-path.jpg');
    default:
      return uri;
  }
}

export function isSampleVisionBoardItem(item: VisionBoardItem) {
  return item.id.startsWith(VISION_BOARD_SAMPLE_ITEM_PREFIX);
}

function itemTimestamp(timestamp: string, minutesBefore: number) {
  const date = new Date(timestamp);
  date.setMinutes(date.getMinutes() - minutesBefore);
  return date.toISOString();
}

export function createSampleVisionBoardItems(
  timestamp = new Date().toISOString(),
): VisionBoardItem[] {
  const time = (minutesBefore: number) => itemTimestamp(timestamp, minutesBefore);
  return [
    {
      id: `${VISION_BOARD_SAMPLE_ITEM_PREFIX}forest`,
      categoryId: VISION_BOARD_SAMPLE_CATEGORY_ID,
      kind: 'image',
      uri: VISION_BOARD_SAMPLE_IMAGE_URIS.forest,
      aspectRatio: 0.8,
      caption: 'Keep choosing the next step',
      frame: {
        x: 0.53,
        y: 0.57,
        width: 0.42,
        height: 0.38,
        rotation: 2,
        zIndex: 0,
      },
      createdAt: time(7),
      updatedAt: time(7),
    },
    {
      id: `${VISION_BOARD_SAMPLE_ITEM_PREFIX}journal`,
      categoryId: VISION_BOARD_SAMPLE_CATEGORY_ID,
      kind: 'image',
      uri: VISION_BOARD_SAMPLE_IMAGE_URIS.journal,
      aspectRatio: 1.5,
      caption: 'Make space to hear yourself',
      frame: {
        x: 0.05,
        y: 0.37,
        width: 0.43,
        height: 0.27,
        rotation: 1,
        zIndex: 1,
      },
      createdAt: time(6),
      updatedAt: time(6),
    },
    {
      id: `${VISION_BOARD_SAMPLE_ITEM_PREFIX}steady-affirmation`,
      categoryId: VISION_BOARD_SAMPLE_CATEGORY_ID,
      kind: 'affirmation',
      text: 'Small, steady steps are changing my life.',
      frame: {
        x: 0.52,
        y: 0.31,
        width: 0.43,
        height: 0.22,
        rotation: -1,
        zIndex: 2,
      },
      createdAt: time(4),
      updatedAt: time(4),
    },
    {
      id: `${VISION_BOARD_SAMPLE_ITEM_PREFIX}morning-goal`,
      categoryId: VISION_BOARD_SAMPLE_CATEGORY_ID,
      kind: 'goal',
      title: 'Protect my morning',
      note: 'Journal before I check my phone.',
      frame: {
        x: 0.55,
        y: 0.05,
        width: 0.4,
        height: 0.25,
        rotation: 1.5,
        zIndex: 3,
      },
      createdAt: time(3),
      updatedAt: time(3),
    },
    {
      id: `${VISION_BOARD_SAMPLE_ITEM_PREFIX}mountain`,
      categoryId: VISION_BOARD_SAMPLE_CATEGORY_ID,
      kind: 'image',
      uri: VISION_BOARD_SAMPLE_IMAGE_URIS.mountain,
      aspectRatio: 1.5,
      caption: 'Begin from a place of calm',
      frame: {
        x: 0.04,
        y: 0.04,
        width: 0.47,
        height: 0.29,
        rotation: -2,
        zIndex: 4,
      },
      createdAt: time(2),
      updatedAt: time(2),
    },
    {
      id: `${VISION_BOARD_SAMPLE_ITEM_PREFIX}future-affirmation`,
      categoryId: VISION_BOARD_SAMPLE_CATEGORY_ID,
      kind: 'affirmation',
      text: 'I am becoming the best version of myself.',
      frame: {
        x: 0.06,
        y: 0.68,
        width: 0.43,
        height: 0.25,
        rotation: 1,
        zIndex: 5,
      },
      createdAt: time(1),
      updatedAt: time(1),
    },
  ];
}

export function upgradeVisionBoardSample(
  categories: VisionBoardCategory[],
  items: VisionBoardItem[],
  sampleVersion: number,
  timestamp = new Date().toISOString(),
) {
  if (sampleVersion >= VISION_BOARD_SAMPLE_VERSION) {
    return { items, sampleVersion };
  }
  if (sampleVersion > 0) {
    const containsOnlySampleItems =
      items.length > 0 && items.every(isSampleVisionBoardItem);
    return {
      items: containsOnlySampleItems ? createSampleVisionBoardItems(timestamp) : items,
      sampleVersion: VISION_BOARD_SAMPLE_VERSION,
    };
  }
  const canSeed =
    categories.some((category) => category.id === VISION_BOARD_SAMPLE_CATEGORY_ID) &&
    !items.some((item) => item.categoryId === VISION_BOARD_SAMPLE_CATEGORY_ID);
  return {
    items: canSeed ? [...items, ...createSampleVisionBoardItems(timestamp)] : items,
    sampleVersion: VISION_BOARD_SAMPLE_VERSION,
  };
}

function sameFrame(left: VisionBoardItem, right: VisionBoardItem) {
  return (
    left.frame.x === right.frame.x &&
    left.frame.y === right.frame.y &&
    left.frame.width === right.frame.width &&
    left.frame.height === right.frame.height &&
    left.frame.rotation === right.frame.rotation &&
    left.frame.zIndex === right.frame.zIndex
  );
}

function sameSampleContent(item: VisionBoardItem, sampleItem: VisionBoardItem) {
  if (
    item.id !== sampleItem.id ||
    item.categoryId !== sampleItem.categoryId ||
    item.kind !== sampleItem.kind ||
    !sameFrame(item, sampleItem)
  ) {
    return false;
  }
  if (item.kind === 'image' && sampleItem.kind === 'image') {
    return (
      item.uri === sampleItem.uri &&
      item.aspectRatio === sampleItem.aspectRatio &&
      item.caption === sampleItem.caption
    );
  }
  if (item.kind === 'affirmation' && sampleItem.kind === 'affirmation') {
    return (
      item.text === sampleItem.text &&
      item.attribution === sampleItem.attribution
    );
  }
  if (item.kind === 'goal' && sampleItem.kind === 'goal') {
    return item.title === sampleItem.title && item.note === sampleItem.note;
  }
  return false;
}

function matchesSampleItems(
  items: VisionBoardItem[],
  expected: VisionBoardItem[],
) {
  if (items.length !== expected.length) return false;
  const byId = new Map(items.map((item) => [item.id, item]));
  return expected.every((sampleItem) => {
    const item = byId.get(sampleItem.id);
    return item ? sameSampleContent(item, sampleItem) : false;
  });
}

export function hasCustomizedVisionBoardItems(items: VisionBoardItem[]) {
  const expected = createSampleVisionBoardItems('2026-01-01T12:00:00.000Z');
  return !matchesSampleItems(items, expected);
}
