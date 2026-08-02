import type { ErrorBoundaryProps } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { typeConfig } from '@/design-system/typography';

/**
 * Recoverable route shell so render/HMR failures never leave a blank white screen.
 * Intentionally avoids app primitives (Button/useTheme) so a broken module graph
 * cannot cascade into a second crash inside the boundary.
 */
export function RouteErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View style={styles.root}>
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.message}>
        {error.message || 'The screen failed to load. Try again.'}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Retry loading screen"
        onPress={() => void retry()}
        style={({ pressed }) => [styles.retry, pressed && styles.retryPressed]}>
        <Text style={styles.retryLabel}>Try again</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
    backgroundColor: '#F7F3EC',
  },
  title: {
    fontFamily: typeConfig.fontFamily,
    fontSize: 22,
    fontWeight: typeConfig.weight.regular,
    color: '#1B1815',
    textAlign: 'center',
  },
  message: {
    fontFamily: typeConfig.fontFamily,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: typeConfig.weight.regular,
    color: '#6B645C',
    textAlign: 'center',
  },
  retry: {
    marginTop: 8,
    minHeight: 44,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: '#1B1815',
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryPressed: {
    opacity: 0.75,
  },
  retryLabel: {
    fontFamily: typeConfig.fontFamily,
    fontSize: 15,
    fontWeight: typeConfig.weight.regular,
    color: '#F7F3EC',
  },
});
