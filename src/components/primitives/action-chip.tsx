import { Pressable, StyleSheet, View } from 'react-native';

import { glassMaterials, radii } from '@/design-system';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { useAgentUiTarget } from '@/utils/agent-ui';
import { haptics } from '@/utils/haptics';

import { AppText } from './app-text';
import { fieldTitleCase } from './field-title-case';
import { GlassPlate } from './glass-plate';

export type ActionChipItem = {
  id: string;
  label: string;
  testID?: string;
  onPress: () => void;
};

/** Compact secondary action chip (demo seeds, quick tools) — frosted glass. */
export function ActionChip({
  label,
  onPress,
  testID,
  selected = false,
}: {
  label: string;
  onPress: () => void;
  testID?: string;
  selected?: boolean;
}) {
  const theme = useTheme();
  const { spacing, layout, s } = useResponsive();
  const title = fieldTitleCase(label);
  const handlePress = () => {
    haptics.select();
    onPress();
  };
  const agent = useAgentUiTarget(testID, {
    label: title,
    onPress: handlePress,
  });

  return (
    <Pressable
      ref={agent.ref}
      onLayout={agent.onLayout}
      testID={agent.testID}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ selected }}
      onPress={handlePress}
      style={({ pressed }) => [
        {
          opacity: pressed ? 0.86 : 1,
          maxWidth: s(160),
          flexShrink: 1,
          minWidth: 0,
        },
      ]}>
      <GlassPlate
        style={[
          styles.chip,
          {
            minHeight: layout.minTapTarget,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
            borderRadius: radii.pill,
            borderColor: selected
              ? theme.accentPrimary
              : theme.name === 'dark'
                ? glassMaterials.border.darkStrong
                : glassMaterials.border.light,
          },
        ]}>
        <AppText
          variant="callout"
          color={selected ? 'accent' : 'secondary'}
          fit
          numberOfLines={1}>
          {title}
        </AppText>
      </GlassPlate>
    </Pressable>
  );
}

/** Wrapping row of action chips. */
export function ActionChipRow({ items }: { items: readonly ActionChipItem[] }) {
  const { spacing } = useResponsive();
  return (
    <View style={[styles.row, { gap: spacing.sm }]}>
      {items.map((item) => (
        <ActionChip
          key={item.id}
          label={item.label}
          testID={item.testID}
          onPress={item.onPress}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 1,
    minWidth: 0,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
});
