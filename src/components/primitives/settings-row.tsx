import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { radii, type AppIconName } from '@/design-system';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { useAgentUiTarget } from '@/utils/agent-ui';
import { haptics } from '@/utils/haptics';

import { AppText } from './app-text';
import { fieldTitleCase } from './field-title-case';
import { Symbol } from './symbol';

interface SettingsRowProps {
  label: string;
  detail: string;
  /** Secondary caption lines (default 2). Use 3–4 for longer how-it-works copy. */
  detailNumberOfLines?: number;
  icon?: AppIconName;
  trailing?: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  testID?: string;
  /**
   * Flush row inside `SettingsGroup` — no outer border/margin (group owns the chrome).
   */
  grouped?: boolean;
}

export function SettingsRow({
  label,
  detail,
  detailNumberOfLines = 2,
  icon,
  trailing,
  onPress,
  accessibilityLabel = label,
  testID,
  grouped = false,
}: SettingsRowProps) {
  const theme = useTheme();
  const { spacing, layout, s } = useResponsive();
  const handlePress = onPress
    ? () => {
        haptics.select();
        onPress();
      }
    : undefined;
  const agent = useAgentUiTarget(testID, {
    label: accessibilityLabel,
    onPress: handlePress,
  });
  const content = (
    <>
      {icon ? (
        <View
          style={[
            styles.icon,
            {
              width: s(34),
              height: s(34),
              backgroundColor: theme.accentFaint,
            },
          ]}>
          <Symbol name={icon} size="sm" color={theme.accentPrimary} />
        </View>
      ) : null}
      <View style={[styles.text, { gap: spacing.xxs }]}>
        <AppText variant="callout" fit>
          {fieldTitleCase(label)}
        </AppText>
        <AppText
          variant="caption"
          color="secondary"
          numberOfLines={detailNumberOfLines}>
          {detail}
        </AppText>
      </View>
      {trailing}
    </>
  );
  const surface = [
    styles.row,
    {
      minHeight: layout.minTapTarget,
      gap: spacing.md,
      paddingVertical: grouped ? spacing.sm : spacing.md,
      paddingHorizontal: spacing.md,
      marginBottom: grouped ? 0 : spacing.xs,
      backgroundColor: grouped ? 'transparent' : theme.backgroundSunken,
      borderColor: grouped ? 'transparent' : theme.separator,
      borderWidth: grouped ? 0 : StyleSheet.hairlineWidth,
      borderRadius: grouped ? 0 : radii.md,
    },
  ];

  if (!onPress) {
    return (
      <View ref={agent.ref} testID={testID} onLayout={agent.onLayout} style={surface}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      ref={agent.ref}
      testID={testID}
      onLayout={agent.onLayout}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={handlePress}
      style={({ pressed }) => [surface, { opacity: pressed ? 0.78 : 1 }]}>
      {content}
    </Pressable>
  );
}

export function SettingsToggleRow({
  label,
  detail,
  detailNumberOfLines,
  icon,
  value,
  disabled,
  onValueChange,
  testID,
  grouped,
}: {
  label: string;
  detail: string;
  detailNumberOfLines?: number;
  icon?: AppIconName;
  value: boolean;
  disabled?: boolean;
  onValueChange: (value: boolean) => void;
  testID?: string;
  grouped?: boolean;
}) {
  const theme = useTheme();
  const accessibilityLabel = `${label}. ${detail}`;
  return (
    <SettingsRow
      label={label}
      detail={detail}
      detailNumberOfLines={detailNumberOfLines}
      icon={icon}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      grouped={grouped}
      onPress={disabled ? undefined : () => onValueChange(!value)}
      trailing={
        <Switch
          accessibilityLabel={accessibilityLabel}
          disabled={disabled}
          value={value}
          // Row press owns the toggle so the whole control is one hit target.
          pointerEvents="none"
          trackColor={{ false: theme.separator, true: theme.accentSoft }}
          ios_backgroundColor={theme.separator}
        />
      }
    />
  );
}

export function SettingsActionRow({
  label,
  detail,
  icon,
  onPress,
  accessibilityLabel,
  testID,
  grouped,
}: Omit<SettingsRowProps, 'trailing'> & { onPress: () => void }) {
  const theme = useTheme();
  return (
    <SettingsRow
      label={label}
      detail={detail}
      icon={icon}
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      grouped={grouped}
      trailing={<Symbol name="chevron-right" size="sm" color={theme.textTertiary} />}
    />
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderCurve: 'continuous',
  },
  icon: {
    borderRadius: radii.sm,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    minWidth: 0,
  },
});
