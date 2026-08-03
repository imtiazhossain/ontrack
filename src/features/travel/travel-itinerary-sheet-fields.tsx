import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { AppText, IconButton, Symbol } from '@/components/primitives';
import { radii, type AppIconName } from '@/design-system';
import {
  itinerarySheetChrome,
  travelInputFieldBackground,
  type SheetIconTone,
} from '@/features/travel/travel-itinerary-sheet-chrome';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { useAgentUiTarget } from '@/utils/agent-ui';
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
  editorialGold = false,
  flat = false,
  testID,
}: {
  label: string;
  onPress: () => void;
  icon?: AppIconName;
  editorialGold?: boolean;
  flat?: boolean;
  testID?: string;
}) {
  const theme = useTheme();
  const chrome = itinerarySheetChrome(theme);
  const { s, spacing: rs, layout } = useResponsive();
  const gradientColors =
    editorialGold && theme.name === 'light'
      ? (['#E0B45A', '#C48A2E', '#9A6520'] as const)
      : ([chrome.ctaFrom, chrome.ctaTo] as const);
  const colors = flat ? ([gradientColors[0], gradientColors[0]] as const) : gradientColors;
  const minHeight = Math.max(layout.minTapTarget, s(editorialGold ? 52 : 52));
  const handlePress = () => {
    haptics.tap();
    onPress();
  };
  const agent = useAgentUiTarget(testID, { label, onPress: handlePress });

  return (
    <Pressable
      ref={agent.ref}
      testID={testID}
      onLayout={agent.onLayout}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.submitWrap,
        {
          opacity: pressed ? 0.86 : 1,
          minHeight,
          borderRadius: radii.pill,
          boxShadow:
            !flat && editorialGold && theme.name === 'light'
              ? '0 4px 14px rgba(160, 110, 40, 0.35), 0 1px 3px rgba(51, 39, 28, 0.12)'
              : undefined,
        },
      ]}>
      <LinearGradient
        colors={[...colors]}
        locations={editorialGold && theme.name === 'light' ? [0, 0.45, 1] : undefined}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={[
          styles.submitGradient,
          {
            minHeight,
            paddingHorizontal: rs.lg,
            gap: icon ? rs.sm : 0,
            borderRadius: radii.pill,
          },
        ]}>
        {icon ? <Symbol name={icon} size="sm" color={chrome.ctaText} /> : null}
        <AppText
          variant="callout"
          fit
          numberOfLines={1}
          style={[
            styles.submitLabel,
            {
              color: chrome.ctaText,
              textAlign: 'center',
              fontSize: editorialGold ? s(20) : undefined,
              lineHeight: editorialGold ? s(25) : undefined,
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
    fieldBackground: travelInputFieldBackground(theme),
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
