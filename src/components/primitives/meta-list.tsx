import { StyleSheet, View } from 'react-native';

import { useResponsive } from '@/hooks/use-responsive';

import { AppText } from './app-text';
import { fieldTitleCase } from './field-title-case';

export type MetaListItem = {
  label: string;
  value: string;
};

/** Label/value rows for diagnostic cards (runtime, sync, storage). */
export function MetaList({
  items,
  testID,
}: {
  items: readonly MetaListItem[];
  testID?: string;
}) {
  const { spacing } = useResponsive();

  return (
    <View testID={testID} style={[styles.root, { gap: spacing.xs }]}>
      {items.map((item) => (
        <View key={item.label} style={[styles.row, { gap: spacing.sm }]}>
          <AppText
            variant="caption"
            color="secondary"
            fit
            numberOfLines={1}
            style={styles.label}>
            {fieldTitleCase(item.label)}
          </AppText>
          <AppText
            variant="caption"
            fit
            numberOfLines={2}
            style={styles.value}>
            {item.value}
          </AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  label: {
    flexShrink: 0,
    maxWidth: '42%',
  },
  value: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    textAlign: 'right',
  },
});
