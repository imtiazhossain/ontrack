import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Symbol } from '@/components/primitives';
import { fontFamilies, radii } from '@/design-system';
import { itinerarySheetChrome } from '@/features/travel/travel-itinerary-sheet-chrome';
import { travelCardFill } from '@/features/travel/travel-surface';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { AgentTestId } from '@/utils/agent-ui';

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

  const iconBox = Math.max(24, s(26));
  const tap = Math.max(40, s(40));
  const chevronBox = Math.max(24, s(24));
  const label = 'Notes';

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: travelCardFill(theme),
          borderColor: chrome.fieldBorder,
          boxShadow: NOTES_CARD_SHADOW,
          borderRadius: Math.max(9, s(10)),
          overflow: 'hidden',
        },
      ]}>
      <AgentTestId
        testID={toggleTestID}
        label={label}
        onPress={() => setExpanded((next) => !next)}
        style={styles.toggleWrapper}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          accessibilityLabel={label}
          onPress={() => setExpanded((next) => !next)}
          hitSlop={2}
          style={[
            styles.header,
            {
              minHeight: tap,
              gap: rs.sm,
              paddingHorizontal: rs.md,
              paddingVertical: rs.xs,
            },
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
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size="sm"
              color={noteTone.fg}
            />
          </View>
        </Pressable>
      </AgentTestId>
      {expanded ? (
        <View
          accessibilityRole="text"
          accessibilityLabel={`Notes: ${trimmed}`}
          style={[
            styles.bodyWrap,
            {
              paddingHorizontal: rs.md,
              paddingBottom: rs.sm,
              gap: rs.xxs,
            },
          ]}>
          <AppText
            variant="callout"
            numberOfLines={3}
            style={[
              styles.body,
              {
                color: chrome.title,
                fontSize: Math.max(13, typography.caption.fontSize),
                lineHeight: Math.max(18, typography.caption.lineHeight),
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
  toggleWrapper: {
    width: '100%',
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
  },
  label: {
    fontFamily: fontFamilies.serif,
    fontWeight: '400',
  },
  body: {
    fontFamily: fontFamilies.serif,
    fontWeight: '400',
    letterSpacing: -0.1,
  },
});
