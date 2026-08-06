import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useResponsive } from '@/hooks/use-responsive';

/** Primary control + trailing action on one band (sort + sync, etc.). */
export function ToolbarRow({
  primary,
  trailing,
  testID,
}: {
  primary: ReactNode;
  trailing?: ReactNode;
  testID?: string;
}) {
  const { spacing } = useResponsive();

  return (
    <View
      testID={testID}
      style={[styles.row, { gap: spacing.sm }]}>
      <View style={styles.primary}>{primary}</View>
      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  primary: {
    flex: 1,
    minWidth: 0,
  },
  trailing: {
    flexShrink: 0,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
});
