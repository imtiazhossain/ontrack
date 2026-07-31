import {
  VISION_BOARD_DASHBOARD_PREVIEWS,
  VISION_BOARD_SAMPLE_IMAGE_URIS,
  visionBoardImageSource,
} from './sample';
import {
  canUseVisionBoardShowcase,
  newestFirst,
  orderedVisionBoardCategories,
} from './selectors';
import type {
  VisionBoardCategory,
  VisionBoardItem,
} from './types';

export type CardSize = 'short' | 'medium' | 'tall';
type BoardImageSource = string | number;

interface DisplayCardBase {
  id: string;
  categoryId: string;
  size: CardSize;
  preferredColumn?: 0 | 1 | 2;
}

interface DisplayImageCard extends DisplayCardBase {
  kind: 'image';
  source: BoardImageSource;
  label?: string;
}

interface DisplayQuoteCard extends DisplayCardBase {
  kind: 'quote';
  text: string;
  attribution?: string;
  dark?: boolean;
}

interface DisplayGoalCard extends DisplayCardBase {
  kind: 'goal';
  eyebrow: string;
  title: string;
  note?: string;
  support?: string;
  progress?: number;
  progressStyle?: 'ring' | 'bar';
}

export type DisplayCard = DisplayImageCard | DisplayQuoteCard | DisplayGoalCard;
export type BoardLayout = {
  heightRatio: number;
  cards: { id: string; flex: number }[];
}[];

export const CARD_GAP = 6;
export const BOARD_SIDE_PADDING = 15;
export const SIZE_RATIO: Record<CardSize, number> = {
  short: 0.7,
  medium: 1.16,
  tall: 1.43,
};

export const SHOWCASE_LAYOUT: BoardLayout = [
  {
    heightRatio: 0.46,
    cards: [
      { id: 'showcase-travel-escape', flex: 1.12 },
      { id: 'showcase-future-quote', flex: 0.92 },
      { id: 'showcase-fitness', flex: 1.12 },
    ],
  },
  {
    heightRatio: 0.44,
    cards: [
      { id: 'showcase-health-goal', flex: 0.82 },
      { id: 'showcase-dream-home', flex: 1.25 },
      { id: 'showcase-savings', flex: 0.88 },
    ],
  },
  {
    heightRatio: 0.405,
    cards: [
      { id: 'showcase-travel-mountains', flex: 1.12 },
      { id: 'showcase-career-goal', flex: 0.92 },
      { id: 'showcase-career-focus', flex: 1.12 },
    ],
  },
  {
    heightRatio: 0.19,
    cards: [
      { id: 'showcase-discipline', flex: 1.5 },
      { id: 'showcase-meditation', flex: 1 },
    ],
  },
];

export const CATEGORY_SHOWCASE_LAYOUTS: Record<string, BoardLayout> = {
  'vision-travel': [
    {
      heightRatio: 0.46,
      cards: [
        { id: 'showcase-travel-escape', flex: 1 },
        { id: 'showcase-travel-mountains', flex: 1 },
      ],
    },
  ],
  'vision-health': [
    {
      heightRatio: 0.46,
      cards: [
        { id: 'showcase-health-goal', flex: 0.82 },
        { id: 'showcase-fitness', flex: 1.12 },
      ],
    },
  ],
  'vision-home': [
    {
      heightRatio: 0.46,
      cards: [{ id: 'showcase-dream-home', flex: 1 }],
    },
  ],
  'vision-career': [
    {
      heightRatio: 0.44,
      cards: [
        { id: 'showcase-savings', flex: 0.88 },
        { id: 'showcase-career-focus', flex: 1.12 },
      ],
    },
    {
      heightRatio: 0.405,
      cards: [{ id: 'showcase-career-goal', flex: 1 }],
    },
  ],
  'vision-mindset': [
    {
      heightRatio: 0.52,
      cards: [
        { id: 'showcase-future-quote', flex: 0.92 },
        { id: 'showcase-meditation', flex: 1.12 },
      ],
    },
    {
      heightRatio: 0.24,
      cards: [
        { id: 'showcase-discipline', flex: 1.5 },
        { id: 'showcase-journal', flex: 1 },
      ],
    },
  ],
};

