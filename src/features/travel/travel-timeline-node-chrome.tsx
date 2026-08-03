import { Image } from 'expo-image';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText, Symbol } from '@/components/primitives';
import { radii, spacing } from '@/design-system';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { isHttpsUrl } from '@/utils/safe-url';

export function validBookingUrl(value: string): boolean {
  return !value || isHttpsUrl(value);
}

/** Split “Company · Location” titles so the location is readable on its own line. */
export function TimelineItemTitle({
  title,
  compact = false,
  dense = false,
}: {
  title: string;
  compact?: boolean;
  dense?: boolean;
}) {
  const primaryVariant = dense ? 'caption' : compact ? 'callout' : 'subheading';
  const separator = ' · ';
  const breakAt = title.indexOf(separator);
  if (breakAt <= 0) {
    return (
      <AppText
        variant={primaryVariant}
        fit
        style={compact ? styles.compactTitle : undefined}>
        {title}
      </AppText>
    );
  }
  const head = title.slice(0, breakAt);
  const tail = title.slice(breakAt + separator.length);
  return (
    <View style={styles.titleStack}>
      <AppText
        variant={primaryVariant}
        fit
        style={compact ? styles.compactTitle : undefined}>
        {head}
      </AppText>
      <AppText
        variant={compact ? 'caption' : 'subheading'}
        color={compact ? 'secondary' : 'primary'}
        fit>
        {tail}
      </AppText>
    </View>
  );
}

export function PhotoStrip({
  uris,
  onRemove,
}: {
  uris: string[];
  onRemove?: (uri: string) => void;
}) {
  const theme = useTheme();
  const { s } = useResponsive();
  const size = Math.max(72, s(88));
  if (!uris.length) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.photoStrip}>
      {uris.map((uri) => (
        <View
          key={uri}
          style={[styles.photoWrap, { width: size, height: size }]}>
          <Image
            source={{ uri }}
            style={styles.photo}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
          {onRemove ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Remove photo"
              hitSlop={6}
              onPress={() => onRemove(uri)}
              style={[
                styles.photoRemove,
                { backgroundColor: theme.overlayScrim },
              ]}>
              <Symbol name="close" size="sm" color={theme.textOnAccent} />
            </Pressable>
          ) : null}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  titleStack: { gap: spacing.xxs, minWidth: 0, flexShrink: 1 },
  compactTitle: { fontWeight: '400' },
  photoStrip: { gap: spacing.sm, paddingVertical: spacing.xxs },
  photoWrap: {
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  photo: { width: '100%', height: '100%' },
  photoRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
