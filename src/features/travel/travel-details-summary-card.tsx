import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Symbol } from '@/components/primitives';
import type { AppIconName } from '@/design-system';
import { fontFamilies, radii } from '@/design-system';
import { travelOverlineStyle } from '@/features/travel/travel-chrome';
import {
  travelCardBorder,
  travelCardFill,
  travelCardShadow,
} from '@/features/travel/travel-surface';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';

export type TravelDetailsSummaryRow = {
  label: string;
  value?: string;
  detail?: string;
  icon?: AppIconName;
};

export function TravelDetailsSummaryCard({
  title,
  subtitle,
  icon,
  accentColor,
  tintColor,
  confirmationCode,
  onPressConfirmation,
  rows,
  children,
}: {
  title: string;
  subtitle?: string;
  icon: AppIconName;
  accentColor: string;
  tintColor: string;
  confirmationCode?: string;
  onPressConfirmation?: () => void;
  rows: TravelDetailsSummaryRow[];
  children?: ReactNode;
}) {
  const theme = useTheme();
  const { s, spacing: rs } = useResponsive();
  const iconWellSize = Math.max(44, s(48));

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: travelCardFill(theme),
          borderColor: travelCardBorder(theme),
          borderRadius: Math.max(radii.lg, s(18)),
          boxShadow: travelCardShadow(theme),
          padding: rs.lg,
          gap: rs.md,
        },
      ]}>
      <View style={[styles.header, { gap: rs.md }]}>
        <View
          style={[
            styles.iconWell,
            {
              width: iconWellSize,
              height: iconWellSize,
              borderRadius: Math.max(radii.md, s(14)),
              backgroundColor: tintColor,
            },
          ]}>
          <Symbol name={icon} size="lg" color={accentColor} />
        </View>
        <View style={[styles.titleCopy, { gap: rs.xxs }]}>
          <AppText variant="heading" fit style={styles.editorialTitle}>
            {title}
          </AppText>
          {subtitle ? (
            <AppText variant="caption" color="secondary" fit>
              {subtitle}
            </AppText>
          ) : null}
        </View>
        {confirmationCode ? (
          <Pressable
            accessibilityRole={onPressConfirmation ? 'button' : undefined}
            accessibilityLabel={
              onPressConfirmation
                ? `View confirmation ${confirmationCode}`
                : undefined
            }
            disabled={!onPressConfirmation}
            hitSlop={8}
            onPress={onPressConfirmation}
            style={({ pressed }) => [
              styles.confirmation,
              pressed && styles.pressed,
            ]}>
            <AppText
              variant="overline"
              color="secondary"
              fit
              style={travelOverlineStyle}>
              Confirmation
            </AppText>
            <AppText
              variant="subheading"
              selectable
              fit
              style={[styles.confirmationValue, { color: theme.textPrimary }]}>
              {confirmationCode}
            </AppText>
          </Pressable>
        ) : null}
      </View>

      {rows.length ? (
        <View style={[styles.rows, { borderTopColor: theme.separator }]}>
          {rows.map((row, index) => (
            <View
              key={`${row.label}-${index}`}
              style={[
                styles.row,
                {
                  gap: rs.md,
                  paddingVertical: rs.md,
                  borderTopColor: theme.separator,
                },
                index > 0 && styles.rowDivider,
              ]}>
              <View
                style={[
                  styles.rowIcon,
                  {
                    width: iconWellSize,
                    height: iconWellSize,
                    borderRadius: Math.max(radii.md, s(14)),
                    backgroundColor: tintColor,
                  },
                ]}>
                <Symbol
                  name={row.icon ?? 'calendar'}
                  size="md"
                  color={accentColor}
                />
              </View>
              <View style={[styles.rowCopy, { gap: rs.xxs }]}>
                <AppText
                  variant="overline"
                  color="secondary"
                  fit
                  style={travelOverlineStyle}>
                  {row.label}
                </AppText>
                {row.value ? (
                  <AppText variant="subheading" fit selectable>
                    {row.value}
                  </AppText>
                ) : null}
                {row.detail ? (
                  <AppText
                    variant="caption"
                    color="secondary"
                    numberOfLines={2}>
                    {row.detail}
                  </AppText>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  header: { flexDirection: 'row', alignItems: 'center' },
  iconWell: { alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  titleCopy: { flex: 1, minWidth: 0, flexShrink: 1 },
  editorialTitle: { fontFamily: fontFamilies.serif },
  confirmation: { maxWidth: '42%', alignItems: 'flex-end', flexShrink: 1 },
  confirmationValue: { textAlign: 'right', fontVariant: ['tabular-nums'] },
  pressed: { opacity: 0.7 },
  rows: { borderTopWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowDivider: { borderTopWidth: StyleSheet.hairlineWidth },
  rowIcon: { alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  rowCopy: { flex: 1, minWidth: 0, flexShrink: 1 },
});
