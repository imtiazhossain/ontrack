import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

interface DragHandleProps {
  color?: string;
  size?: number;
}

/** Six-dot grip used as the visual affordance for drag-to-reorder controls. */
export function DragHandle({ color, size = 20 }: DragHandleProps) {
  const theme = useTheme();
  const dotSize = Math.max(3, Math.round(size * 0.2));
  const gap = Math.max(2, Math.round(size * 0.15));

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.handle, { height: size, width: size }]}>
      {[0, 1, 2].map((row) => (
        <View key={row} style={[styles.row, { gap }]}>
          <View
            style={[
              styles.dot,
              {
                backgroundColor: color ?? theme.textSecondary,
                height: dotSize,
                width: dotSize,
              },
            ]}
          />
          <View
            style={[
              styles.dot,
              {
                backgroundColor: color ?? theme.textSecondary,
                height: dotSize,
                width: dotSize,
              },
            ]}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  handle: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  row: {
    flexDirection: 'row',
  },
  dot: {
    borderRadius: 999,
  },
});
