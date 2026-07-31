import type { PropsWithChildren } from 'react';
import { Platform, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { layout, spacing } from '@/design-system';
import { useTheme } from '@/hooks/use-theme';
import { useUI } from '@/store/ui';

interface ScreenProps extends PropsWithChildren {
  /** Scrollable content (default) or a fixed layout */
  scroll?: boolean;
  /** Extra bottom padding for content above the tab bar, or only the device safe area */
  bottomInset?: boolean | 'safe';
  padded?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  scrollEnabled?: boolean;
}

export function Screen({
  children,
  scroll = true,
  bottomInset = true,
  padded = true,
  style,
  contentStyle,
  scrollEnabled = true,
}: ScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const notifyPageInteraction = useUI((state) => state.notifyPageInteraction);

  const paddingStyle: ViewStyle = {
    // The app shell owns the non-scrolling top safe area.
    paddingTop: spacing.sm,
    paddingBottom:
      bottomInset === 'safe'
        ? insets.bottom + spacing.lg
        : bottomInset
          ? insets.bottom + layout.tabBarInset
          : spacing.xl,
    ...(padded
      ? {
          paddingLeft: insets.left + layout.screenPadding,
          paddingRight: insets.right + layout.screenPadding,
        }
      : null),
  };

  if (!scroll) {
    return (
      <View
        onTouchStart={notifyPageInteraction}
        style={[styles.fill, { backgroundColor: theme.backgroundPrimary }, style]}>
        <View style={[styles.fill, paddingStyle, contentStyle]}>{children}</View>
      </View>
    );
  }

  return (
    <View
      onTouchStart={notifyPageInteraction}
      style={[styles.fill, { backgroundColor: theme.backgroundPrimary }, style]}>
      <ScrollView
        automaticallyAdjustKeyboardInsets
        scrollEnabled={scrollEnabled}
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={[styles.scrollContent, paddingStyle, contentStyle]}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scrollContent: { flexGrow: 1 },
});
