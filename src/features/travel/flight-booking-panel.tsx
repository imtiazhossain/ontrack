import type { ReactNode } from 'react';
import {
    Pressable,
    StyleSheet,
    View,
    type StyleProp,
    type ViewStyle,
} from 'react-native';

import { AppText, LoadingSpinner, Symbol } from '@/components/primitives';
import { radii } from '@/design-system';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { AgentTestId, AgentUiIds, useAgentUiTarget } from '@/utils/agent-ui';

import { confirmationUrisForDisplay } from './confirmation-attachments';
import { ConfirmationDocumentCue } from './confirmation-document-cue';

function ConfirmationCodeTrigger({
  confirmationCode,
  accent,
  open,
  loading,
  accessibilityLabel,
  testID,
}: {
  confirmationCode: string;
  accent: string;
  open: () => void;
  loading: boolean;
  accessibilityLabel: string;
  testID: string;
}) {
  const theme = useTheme();
  const { spacing: rs, iconSizes } = useResponsive();
  const agent = useAgentUiTarget(testID, {
    label: accessibilityLabel,
    onPress: loading ? undefined : open,
  });

  return (
    <Pressable
      ref={agent.ref}
      testID={testID}
      onLayout={agent.onLayout}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ busy: loading, disabled: loading }}
      disabled={loading}
      hitSlop={8}
      onPress={open}
      style={({ pressed }) => [
        styles.codeRow,
        { gap: rs.md, opacity: pressed && !loading ? 0.7 : 1 },
      ]}>
      <AppText
        variant="callout"
        fit
        style={[styles.code, styles.codeText, { color: theme.textPrimary }]}>
        {confirmationCode}
      </AppText>
      {loading ? (
        <LoadingSpinner
          size={Math.round(iconSizes.sm)}
          color={accent}
          accessibilityLabel="Opening confirmation"
        />
      ) : (
        <Symbol name="note" size="sm" color={accent} />
      )}
    </Pressable>
  );
}

/**
 * Booking facts above the route: confirmation number and who is traveling.
 * Live status syncs live beside each flight leg in the itinerary.
 */
export function FlightBookingPanel({
  itemId,
  confirmationCode,
  confirmationUris,
  passengerLabel,
  accent,
  fill,
  style,
}: {
  itemId: string;
  confirmationCode?: string;
  confirmationUris?: string[];
  passengerLabel: string;
  accent: string;
  fill: string;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const { s, spacing: rs } = useResponsive();
  const openableConfirmation = confirmationUrisForDisplay(
    confirmationUris,
    'flight',
  );
  const cellPad = {
    paddingHorizontal: rs.sm,
    gap: Math.max(2, s(3)),
  } as const;

  const cell = (
    label: string,
    value: ReactNode,
    options?: { divider?: boolean; grow?: number },
  ) => (
    <View
      key={label}
      style={[
        styles.cell,
        cellPad,
        {
          flexGrow: options?.grow ?? 1,
          borderLeftWidth: options?.divider ? StyleSheet.hairlineWidth : 0,
          borderLeftColor: theme.separator,
        },
      ]}>
      <AppText variant="caption" color="secondary" fit>
        {label}
      </AppText>
      {value}
    </View>
  );

  const confirmationValue = (() => {
    if (!confirmationCode) {
      return (
        <AppText variant="callout" color="secondary" fit>
          —
        </AppText>
      );
    }
    if (!openableConfirmation.length) {
      return (
        <AppText
          variant="callout"
          selectable
          fit
          style={[styles.code, { color: theme.textPrimary }]}>
          {confirmationCode}
        </AppText>
      );
    }
    return (
      <ConfirmationDocumentCue
        uris={confirmationUris}
        kind="flight"
        accessibilityLabel={`View confirmation ${confirmationCode}`}
        testID={AgentUiIds.travel.flight.openConfirmation(itemId)}
        trigger={({ open, loading, accessibilityLabel, testID }) => (
          <ConfirmationCodeTrigger
            confirmationCode={confirmationCode}
            accent={accent}
            open={open}
            loading={loading}
            accessibilityLabel={accessibilityLabel}
            testID={testID}
          />
        )}
      />
    );
  })();

  return (
    <View
      style={[
        styles.panel,
        {
          backgroundColor: fill,
          borderColor: theme.separator,
          borderRadius: Math.max(radii.md, s(12)),
          paddingVertical: rs.sm,
        },
        style,
      ]}>
      {cell('Confirmation', confirmationValue, { grow: 1.35 })}
      {cell(
        'Passenger(s)',
        <AgentTestId
          testID={AgentUiIds.travel.flight.passenger(itemId)}
          label={passengerLabel}>
          <AppText variant="callout" fit style={{ color: theme.textPrimary }}>
            {passengerLabel}
          </AppText>
        </AgentTestId>,
        { divider: true },
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderCurve: 'continuous',
  },
  cell: { flexShrink: 1, minWidth: 0, flexBasis: 0 },
  codeRow: { flexDirection: 'row', alignItems: 'center', minWidth: 0 },
  code: { fontVariant: ['tabular-nums'] },
  codeText: { flexShrink: 1, minWidth: 0 },
});