export const CATEGORY_PRIORITY: Record<string, number> = {
  'vision-travel': 0,
  'vision-health': 1,
  'vision-home': 2,
  'vision-career': 3,
  'vision-mindset': 4,
};

export const SHOWCASE_CARDS: DisplayCard[] = [
  {
    id: 'showcase-travel-escape',
    categoryId: 'vision-travel',
    kind: 'image',
    source: VISION_BOARD_DASHBOARD_PREVIEWS['vision-travel'].source,
    label: 'Travel',
    size: 'tall',
    preferredColumn: 0,
  },
  {
    id: 'showcase-health-goal',
    categoryId: 'vision-health',
    kind: 'goal',
    eyebrow: 'Goal',
    title: 'Run a Marathon',
    note: 'April 27, 2027',
    progress: 0.6,
    progressStyle: 'ring',
    size: 'tall',
    preferredColumn: 0,
  },
  {
    id: 'showcase-travel-mountains',
    categoryId: 'vision-travel',
    kind: 'image',
    source: visionBoardImageSource(VISION_BOARD_SAMPLE_IMAGE_URIS.mountain),
    label: 'Travel',
    size: 'tall',
    preferredColumn: 0,
  },
  {
    id: 'showcase-discipline',
    categoryId: 'vision-mindset',
    kind: 'quote',
    text: 'Discipline today creates freedom tomorrow.',
    attribution: 'Unknown',
    dark: true,
    size: 'short',
    preferredColumn: 0,
  },
  {
    id: 'showcase-future-quote',
    categoryId: 'vision-mindset',
    kind: 'quote',
    text: 'The future belongs to those who believe in the beauty of their dreams.',
    attribution: 'Eleanor Roosevelt',
    size: 'tall',
    preferredColumn: 1,
  },
  {
    id: 'showcase-dream-home',
    categoryId: 'vision-home',
    kind: 'image',
    source: VISION_BOARD_DASHBOARD_PREVIEWS['vision-home'].source,
    label: 'Dream Home',
    size: 'tall',
    preferredColumn: 1,
  },
  {
    id: 'showcase-career-goal',
    categoryId: 'vision-career',
    kind: 'goal',
    eyebrow: 'Career Goal',
    title: 'Build a Meaningful Career',
    note: 'Lead. Inspire. Impact.',
    size: 'tall',
    preferredColumn: 1,
  },
  {
    id: 'showcase-meditation',
    categoryId: 'vision-mindset',
    kind: 'image',
    source: VISION_BOARD_DASHBOARD_PREVIEWS['vision-mindset'].source,
    size: 'short',
    preferredColumn: 1,
  },
  {
    id: 'showcase-fitness',
    categoryId: 'vision-health',
    kind: 'image',
    source: VISION_BOARD_DASHBOARD_PREVIEWS['vision-health'].source,
    label: 'Fitness',
    size: 'tall',
    preferredColumn: 2,
  },
  {
    id: 'showcase-savings',
    categoryId: 'vision-career',
    kind: 'goal',
    eyebrow: 'Savings Goal',
    title: '$25,000',
    note: 'Emergency Fund',
    support: '$15,600 saved',
    progress: 0.62,
    progressStyle: 'bar',
    size: 'tall',
    preferredColumn: 2,
  },
  {
    id: 'showcase-career-focus',
    categoryId: 'vision-career',
    kind: 'image',
    source: VISION_BOARD_DASHBOARD_PREVIEWS['vision-career'].source,
    label: 'Career',
    size: 'tall',
    preferredColumn: 2,
  },
  {
    id: 'showcase-journal',
    categoryId: 'vision-mindset',
    kind: 'image',
    source: visionBoardImageSource(VISION_BOARD_SAMPLE_IMAGE_URIS.journal),
    size: 'short',
    preferredColumn: 2,
  },
];

