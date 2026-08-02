import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { AppText, IconButton, Symbol } from '@/components/primitives';
import { radii, type AppIconName } from '@/design-system';
import {
  itinerarySheetChrome,
  type SheetIconTone,
} from '@/features/travel/travel-itinerary-sheet-chrome';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { haptics } from '@/utils/haptics';

export function ItinerarySheetImportCard({
  title,
  subtitle,
  importing,
  importingLabel,
  onImportScreenshots,
  onImportDocument,
  accessibilityLabel,
}: {
  title: string;
  subtitle: string;
  importing: boolean;
  importingLabel?: string;
  onImportScreenshots: () => void;
  onImportDocument: () => void;
  accessibilityLabel: string;
}) {
  const theme = useTheme();
  const chrome = itinerarySheetChrome(theme);
  const { s, spacing: rs } = useResponsive();
  const actionSize = Math.max(40, s(44));
  const importTone = chrome.icons.import;

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.importCard,
        {
          backgroundColor: chrome.fieldBg,
          borderColor: chrome.fieldBorder,
          borderRadius: radii.lg,
          paddingHorizontal: rs.md,
          paddingVertical: rs.sm,
          gap: rs.sm,
          minHeight: Math.max(56, s(64)),
        },
      ]}>
      <View style={[styles.importIcon, { marginTop: s(2) }]}>
        <View
          style={{
            width: Math.max(32, s(32)),
            height: Math.max(32, s(32)),
            borderRadius: radii.sm,
            borderCurve: 'continuous',
            backgroundColor: importTone.bg,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Symbol name="smart" size="sm" color={importTone.fg} />
        </View>
      </View>
      <View style={styles.importCopy}>
        <AppText
          fit
          numberOfLines={1}
          style={[
            styles.importTitle,
            {
              color: chrome.importTitle,
              fontSize: Math.max(15, s(16)),
            },
          ]}>
          {title}
        </AppText>
        <AppText
          variant="caption"
          numberOfLines={2}
          style={{ color: chrome.importSubtitle, flexShrink: 1, minWidth: 0 }}>
          {subtitle}
        </AppText>
      </View>
      {importing ? (
        <IconButton
          icon="scan-document"
          loading
          size={actionSize}
          shape="rounded"
          background={chrome.importActionBg}
          borderColor={chrome.importActionBorder}
          color={chrome.importTitle}
          onPress={() => {}}
          accessibilityLabel={importingLabel ?? 'Importing confirmation'}
        />
      ) : (
        <View style={[styles.importActions, { gap: rs.xs }]}>
          <IconButton
            icon="photo"
            size={actionSize}
            shape="rounded"
            background={chrome.importActionBg}
            borderColor={chrome.importActionBorder}
            color={chrome.importTitle}
            onPress={onImportScreenshots}
            accessibilityLabel="Import confirmation from photo screenshots"
          />
          <IconButton
            icon="scan-document"
            size={actionSize}
            shape="rounded"
            background={chrome.importActionBg}
            borderColor={chrome.importActionBorder}
            color={chrome.importTitle}
            onPress={onImportDocument}
            accessibilityLabel="Import confirmation from document or email"
          />
        </View>
      )}
    </View>
  );
}

export function ItinerarySheetSubmitButton({
  label,
  onPress,
  icon = 'calendar-add',
  editorialGold = false,
}: {
  label: string;
  onPress: () => void;
  icon?: AppIconName;
  editorialGold?: boolean;
}) {
  const theme = useTheme();
  const chrome = itinerarySheetChrome(theme);
  const { s, spacing: rs, layout } = useResponsive();
  const colors =
    editorialGold && theme.name === 'light'
      ? (['#D5A13E', '#A86E20'] as const)
      : ([chrome.ctaFrom, chrome.ctaTo] as const);
  const minHeight = Math.max(layout.minTapTarget, s(editorialGold ? 48 : 52));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      style={({ pressed }) => [
        styles.submitWrap,
        {
          opacity: pressed ? 0.86 : 1,
          minHeight,
          borderRadius: radii.pill,
        },
      ]}>
      <LinearGradient
        colors={[...colors]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={[
          styles.submitGradient,
          {
            minHeight,
            paddingHorizontal: rs.lg,
            gap: rs.sm,
            borderRadius: radii.pill,
          },
        ]}>
        <Symbol name={icon} size="sm" color={chrome.ctaText} />
        <AppText
          variant="callout"
          fit
          numberOfLines={1}
          style={[
            styles.submitLabel,
            {
              color: chrome.ctaText,
              fontSize: editorialGold ? s(19) : undefined,
              lineHeight: editorialGold ? s(24) : undefined,
            },
          ]}>
          {label}
        </AppText>
      </LinearGradient>
    </Pressable>
  );
}

export function useSheetFieldChrome(tone: SheetIconTone) {
  const theme = useTheme();
  const chrome = itinerarySheetChrome(theme);
  const icon = chrome.icons[tone];
  return {
    chrome,
    iconBackground: icon.bg,
    iconColor: icon.fg,
    fieldBackground: chrome.fieldBg,
    stackedLabelColor: chrome.label,
    placeholderColor: chrome.placeholder,
    placeholderTextColor: chrome.placeholder,
  };
}

const styles = StyleSheet.create({
  importCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  importIcon: {
    flexShrink: 0,
  },
  importCopy: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    gap: 2,
  },
  importTitle: {
    flexShrink: 1,
    minWidth: 0,
    letterSpacing: -0.2,
  },
  importActions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  submitWrap: {
    width: '100%',
    overflow: 'hidden',
  },
  submitGradient: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitLabel: {
    flexShrink: 1,
    minWidth: 0,
  },
});
