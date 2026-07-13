import type { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { layout, spacing } from '@/design-system';
import { useTheme } from '@/hooks/use-theme';

interface ScreenProps extends PropsWithChildren {
  /** Scrollable content (default) or a fixed layout */
  scroll?: boolean;
  /** Respect the top safe area (off for screens under a navigation header) */
  topInset?: boolean;
  /** Extra bottom padding for content above the tab bar */
  bottomInset?: boolean;
  padded?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
}

export function Screen({
  children,
  scroll = true,
  topInset = true,
  bottomInset = true,
  padded = true,
  style,
  contentStyle,
}: ScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const paddingStyle: ViewStyle = {
    paddingTop: topInset ? insets.top + spacing.sm : 0,
    paddingBottom: bottomInset ? insets.bottom + layout.tabBarInset : spacing.xl,
    ...(padded
      ? {
          paddingLeft: insets.left + layout.screenPadding,
          paddingRight: insets.right + layout.screenPadding,
        }
      : null),
  };

  if (!scroll) {
    return (
      <View style={[styles.fill, { backgroundColor: theme.backgroundPrimary }, style]}>
        <View style={[styles.fill, paddingStyle, contentStyle]}>{children}</View>
      </View>
    );
  }

  return (
    <View style={[styles.fill, { backgroundColor: theme.backgroundPrimary }, style]}>
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={[paddingStyle, contentStyle]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
