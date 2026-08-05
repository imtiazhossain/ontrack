import { StyleSheet, View } from 'react-native';

import { AppText, Symbol } from '@/components/primitives';
import { fontFamilies, radii } from '@/design-system';
import { itinerarySheetChrome } from '@/features/travel/travel-itinerary-sheet-chrome';
import { travelCardFill } from '@/features/travel/travel-surface';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';

const NOTES_CARD_SHADOW = '0 2px 8px rgba(17, 74, 110, 0.10)';

/** Trip notes strip — matches the dates row: cream card, teal note well, labeled body. */
export function TravelTripNotesCard({ notes }: { notes: string }) {
  const theme = useTheme();
  const chrome = itinerarySheetChrome(theme);
  const noteTone = chrome.icons.note;
  const { s, spacing: rs, typography } = useResponsive();
  const trimmed = notes.trim();
  if (!trimmed) return null;

  const iconBox = Math.max(24, s(26));

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={`Notes: ${trimmed}`}
      style={[
        styles.card,
        {
          backgroundColor: travelCardFill(theme),
          borderColor: chrome.fieldBorder,
          boxShadow: NOTES_CARD_SHADOW,
          minHeight: Math.max(44, s(48)),
          paddingHorizontal: rs.md,
          paddingVertical: rs.sm,
          gap: rs.md,
          borderRadius: Math.max(9, s(10)),
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
      <View style={[styles.copy, { gap: rs.xxs }]}>
        <AppText
          variant="caption"
          fit
          numberOfLines={1}
          style={[
            styles.label,
            {
              color: chrome.subtitle,
              fontSize: Math.max(12, typography.caption.fontSize - 0.5),
              lineHeight: Math.max(16, s(16)),
            },
          ]}>
          Notes
        </AppText>
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
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: StyleSheet.hairlineWidth,
    borderCurve: 'continuous',
  },
  iconWell: {
    marginTop: 1,
    borderRadius: radii.sm,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  copy: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    justifyContent: 'center',
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
