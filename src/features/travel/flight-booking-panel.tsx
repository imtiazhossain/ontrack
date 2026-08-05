import * as Clipboard from 'expo-clipboard';
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppText, IconButton } from '@/components/primitives';
import { radii } from '@/design-system';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { AgentUiIds } from '@/utils/agent-ui';

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
      <AppText variant="callout" color="secondary" fit>
        Checking…
      </AppText>
    );
  }
  if (!status.summary) {
    return (
      <AppText variant="callout" color="secondary" fit>
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
      <AppText variant="caption" fit style={{ color: tone, flexShrink: 1 }}>
        {status.summary}
      </AppText>
    </View>
  );
}

/**
 * Booking facts every flight card shows above the route: confirmation number,
 * who is traveling, and the latest operational status.
 */
export function FlightBookingPanel({
  itemId,
  confirmationCode,
  passengerLabel,
  status,
  accent,
  fill,
  style,
}: {
  itemId: string;
  confirmationCode?: string;
  passengerLabel: string;
  status: FlightStatusLookup;
  accent: string;
  fill: string;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const { s, spacing: rs } = useResponsive();

  const cell = (
    label: string,
    value: ReactNode,
    options?: { divider?: boolean; grow?: number },
  ) => (
    <View
      key={label}
      style={[
        styles.cell,
        {
          flexGrow: options?.grow ?? 1,
          paddingHorizontal: rs.sm,
          gap: Math.max(2, s(3)),
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
      {cell(
        'Confirmation #',
        confirmationCode ? (
          <View style={[styles.codeRow, { gap: rs.xxs }]}>
            <AppText
              variant="callout"
              selectable
              fit
              style={[styles.code, { color: theme.textPrimary }]}>
              {confirmationCode}
            </AppText>
            <IconButton
              icon="copy"
              size={Math.max(24, s(26))}
              iconSize="sm"
              background="transparent"
              color={accent}
              testID={AgentUiIds.travel.flight.copyConfirmation(itemId)}
              accessibilityLabel={`Copy confirmation ${confirmationCode}`}
              onPress={() => void Clipboard.setStringAsync(confirmationCode)}
            />
          </View>
        ) : (
          <AppText variant="callout" color="secondary" fit>
            —
          </AppText>
        ),
        { grow: 1.35 },
      )}
      {cell(
        'Passenger',
        <AppText variant="callout" fit style={{ color: theme.textPrimary }}>
          {passengerLabel}
        </AppText>,
        { divider: true },
      )}
      {cell('Status', <StatusValue status={status} />, {
        divider: true,
        grow: 1.1,
      })}
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
  codeRow: { flexDirection: 'row', alignItems: 'center' },
  code: { fontVariant: ['tabular-nums'] },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexShrink: 1,
  },
});
