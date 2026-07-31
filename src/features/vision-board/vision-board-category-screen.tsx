import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Platform,
    Pressable,
    StyleSheet,
    useWindowDimensions,
    View,
} from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';

import {
    appPrompt,
    AppText,
    Button,
    EmptyState,
    ErrorMessage,
    IconButton,
    Screen,
    Symbol,
} from '@/components/primitives';
import { fontFamilies, radii, spacing } from '@/design-system';
import { usePendingImagePickerResult } from '@/hooks/use-pending-image-picker';
import { useTheme } from '@/hooks/use-theme';
import { newVisionBoardId, useVisionBoard } from '@/store/vision-board';
import { confirmDestructiveAction } from '@/utils/confirm-destructive';
import { goBackOrReplace } from '@/utils/navigation';
import { pickCameraImage, pickLibraryImage } from '@/utils/pick-image';

import {
    initialCanvasFrame,
    nudgeCanvasFrame,
    VISION_BOARD_ASPECT_RATIO,
} from './canvas';
import { VISION_BOARD_BACKGROUNDS } from './defaults';
import {
    cleanupOrphanedVisionBoardImages,
    persistVisionBoardImage,
} from './media';
import { itemsForCategory } from './selectors';
import type {
    CanvasFrame,
    VisionBoardBackground,
    VisionBoardImageItem,
    VisionBoardItem,
    VisionBoardItemKind,
} from './types';
import { VisionBoardBackground as BoardBackground } from './vision-board-background';
import { VisionBoardCanvasItem } from './vision-board-canvas-item';
import { VisionBoardGallery } from './vision-board-gallery';

