import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { AppText } from '@/components/primitives';
import { borders, radii, spacing } from '@/design-system';
import { useTheme } from '@/hooks/use-theme';
import { haptics } from '@/utils/haptics';

export interface ChipOption<T extends string> {
  value: T;
  label: string;
}

interface ChipRowProps<T extends string> {
  options: ChipOption<T>[];
  selected: T | T[];
  onSelect: (value: T) => void;
  scrollable?: boolean;
}

/** Horizontally-flowing selectable chips used in forms and onboarding. */
export function ChipRow<T extends string>({
  options,
  selected,
  onSelect,
  scrollable,
}: ChipRowProps<T>) {
  const theme = useTheme();
  const isSelected = (v: T) => (Array.isArray(selected) ? selected.includes(v) : selected === v);

  const chips = options.map((option) => {
    const active = isSelected(option.value);
    return (
      <Pressable
        key={option.value}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        onPress={() => {
          haptics.select();
          onSelect(option.value);
        }}
        style={[
          styles.chip,
          {
            backgroundColor: active ? theme.accentFaint : theme.backgroundSunken,
            borderColor: active ? theme.accentPrimary : 'transparent',
          },
        ]}>
        <AppText variant="callout" color={active ? 'accent' : 'secondary'}>
          {option.label}
        </AppText>
      </Pressable>
    );
  });

  if (scrollable) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}>
        {chips}
      </ScrollView>
    );
  }
  return <ScrollView scrollEnabled={false} contentContainerStyle={[styles.row, styles.wrap]}>{chips}</ScrollView>;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  wrap: {
    flexWrap: 'wrap',
  },
  chip: {
    borderRadius: radii.pill,
    borderWidth: borders.thin,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    minHeight: 38,
    justifyContent: 'center',
  },
});
