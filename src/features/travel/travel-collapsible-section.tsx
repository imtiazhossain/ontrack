import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Symbol } from '@/components/primitives';
import type { AppIconName, TypeVariant } from '@/design-system';
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
import { AgentTestId } from '@/utils/agent-ui';

const TRAVEL_HEADER_SHADOW = '0 2px 8px rgba(51, 39, 28, 0.08)';

export function TravelCollapsibleSection({
  title,
  count,
  expanded,
  onToggle,
  onAddPress,
  addTestID,
  titleVariant = 'overline',
  nested = false,
  icon,
  card = false,
  compact = false,
  accentColor,
  flushContent = false,
  tightHeader = false,
  children,
}: {
  title: string;
  count?: number;
  expanded: boolean;
  onToggle: () => void;
  /** Optional plus control to the right of the title (e.g. add timeline item). */
  onAddPress?: () => void;
  addTestID?: string;
  /** Slightly larger parent headers can use `caption` or `callout`. */
  titleVariant?: TypeVariant;
  /** Smaller chevron flush to the title — for sections nested under a parent. */
  nested?: boolean;
  icon?: AppIconName;
  /** Join the header and expanded content into one bordered itinerary panel. */
  card?: boolean;
  /** Detail-page density from the itinerary mock; hit slop preserves tap size. */
  compact?: boolean;
  accentColor?: string;
  /** Let day cards sit nearly flush with the parent timeline panel. */
  flushContent?: boolean;
  tightHeader?: boolean;
  children?: ReactNode;
}) {
  const theme = useTheme();
  const { s, spacing } = useResponsive();
  const label = count === undefined ? title : `${title} (${count})`;
  const accent = accentColor ?? TRAVEL_EDITORIAL_ACCENT;
  const tap = compact
    ? nested
      ? Math.max(28, s(28))
      : tightHeader
        ? Math.max(32, s(32))
        : Math.max(40, s(40))
    : Math.max(44, s(44));
  const chevronBox = compact
    ? Math.max(24, s(24))
    : nested
      ? s(16)
      : Math.max(32, s(32));
  const headerGap = nested ? spacing.xxs : spacing.sm;

  return (
    <View
      style={[
        styles.section,
        card
          ? {
              borderRadius: compact ? Math.max(11, s(12)) : Math.max(16, s(18)),
              borderCurve: 'continuous',
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: travelCardBorder(theme),
              backgroundColor: travelCardFill(theme),
              boxShadow: compact ? TRAVEL_HEADER_SHADOW : undefined,
              overflow: 'hidden',
            }
          : { gap: compact ? spacing.xxs : spacing.sm },
      ]}>
      <View
        style={[
          styles.headerShell,
          {
            minHeight: tap,
            gap: headerGap,
            paddingLeft: nested ? 0 : tightHeader ? spacing.xs : spacing.sm,
            paddingRight: nested ? 0 : spacing.sm,
            paddingVertical: nested || compact ? 0 : spacing.xs,
            borderRadius: card || nested ? 0 : radii.lg,
            backgroundColor: nested
              ? 'transparent'
              : compact
                ? travelCardFill(theme)
                : travelPanelTint(theme),
            borderWidth: card || nested ? 0 : StyleSheet.hairlineWidth,
            borderBottomWidth: card && expanded ? StyleSheet.hairlineWidth : 0,
            borderColor: nested ? 'transparent' : travelCardBorder(theme),
          },
        ]}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          accessibilityLabel={label}
          onPress={onToggle}
          hitSlop={
            compact
              ? nested
                ? 8
                : tightHeader
                  ? 6
                  : 2
              : nested
                ? 10
                : undefined
          }
          style={[styles.toggle, { minHeight: tap, gap: headerGap }]}>
          {icon ? (
            <View
              style={[
                styles.leadingIcon,
                {
                  width: nested
                    ? Math.max(18, s(18))
                    : tightHeader
                      ? Math.max(26, s(28))
                      : Math.max(28, s(30)),
                },
              ]}>
              <Symbol
                name={icon}
                size={compact ? (nested ? 12 : tightHeader ? 18 : 16) : 'sm'}
                color={accent}
              />
            </View>
          ) : null}
          <AppText
            variant={compact && nested ? 'overline' : titleVariant}
            color="accent"
            fit
            fitMinimumScale={compact && nested ? 0.9 : undefined}
            style={[
              travelOverlineStyle,
              styles.title,
              compact && nested ? styles.compactNestedTitle : undefined,
              { color: accent },
            ]}>
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
          {compact && nested ? null : (
          <View
            style={[
              styles.chevron,
              {
                minHeight: nested ? s(22) : chevronBox,
                minWidth: chevronBox,
                width: chevronBox,
                borderRadius: nested ? 0 : radii.pill,
                backgroundColor: nested || compact
                  ? 'transparent'
                  : travelCardFill(theme),
              },
            ]}>
            <Symbol
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={nested ? 12 : 'sm'}
              color={accent}
            />
          </View>
          )}
        </Pressable>
        {onAddPress ? (
          <AgentTestId
            testID={addTestID}
            label={`Add to ${title}`}
            onPress={onAddPress}
            style={styles.addButton}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Add to ${title}`}
              onPress={onAddPress}
              hitSlop={6}
              style={[
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
          </AgentTestId>
        ) : null}
      </View>
      {expanded ? (
        <View
          style={
            card
              ? { padding: flushContent ? spacing.xxs : compact ? spacing.xs : spacing.md }
              : undefined
          }>
          {children}
        </View>
      ) : null}
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
  leadingIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  compactNestedTitle: {
    letterSpacing: 1.2,
  },
});
