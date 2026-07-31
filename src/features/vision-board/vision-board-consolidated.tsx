import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AppText,
  appPrompt,
  EmptyState,
  IconButton,
  ProgressRing,
  Symbol,
} from '@/components/primitives';
import {
  fontFamilies,
  layout,
  radii,
  spacing,
  type AppIconName,
} from '@/design-system';
import { useTheme } from '@/hooks/use-theme';
import { useUI } from '@/store/ui';
import { useVisionBoard } from '@/store/vision-board';
import { haptics } from '@/utils/haptics';

import { VISION_BOARD_ACCENTS } from './defaults';
import {
  VISION_BOARD_DASHBOARD_PREVIEWS,
  VISION_BOARD_SAMPLE_IMAGE_URIS,
  visionBoardImageSource,
} from './sample';
import {
  hasCustomizedVisionBoardCategories,
  hasCustomizedVisionBoardItems,
  newestFirst,
  orderedVisionBoardCategories,
} from './selectors';
import type {
  VisionBoardCategory,
  VisionBoardItem,
} from './types';

type CardSize = 'short' | 'medium' | 'tall';
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

type DisplayCard = DisplayImageCard | DisplayQuoteCard | DisplayGoalCard;
type BoardLayout = {
  heightRatio: number;
  cards: { id: string; flex: number }[];
}[];

const CARD_GAP = 6;
const BOARD_SIDE_PADDING = 15;
const SIZE_RATIO: Record<CardSize, number> = {
  short: 0.7,
  medium: 1.16,
  tall: 1.43,
};

