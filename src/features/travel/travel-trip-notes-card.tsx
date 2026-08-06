import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Symbol } from '@/components/primitives';
import { fontFamilies, radii } from '@/design-system';
import { TRAVEL_TITLE_ICON_GAP } from '@/features/travel/travel-chrome';
import { itinerarySheetChrome } from '@/features/travel/travel-itinerary-sheet-chrome';
import { travelMainCardFill } from '@/features/travel/travel-surface';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { useAgentUiTarget } from '@/utils/agent-ui';
import { haptics } from '@/utils/haptics';

const NOTES_CARD_SHADOW = '0 2px 8px rgba(17, 74, 110, 0.10)';

/** Trip notes strip — matches the dates row: cream card, teal note well, labeled body. */
export function TravelTripNotesCard({
  notes,
  toggleTestID,
  defaultExpanded = true,
}: {
  notes: string;
  toggleTestID?: string;
  defaultExpanded?: boolean;
}) {
  const theme = useTheme();
  const chrome = itinerarySheetChrome(theme);
  const noteTone = chrome.icons.note;
  const { s, spacing: rs, typography } = useResponsive();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const trimmed = notes.trim();
  if (!trimmed) return null;

  const iconBox = Math.max(26, s(28));
  const titleIconGap = Math.max(TRAVEL_TITLE_ICON_GAP, s(TRAVEL_TITLE_ICON_GAP));
  const tap = Math.max(44, s(44));
  const chevronBox = Math.max(24, s(24));
  const label = 'Notes';
  const accessibilityLabel = expanded ? `Notes, expanded` : `Notes, collapsed`;

  const toggle = () => {
    haptics.select();
    setExpanded((next) => !next);
  };
  const agent = useAgentUiTarget(toggleTestID, {
    label: accessibilityLabel,
    onPress: toggle,
  });

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: travelMainCardFill(theme),
          borderColor: chrome.fieldBorder,
          boxShadow: NOTES_CARD_SHADOW,
          borderRadius: Math.max(12, s(14)),
          overflow: 'hidden',
        },
      ]}>
      <Pressable
        ref={agent.ref}
        testID={toggleTestID}
        onLayout={agent.onLayout}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={expanded ? 'Collapses trip notes' : 'Expands trip notes'}
        onPress={toggle}
        hitSlop={2}
        style={({ pressed }) => [
          styles.header,
          {
            minHeight: tap,
            gap: titleIconGap,
            paddingHorizontal: rs.md,
            paddingVertical: rs.sm,
          },
          pressed && styles.pressed,
        ]}>
        <View
          style={[
            styles.iconWell,
            {
              width: iconBox,
              height: iconBox,
              backgroundColor: noteTone.bg,
              boxShadow: theme.name === 'light' ? NOTES_CARD_SHADOW : undefined,
            },
          ]}>
          <Symbol name="note" size={18} color={noteTone.fg} />
        </View>
        <AppText
          variant="caption"
          fit
          numberOfLines={1}
          style={[
            styles.label,
            styles.title,
            {
              color: chrome.subtitle,
              fontSize: Math.max(12, typography.caption.fontSize - 0.5),
              lineHeight: Math.max(16, s(16)),
            },
          ]}>
          Notes
        </AppText>
        <View
          style={[
            styles.chevron,
            {
              minHeight: chevronBox,
              minWidth: chevronBox,
              width: chevronBox,
            },
          ]}>
          <Symbol
            name={expanded ? 'chevron-up' : 'chevron-right'}
            size="sm"
            color={noteTone.fg}
          />
        </View>
      </Pressable>
      {expanded ? (
        <View
          accessibilityRole="text"
          accessibilityLabel={`Notes: ${trimmed}`}
          style={[
            styles.bodyWrap,
            {
              borderTopColor: chrome.fieldBorder,
              // Align note copy with the "Notes" title (after icon + gap).
              paddingLeft: rs.md + iconBox + titleIconGap,
              paddingRight: rs.md,
              paddingTop: rs.sm,
              paddingBottom: Math.max(rs.md, s(14)),
            },
          ]}>
          <AppText
            variant="callout"
            color="secondary"
            style={[
              styles.body,
              {
                fontSize: Math.max(14, typography.callout.fontSize),
                lineHeight: Math.max(20, typography.callout.lineHeight + 1),
              },
            ]}>
            {trimmed}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderCurve: 'continuous',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWell: {
    borderRadius: radii.sm,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  title: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  chevron: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  bodyWrap: {
    width: '100%',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  label: {
    fontFamily: fontFamilies.serif,
    fontWeight: '400',
  },
  body: {
    fontFamily: fontFamilies.serif,
    fontWeight: '400',
    letterSpacing: -0.15,
  },
  pressed: { opacity: 0.72 },
});