export function isDefaultBoard(
  categories: VisionBoardCategory[],
  items: VisionBoardItem[],
) {
  return canUseVisionBoardShowcase(categories, items);
}

export function cardsFromBoard(
  categories: VisionBoardCategory[],
  items: VisionBoardItem[],
): DisplayCard[] {
  const cards: DisplayCard[] = newestFirst(items).map((item) => {
    if (item.kind === 'image') {
      return {
        id: item.id,
        categoryId: item.categoryId,
        kind: 'image',
        source: visionBoardImageSource(item.uri),
        label: item.caption,
        size:
          item.aspectRatio < 0.9
            ? 'tall'
            : item.aspectRatio > 1.28
              ? 'short'
              : 'medium',
      };
    }
    if (item.kind === 'affirmation') {
      return {
        id: item.id,
        categoryId: item.categoryId,
        kind: 'quote',
        text: item.text,
        attribution: item.attribution,
        size: item.text.length > 74 ? 'tall' : 'medium',
      };
    }
    return {
      id: item.id,
      categoryId: item.categoryId,
      kind: 'goal',
      eyebrow: 'Goal',
      title: item.title,
      note: item.note,
      size: 'medium',
    };
  });

  orderedVisionBoardCategories(categories).forEach((category) => {
    if (items.some((item) => item.categoryId === category.id && item.kind === 'image')) {
      return;
    }
    const preview =
      VISION_BOARD_DASHBOARD_PREVIEWS[
        category.id as keyof typeof VISION_BOARD_DASHBOARD_PREVIEWS
      ];
    if (!preview) return;
    cards.push({
      id: `category-preview-${category.id}`,
      categoryId: category.id,
      kind: 'image',
      source: preview.source,
      label: category.name,
      size: 'tall',
    });
  });

  return cards;
}

export function searchText(card: DisplayCard, category?: VisionBoardCategory) {
  const details =
    card.kind === 'image'
      ? card.label
      : card.kind === 'quote'
        ? `${card.text} ${card.attribution ?? ''}`
        : `${card.eyebrow} ${card.title} ${card.note ?? ''} ${card.support ?? ''}`;
  return `${category?.name ?? ''} ${details ?? ''}`.toLocaleLowerCase();
}

export function splitCards(
  cards: DisplayCard[],
  columnCount: number,
  honorPreferredColumns: boolean,
) {
  const columns = Array.from({ length: columnCount }, () => [] as DisplayCard[]);
  const heights = Array.from({ length: columnCount }, () => 0);

  cards.forEach((card) => {
    const preferred =
      honorPreferredColumns && card.preferredColumn !== undefined
        ? card.preferredColumn
        : undefined;
    const target =
      preferred !== undefined && preferred < columnCount
        ? preferred
        : heights.indexOf(Math.min(...heights));
    columns[target].push(card);
    heights[target] += SIZE_RATIO[card.size];
  });

  return columns;
}

export function packedCategoryLayout(cards: DisplayCard[]): BoardLayout {
  const rows: BoardLayout = [];
  for (let index = 0; index < cards.length; index += 2) {
    const rowCards = cards.slice(index, index + 2);
    const hasTallCard = rowCards.some((card) => card.size === 'tall');
    const hasMediumCard = rowCards.some((card) => card.size === 'medium');
    rows.push({
      heightRatio: hasTallCard ? 0.46 : hasMediumCard ? 0.36 : 0.24,
      cards: rowCards.map((card) => ({
        id: card.id,
        flex:
          card.kind === 'image'
            ? 1.12
            : card.kind === 'quote'
              ? 0.96
              : 0.88,
      })),
    });
  }
  return rows;
}

