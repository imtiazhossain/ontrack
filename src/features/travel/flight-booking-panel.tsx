import type { ReactNode } from 'react';
import {
    Pressable,
    StyleSheet,
    View,
    type StyleProp,
    type ViewStyle,
} from 'react-native';

import { AppText, IconButton, LoadingSpinner, Symbol } from '@/components/primitives';
import { radii } from '@/design-system';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { AgentUiIds, useAgentUiTarget } from '@/utils/agent-ui';

import { confirmationUrisForDisplay } from './confirmation-attachments';
import { ConfirmationDocumentCue } from './confirmation-document-cue';
import {
    flightStatusTone,
    flightStatusToneColor,
    type FlightStatusLookup,
} from './use-flight-status';

function StatusValue({ status }: { status: FlightStatusLookup }) {
  const theme = useTheme();
  const { s, spacing: rs } = useResponsive();
  const dotSize = Math.max(6, s(7));

  if (status.loading) {
    return (
      <AppText variant="callout" color="secondary" fit style={styles.statusText}>
        Checking…
      </AppText>
    );
  }
  if (!status.summary) {
    return (
      <AppText variant="callout" color="secondary" fit style={styles.statusText}>
        {status.error ?? (status.available ? 'Not checked' : 'Unavailable')}
      </AppText>
    );
  }

  const tone = flightStatusToneColor(flightStatusTone(status.status), theme);
  return (
    <View
      style={[
        styles.statusPill,
        {
          backgroundColor: theme.backgroundSunken,
          borderRadius: radii.pill,
          paddingHorizontal: rs.sm,
          paddingVertical: Math.max(3, s(4)),
          gap: rs.xxs,
        },
      ]}>
      <View
        style={{
          width: dotSize,
          height: dotSize,
          borderRadius: dotSize / 2,
          backgroundColor: tone,
        }}
      />
      <AppText variant="caption" fit style={{ color: tone, flexShrink: 1, minWidth: 0 }}>
        {status.summary}
      </AppText>
    </View>
  );
}

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
        { gap: rs.xxs, opacity: pressed && !loading ? 0.7 : 1 },
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
 * Booking facts every flight card shows above the route: confirmation number,
 * who is traveling, and the latest operational status.
 */
export function FlightBookingPanel({
  itemId,
  confirmationCode,
  confirmationUris,
  passengerLabel,
  status,
  accent,
  fill,
  style,
}: {
  itemId: string;
  confirmationCode?: string;
  confirmationUris?: string[];
  passengerLabel: string;
  status: FlightStatusLookup;
  accent: string;
  fill: string;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const { s, spacing: rs, typography } = useResponsive();
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
      {cell('Confirmation #', confirmationValue, { grow: 1.35 })}
      {cell(
        'Passenger',
        <AppText variant="callout" fit style={{ color: theme.textPrimary }}>
          {passengerLabel}
        </AppText>,
        { divider: true },
      )}
      <View
        style={[
          styles.cell,
          cellPad,
          {
            flexGrow: 1.1,
            borderLeftWidth: StyleSheet.hairlineWidth,
            borderLeftColor: theme.separator,
          },
        ]}>
        <View style={[styles.statusHeader, { gap: rs.xxs }]}>
          <AppText
            variant="caption"
            color="secondary"
            fit
            style={styles.statusHeaderLabel}>
            Status
          </AppText>
          {status.available ? (
            <IconButton
              icon="sync"
              size={typography.caption.lineHeight}
              iconSize={12.5}
              background="transparent"
              color={theme.textSecondary}
              loading={status.loading}
              testID={AgentUiIds.travel.flight.status(itemId)}
              accessibilityLabel="Check flight status"
              onPress={status.check}
            />
          ) : null}
        </View>
        <StatusValue status={status} />
      </View>
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
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  statusHeaderLabel: { flexShrink: 1, minWidth: 0 },
  statusText: { flexShrink: 1, minWidth: 0 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexShrink: 1,
    minWidth: 0,
  },
});
