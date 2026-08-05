import * as Linking from 'expo-linking';
import { View } from 'react-native';

import { Button } from '@/components/primitives';
import {
    confirmationUrisForDisplay,
    openConfirmationAttachments,
} from '@/features/travel/confirmation-attachments';
import { ConfirmationDocumentCue } from '@/features/travel/confirmation-document-cue';
import { transportDirectionsUrl } from '@/features/travel/transport-details';
import { TravelDetailsSummaryCard } from '@/features/travel/travel-details-summary-card';
import { kindAccent, kindTint } from '@/features/travel/travel-kind-chrome';
import { transportModeIcon, transportModeLabel } from '@/features/travel/travel-mode';
import type { TravelTransportDetails } from '@/features/travel/types';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { AgentUiIds } from '@/utils/agent-ui';
import { formatDateKeyShort, formatMinutes, type DateDisplayFormat } from '@/utils/date';

export function TransportDetailsSummary({
  itemId,
  details,
  departureDate,
  departureMinutes,
  dateDisplayFormat,
}: {
  itemId: string;
  details: TravelTransportDetails;
  departureDate: string;
  departureMinutes: number;
  dateDisplayFormat: DateDisplayFormat;
}) {
  const theme = useTheme();
  const { spacing } = useResponsive();
  const accent = kindAccent('transport', theme);
  const tint = kindTint('transport', theme);
  const directionsUrl = transportDirectionsUrl(details);
  const attachments = confirmationUrisForDisplay(details.confirmationUris, 'transport');
  const rows = [
    {
      label: 'Depart',
      value: `${formatDateKeyShort(departureDate, dateDisplayFormat)} · ${formatMinutes(departureMinutes)}`,
      detail: details.origin,
      icon: 'location' as const,
    },
    {
      label: 'Arrive',
      value: `${formatDateKeyShort(details.arrivalDate, dateDisplayFormat)} · ${formatMinutes(details.arrivalMinutes)}`,
      detail: details.destination,
      icon: 'location' as const,
    },
    details.operator || details.serviceNumber
      ? {
          label: details.mode === 'rideshare' || details.mode === 'taxi' ? 'Provider' : 'Operator',
          value: [details.operator, details.serviceNumber].filter(Boolean).join(' · '),
          detail: [details.platform, details.seat].filter(Boolean).join(' · ') || undefined,
          icon: transportModeIcon(details.mode),
        }
      : undefined,
    details.vehicle
      ? { label: 'Vehicle', value: details.vehicle, icon: 'vehicles' as const }
      : undefined,
    details.distance
      ? { label: 'Distance', value: `${details.distance} ${details.distanceUnit ?? 'mi'}`, icon: 'route' as const }
      : undefined,
    ...(details.stops ?? []).map((stop, index) => ({
      label: `Stop ${index + 1}`,
      value: stop.name,
      detail: [
        stop.arrivalDate && stop.arrivalMinutes !== undefined
          ? `${formatDateKeyShort(stop.arrivalDate, dateDisplayFormat)} · ${formatMinutes(stop.arrivalMinutes)}`
          : undefined,
        stop.address,
      ].filter(Boolean).join(' · ') || undefined,
      icon: 'location' as const,
    })),
  ].filter((row): row is NonNullable<typeof row> => Boolean(row));

  return (
    <TravelDetailsSummaryCard
      title={transportModeLabel(details.mode)}
      subtitle={`${details.origin} → ${details.destination}`}
      icon={transportModeIcon(details.mode)}
      accentColor={accent}
      tintColor={tint}
      confirmationCode={details.confirmationCode}
      onPressConfirmation={attachments.length ? () => void openConfirmationAttachments(attachments) : undefined}
      rows={rows}>
      <View style={{ gap: spacing.sm }}>
        {directionsUrl ? (
          <Button
            variant="secondary"
            icon="route"
            testID={AgentUiIds.travel.transport.openMaps(itemId)}
            onPress={() => void Linking.openURL(directionsUrl)}>
            Open in Maps
          </Button>
        ) : null}
        <ConfirmationDocumentCue
          uris={details.confirmationUris}
          kind="transport"
          accessibilityLabel="View uploaded transport ticket"
        />
      </View>
    </TravelDetailsSummaryCard>
  );
}
