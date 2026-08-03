import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { radii, type AppIconName } from '@/design-system';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { useAgentUiTarget } from '@/utils/agent-ui';
import { haptics } from '@/utils/haptics';

import { AppText } from './app-text';
import { Symbol } from './symbol';

interface SettingsRowProps {
  label: string;
  detail: string;
  icon?: AppIconName;
  trailing?: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  testID?: string;
}

export function SettingsRow({
  label,
  detail,
  icon,
  trailing,
  onPress,
  accessibilityLabel = label,
  testID,
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
          {label}
        </AppText>
        <AppText variant="caption" color="secondary" numberOfLines={2}>
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
      padding: spacing.lg,
      marginBottom: spacing.sm,
      backgroundColor: theme.backgroundSunken,
      borderColor: theme.separator,
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
  icon,
  value,
  disabled,
  onValueChange,
}: {
  label: string;
  detail: string;
  icon?: AppIconName;
  value: boolean;
  disabled?: boolean;
  onValueChange: (value: boolean) => void;
}) {
  const theme = useTheme();
  return (
    <SettingsRow
      label={label}
      detail={detail}
      icon={icon}
      trailing={
        <Switch
          accessibilityLabel={label}
          disabled={disabled}
          value={value}
          onValueChange={onValueChange}
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
      trailing={<Symbol name="chevron-right" size="sm" color={theme.textTertiary} />}
    />
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.md,
    borderCurve: 'continuous',
    borderWidth: 1,
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
