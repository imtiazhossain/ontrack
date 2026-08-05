import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import {
    AppText,
    Button,
    ErrorMessage,
    IconButton,
    Input,
    Screen,
} from '@/components/primitives';
import { fontFamilies, spacing } from '@/design-system';
import { initialCanvasFrame } from '@/features/vision-board/canvas';
import type { VisionBoardItemKind } from '@/features/vision-board/types';
import { useTheme } from '@/hooks/use-theme';
import { newVisionBoardId, useVisionBoard } from '@/store/vision-board';
import { AgentUiIds } from '@/utils/agent-ui';

function param(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function VisionBoardItemEditor() {
  const router = useRouter();
  const theme = useTheme();
  const params = useLocalSearchParams<{
    id?: string | string[];
    categoryId?: string | string[];
    type?: string | string[];
  }>();
  const id = param(params.id);
  const categoryId = param(params.categoryId);
  const requestedType = param(params.type);
  const categories = useVisionBoard((state) => state.categories);
  const items = useVisionBoard((state) => state.items);
  const addItem = useVisionBoard((state) => state.addItem);
  const updateItem = useVisionBoard((state) => state.updateItem);
  const existing = items.find((item) => item.id === id);
  const category = categories.find((item) => item.id === categoryId);
  const type: VisionBoardItemKind =
    existing?.kind ??
    (requestedType === 'goal' || requestedType === 'image' ? requestedType : 'affirmation');
  const [primary, setPrimary] = useState(
    existing?.kind === 'affirmation'
      ? existing.text
      : existing?.kind === 'goal'
        ? existing.title
        : existing?.kind === 'image'
          ? existing.caption ?? ''
          : '',
  );
  const [secondary, setSecondary] = useState(
    existing?.kind === 'affirmation'
      ? existing.attribution ?? ''
      : existing?.kind === 'goal'
        ? existing.note ?? ''
        : '',
  );
  const [error, setError] = useState<string>();
  const close = () => router.back();

  const save = () => {
    if (!category) {
      setError('This vision board category is no longer available.');
      return;
    }
    const first = primary.trim();
    const second = secondary.trim();
    if (type !== 'image' && !first) {
      setError(type === 'goal' ? 'Give this goal a title.' : 'Write your affirmation.');
      return;
    }
    if (existing) {
      if (existing.kind === 'image') updateItem(existing.id, { caption: first || undefined });
      if (existing.kind === 'affirmation') {
        updateItem(existing.id, { text: first, attribution: second || undefined });
      }
      if (existing.kind === 'goal') {
        updateItem(existing.id, { title: first, note: second || undefined });
      }
      close();
      return;
    }
    if (type === 'image') {
      setError('Choose an image from the category board first.');
      return;
    }
    const categoryItems = items.filter((item) => item.categoryId === category.id);
    const now = new Date().toISOString();
    const base = {
      id: newVisionBoardId(`vision-${type}`),
      categoryId: category.id,
      frame: initialCanvasFrame(
        type,
        categoryItems.length,
        Math.max(-1, ...categoryItems.map((item) => item.frame.zIndex)) + 1,
      ),
      createdAt: now,
      updatedAt: now,
    };
    if (type === 'affirmation') {
      addItem({ ...base, kind: 'affirmation', text: first, attribution: second || undefined });
    } else {
      addItem({ ...base, kind: 'goal', title: first, note: second || undefined });
    }
    close();
  };

  if (Platform.OS === 'web') {
    return (
      <Screen refresh={false}>
        <AppText variant="title">Mobile Editing</AppText>
        <AppText color="secondary">
          Board editing is available in the onTrack iOS and Android apps.
        </AppText>
        <Button onPress={close}>Close</Button>
      </Screen>
    );
  }

  const title =
    type === 'image'
      ? 'Image Caption'
      : existing
        ? `Edit ${type}`
        : type === 'goal'
          ? 'Add Goal'
          : 'Add Affirmation';

  return (
    <Screen contentStyle={styles.screen} refresh={false}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <AppText style={styles.title}>{title}</AppText>
          <AppText color="secondary">
            {type === 'image'
              ? 'Add a few words to anchor this image.'
              : type === 'goal'
                ? 'Name the direction you want to move toward.'
                : 'Write something you want to return to often.'}
          </AppText>
        </View>
        <IconButton
          icon="close"
          accessibilityLabel="Close"
          background={theme.backgroundSunken}
          testID={AgentUiIds.vision.itemClose}
          onPress={close}
        />
      </View>
      <Input
        label={type === 'image' ? 'Caption' : type === 'goal' ? 'Goal' : 'Affirmation'}
        value={primary}
        onChangeText={setPrimary}
        placeholder={
          type === 'image'
            ? 'Future home'
            : type === 'goal'
              ? 'Build a meaningful career'
              : 'I am becoming the best version of myself.'
        }
        maxLength={type === 'affirmation' ? 240 : 120}
        multiline
        autoFocus
        testID={AgentUiIds.vision.itemPrimary}
      />
      {type !== 'image' ? (
        <Input
          label={type === 'goal' ? 'Supporting note (optional)' : 'Attribution (optional)'}
          value={secondary}
          onChangeText={setSecondary}
          placeholder={type === 'goal' ? 'Lead. Inspire. Impact.' : 'Your name or source'}
          maxLength={160}
          multiline={type === 'goal'}
          testID={AgentUiIds.vision.itemSecondary}
        />
      ) : null}
      {error ? <ErrorMessage message={error} /> : null}
      <Button testID={AgentUiIds.vision.itemSave} onPress={save}>
        Save
      </Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { width: '100%', maxWidth: 640, alignSelf: 'center', gap: spacing.lg },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  headerCopy: { flex: 1, gap: spacing.xs, minWidth: 0 },
  title: { fontFamily: fontFamilies.serif, fontSize: 32, lineHeight: 38, fontWeight: '400' },
});