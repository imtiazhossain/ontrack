import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, GlassIconWell, GlassPlate, Symbol } from '@/components/primitives';
import type { AppIconName } from '@/design-system';
import { fontFamilies, radii } from '@/design-system';
import { travelOverlineStyle } from '@/features/travel/travel-chrome';
import { travelCardShadow } from '@/features/travel/travel-surface';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';

export type TravelDetailsSummaryRow = {
  label: string;
  value?: string;
  detail?: string;
  icon?: AppIconName;
  /** Brand mark filling the icon well instead of the glyph (airline logos). */
  mark?: ReactNode;
};

export function TravelDetailsSummaryCard({
  title,
  subtitle,
  icon,
  mark,
  accentColor,
  confirmationCode,
  onPressConfirmation,
  rows,
  children,
}: {
  title: string;
  subtitle?: string;
  icon: AppIconName;
  /** Brand mark filling the header well instead of the glyph. */
  mark?: ReactNode;
  accentColor: string;
  confirmationCode?: string;
  onPressConfirmation?: () => void;
  rows: TravelDetailsSummaryRow[];
  children?: ReactNode;
}) {
  const theme = useTheme();
  const { s, spacing: rs } = useResponsive();
  const iconWellSize = Math.max(44, s(48));
  const wellRadius = Math.max(radii.md, s(14));

  return (
    <GlassPlate
      airy
      style={[
        styles.card,
        {
          borderRadius: Math.max(radii.lg, s(18)),
          boxShadow: travelCardShadow(theme),
          padding: rs.lg,
          gap: rs.md,
        },
      ]}>
      <View style={[styles.header, { gap: rs.md }]}>
        <GlassIconWell size={iconWellSize} borderRadius={wellRadius}>
          {mark ?? <Symbol name={icon} size="lg" color={accentColor} />}
        </GlassIconWell>
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
              <GlassIconWell size={iconWellSize} borderRadius={wellRadius}>
                {row.mark ?? (
                  <Symbol
                    name={row.icon ?? 'calendar'}
                    size="md"
                    color={accentColor}
                  />
                )}
              </GlassIconWell>
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
    </GlassPlate>
  );
}

const styles = StyleSheet.create({
  card: {
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  header: { flexDirection: 'row', alignItems: 'center' },
  titleCopy: { flex: 1, minWidth: 0, flexShrink: 1 },
  editorialTitle: { fontFamily: fontFamilies.serif },
  confirmation: { maxWidth: '42%', alignItems: 'flex-end', flexShrink: 1 },
  confirmationValue: { textAlign: 'right', fontVariant: ['tabular-nums'] },
  pressed: { opacity: 0.7 },
  rows: { borderTopWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowDivider: { borderTopWidth: StyleSheet.hairlineWidth },
  rowCopy: { flex: 1, minWidth: 0, flexShrink: 1 },
});
