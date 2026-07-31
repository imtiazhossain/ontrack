import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AppText,
  appPrompt,
  EmptyState,
  IconButton,
  Screen,
  Symbol,
} from '@/components/primitives';
import { fontFamilies, layout, radii, spacing } from '@/design-system';
import { useTheme } from '@/hooks/use-theme';
import { useUI } from '@/store/ui';
import { useVisionBoard } from '@/store/vision-board';

import { VISION_BOARD_ACCENTS } from './defaults';
import { cleanupOrphanedVisionBoardImages } from './media';
import {
  isSampleVisionBoardItem,
  VISION_BOARD_DASHBOARD_PREVIEWS,
  visionBoardImageSource,
} from './sample';
import {
  categoryCover,
  countVisionBoardItems,
  itemsForCategory,
  newestVisionBoardItem,
  orderedVisionBoardCategories,
} from './selectors';
import type {
  VisionBoardAffirmationItem,
  VisionBoardImageItem,
} from './types';

function countLabel(counts: ReturnType<typeof countVisionBoardItems>) {
  if (counts.total === 0) return 'No items yet';
  const parts = [
    counts.image ? `${counts.image} ${counts.image === 1 ? 'photo' : 'photos'}` : '',
    counts.affirmation
      ? `${counts.affirmation} ${counts.affirmation === 1 ? 'quote' : 'quotes'}`
      : '',
    counts.goal ? `${counts.goal} ${counts.goal === 1 ? 'goal' : 'goals'}` : '',
  ].filter(Boolean);
  return parts.join(' · ');
}

function boardFillPercent(counts: ReturnType<typeof countVisionBoardItems>) {
  return Math.min(100, Math.round((counts.total / 8) * 100));
}

