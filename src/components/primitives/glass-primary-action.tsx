import {
    Pressable,
    StyleSheet,
    type StyleProp,
    type ViewStyle,
} from 'react-native';

import { glassMaterials, radii, type AppIconName } from '@/design-system';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { useAgentUiTarget } from '@/utils/agent-ui';
import { haptics } from '@/utils/haptics';

import { AppText } from './app-text';
import { fieldTitleCase } from './field-title-case';
import { GlassPlate } from './glass-plate';
import { Symbol } from './symbol';

/** Wide sheet footer CTA — frosted sage glass. */
export function GlassPrimaryAction({
  label,
  icon,
  onPress,
  disabled = false,
  testID,
  style,
}: {
  label: string;
  icon?: AppIconName;
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const { spacing, layout } = useResponsive();
  const title = fieldTitleCase(label);
  const handlePress = () => {
    if (disabled) return;
    haptics.tap();
    onPress();
  };
  const agent = useAgentUiTarget(testID, {
    label: title,
    onPress: disabled ? undefined : handlePress,
  });
  const ink = '#FFFFFF';

  return (
    <Pressable
      ref={agent.ref}
      testID={testID}
      onLayout={agent.onLayout}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.hit,
        { opacity: disabled ? 0.45 : pressed ? 0.88 : 1 },
        style,
      ]}>
      <GlassPlate
        accent="green"
        style={[
          styles.glass,
          {
            minHeight: layout.minTapTarget,
            gap: spacing.sm,
            paddingHorizontal: spacing.xl,
            paddingVertical: spacing.md,
            borderRadius: radii.pill,
            boxShadow:
              theme.name === 'dark'
                ? glassMaterials.accentGreen.shadowDark
                : glassMaterials.accentGreen.shadow,
          },
        ]}>
        {icon ? <Symbol name={icon} size="sm" color={ink} /> : null}
        <AppText
          variant="callout"
          fit
          numberOfLines={1}
          style={[styles.label, { color: ink }]}>
          {title}
        </AppText>
      </GlassPlate>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: {
    width: '100%',
  },
  glass: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  label: {
    flexShrink: 1,
    minWidth: 0,
    fontWeight: '600',
  },
});
