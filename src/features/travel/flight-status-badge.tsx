import { GlassTonePill } from '@/components/primitives';
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
  const tone = flightStatusToneColor(flightStatusTone(status), theme);

  const pill = (
    <GlassTonePill label={label} toneColor={tone} showDot />
  );

  if (!testID) return pill;
  return (
    <AgentTestId testID={testID} label={label}>
      {pill}
    </AgentTestId>
  );
}
