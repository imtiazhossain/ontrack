import { Pressable, StyleSheet, View } from 'react-native';

import {
  AppText,
  GlassPlate,
  LoadingSpinner,
  Symbol,
} from '@/components/primitives';
import { FieldLeadingIcon } from '@/components/primitives/field-leading-icon';
import { radii, spacing } from '@/design-system';
import { itinerarySheetChrome } from '@/features/travel/travel-itinerary-sheet-chrome';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { useAgentUiTarget } from '@/utils/agent-ui';

export function ConfirmationImportAction({
  accessibilityLabel,
  importing,
  onPress,
  testID,
}: {
  accessibilityLabel: string;
  importing: boolean;
  onPress: () => void;
  testID: string;
}) {
  const theme = useTheme();
  const chrome = itinerarySheetChrome(theme);
  const { s, spacing: rs } = useResponsive();
  const agent = useAgentUiTarget(testID, {
    label: accessibilityLabel,
    onPress,
  });

  return (
    <Pressable
      ref={agent.ref}
      onLayout={agent.onLayout}
      testID={agent.testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ busy: importing }}
      disabled={importing}
      onPress={onPress}
      style={({ pressed }) => [{ opacity: pressed ? 0.72 : 1 }]}>
      <GlassPlate
        airy
        style={[
          styles.row,
          {
            borderColor: chrome.importActionBorder,
            borderRadius: radii.md,
            gap: rs.sm,
            minHeight: Math.max(60, s(64)),
            paddingHorizontal: rs.sm,
            paddingVertical: rs.sm,
          },
        ]}>
        <FieldLeadingIcon
          name="scan-document"
          backgroundColor={chrome.icons.import.bg}
          color={chrome.icons.import.fg}
        />
        <View style={styles.copy}>
          <AppText variant="callout" fit style={styles.label}>
            Import Confirmation
          </AppText>
          <AppText variant="caption" color="tertiary" fit>
            Scan email or paste details
          </AppText>
        </View>
        {importing ? (
          <LoadingSpinner size={16} color={chrome.icons.import.fg} />
        ) : (
          <Symbol name="chevron-right" size="sm" color={theme.textTertiary} />
        )}
      </GlassPlate>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  copy: { flex: 1, flexShrink: 1, minWidth: 0, gap: spacing.xxs },
  label: { fontWeight: '600' },
});