function param(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function VisionBoardCategoryScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const categoryId = param(params.id) ?? '';
  const categories = useVisionBoard((state) => state.categories);
  const allItems = useVisionBoard((state) => state.items);
  const updateCategory = useVisionBoard((state) => state.updateCategory);
  const addItem = useVisionBoard((state) => state.addItem);
  const updateItemFrame = useVisionBoard((state) => state.updateItemFrame);
  const moveItemLayer = useVisionBoard((state) => state.moveItemLayer);
  const removeItem = useVisionBoard((state) => state.removeItem);
  const undoCategory = useVisionBoard((state) => state.undoCategory);
  const redoCategory = useVisionBoard((state) => state.redoCategory);
  const clearCategoryHistory = useVisionBoard((state) => state.clearCategoryHistory);
  const history = useVisionBoard((state) => state.history[categoryId]);
  const category = categories.find((item) => item.id === categoryId);
  const items = useMemo(
    () => itemsForCategory(allItems, categoryId),
    [allItems, categoryId],
  );
  const [mode, setMode] = useState<'edit' | 'gallery'>(
    Platform.OS === 'web' ? 'gallery' : 'edit',
  );
  const [selectedId, setSelectedId] = useState<string>();
  const [gestureActive, setGestureActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const itemsRef = useRef(allItems);
  const posterWidth = Math.max(280, Math.min(windowWidth - 40, 620));
  const posterHeight = posterWidth / VISION_BOARD_ASPECT_RATIO;
  const selected = items.find((item) => item.id === selectedId);

  useEffect(() => {
    itemsRef.current = allItems;
  }, [allItems]);

  useEffect(
    () => () => {
      clearCategoryHistory(categoryId);
      const referenced = itemsRef.current
        .filter((item): item is VisionBoardImageItem => item.kind === 'image')
        .map((item) => item.uri);
      void cleanupOrphanedVisionBoardImages(referenced);
    },
    [categoryId, clearCategoryHistory],
  );

  const addPersistedImage = useCallback(
    async (uri: string) => {
      if (!category) return;
      setBusy(true);
      setError(undefined);
      try {
        const id = newVisionBoardId('vision-image');
        const persisted = await persistVisionBoardImage(uri, id);
        const categoryItems = useVisionBoard
          .getState()
          .items.filter((item) => item.categoryId === category.id);
        const now = new Date().toISOString();
        const item: VisionBoardImageItem = {
          id,
          categoryId: category.id,
          kind: 'image',
          uri: persisted.uri,
          aspectRatio: persisted.width / Math.max(1, persisted.height),
          frame: initialCanvasFrame(
            'image',
            categoryItems.length,
            Math.max(-1, ...categoryItems.map((entry) => entry.frame.zIndex)) + 1,
            persisted.width / Math.max(1, persisted.height),
          ),
          createdAt: now,
          updatedAt: now,
        };
        addItem(item);
        setSelectedId(item.id);
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : 'The selected image could not be added.',
        );
      } finally {
        setBusy(false);
      }
    },
    [addItem, category],
  );

  usePendingImagePickerResult((uri) => {
    void addPersistedImage(uri);
  });

  const choosePhoto = async () => {
    const uri = await pickLibraryImage();
    if (uri) await addPersistedImage(uri);
  };

  const capturePhoto = async () => {
    const uri = await pickCameraImage({
      cameraDeniedMessage:
        'Allow camera access in Settings to add a photo to your vision board.',
    });
    if (uri) await addPersistedImage(uri);
  };

  const showImageActions = () => {
    if (Platform.OS === 'ios') {
      appPrompt.actionSheet(
        {
          options: ['Cancel', 'Choose from Photos', 'Take Photo'],
          cancelButtonIndex: 0,
          title: 'Add an Image',
        },
        (index) => {
          if (index === 1) void choosePhoto();
          if (index === 2) void capturePhoto();
        },
      );
      return;
    }
    appPrompt.alert('Add an Image', undefined, [
      { text: 'Choose from Photos', onPress: () => void choosePhoto() },
      { text: 'Take Photo', onPress: () => void capturePhoto() },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const openItemEditor = (type: VisionBoardItemKind, id?: string) => {
    router.push({
      pathname: '/vision-board/item-editor',
      params: { categoryId, type, ...(id ? { id } : {}) },
    } as never);
  };

  const confirmDelete = (item: VisionBoardItem) => {
    const perform = () => {
      removeItem(item.id);
      setSelectedId(undefined);
    };
    const label =
      item.kind === 'image'
        ? item.caption || 'this image'
        : item.kind === 'affirmation'
          ? item.text
          : item.title;
    confirmDestructiveAction({
      title: 'Remove Board Item?',
      message: label,
      actionLabel: 'Remove',
      onConfirm: perform,
    });
  };

  const adjustSelected = (
    action:
      | 'left'
      | 'right'
      | 'up'
      | 'down'
      | 'grow'
      | 'shrink'
      | 'rotate-left'
      | 'rotate-right',
  ) => {
    if (selected) updateItemFrame(selected.id, nudgeCanvasFrame(selected.frame, action));
  };

  const switchMode = () => {
    setSelectedId(undefined);
    setMode((value) => (value === 'edit' ? 'gallery' : 'edit'));
  };

  if (!category) {
    return (
      <Screen>
        <EmptyState
          icon="vision-board"
          title="Category Not Found"
          message="This vision board category may have been removed on another device."
          actionLabel="Back to Vision Board"
          onAction={() =>
            router.replace('/(tabs)/vision-board/categories' as never)
          }
        />
      </Screen>
    );
  }

  return (
    <Screen
      bottomInset="safe"
      scrollEnabled={!gestureActive}
      contentStyle={{ ...styles.screen, maxWidth: Math.max(680, posterWidth) }}>
      <View style={styles.header}>
        <IconButton
          icon="chevron-left"
          size={40}
          background="transparent"
          accessibilityLabel="Back to Vision Board"
          onPress={() =>
            goBackOrReplace(router, '/(tabs)/vision-board/categories')
          }
        />
        <View style={styles.headerCopy}>
          <AppText style={styles.title}>{category.name}</AppText>
          <AppText color="secondary">{category.intention}</AppText>
        </View>
        {Platform.OS !== 'web' ? (
          <Button
            icon={mode === 'edit' ? 'gallery' : 'edit'}
            variant={mode === 'edit' ? 'secondary' : 'primary'}
            onPress={switchMode}
            accessibilityLabel={
              mode === 'edit' ? 'Show read-only gallery' : 'Return to editable board'
            }>
            {mode === 'edit' ? 'Gallery' : 'Edit Board'}
          </Button>
        ) : null}
      </View>

      {Platform.OS === 'web' ? (
        <View style={[styles.notice, { backgroundColor: theme.backgroundSunken }]}>
          <Symbol name="gallery" color={theme.textSecondary} />
          <AppText variant="callout" color="secondary" style={styles.flex}>
            This is the synced read-only gallery. Edit the collage in the mobile app.
          </AppText>
        </View>
      ) : null}

      {mode === 'gallery' ? (
        <VisionBoardGallery category={category} items={items} />
      ) : (
        <Animated.View
          entering={FadeIn.duration(220).reduceMotion(ReduceMotion.System)}
          style={styles.editor}>
          <View style={styles.editorTopbar}>
            <View style={styles.historyActions}>
              <IconButton
                icon="undo"
                disabled={!history?.past.length}
                accessibilityLabel="Undo last board change"
                onPress={() => undoCategory(category.id)}
              />
              <IconButton
                icon="redo"
                disabled={!history?.future.length}
                accessibilityLabel="Redo last board change"
                onPress={() => redoCategory(category.id)}
              />
            </View>
            <AppText variant="caption" color="secondary">
              Drag · pinch · rotate
            </AppText>
          </View>

          <View
            style={[
              styles.poster,
              { width: posterWidth, height: posterHeight, borderColor: theme.separator },
            ]}>
            <BoardBackground background={category.background} />
            {items.length === 0 ? (
              <View pointerEvents="none" style={styles.posterEmpty}>
                <Symbol name="vision-board" size={42} color="rgba(255,255,255,0.82)" />
                <AppText style={styles.posterEmptyTitle} align="center">
                  Build the life you can see
                </AppText>
                <AppText style={styles.posterEmptyBody} align="center">
                  Add an image, affirmation, or goal below.
                </AppText>
              </View>
            ) : null}
            {[...items]
              .sort((a, b) => a.frame.zIndex - b.frame.zIndex)
              .map((item) => (
                <VisionBoardCanvasItem
                  key={`${item.id}-${item.updatedAt}`}
                  item={item}
                  category={category}
                  posterWidth={posterWidth}
                  posterHeight={posterHeight}
                  selected={selectedId === item.id}
                  onSelect={() => setSelectedId(item.id)}
                  onCommit={(frame: CanvasFrame) => updateItemFrame(item.id, frame)}
                  onGestureActive={setGestureActive}
                />
              ))}
          </View>

          <View style={styles.addActions}>
            <Button
              icon="photo"
              variant="secondary"
              disabled={busy}
              onPress={showImageActions}
              accessibilityLabel="Add an image to this vision board">
              {busy ? 'Adding…' : 'Image'}
            </Button>
            <Button
              icon="smart"
              variant="secondary"
              onPress={() => openItemEditor('affirmation')}
              accessibilityLabel="Add an affirmation to this vision board">
              Affirmation
            </Button>
            <Button
              icon="target"
              variant="secondary"
              onPress={() => openItemEditor('goal')}
              accessibilityLabel="Add a goal to this vision board">
              Goal
            </Button>
          </View>

          {error ? <ErrorMessage message={error} /> : null}

          {selected ? (
            <View
              accessibilityLiveRegion="polite"
              style={[styles.selectionPanel, { backgroundColor: theme.backgroundElevated }]}>
              <View style={styles.selectionHeading}>
                <View style={styles.flex}>
                  <AppText variant="subheading">Selected {selected.kind}</AppText>
                  <AppText variant="caption" color="secondary" numberOfLines={1}>
                    Use these controls as an alternative to gestures.
                  </AppText>
                </View>
                <IconButton
                  icon="close"
                  accessibilityLabel="Deselect board item"
                  onPress={() => setSelectedId(undefined)}
                />
              </View>
              <View style={styles.toolRow}>
                <IconButton
                  icon="edit"
                  accessibilityLabel={`Edit selected ${selected.kind}`}
                  onPress={() => openItemEditor(selected.kind, selected.id)}
                />
                <IconButton
                  icon="layer-back"
                  accessibilityLabel="Send selected item backward"
                  onPress={() => moveItemLayer(selected.id, 'back')}
                />
                <IconButton
                  icon="layer-forward"
                  accessibilityLabel="Bring selected item forward"
                  onPress={() => moveItemLayer(selected.id, 'forward')}
                />
                <IconButton
                  icon="delete"
                  color={theme.danger}
                  accessibilityLabel={`Delete selected ${selected.kind}`}
                  onPress={() => confirmDelete(selected)}
                />
              </View>
              <View style={styles.adjustments}>
                {[
                  ['←', 'left', 'Move selected item left'],
                  ['↑', 'up', 'Move selected item up'],
                  ['↓', 'down', 'Move selected item down'],
                  ['→', 'right', 'Move selected item right'],
                  ['−', 'shrink', 'Make selected item smaller'],
                  ['+', 'grow', 'Make selected item larger'],
                  ['↺', 'rotate-left', 'Rotate selected item left'],
                  ['↻', 'rotate-right', 'Rotate selected item right'],
                ].map(([label, action, accessibilityLabel]) => (
                  <Pressable
                    key={action}
                    accessibilityRole="button"
                    accessibilityLabel={accessibilityLabel}
                    onPress={() => adjustSelected(action as Parameters<typeof adjustSelected>[0])}
                    style={({ pressed }) => [
                      styles.adjustButton,
                      {
                        backgroundColor: theme.backgroundSunken,
                        opacity: pressed ? 0.65 : 1,
                      },
                    ]}>
                    <AppText variant="subheading">{label}</AppText>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          <View style={styles.backgroundSection}>
            <View style={styles.backgroundHeading}>
              <Symbol name="background" color={theme.textSecondary} />
              <AppText variant="overline" color="tertiary">
                Background
              </AppText>
            </View>
            <View style={styles.backgroundChoices}>
              {(Object.keys(VISION_BOARD_BACKGROUNDS) as VisionBoardBackground[]).map(
                (background) => {
                  const preset = VISION_BOARD_BACKGROUNDS[background];
                  return (
                    <Pressable
                      key={background}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: category.background === background }}
                      accessibilityLabel={`Use ${preset.label} background`}
                      onPress={() => updateCategory(category.id, { background })}
                      style={[
                        styles.backgroundChoice,
                        {
                          backgroundColor:
                            theme.name === 'light' ? preset.light : preset.dark,
                          borderColor:
                            category.background === background
                              ? theme.accentPrimary
                              : theme.separator,
                        },
                      ]}>
                      <AppText
                        variant="caption"
                        style={{
                          color: background === 'charcoal' ? '#FFFFFF' : theme.textPrimary,
                        }}>
                        {preset.label}
                      </AppText>
                    </Pressable>
                  );
                },
              )}
            </View>
          </View>
        </Animated.View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    width: '100%',
    alignSelf: 'center',
    gap: spacing.lg,
    paddingTop: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  headerCopy: { flex: 1, gap: spacing.xs },
  title: { fontFamily: fontFamilies.serif, fontSize: 34, lineHeight: 40, fontWeight: '400' },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
    borderCurve: 'continuous',
  },
  editor: { alignItems: 'center', gap: spacing.lg },
  editorTopbar: {
    width: '100%',
    maxWidth: 620,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  historyActions: { flexDirection: 'row', gap: spacing.sm },
  poster: {
    overflow: 'hidden',
    borderWidth: 4,
    borderRadius: radii.lg,
    borderCurve: 'continuous',
    boxShadow: '0 10px 28px rgba(45, 32, 18, 0.22)',
  },
  posterEmpty: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
    backgroundColor: 'rgba(35,29,23,0.16)',
  },
  posterEmptyTitle: {
    color: '#FFFFFF',
    fontFamily: fontFamilies.serif,
    fontSize: 25,
    lineHeight: 31,
    fontWeight: '400',
  },
  posterEmptyBody: { color: 'rgba(255,255,255,0.88)' },
  addActions: {
    width: '100%',
    maxWidth: 620,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  selectionPanel: {
    width: '100%',
    maxWidth: 620,
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderCurve: 'continuous',
    boxShadow: '0 5px 16px rgba(40, 31, 22, 0.10)',
  },
  selectionHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  toolRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  adjustments: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  adjustButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
  },
  backgroundSection: { width: '100%', maxWidth: 620, gap: spacing.md },
  backgroundHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  backgroundChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  backgroundChoice: {
    minWidth: 82,
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 2,
    borderRadius: radii.md,
    borderCurve: 'continuous',
  },
  flex: { flex: 1 },
});
