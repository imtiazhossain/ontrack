import { StyleSheet, View } from 'react-native';

import { AppText, Button, IconButton, Symbol } from '@/components/primitives';
import { radii, type AppIconName } from '@/design-system';
import {
  itinerarySheetChrome,
  travelInputFieldBackground,
  type SheetIconTone,
} from '@/features/travel/travel-itinerary-sheet-chrome';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';

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
          backgroundColor: travelInputFieldBackground(theme),
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
  icon,
  editorialGold: _editorialGold = false,
  flat: _flat = false,
  flatColor: _flatColor,
  testID,
}: {
  label: string;
  onPress: () => void;
  icon?: AppIconName;
  editorialGold?: boolean;
  flat?: boolean;
  /** Optional solid color for flat primary actions. */
  flatColor?: string;
  testID?: string;
}) {
  return (
    <Button
      variant="primary"
      icon={icon}
      onPress={onPress}
      testID={testID}
      accessibilityLabel={label}>
      {label}
    </Button>
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
    fieldBackground: icon.field,
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
});
