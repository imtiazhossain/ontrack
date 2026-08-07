import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  AppText,
  CollapsibleBody,
  DisclosureChevron,
  Symbol,
} from '@/components/primitives';
import { fontFamilies, radii } from '@/design-system';
import { TRAVEL_TITLE_ICON_GAP } from '@/features/travel/travel-chrome';
import { TravelHomeGlass } from '@/features/travel/travel-home-glass';
import { itinerarySheetChrome } from '@/features/travel/travel-itinerary-sheet-chrome';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { useAgentUiTarget } from '@/utils/agent-ui';
import { haptics } from '@/utils/haptics';

const NOTES_CARD_SHADOW = '0 2px 8px rgba(17, 74, 110, 0.10)';

/** Trip notes strip — glass card matching the dates row. */
export function TravelTripNotesCard({
  notes,
  toggleTestID,
  editTestID,
  onEdit,
  defaultExpanded = true,
  expanded: expandedProp,
  onExpandedChange,
}: {
  notes: string;
  toggleTestID?: string;
  editTestID?: string;
  onEdit?: () => void;
  defaultExpanded?: boolean;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
}) {
  const theme = useTheme();
  const chrome = itinerarySheetChrome(theme);
  const noteTone = chrome.icons.note;
  const { s, spacing: rs, typography } = useResponsive();
  const [uncontrolled, setUncontrolled] = useState(defaultExpanded);
  const expanded = expandedProp ?? uncontrolled;
  const trimmed = notes.trim();
  const canEdit = Boolean(onEdit);
  if (!trimmed && !canEdit) return null;

  const iconBox = Math.max(26, s(28));
  const titleIconGap = Math.max(TRAVEL_TITLE_ICON_GAP, s(TRAVEL_TITLE_ICON_GAP));
  const tap = Math.max(44, s(44));
  const chevronBox = Math.max(24, s(24));
  const accessibilityLabel = expanded ? `Notes, expanded` : `Notes, collapsed`;
  const bodyLabel = trimmed
    ? canEdit
      ? `Edit notes: ${trimmed}`
      : `Notes: ${trimmed}`
    : 'Add trip notes';
  const bodyCopy = trimmed || 'Tap to add notes…';

  const setExpanded = (next: boolean) => {
    if (expandedProp === undefined) setUncontrolled(next);
    onExpandedChange?.(next);
  };
  const toggle = () => {
    haptics.select();
    setExpanded(!expanded);
  };
  const openEdit = () => {
    if (!onEdit) return;
    haptics.tap();
    onEdit();
  };
  const agent = useAgentUiTarget(toggleTestID, {
    label: accessibilityLabel,
    onPress: toggle,
  });
  const editAgent = useAgentUiTarget(editTestID, {
    label: bodyLabel,
    onPress: canEdit ? openEdit : undefined,
  });
  const radius = Math.max(12, s(14));

  return (
    <TravelHomeGlass
      clear
      style={[
        styles.card,
        {
          boxShadow: NOTES_CARD_SHADOW,
          borderRadius: radius,
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
          <DisclosureChevron
            expanded={expanded}
            size="sm"
            color={noteTone.fg}
          />
        </View>
      </Pressable>
      <CollapsibleBody expanded={expanded}>
        <Pressable
          ref={editAgent.ref}
          testID={editTestID}
          onLayout={editAgent.onLayout}
          accessibilityRole={canEdit ? 'button' : 'text'}
          accessibilityLabel={bodyLabel}
          accessibilityHint={canEdit ? 'Opens the trip notes editor' : undefined}
          disabled={!canEdit}
          onPress={canEdit ? openEdit : undefined}
          style={({ pressed }) => [
            styles.bodyWrap,
            {
              borderTopColor:
                theme.name === 'dark'
                  ? 'rgba(255,255,255,0.12)'
                  : 'rgba(255,255,255,0.45)',
              // Align note copy with the "Notes" title (after icon + gap).
              paddingLeft: rs.md + iconBox + titleIconGap,
              paddingRight: rs.md,
              paddingTop: rs.sm,
              paddingBottom: Math.max(rs.md, s(14)),
              minHeight: tap,
            },
            canEdit && pressed && styles.pressed,
          ]}>
          <AppText
            variant="callout"
            color={trimmed ? 'secondary' : 'tertiary'}
            style={[
              styles.body,
              {
                fontSize: Math.max(14, typography.callout.fontSize),
                lineHeight: Math.max(20, typography.callout.lineHeight + 1),
              },
            ]}>
            {bodyCopy}
          </AppText>
        </Pressable>
      </CollapsibleBody>
    </TravelHomeGlass>
  );
}

const styles = StyleSheet.create({
  card: {
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
    justifyContent: 'center',
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
