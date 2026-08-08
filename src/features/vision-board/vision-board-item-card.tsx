import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { AppText, GlassPlate, Symbol } from '@/components/primitives';
import { fontFamilies, radii, spacing } from '@/design-system';
import { useTheme } from '@/hooks/use-theme';

import { VISION_BOARD_ACCENTS } from './defaults';
import { visionBoardImageSource } from './sample';
import type { VisionBoardCategory, VisionBoardItem } from './types';

export function VisionBoardItemCard({
  item,
  category,
  gallery = false,
}: {
  item: VisionBoardItem;
  category: VisionBoardCategory;
  gallery?: boolean;
}) {
  const theme = useTheme();
  const accentPreset = VISION_BOARD_ACCENTS[category.accent];
  const accent = theme.name === 'light' ? accentPreset.light : accentPreset.dark;
  const tint = theme.name === 'light' ? accentPreset.tintLight : accentPreset.tintDark;

  if (item.kind === 'image') {
    return (
      <View style={styles.fill}>
        <Image
          source={visionBoardImageSource(item.uri)}
          style={styles.fill}
          contentFit="cover"
          transition={gallery ? 180 : 0}
          accessibilityLabel={item.caption || `${category.name} vision image`}
        />
        {item.caption ? (
          <View style={styles.caption}>
            <AppText
              variant="caption"
              style={styles.captionText}
              numberOfLines={gallery ? 3 : 2}>
              {item.caption}
            </AppText>
          </View>
        ) : null}
      </View>
    );
  }

  if (item.kind === 'affirmation') {
    return (
      <GlassPlate style={styles.textCard}>
        <AppText style={[styles.quoteMark, { color: accent, zIndex: 1 }]}>“</AppText>
        <AppText
          style={[
            gallery ? styles.galleryAffirmation : styles.canvasAffirmation,
            { fontFamily: fontFamilies.serif, zIndex: 1 },
          ]}
          numberOfLines={gallery ? undefined : 6}
          align="center">
          {item.text}
        </AppText>
        {item.attribution ? (
          <AppText
            variant="caption"
            color="secondary"
            align="center"
            numberOfLines={2}
            style={{ zIndex: 1 }}>
            — {item.attribution}
          </AppText>
        ) : null}
      </GlassPlate>
    );
  }

  return (
    <View style={[styles.textCard, styles.goalCard, { backgroundColor: tint }]}>
      <View style={styles.goalLabel}>
        <Symbol name="target" size={15} color={accent} />
        <AppText variant="overline" style={{ color: accent }}>
          Goal
        </AppText>
      </View>
      <AppText
        style={[
          gallery ? styles.galleryGoal : styles.canvasGoal,
          { fontFamily: fontFamilies.serif },
        ]}
        align="center"
        numberOfLines={gallery ? undefined : 4}>
        {item.title}
      </AppText>
      {item.note ? (
        <AppText
          variant="caption"
          color="secondary"
          align="center"
          numberOfLines={gallery ? 4 : 2}>
          {item.note}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  caption: {
    position: 'absolute',
    left: spacing.sm,
    right: spacing.sm,
    bottom: spacing.sm,
    borderRadius: radii.sm,
    borderCurve: 'continuous',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.88)',
  },
  captionText: { color: '#29231E' },
  textCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  quoteMark: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.md,
    fontFamily: fontFamilies.serif,
    fontSize: 34,
    lineHeight: 36,
  },
  canvasAffirmation: { fontSize: 14, lineHeight: 18, fontWeight: '400' },
  galleryAffirmation: { fontSize: 19, lineHeight: 25, fontWeight: '400' },
  goalCard: { justifyContent: 'space-around' },
  goalLabel: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  canvasGoal: { fontSize: 15, lineHeight: 19, fontWeight: '400' },
  galleryGoal: { fontSize: 21, lineHeight: 27, fontWeight: '400' },
});
