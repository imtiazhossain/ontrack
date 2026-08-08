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
    EmptyState,
    GlassPlate,
    IconButton,
    Symbol,
    appPrompt,
    useScreenAtmosphereChrome,
} from '@/components/primitives';
import {
    fontFamilies,
    layout,
    radii,
    spacing,
} from '@/design-system';
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh';
import { useTheme } from '@/hooks/use-theme';
import { useUI } from '@/store/ui';
import { useVisionBoard } from '@/store/vision-board';
import { AgentUiIds } from '@/utils/agent-ui';
import { haptics } from '@/utils/haptics';

import { BoardCard, FilterChip } from './consolidated-card';
import {
    BOARD_SIDE_PADDING,
    CARD_GAP,
    CATEGORY_PRIORITY,
    CATEGORY_SHOWCASE_LAYOUTS,
    SHOWCASE_CARDS,
    SHOWCASE_LAYOUT,
    cardsFromBoard,
    isDefaultBoard,
    packedCategoryLayout,
    searchText,
    splitCards
} from './consolidated-model';
import { orderedVisionBoardCategories } from './selectors';

export function VisionBoardConsolidated() {
  const router = useRouter();
  const theme = useTheme();
  const { refreshControl } = usePullToRefresh();
  const insets = useSafeAreaInsets();
  const measuredTabBarHeight = useUI((state) => state.tabBarHeight);
  const tabBarHeight =
    measuredTabBarHeight ||
    layout.bottomNavBarBaseHeight + insets.bottom;
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

  useScreenAtmosphereChrome();

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
          title: 'Add to a Vision Board',
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
      'Add to a Vision Board',
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
    const backToToday = () => router.replace('/' as never);
    if (Platform.OS === 'ios') {
      appPrompt.actionSheet(
        {
          title: 'Vision Board',
          options: ['Cancel', 'Category List', 'Add Category', 'Back to Today'],
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
      { text: 'Category List', onPress: openCategories },
      { text: 'Add Category', onPress: addCategory },
      { text: 'Back to Today', onPress: backToToday },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <View onTouchStart={notifyPageInteraction} style={styles.root}>
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        keyboardShouldPersistTaps="handled"
        refreshControl={refreshControl}
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
          <GlassPlate
            style={[
              styles.searchBar,
              {
                width: boardWidth,
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
              underlineColorAndroid="transparent"
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
          </GlassPlate>
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
              testID={AgentUiIds.vision.consolidatedCategory('all')}
              onPress={() => setSelectedCategoryId('all')}
            />
            {orderedCategories.map((category) => (
              <FilterChip
                key={category.id}
                label={category.name}
                icon={category.icon}
                selected={selectedCategoryId === category.id}
                testID={AgentUiIds.vision.consolidatedCategory(category.id)}
                onPress={() => setSelectedCategoryId(category.id)}
              />
            ))}
          </ScrollView>
        </View>

        {filteredCards.length === 0 ? (
          <View style={[styles.empty, { width: boardWidth }]}>
            <EmptyState
              icon="search"
              title="No Inspiration Found"
              message="Try another category or search term."
              actionLabel="Show All"
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
          <Symbol name="add" size={24} color="#FFFFFF" />
        </Pressable>
      ) : null}
    </View>
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
    fontFamily: fontFamilies.serif,
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
    borderRadius: radii.pill,
  },
  searchInput: {
    minWidth: 0,
    flex: 1,
    paddingVertical: 0,
    fontFamily: fontFamilies.serif,
    fontSize: 15,
    lineHeight: 20,
  },
  filters: {
    gap: 4,
    paddingHorizontal: 1,
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
  empty: {
    minHeight: 360,
    justifyContent: 'center',
  },
  floatingButton: {
    position: 'absolute',
    right: 24,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.92)',
    boxShadow: '0 6px 16px rgba(53, 38, 25, 0.2)',
  },
});
