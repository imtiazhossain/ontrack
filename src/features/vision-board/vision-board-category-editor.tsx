import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import {
  AppText,
  Button,
  ErrorMessage,
  IconButton,
  Input,
  Screen,
  Symbol,
} from '@/components/primitives';
import { fontFamilies, radii, spacing } from '@/design-system';
import { useTheme } from '@/hooks/use-theme';
import { newVisionBoardId, useVisionBoard } from '@/store/vision-board';

import {
  VISION_BOARD_ACCENTS,
  VISION_BOARD_BACKGROUNDS,
  VISION_BOARD_CATEGORY_ICONS,
} from './defaults';
import type {
  VisionBoardAccent,
  VisionBoardBackground,
  VisionBoardCategory,
} from './types';

function param(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function VisionBoardCategoryEditor() {
  const router = useRouter();
  const theme = useTheme();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = param(params.id);
  const categories = useVisionBoard((state) => state.categories);
  const addCategory = useVisionBoard((state) => state.addCategory);
  const updateCategory = useVisionBoard((state) => state.updateCategory);
  const existing = categories.find((category) => category.id === id);
  const [name, setName] = useState(existing?.name ?? '');
  const [intention, setIntention] = useState(existing?.intention ?? '');
  const [icon, setIcon] = useState<VisionBoardCategory['icon']>(
    existing?.icon ?? 'vision-board',
  );
  const [accent, setAccent] = useState<VisionBoardAccent>(existing?.accent ?? 'sage');
  const [background, setBackground] = useState<VisionBoardBackground>(
    existing?.background ?? 'linen',
  );
  const [error, setError] = useState<string>();
  const close = () => router.back();

  const save = () => {
    const trimmedName = name.trim();
    const trimmedIntention = intention.trim();
    if (!trimmedName) {
      setError('Give this category a name.');
      return;
    }
    if (!trimmedIntention) {
      setError('Add a short intention for this category.');
      return;
    }
    if (existing) {
      updateCategory(
        existing.id,
        { name: trimmedName, intention: trimmedIntention, icon, accent, background },
        false,
      );
    } else {
      const now = new Date().toISOString();
      addCategory({
        id: newVisionBoardId('vision-category'),
        name: trimmedName,
        intention: trimmedIntention,
        icon,
        accent,
        background,
        order: Math.max(-1, ...categories.map((category) => category.order)) + 1,
        createdAt: now,
        updatedAt: now,
      });
    }
    close();
  };

  if (Platform.OS === 'web') {
    return (
      <Screen>
        <AppText variant="title">Mobile editing</AppText>
        <AppText color="secondary">
          Category editing is available in the onTrack iOS and Android apps.
        </AppText>
        <Button onPress={close}>Close</Button>
      </Screen>
    );
  }

  return (
    <Screen contentStyle={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <AppText style={styles.title}>{existing ? 'Edit category' : 'New category'}</AppText>
          <AppText color="secondary">
            Shape a clear space for one part of your future.
          </AppText>
        </View>
        <IconButton
          icon="close"
          accessibilityLabel="Close"
          background={theme.backgroundSunken}
          onPress={close}
        />
      </View>
      <Input
        label="Category name"
        value={name}
        onChangeText={setName}
        placeholder="Creativity"
        maxLength={40}
        returnKeyType="next"
      />
      <Input
        label="Intention"
        value={intention}
        onChangeText={setIntention}
        placeholder="Make more room for ideas and meaningful work."
        maxLength={140}
        multiline
      />

      <AppText variant="overline" color="tertiary">
        Icon
      </AppText>
      <View style={styles.choices}>
        {VISION_BOARD_CATEGORY_ICONS.map((option) => (
          <Pressable
            key={option}
            accessibilityRole="radio"
            accessibilityState={{ checked: icon === option }}
            accessibilityLabel={`Use ${option} icon`}
            onPress={() => setIcon(option)}
            style={[
              styles.iconChoice,
              {
                backgroundColor:
                  icon === option ? theme.accentFaint : theme.backgroundSunken,
                borderColor: icon === option ? theme.accentPrimary : 'transparent',
              },
            ]}>
            <Symbol
              name={option}
              color={icon === option ? theme.accentPrimary : theme.textSecondary}
            />
          </Pressable>
        ))}
      </View>

      <AppText variant="overline" color="tertiary">
        Accent
      </AppText>
      <View style={styles.choices}>
        {(Object.keys(VISION_BOARD_ACCENTS) as VisionBoardAccent[]).map((option) => {
          const preset = VISION_BOARD_ACCENTS[option];
          const color = theme.name === 'light' ? preset.light : preset.dark;
          return (
            <Pressable
              key={option}
              accessibilityRole="radio"
              accessibilityState={{ checked: accent === option }}
              accessibilityLabel={`Use ${option} accent`}
              onPress={() => setAccent(option)}
              style={[
                styles.colorChoice,
                {
                  backgroundColor: color,
                  borderColor: accent === option ? theme.textPrimary : 'transparent',
                },
              ]}
            />
          );
        })}
      </View>

      <AppText variant="overline" color="tertiary">
        Board background
      </AppText>
      <View style={styles.backgrounds}>
        {(Object.keys(VISION_BOARD_BACKGROUNDS) as VisionBoardBackground[]).map(
          (option) => {
            const preset = VISION_BOARD_BACKGROUNDS[option];
            return (
              <Pressable
                key={option}
                accessibilityRole="radio"
                accessibilityState={{ checked: background === option }}
                onPress={() => setBackground(option)}
                style={[
                  styles.backgroundChoice,
                  {
                    backgroundColor: theme.name === 'light' ? preset.light : preset.dark,
                    borderColor:
                      background === option ? theme.accentPrimary : theme.separator,
                  },
                ]}>
                <AppText
                  variant="caption"
                  style={{
                    color: option === 'charcoal' ? '#FFFFFF' : theme.textPrimary,
                  }}>
                  {preset.label}
                </AppText>
              </Pressable>
            );
          },
        )}
      </View>

      {error ? <ErrorMessage message={error} /> : null}
      <Button onPress={save}>
        {existing ? 'Save changes' : 'Create category'}
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
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  iconChoice: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderRadius: radii.md,
    borderCurve: 'continuous',
  },
  colorChoice: {
    width: 46,
    height: 46,
    borderWidth: 3,
    borderRadius: radii.pill,
  },
  backgrounds: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  backgroundChoice: {
    minWidth: 92,
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderWidth: 2,
    borderRadius: radii.md,
    borderCurve: 'continuous',
  },
});