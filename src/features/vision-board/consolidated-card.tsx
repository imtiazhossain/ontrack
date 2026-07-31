import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, ProgressRing, Symbol } from '@/components/primitives';
import { fontFamilies, radii, spacing, type AppIconName } from '@/design-system';
import { useTheme } from '@/hooks/use-theme';
import { haptics } from '@/utils/haptics';

import { VISION_BOARD_ACCENTS } from './defaults';
import { SIZE_RATIO, type DisplayCard } from './consolidated-model';
import type { VisionBoardCategory } from './types';

export function FilterChip({
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

export function BoardCard({
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
  barBlock: {
    width: '100%',
    gap: 5,
  },
  boardCard: {
    overflow: 'hidden',
    borderRadius: 13,
    borderCurve: 'continuous',
    boxShadow: '0 3px 12px rgba(51, 39, 28, 0.11)',
  },
  compactQuoteMark: {
    position: 'absolute',
    top: 7,
    left: 12,
    fontSize: 20,
    lineHeight: 18,
  },
  compactQuoteText: {
    paddingHorizontal: spacing.md,
  },
  compactTextCard: {
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
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
    fontFamily: fontFamilies.serif,
    fontSize: 10,
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
    fontFamily: fontFamilies.serif,
    fontSize: 9,
    lineHeight: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  goalNote: {
    fontFamily: fontFamilies.serif,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '400',
  },
  goalSupport: {
    fontFamily: fontFamilies.serif,
    fontSize: 9.5,
    lineHeight: 12,
    fontWeight: '400',
  },
  goalTitle: {
    fontFamily: fontFamilies.serif,
    fontWeight: '400',
  },
  progressFill: {
    height: '100%',
    borderRadius: radii.pill,
  },
  progressLabel: {
    fontFamily: fontFamilies.serif,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '400',
    fontVariant: ['tabular-nums'],
  },
  progressTrack: {
    width: '100%',
    height: 6,
    overflow: 'hidden',
    borderRadius: radii.pill,
  },
  quoteAttribution: {
    fontFamily: fontFamilies.serif,
    fontSize: 9.5,
    lineHeight: 13,
    fontWeight: '400',
  },
  quoteMark: {
    fontFamily: fontFamilies.serif,
    fontSize: 23,
    lineHeight: 20,
    fontWeight: '600',
  },
  quoteText: {
    fontFamily: fontFamilies.serif,
    fontWeight: '400',
  },
  textCard: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
    paddingHorizontal: 11,
    paddingVertical: 10,
  },
});
