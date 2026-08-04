import { StyleSheet, View } from 'react-native';

import { Symbol } from '@/components/primitives';
import type { Theme } from '@/design-system';
import { fontFamilies } from '@/design-system';
import { itinerarySheetChrome } from '@/features/travel/travel-itinerary-sheet-chrome';
import { travelPageBg } from '@/features/travel/travel-surface';
import { useResponsive } from '@/hooks/use-responsive';

/** Shared cream-card palette for travel dialogs (calendar, photos, remove). */
export function travelDialogPalette(theme: Theme) {
  const chrome = itinerarySheetChrome(theme);
  const light = theme.name === 'light';
  return {
    chrome,
    light,
    cardBg: light ? '#FDF8F2' : chrome.fieldBg,
    borderColor: light ? 'rgba(180, 140, 90, 0.45)' : chrome.importActionBorder,
    goldFrom: light ? '#D4A76A' : chrome.ctaFrom,
    goldTo: light ? '#BB8D50' : chrome.ctaTo,
    primaryText: light ? '#2D1C13' : chrome.ctaText,
    outlineBorder: light ? 'rgba(180, 140, 90, 0.55)' : chrome.importActionBorder,
    outlineBg: light ? travelPageBg(theme) : chrome.sheetBg,
    ruleColor: light ? 'rgba(180, 140, 90, 0.35)' : chrome.fieldBorder,
    diamondColor: light ? '#C4A06A' : chrome.ctaFrom,
    badgeBg: light ? 'rgba(212, 167, 106, 0.16)' : chrome.icons.import.bg,
    badgeFg: light ? '#B8895A' : chrome.ctaFrom,
    closeBg: light ? 'rgba(212, 167, 106, 0.14)' : chrome.closeBg,
    closeFg: light ? '#8A6A45' : chrome.closeIcon,
    mountainColor: light ? '#B8956C' : chrome.subtitle,
    /** Terracotta destructive CTA — remove / delete confirms. */
    dangerFrom: light ? '#C26D55' : '#E74C3C',
    dangerTo: light ? '#A85845' : '#C0392B',
    dangerText: '#FFFFFF',
    cancelText: light ? '#9A5A48' : '#E0A090',
  };
}

export function TravelDialogSparkleBadge({
  color,
  bg,
}: {
  color: string;
  bg: string;
}) {
  const { s } = useResponsive();
  const size = Math.max(40, s(44));

  return (
    <View
      style={[
        styles.badge,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bg,
        },
      ]}>
      <Symbol name="smart" size={Math.max(20, s(22))} color={color} />
    </View>
  );
}

export function TravelDialogDiamondRule({
  line,
  diamond,
}: {
  line: string;
  diamond: string;
}) {
  const { s } = useResponsive();
  const diamondSize = Math.max(7, s(8));

  return (
    <View style={[styles.diamondRule, { gap: Math.max(8, s(10)) }]}>
      <View style={[styles.ruleLine, { backgroundColor: line }]} />
      <View
        style={[
          styles.diamond,
          {
            width: diamondSize,
            height: diamondSize,
            backgroundColor: diamond,
          },
        ]}
      />
      <View style={[styles.ruleLine, { backgroundColor: line }]} />
    </View>
  );
}

export const travelDialogTextStyles = StyleSheet.create({
  heading: {
    fontFamily: fontFamilies.serif,
    fontWeight: '400',
    textAlign: 'center',
    letterSpacing: -0.4,
    flexShrink: 1,
    minWidth: 0,
    width: '100%',
  },
  message: {
    fontFamily: fontFamilies.serif,
    fontWeight: '400',
    textAlign: 'center',
  },
  buttonLabel: {
    fontFamily: fontFamilies.serif,
    fontWeight: '400',
    textAlign: 'center',
    alignSelf: 'center',
    flexShrink: 1,
    minWidth: 0,
  },
});

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  diamondRule: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '72%',
    maxWidth: 220,
  },
  ruleLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth * 2,
  },
  diamond: {
    transform: [{ rotate: '45deg' }],
    borderRadius: 1,
  },
});
