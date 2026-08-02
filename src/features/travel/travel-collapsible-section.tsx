import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Symbol } from '@/components/primitives';
import type { TypeVariant } from '@/design-system';
import { radii } from '@/design-system';
import { travelOverlineStyle } from '@/features/travel/travel-chrome';
import {
  TRAVEL_EDITORIAL_ACCENT,
  travelCardBorder,
  travelCardFill,
  travelPanelTint,
} from '@/features/travel/travel-surface';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';

export function TravelCollapsibleSection({
  title,
  count,
  expanded,
  onToggle,
  onAddPress,
  titleVariant = 'overline',
  nested = false,
  children,
}: {
  title: string;
  count?: number;
  expanded: boolean;
  onToggle: () => void;
  /** Optional plus control to the right of the title (e.g. add timeline item). */
  onAddPress?: () => void;
  /** Slightly larger parent headers can use `caption` or `callout`. */
  titleVariant?: TypeVariant;
  /** Smaller chevron flush to the title — for sections nested under a parent. */
  nested?: boolean;
  children?: ReactNode;
}) {
  const theme = useTheme();
  const { s, spacing } = useResponsive();
  const label = count === undefined ? title : `${title} (${count})`;
  const tap = Math.max(44, s(44));
  const chevronBox = nested ? s(16) : Math.max(32, s(32));
  const headerGap = nested ? spacing.xs : spacing.sm;

  return (
    <View style={[styles.section, { gap: spacing.sm }]}>
      <View
        style={[
          styles.headerShell,
          {
            minHeight: tap,
            gap: headerGap,
            paddingHorizontal: nested ? 0 : spacing.sm,
            paddingVertical: nested ? 0 : spacing.xs,
            borderRadius: nested ? 0 : radii.lg,
            backgroundColor: nested ? 'transparent' : travelPanelTint(theme),
            borderWidth: nested ? 0 : StyleSheet.hairlineWidth,
            borderColor: nested ? 'transparent' : travelCardBorder(theme),
          },
        ]}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          accessibilityLabel={label}
          onPress={onToggle}
          hitSlop={nested ? 10 : undefined}
          style={[styles.toggle, { minHeight: tap, gap: headerGap }]}>
          <View
            style={[
              styles.chevron,
              {
                minHeight: nested ? s(22) : chevronBox,
                minWidth: chevronBox,
                width: nested ? chevronBox : chevronBox,
                borderRadius: nested ? 0 : radii.pill,
                backgroundColor: nested
                  ? 'transparent'
                  : travelCardFill(theme),
              },
            ]}>
            <Symbol
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={nested ? 12 : 'sm'}
              color={TRAVEL_EDITORIAL_ACCENT}
            />
          </View>
          <AppText
            variant={titleVariant}
            color="accent"
            fit
            style={[travelOverlineStyle, styles.title, { color: TRAVEL_EDITORIAL_ACCENT }]}>
            {title}
          </AppText>
          {count !== undefined ? (
            <View
              style={[
                styles.countBadge,
                {
                  backgroundColor: TRAVEL_EDITORIAL_ACCENT,
                  minHeight: Math.max(22, s(22)),
                  paddingHorizontal: spacing.xs,
                },
              ]}>
              <AppText variant="caption" color="onAccent" fit>
                {count}
              </AppText>
            </View>
          ) : null}
        </Pressable>
        {onAddPress ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Add to ${title}`}
            onPress={onAddPress}
            hitSlop={6}
            style={[
              styles.addButton,
              {
                minHeight: tap,
                minWidth: tap,
                borderRadius: radii.pill,
                backgroundColor: nested
                  ? 'transparent'
                  : travelCardFill(theme),
              },
            ]}>
            <Symbol name="add" size="sm" color={TRAVEL_EDITORIAL_ACCENT} />
          </Pressable>
        ) : null}
      </View>
      {expanded ? children : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {},
  headerShell: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggle: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  countBadge: {
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  chevron: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