const SHOWCASE_LAYOUT: BoardLayout = [
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

const CATEGORY_SHOWCASE_LAYOUTS: Record<string, BoardLayout> = {
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

const CATEGORY_PRIORITY: Record<string, number> = {
  'vision-travel': 0,
  'vision-health': 1,
  'vision-home': 2,
  'vision-career': 3,
  'vision-mindset': 4,
};

const SHOWCASE_CARDS: DisplayCard[] = [
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

function isDefaultBoard(
  categories: VisionBoardCategory[],
  items: VisionBoardItem[],
) {
  return (
    !hasCustomizedVisionBoardCategories(categories) &&
    !hasCustomizedVisionBoardItems(items)
  );
}

function cardsFromBoard(
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

function searchText(card: DisplayCard, category?: VisionBoardCategory) {
  const details =
    card.kind === 'image'
      ? card.label
      : card.kind === 'quote'
        ? `${card.text} ${card.attribution ?? ''}`
        : `${card.eyebrow} ${card.title} ${card.note ?? ''} ${card.support ?? ''}`;
  return `${category?.name ?? ''} ${details ?? ''}`.toLocaleLowerCase();
}

function splitCards(
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

function packedCategoryLayout(cards: DisplayCard[]): BoardLayout {
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

export function VisionBoardConsolidated() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const measuredTabBarHeight = useUI((state) => state.tabBarHeight);
  const tabBarHeight =
    measuredTabBarHeight ||
    layout.floatingTabBarBaseHeight + insets.bottom;
  const { width: windowWidth } = useWindowDimensions();
  const categories = useVisionBoard((state) => state.categories);
  const items = useVisionBoard((state) => state.items);
  const notifyPageInteraction = useUI((state) => state.notifyPageInteraction);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [searchVisible, setSearchVisible] = useState(false);
  const [query, setQuery] = useState('');

  const orderedCategories = useMemo(
    () =>
      orderedVisionBoardCategories(categories).sort(
        (left, right) =>
          (CATEGORY_PRIORITY[left.id] ?? 99) -
            (CATEGORY_PRIORITY[right.id] ?? 99) ||
          left.order - right.order,
      ),
    [categories],
  );
  const categoriesById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );
  const displayCards = useMemo(
    () =>
      isDefaultBoard(categories, items)
        ? SHOWCASE_CARDS
        : cardsFromBoard(categories, items),
    [categories, items],
  );
  const filteredCards = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return displayCards.filter((card) => {
      if (
        selectedCategoryId !== 'all' &&
        card.categoryId !== selectedCategoryId
      ) {
        return false;
      }
      return (
        normalizedQuery.length === 0 ||
        searchText(card, categoriesById.get(card.categoryId)).includes(
          normalizedQuery,
        )
      );
    });
  }, [categoriesById, displayCards, query, selectedCategoryId]);

  const columnCount = windowWidth < 360 ? 2 : 3;
  const boardWidth = Math.min(windowWidth - BOARD_SIDE_PADDING * 2, 690);
  const cardWidth =
    (boardWidth - CARD_GAP * (columnCount - 1)) / columnCount;
  const columns = useMemo(
    () =>
      splitCards(
        filteredCards,
        columnCount,
        columnCount === 3 &&
          selectedCategoryId === 'all' &&
          query.trim().length === 0 &&
          isDefaultBoard(categories, items),
      ),
    [
      categories,
      columnCount,
      filteredCards,
      items,
      query,
      selectedCategoryId,
    ],
  );
  const activeLayout =
    columnCount === 3
      ? selectedCategoryId !== 'all'
        ? query.trim().length === 0 && isDefaultBoard(categories, items)
          ? CATEGORY_SHOWCASE_LAYOUTS[selectedCategoryId] ??
            packedCategoryLayout(filteredCards)
          : packedCategoryLayout(filteredCards)
        : query.trim().length === 0 && isDefaultBoard(categories, items)
          ? SHOWCASE_LAYOUT
          : undefined
      : undefined;

  const openCategory = (categoryId: string) => {
    router.push(`/vision-board/${categoryId}` as never);
  };

  const showCategoryChooser = () => {
    if (selectedCategoryId !== 'all') {
      openCategory(selectedCategoryId);
      return;
    }
    if (orderedCategories.length === 0) {
      router.push('/vision-board/category-editor' as never);
      return;
    }
    if (Platform.OS === 'ios') {
      appPrompt.actionSheet(
        {
          title: 'Add to a vision board',
          message: 'Choose the category you want to build out.',
          options: ['Cancel', ...orderedCategories.map((category) => category.name)],
          cancelButtonIndex: 0,
        },
        (index) => {
          const category = orderedCategories[index - 1];
          if (category) openCategory(category.id);
        },
      );
      return;
    }
    appPrompt.alert(
      'Add to a vision board',
      'Choose a category.',
      [
        ...orderedCategories.map((category) => ({
          text: category.name,
          onPress: () => openCategory(category.id),
        })),
        { text: 'Cancel', style: 'cancel' as const },
      ],
    );
  };

  const showHeaderMenu = () => {
    const addCategory = () =>
      router.push('/vision-board/category-editor' as never);
    const openCategories = () =>
      router.push('/(tabs)/vision-board/categories' as never);
    const backToToday = () => router.replace('/(tabs)' as never);
    if (Platform.OS === 'ios') {
      appPrompt.actionSheet(
        {
          title: 'Vision Board',
          options: ['Cancel', 'Category list', 'Add category', 'Back to Today'],
          cancelButtonIndex: 0,
        },
        (index) => {
          if (index === 1) openCategories();
          if (index === 2) addCategory();
          if (index === 3) backToToday();
        },
      );
      return;
    }
    appPrompt.alert('Vision Board', undefined, [
      { text: 'Category list', onPress: openCategories },
      { text: 'Add category', onPress: addCategory },
      { text: 'Back to Today', onPress: backToToday },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <View
      onTouchStart={notifyPageInteraction}
      style={[
        styles.root,
        { backgroundColor: theme.backgroundPrimary },
      ]}>
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: spacing.xl,
          },
        ]}>
        <View style={[styles.header, { width: boardWidth }]}>
          <View style={styles.headerCopy}>
            <AppText style={styles.title}>Vision Board</AppText>
            <AppText style={styles.subtitle} color="secondary">
              Visualize. Believe. Achieve.
            </AppText>
          </View>
          <View style={styles.headerActions}>
            <IconButton
              icon="search"
              size={36}
              background="transparent"
              borderColor={theme.separator}
              accessibilityLabel={
                searchVisible ? 'Close vision board search' : 'Search vision board'
              }
              onPress={() => {
                setSearchVisible((visible) => {
                  if (visible) setQuery('');
                  return !visible;
                });
              }}
            />
            <IconButton
              icon="more"
              size={36}
              background="transparent"
              borderColor={theme.separator}
              accessibilityLabel="Vision board options"
              onPress={showHeaderMenu}
            />
          </View>
        </View>

        {searchVisible ? (
          <View
            style={[
              styles.searchBar,
              {
                width: boardWidth,
                backgroundColor: theme.backgroundElevated,
                borderColor: theme.separator,
              },
            ]}>
            <Symbol name="search" size={17} color={theme.textTertiary} />
            <TextInput
              autoFocus
              accessibilityLabel="Search vision board"
              value={query}
              onChangeText={setQuery}
              placeholder="Search your vision..."
              placeholderTextColor={theme.textTertiary}
              returnKeyType="search"
              style={[styles.searchInput, { color: theme.textPrimary }]}
            />
            {query.length > 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear search"
                hitSlop={8}
                onPress={() => setQuery('')}>
                <Symbol name="close" size={15} color={theme.textSecondary} />
              </Pressable>
            ) : null}
          </View>
        ) : null}

        <View style={{ width: boardWidth }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filters}>
            <FilterChip
              label="All"
              icon="vision-board"
              selected={selectedCategoryId === 'all'}
              onPress={() => setSelectedCategoryId('all')}
            />
            {orderedCategories.map((category) => (
              <FilterChip
                key={category.id}
                label={category.name}
                icon={category.icon}
                selected={selectedCategoryId === category.id}
                onPress={() => setSelectedCategoryId(category.id)}
              />
            ))}
          </ScrollView>
        </View>

        {filteredCards.length === 0 ? (
          <View style={[styles.empty, { width: boardWidth }]}>
            <EmptyState
              icon="search"
              title="No inspiration found"
              message="Try another category or search term."
              actionLabel="Show all"
              onAction={() => {
                setSelectedCategoryId('all');
                setQuery('');
              }}
            />
          </View>
        ) : activeLayout ? (
          <View style={[styles.mosaic, { width: boardWidth }]}>
            {activeLayout.map((row, rowIndex) => {
              const rowGapWidth = CARD_GAP * (row.cards.length - 1);
              const totalFlex = row.cards.reduce(
                (total, layoutCard) => total + layoutCard.flex,
                0,
              );
              const rowHeight = Math.round(boardWidth * row.heightRatio);
              return (
                <View
                  key={rowIndex}
                  style={[styles.mosaicRow, { height: rowHeight }]}>
                  {row.cards.map((layoutCard) => {
                    const card = displayCards.find(
                      (candidate) => candidate.id === layoutCard.id,
                    );
                    if (!card) return null;
                    const category = categoriesById.get(card.categoryId);
                    if (!category) return null;
                    const width =
                      ((boardWidth - rowGapWidth) * layoutCard.flex) / totalFlex;
                    return (
                      <BoardCard
                        key={card.id}
                        card={card}
                        category={category}
                        width={width}
                        height={rowHeight}
                        onPress={() => openCategory(category.id)}
                      />
                    );
                  })}
                </View>
              );
            })}
          </View>
        ) : (
          <View style={[styles.columns, { width: boardWidth }]}>
            {columns.map((column, columnIndex) => (
              <View key={columnIndex} style={styles.column}>
                {column.map((card) => {
                  const category = categoriesById.get(card.categoryId);
                  if (!category) return null;
                  return (
                    <BoardCard
                      key={card.id}
                      card={card}
                      category={category}
                      width={cardWidth}
                      onPress={() => openCategory(category.id)}
                    />
                  );
                })}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {selectedCategoryId !== 'all' ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Add to ${categoriesById.get(selectedCategoryId)?.name ?? 'vision board'}`}
          onPress={() => {
            haptics.tap();
            showCategoryChooser();
          }}
          style={({ pressed }) => [
            styles.floatingButton,
            {
              bottom: tabBarHeight + spacing.md,
              backgroundColor: '#9A7654',
              opacity: pressed ? 0.82 : 1,
              transform: [{ scale: pressed ? 0.96 : 1 }],
            },
          ]}>
          <Symbol name="add" size={31} color="#FFFFFF" />
        </Pressable>
      ) : null}
    </View>
  );
}

function FilterChip({
  label,
  icon,
  selected,
  onPress,
}: {
  label: string;
  icon: AppIconName;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      onPress={() => {
        haptics.select();
        onPress();
      }}
      style={({ pressed }) => [
        styles.filterChip,
        {
          backgroundColor: selected ? '#9A7654' : 'transparent',
          borderColor: selected ? '#9A7654' : theme.separator,
          opacity: pressed ? 0.72 : 1,
        },
      ]}>
      <Symbol
        name={icon}
        size={12}
        color={selected ? '#FFFFFF' : theme.textPrimary}
      />
      <AppText
        style={[
          styles.filterLabel,
          { color: selected ? '#FFFFFF' : theme.textPrimary },
        ]}>
        {label}
      </AppText>
    </Pressable>
  );
}

function BoardCard({
  card,
  category,
  width,
  height: heightOverride,
  onPress,
}: {
  card: DisplayCard;
  category: VisionBoardCategory;
  width: number;
  height?: number;
  onPress: () => void;
}) {
  const theme = useTheme();
  const accentPreset = VISION_BOARD_ACCENTS[category.accent];
  const accent = theme.name === 'light' ? accentPreset.light : accentPreset.dark;
  const tint =
    theme.name === 'light' ? accentPreset.tintLight : accentPreset.tintDark;
  const height = heightOverride ?? Math.round(width * SIZE_RATIO[card.size]);
  const cardStyle = [
    styles.boardCard,
    {
      width,
      height,
      backgroundColor: theme.backgroundElevated,
    },
  ];

  if (card.kind === 'image') {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open ${category.name} vision board`}
        onPress={onPress}
        style={({ pressed }) => [
          cardStyle,
          { opacity: pressed ? 0.86 : 1 },
        ]}>
        <Image
          source={card.source}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={160}
          accessibilityLabel={
            card.label
              ? `${card.label} inspiration`
              : `${category.name} inspiration`
          }
        />
      </Pressable>
    );
  }

  if (card.kind === 'quote') {
    const dark = card.dark === true;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open ${category.name} vision board`}
        onPress={onPress}
        style={({ pressed }) => [
          cardStyle,
          styles.textCard,
          dark && styles.compactTextCard,
          {
            backgroundColor: dark ? '#303636' : theme.backgroundElevated,
            opacity: pressed ? 0.86 : 1,
          },
        ]}>
        <AppText
          style={[
            styles.quoteMark,
            dark && styles.compactQuoteMark,
            { color: dark ? '#FFFFFF' : theme.textPrimary },
          ]}>
          “
        </AppText>
        <AppText
          style={[
            styles.quoteText,
            {
              color: dark ? '#FFFFFF' : theme.textPrimary,
              fontSize: dark
                ? Math.min(17, Math.max(11.5, width * 0.057))
                : Math.min(18, Math.max(11.5, width * 0.105)),
              lineHeight: dark
                ? Math.min(22, Math.max(15, width * 0.072))
                : Math.min(23, Math.max(14.5, width * 0.135)),
            },
            dark && styles.compactQuoteText,
          ]}
          numberOfLines={dark ? 2 : 6}
          adjustsFontSizeToFit
          minimumFontScale={0.78}
          align="center">
          {card.text}
        </AppText>
        {card.attribution ? (
          <AppText
            style={[
              styles.quoteAttribution,
              { color: dark ? 'rgba(255,255,255,0.72)' : theme.textSecondary },
            ]}
            align="center">
            — {card.attribution}
          </AppText>
        ) : null}
        {!dark ? (
          <Symbol
            name="favorite"
            size={16}
            color={theme.textTertiary}
          />
        ) : null}
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${category.name} vision board`}
      onPress={onPress}
      style={({ pressed }) => [
        cardStyle,
        { opacity: pressed ? 0.86 : 1 },
      ]}>
      <LinearGradient
        colors={[tint, theme.backgroundElevated]}
        style={styles.goalCard}>
        <View style={styles.goalEyebrow}>
          <Symbol name={category.icon} size={14} color={accent} />
          <AppText
            style={[styles.goalEyebrowText, { color: accent }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}>
            {card.eyebrow}
          </AppText>
        </View>
        <AppText
          style={[
            styles.goalTitle,
            {
              color: theme.textPrimary,
              fontSize: Math.min(23, Math.max(15, width * 0.14)),
              lineHeight: Math.min(28, Math.max(18, width * 0.17)),
            },
          ]}
          numberOfLines={card.title.length > 18 ? 3 : 2}
          adjustsFontSizeToFit
          minimumFontScale={0.72}
          align="center">
          {card.title}
        </AppText>
        {card.note ? (
          <AppText
            style={[styles.goalNote, { color: theme.textSecondary }]}
            align="center"
            numberOfLines={2}>
            {card.note}
          </AppText>
        ) : null}
        {card.support ? (
          <AppText
            style={[styles.goalSupport, { color: theme.textSecondary }]}
            align="center"
            numberOfLines={1}>
            {card.support}
          </AppText>
        ) : null}
        {card.progressStyle === 'ring' && card.progress !== undefined ? (
          <ProgressRing
            progress={card.progress}
            size={Math.min(48, width * 0.42)}
            strokeWidth={4}
            color={accent}
            trackColor={`${accent}24`}
            label={`${Math.round(card.progress * 100)}%`}
          />
        ) : null}
        {card.progressStyle === 'bar' && card.progress !== undefined ? (
          <View style={styles.barBlock}>
            <View
              style={[
                styles.progressTrack,
                { backgroundColor: `${accent}24` },
              ]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${card.progress * 100}%`,
                    backgroundColor: accent,
                  },
                ]}
              />
            </View>
            <AppText
              style={[styles.progressLabel, { color: theme.textPrimary }]}
              align="center">
              {Math.round(card.progress * 100)}%
            </AppText>
          </View>
        ) : null}
        {card.progress === undefined ? (
          <Symbol name="favorite" size={16} color={theme.textTertiary} />
        ) : null}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollContent: {
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: 10,
  },
  header: {
    minHeight: 74,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: 10,
  },
  headerCopy: {
    minWidth: 0,
    flex: 1,
    gap: 5,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 4,
  },
  title: {
    fontFamily: fontFamilies.serif,
    fontSize: 36,
    lineHeight: 43,
    fontWeight: '400',
    letterSpacing: -0.9,
  },
  subtitle: {
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '400',
  },
  searchBar: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.pill,
  },
  searchInput: {
    minWidth: 0,
    flex: 1,
    paddingVertical: 0,
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 20,
  },
  filters: {
    gap: 4,
    paddingHorizontal: 1,
  },
  filterChip: {
    minHeight: 26,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.pill,
  },
  filterLabel: {
    fontFamily: fontFamilies.sans,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '400',
  },
  mosaic: {
    gap: CARD_GAP,
  },
  mosaicRow: {
    flexDirection: 'row',
    gap: CARD_GAP,
  },
  columns: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: CARD_GAP,
  },
  column: {
    flex: 1,
    gap: CARD_GAP,
  },
  boardCard: {
    overflow: 'hidden',
    borderRadius: 13,
    borderCurve: 'continuous',
    boxShadow: '0 3px 12px rgba(51, 39, 28, 0.11)',
  },
  textCard: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
    paddingHorizontal: 11,
    paddingVertical: 10,
  },
  compactTextCard: {
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  quoteMark: {
    fontFamily: fontFamilies.serif,
    fontSize: 23,
    lineHeight: 20,
    fontWeight: '600',
  },
  compactQuoteMark: {
    position: 'absolute',
    top: 7,
    left: 12,
    fontSize: 20,
    lineHeight: 18,
  },
  quoteText: {
    fontFamily: fontFamilies.serif,
    fontWeight: '400',
  },
  compactQuoteText: {
    paddingHorizontal: spacing.md,
  },
  quoteAttribution: {
    fontFamily: fontFamilies.sans,
    fontSize: 9.5,
    lineHeight: 13,
    fontWeight: '400',
  },
  goalCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-around',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  goalEyebrow: {
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  goalEyebrowText: {
    flexShrink: 1,
    fontFamily: fontFamilies.sans,
    fontSize: 9,
    lineHeight: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  goalTitle: {
    fontFamily: fontFamilies.serif,
    fontWeight: '400',
  },
  goalNote: {
    fontFamily: fontFamilies.sans,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '400',
  },
  goalSupport: {
    fontFamily: fontFamilies.sans,
    fontSize: 9.5,
    lineHeight: 12,
    fontWeight: '400',
  },
  barBlock: {
    width: '100%',
    gap: 5,
  },
  progressTrack: {
    width: '100%',
    height: 6,
    overflow: 'hidden',
    borderRadius: radii.pill,
  },
  progressFill: {
    height: '100%',
    borderRadius: radii.pill,
  },
  progressLabel: {
    fontFamily: fontFamilies.sans,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '400',
    fontVariant: ['tabular-nums'],
  },
  empty: {
    minHeight: 360,
    justifyContent: 'center',
  },
  floatingButton: {
    position: 'absolute',
    right: 24,
    width: 66,
    height: 66,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 33,
    borderWidth: 7,
    borderColor: 'rgba(255,255,255,0.92)',
    boxShadow: '0 8px 22px rgba(53, 38, 25, 0.22)',
  },
});
