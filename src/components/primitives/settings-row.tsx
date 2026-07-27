import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { layout, radii, spacing, type AppIconName } from '@/design-system';
import { useTheme } from '@/hooks/use-theme';
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
}

export function SettingsRow({
  label,
  detail,
  icon,
  trailing,
  onPress,
  accessibilityLabel = label,
}: SettingsRowProps) {
  const theme = useTheme();
  const content = (
    <>
      {icon ? (
        <View style={[styles.icon, { backgroundColor: theme.accentFaint }]}>
          <Symbol name={icon} size="sm" color={theme.accentPrimary} />
        </View>
      ) : null}
      <View style={styles.text}>
        <AppText variant="callout">{label}</AppText>
        <AppText variant="caption" color="secondary">
          {detail}
        </AppText>
      </View>
      {trailing}
    </>
  );
  const surface = [
    styles.row,
    { backgroundColor: theme.backgroundSunken, borderColor: theme.separator },
  ];

  if (!onPress) return <View style={surface}>{content}</View>;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={() => {
        haptics.select();
        onPress();
      }}
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
}: Omit<SettingsRowProps, 'trailing'> & { onPress: () => void }) {
  const theme = useTheme();
  return (
    <SettingsRow
      label={label}
      detail={detail}
      icon={icon}
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      trailing={<Symbol name="chevron-right" size="sm" color={theme.textTertiary} />}
    />
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: layout.minTapTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  icon: {
    width: 34,
    height: 34,
    borderRadius: radii.sm,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    gap: spacing.xxs,
  },
});
