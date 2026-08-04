import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';

/**
 * Non-scrolling boundary for the entire navigation tree.
 * Keeping the top inset outside route scroll views prevents content and
 * overscroll effects from ever moving behind the device clock or cutout.
 */
export function AppSafeArea({
  children,
  style,
}: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  const theme = useTheme();

  return (
    <View style={[styles.fill, { backgroundColor: theme.backgroundPrimary }, style]}>
      <SafeAreaView edges={['top']} style={styles.fill}>
        {children}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
