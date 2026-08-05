import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/primitives';
import { radii } from '@/design-system';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { AgentTestId } from '@/utils/agent-ui';

import type { FlightOperationalStatus } from './flights/types';
import {
    flightStatusTone,
    flightStatusToneColor,
} from './use-flight-status';

/** Compact tone-colored status chip for booking panel + per-leg itinerary rows. */
export function FlightStatusBadge({
  label,
  status,
  testID,
}: {
  label: string;
  status?: FlightOperationalStatus;
  testID?: string;
}) {
  const theme = useTheme();
  const { s, spacing: rs } = useResponsive();
  const tone = flightStatusToneColor(flightStatusTone(status), theme);
  const dotSize = Math.max(6, s(7));

  const pill = (
    <View
      accessibilityLabel={label}
      style={[
        styles.pill,
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
      <AppText
        variant="caption"
        fit
        style={{ color: tone, flexShrink: 1, minWidth: 0 }}>
        {label}
      </AppText>
    </View>
  );

  if (!testID) return pill;
  return (
    <AgentTestId testID={testID} label={label}>
      {pill}
    </AgentTestId>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexShrink: 1,
    minWidth: 0,
  },
});