export function VisionBoardDashboard() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const measuredTabBarHeight = useUI((state) => state.tabBarHeight);
  const tabBarHeight =
    measuredTabBarHeight ||
    layout.floatingTabBarBaseHeight + insets.bottom;
  const categories = useVisionBoard((state) => state.categories);
  const items = useVisionBoard((state) => state.items);
  const reorderCategories = useVisionBoard((state) => state.reorderCategories);
  const removeCategory = useVisionBoard((state) => state.removeCategory);
  const [editing, setEditing] = useState(false);
  const [showPopulatedOnly, setShowPopulatedOnly] = useState(false);
  const orderedCategories = useMemo(
    () => orderedVisionBoardCategories(categories),
    [categories],
  );
  const visibleCategories = useMemo(
    () =>
      showPopulatedOnly && !editing
        ? orderedCategories.filter(
            (category) => itemsForCategory(items, category.id).length > 0,
          )
        : orderedCategories,
    [editing, items, orderedCategories, showPopulatedOnly],
  );
  const affirmation = newestVisionBoardItem<VisionBoardAffirmationItem>(
    items,
    'affirmation',
  );
  const heroImage = newestVisionBoardItem<VisionBoardImageItem>(items, 'image');
  const isWeb = Platform.OS === 'web';

  const moveCategory = (id: string, direction: -1 | 1) => {
    const index = orderedCategories.findIndex((category) => category.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= orderedCategories.length) return;
    const ids = orderedCategories.map((category) => category.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    reorderCategories(ids);
  };

  const deleteCategory = (id: string, name: string) => {
    const categoryItems = itemsForCategory(items, id);
    const perform = () => {
      removeCategory(id);
      const referenced = useVisionBoard
        .getState()
        .items.filter((item): item is VisionBoardImageItem => item.kind === 'image')
        .map((item) => item.uri);
      void cleanupOrphanedVisionBoardImages(referenced);
    };
    const message =
      categoryItems.length === 0
        ? `Remove “${name}”?`
        : `Remove “${name}” and its ${categoryItems.length} board ${
            categoryItems.length === 1 ? 'item' : 'items'
          }?`;
    if (Platform.OS === 'web') {
      if (globalThis.confirm(message)) perform();
      return;
    }
    appPrompt.alert('Delete category?', message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: perform },
    ]);
  };

  return (
    <Screen
      bottomInset={false}
      contentStyle={{
        ...styles.screen,
        paddingBottom: tabBarHeight + spacing.lg,
      }}>
      <View style={styles.header}>
        <View style={styles.headerLead}>
          <View style={styles.headerCopy}>
            <AppText style={styles.title} numberOfLines={1}>
              Vision Board
            </AppText>
            <AppText
              variant="callout"
              color="secondary"
              numberOfLines={1}
              style={styles.subtitle}>
              Visualize. Believe. Achieve. ✨
            </AppText>
          </View>
        </View>
        <View style={styles.headerActions}>
          <IconButton
            icon="filter"
            shape="rounded"
            accessibilityLabel={
              showPopulatedOnly
                ? 'Show all vision board categories'
                : 'Show categories with board items'
            }
            background={
              showPopulatedOnly ? theme.accentFaint : theme.backgroundPrimary
            }
            borderColor={theme.separator}
            color={showPopulatedOnly ? theme.accentPrimary : theme.textSecondary}
            onPress={() => setShowPopulatedOnly((value) => !value)}
          />
          {!isWeb ? (
            <IconButton
              icon="add"
              shape="rounded"
              accessibilityLabel="Add a vision board category"
              color={theme.textOnAccent}
              background={theme.success}
              onPress={() => router.push('/vision-board/category-editor' as never)}
            />
          ) : null}
        </View>
      </View>

      {isWeb ? (
        <View style={[styles.webNotice, { backgroundColor: theme.backgroundSunken }]}>
          <Symbol name="gallery" color={theme.textSecondary} />
          <AppText variant="callout" color="secondary" style={styles.flex}>
            Vision Board editing is available in the iOS and Android apps. Your synced boards
            remain viewable here.
          </AppText>
        </View>
      ) : null}

      <View style={styles.hero}>
        {heroImage ? (
          <Image
            source={visionBoardImageSource(heroImage.uri)}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            accessibilityLabel={heroImage.caption || 'Latest vision board image'}
          />
        ) : null}
        <LinearGradient
          colors={
            heroImage
              ? ['rgba(18,20,17,0.18)', 'rgba(18,20,17,0.82)']
              : theme.name === 'light'
                ? ['#9BAA91', '#344A3A']
                : ['#536351', '#1B281E']
          }
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.heroContent}>
          <View style={styles.heroPill}>
            <AppText style={styles.heroPillMark}>“</AppText>
            <AppText variant="caption" style={styles.heroPillText}>
              Today’s Affirmation
            </AppText>
          </View>
          <View style={styles.heroCopy}>
            <AppText
              style={[styles.heroQuote, { fontFamily: fontFamilies.serif }]}
              numberOfLines={3}>
              {affirmation?.text || 'I am creating a life that feels true to me.'}
            </AppText>
            <View style={styles.heroDivider} />
            <AppText variant="callout" style={styles.heroSupport}>
              {affirmation?.attribution
                ? affirmation.attribution
                : items.length
                  ? 'Focus. Align. Manifest.'
                  : 'Add your first affirmation to make this space yours.'}
            </AppText>
          </View>
        </View>
        <View style={styles.heroPagination} pointerEvents="none">
          {[0, 1, 2, 3, 4].map((dot) => (
            <View
              key={dot}
              style={[
                styles.heroDot,
                dot === 2 ? styles.heroDotActive : styles.heroDotInactive,
              ]}
            />
          ))}
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <AppText variant="subheading" style={styles.sectionTitle}>
          Your Categories
        </AppText>
        <View style={styles.sectionActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open consolidated vision board"
            onPress={() => router.push('/vision-board/all' as never)}
            style={({ pressed }) => [
              styles.sectionButton,
              { opacity: pressed ? 0.62 : 1 },
            ]}>
            <Symbol name="gallery" size={16} color={theme.accentPrimary} />
            <AppText style={[styles.sectionButtonText, { color: theme.accentPrimary }]}>
              View all
            </AppText>
          </Pressable>
          {!isWeb ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setEditing((value) => !value)}
              accessibilityLabel={
                editing
                  ? 'Finish editing vision board categories'
                  : 'Edit vision board categories'
              }
              style={({ pressed }) => [
                styles.sectionButton,
                { opacity: pressed ? 0.62 : 1 },
              ]}>
              <AppText style={[styles.sectionButtonText, { color: theme.success }]}>
                {editing ? 'Done' : 'Edit'}
              </AppText>
              <Symbol
                name={editing ? 'check' : 'edit'}
                size={16}
                color={theme.success}
              />
            </Pressable>
          ) : null}
        </View>
      </View>

      {visibleCategories.length === 0 ? (
        <EmptyState
          icon="vision-board"
          title={
            showPopulatedOnly
              ? 'Your boards are ready for inspiration'
              : 'Create your first category'
          }
          message={
            showPopulatedOnly
              ? 'Add something to a category or show all categories.'
              : 'Give a part of your future its own place to grow.'
          }
          actionLabel={
            showPopulatedOnly ? 'Show all' : isWeb ? undefined : 'Add category'
          }
          onAction={
            showPopulatedOnly
              ? () => setShowPopulatedOnly(false)
              : isWeb
                ? undefined
                : () => router.push('/vision-board/category-editor' as never)
          }
        />
      ) : (
        <View style={styles.categories}>
          {visibleCategories.map((category) => {
            const categoryItems = itemsForCategory(items, category.id);
            const counts = countVisionBoardItems(categoryItems);
            const preview =
              VISION_BOARD_DASHBOARD_PREVIEWS[
                category.id as keyof typeof VISION_BOARD_DASHBOARD_PREVIEWS
              ];
            const isSampleOnly =
              categoryItems.length > 0 &&
              categoryItems.every(isSampleVisionBoardItem);
            const usesPreview =
              Boolean(preview) && (categoryItems.length === 0 || isSampleOnly);
            const fillPercent =
              usesPreview && preview
                ? preview.progress
                : boardFillPercent(counts);
            const cover = categoryCover(items, category.id);
            const coverSource =
              usesPreview && preview
                ? preview.source
                : cover
                  ? visionBoardImageSource(cover.uri)
                  : null;
            const preset = VISION_BOARD_ACCENTS[category.accent];
            const accent = theme.name === 'light' ? preset.light : preset.dark;
            const tint =
              theme.name === 'light' ? preset.tintLight : preset.tintDark;
            const categoryIndex = orderedCategories.findIndex(
              (item) => item.id === category.id,
            );
            return (
              <Pressable
                key={category.id}
                accessibilityRole="button"
                accessibilityLabel={`Open ${category.name} vision board, ${countLabel(counts)}, ${fillPercent}% filled`}
                disabled={editing}
                onPress={() => router.push(`/vision-board/${category.id}` as never)}
                style={({ pressed }) => [
                  styles.categoryCard,
                  editing && styles.categoryCardEditing,
                  {
                    backgroundColor: theme.backgroundElevated,
                    opacity: pressed ? 0.78 : 1,
                  },
                ]}>
                <View style={styles.cover}>
                  <View
                    style={[
                      StyleSheet.absoluteFill,
                      styles.coverSurface,
                      { backgroundColor: tint },
                    ]}>
                    {coverSource ? (
                      <Image
                        source={coverSource}
                        style={StyleSheet.absoluteFill}
                        contentFit="cover"
                        accessibilityLabel={
                          usesPreview
                            ? `${category.name} inspiration preview`
                            : cover?.caption || `${category.name} cover`
                        }
                      />
                    ) : (
                      <Symbol name={category.icon} size={34} color={accent} />
                    )}
                  </View>
                </View>
                <View style={[styles.categoryBody, editing && styles.categoryBodyEditing]}>
                  <View style={styles.categoryTitleRow}>
                    <View style={[styles.iconTile, { backgroundColor: tint }]}>
                      <Symbol name={category.icon} size={19} color={accent} />
                    </View>
                    <View style={[styles.flex, styles.categoryCopy]}>
                      <AppText
                        style={[styles.categoryName, { fontFamily: fontFamilies.serif }]}
                        numberOfLines={1}>
                        {category.name}
                      </AppText>
                      <AppText
                        variant="caption"
                        color="secondary"
                        numberOfLines={2}
                        style={styles.categoryIntention}>
                        {category.intention}
                      </AppText>
                    </View>
                    {!editing ? (
                      <Symbol name="chevron-right" color={theme.textTertiary} />
                    ) : null}
                  </View>
                  <View style={styles.progressRow}>
                    <View
                      style={[
                        styles.progressTrack,
                        { backgroundColor: theme.separator },
                      ]}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            backgroundColor: accent,
                            width: `${fillPercent}%`,
                          },
                        ]}
                      />
                    </View>
                    <AppText
                      variant="caption"
                      color="secondary"
                      style={styles.progressLabel}
                      numberOfLines={1}>
                      {fillPercent}%
                    </AppText>
                  </View>
                  {editing ? (
                    <View style={styles.editActions}>
                      <IconButton
                        icon="arrow-up"
                        disabled={categoryIndex === 0}
                        accessibilityLabel={`Move ${category.name} up`}
                        onPress={() => moveCategory(category.id, -1)}
                      />
                      <IconButton
                        icon="arrow-down"
                        disabled={categoryIndex === orderedCategories.length - 1}
                        accessibilityLabel={`Move ${category.name} down`}
                        onPress={() => moveCategory(category.id, 1)}
                      />
                      <IconButton
                        icon="edit"
                        accessibilityLabel={`Edit ${category.name}`}
                        onPress={() =>
                          router.push({
                            pathname: '/vision-board/category-editor',
                            params: { id: category.id },
                          } as never)
                        }
                      />
                      <IconButton
                        icon="delete"
                        color={theme.danger}
                        accessibilityLabel={`Delete ${category.name}`}
                        onPress={() => deleteCategory(category.id, category.name)}
                      />
                    </View>
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    gap: spacing.md,
    paddingTop: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  headerLead: {
    minWidth: 0,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerCopy: { minWidth: 0, flex: 1, gap: spacing.xxs },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    fontFamily: fontFamilies.serif,
    fontSize: 32,
    lineHeight: 37,
    fontWeight: '400',
  },
  subtitle: { fontFamily: fontFamilies.sans, fontWeight: '400' },
  webNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radii.md,
    borderCurve: 'continuous',
    padding: spacing.md,
  },
  hero: {
    width: '100%',
    maxHeight: 280,
    aspectRatio: 1.86,
    overflow: 'hidden',
    borderRadius: 22,
    borderCurve: 'continuous',
    boxShadow: '0 7px 22px rgba(43, 36, 29, 0.11)',
  },
  heroContent: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 28,
  },
  heroPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  heroPillMark: {
    color: '#FFFFFF',
    fontFamily: fontFamilies.serif,
    fontSize: 18,
    lineHeight: 16,
    fontWeight: '600',
  },
  heroPillText: {
    color: '#FFFFFF',
    fontFamily: fontFamilies.sans,
    fontSize: 11.5,
    lineHeight: 14,
    fontWeight: '400',
  },
  heroCopy: { alignItems: 'flex-start', gap: spacing.sm },
  heroQuote: {
    maxWidth: '72%',
    color: '#FFFFFF',
    fontSize: 23,
    lineHeight: 28,
    fontWeight: '400',
  },
  heroDivider: {
    width: 20,
    height: 1.5,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  heroSupport: {
    color: 'rgba(255,255,255,0.86)',
    fontFamily: fontFamilies.sans,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400',
  },
  heroPagination: {
    position: 'absolute',
    bottom: 9,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 7,
  },
  heroDot: { width: 6, height: 6, borderRadius: 3 },
  heroDotActive: { backgroundColor: '#FFFFFF' },
  heroDotInactive: { backgroundColor: 'rgba(255,255,255,0.48)' },
  sectionHeader: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  sectionTitle: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '400',
  },
  sectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionButton: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
  },
  sectionButtonText: {
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
  },
  categories: { gap: spacing.sm },
  categoryCard: {
    minHeight: 88,
    overflow: 'hidden',
    flexDirection: 'row',
    borderRadius: 18,
    borderCurve: 'continuous',
    boxShadow: '0 3px 12px rgba(45, 38, 31, 0.065)',
  },
  categoryCardEditing: { minHeight: 144 },
  cover: { width: 116 },
  coverSurface: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    borderTopRightRadius: 0,
  },
  categoryBody: {
    flex: 1,
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  categoryBodyEditing: { gap: spacing.sm, paddingVertical: spacing.md },
  categoryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  categoryCopy: { gap: 3 },
  iconTile: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    borderCurve: 'continuous',
  },
  categoryName: { fontSize: 18, lineHeight: 21, fontWeight: '400' },
  categoryIntention: {
    fontFamily: fontFamilies.sans,
    fontSize: 11.5,
    lineHeight: 15,
    fontWeight: '400',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  progressTrack: {
    flex: 1,
    maxWidth: 140,
    height: 5,
    overflow: 'hidden',
    borderRadius: radii.pill,
  },
  progressFill: {
    height: '100%',
    borderRadius: radii.pill,
  },
  progressLabel: {
    minWidth: 30,
    fontFamily: fontFamilies.sans,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '400',
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  flex: { flex: 1 },
});
