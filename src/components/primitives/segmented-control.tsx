import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import type { AppIconName } from '@/design-system';
import { radii } from '@/design-system';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { useAgentUiTarget } from '@/utils/agent-ui';
import { haptics } from '@/utils/haptics';

import { AppText } from './app-text';
import { Symbol } from './symbol';

export interface SegmentedControlOption<T extends string> {
  value: T;
  label: string;
  icon?: AppIconName;
  disabled?: boolean;
  testID?: string;
}

export interface SegmentedControlProps<T extends string> {
  label?: string;
  value: T;
  options: readonly SegmentedControlOption<T>[];
  onChange: (value: T) => void;
  wrap?: boolean;
  style?: ViewStyle;
}

function Segment<T extends string>({
  option,
  selected,
  onSelect,
}: {
  option: SegmentedControlOption<T>;
  selected: boolean;
  onSelect: () => void;
}) {
  const theme = useTheme();
  const { spacing, layout } = useResponsive();
  const handlePress = () => {
    haptics.select();
    onSelect();
  };
  const agent = useAgentUiTarget(option.testID, {
    label: option.label,
    onPress: option.disabled ? undefined : handlePress,
  });

  return (
    <Pressable
      ref={agent.ref}
      testID={option.testID}
      onLayout={agent.onLayout}
      accessibilityRole="radio"
      accessibilityLabel={option.label}
      accessibilityState={{ checked: selected, disabled: option.disabled }}
      disabled={option.disabled}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.segment,
        {
          minHeight: layout.minTapTarget,
          gap: spacing.xs,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          backgroundColor: selected ? theme.accentFaint : theme.backgroundSunken,
          borderColor: selected ? theme.accentPrimary : theme.separator,
          opacity: option.disabled ? 0.4 : pressed ? 0.72 : 1,
        },
      ]}>
      {option.icon ? (
        <Symbol
          name={option.icon}
          size="sm"
          color={selected ? theme.accentPrimary : theme.textSecondary}
        />
      ) : null}
      <AppText variant="callout" color={selected ? 'accent' : 'secondary'} fit>
        {option.label}
      </AppText>
    </Pressable>
  );
}

/** Shared radio-style choice control for filters, modes, and compact option sets. */
export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
  wrap = false,
  style,
}: SegmentedControlProps<T>) {
  const { spacing } = useResponsive();
  return (
    <View style={[styles.root, { gap: spacing.sm }, style]}>
      {label ? (
        <AppText variant="overline" color="tertiary" fit>
          {label}
        </AppText>
      ) : null}
      <View
        accessibilityRole="radiogroup"
        style={[styles.row, { gap: spacing.sm, flexWrap: wrap ? 'wrap' : 'nowrap' }]}>
        {options.map((option) => (
          <Segment
            key={option.value}
            option={option}
            selected={option.value === value}
            onSelect={() => onChange(option.value)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { width: '100%' },
  row: { flexDirection: 'row', width: '100%' },
  segment: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    borderCurve: 'continuous',
  },
});
