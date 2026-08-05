import { StyleSheet, View } from 'react-native';

import { AppText, Symbol } from '@/components/primitives';
import { radii } from '@/design-system';
import { formatFlightNumber } from '@/features/travel/airline-catalog';
import {
    flightPassengerLabel,
    type FlightJourneyViewModel,
} from '@/features/travel/flight-journey-model';
import {
    travelCardBorder,
    travelMainCardFill,
} from '@/features/travel/travel-surface';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { AgentUiIds } from '@/utils/agent-ui';
import { formatDuration } from '@/utils/date';

import { formatFlightJourneyDate } from './flight-arrival';
import { FlightBookingPanel } from './flight-booking-panel';
import {
    JourneyStrip,
    LayoverBanner,
    VerticalStop,
} from './flight-journey-chrome';
import {
    useFlightStatus,
    type FlightStatusRequest,
} from './use-flight-status';

function JourneyHero({
  journey,
  date,
}: {
  journey: FlightJourneyViewModel;
  date?: string;
}) {
  const theme = useTheme();
  const { spacing: rs } = useResponsive();
  const route = journey.routeAirports.join(' → ');
  const stopLabel =
    journey.stopCount === 0
      ? 'Nonstop'
      : `${journey.stopCount} stop${journey.stopCount === 1 ? '' : 's'}`;

  if (!route) return null;

  return (
    <View style={{ gap: rs.xs }}>
      <AppText variant="heading" bold fit>
        {route}
      </AppText>
      <View style={[styles.heroMeta, { gap: rs.sm }]}>
        {date ? (
          <View style={[styles.heroMetaItem, { gap: rs.xxs }]}>
            <Symbol name="calendar" size="sm" color={theme.textSecondary} />
            <AppText variant="caption" color="secondary" fit>
              {formatFlightJourneyDate(date)}
            </AppText>
          </View>
        ) : null}
        {date && journey.totalDurationMinutes ? (
          <View
            style={[styles.heroMetaRule, { backgroundColor: theme.separator }]}
          />
        ) : null}
        {journey.totalDurationMinutes ? (
          <View style={[styles.heroMetaItem, { gap: rs.xxs, flexShrink: 1, minWidth: 0 }]}>
            <Symbol name="clock" size="sm" color={theme.textSecondary} />
            <AppText variant="caption" color="secondary" fit>
              {formatDuration(journey.totalDurationMinutes)} total
            </AppText>
          </View>
        ) : null}
        <AppText variant="caption" color="secondary" fit>
          · {stopLabel}
        </AppText>
      </View>
    </View>
  );
}

/**
 * Expanded flight card shared by non-stop and connecting itineraries: booking
 * confirmation + travelers, the at-a-glance route strip, and the vertical leg
 * itinerary with per-flight status + sync.
 */
export function FlightJourneyCard({
  itemId,
  journey,
  date,
  accentColor,
  tintColor,
  confirmationCode,
  confirmationUris,
  passengerName,
  passengerCount,
  statusRequests,
  hideHero = false,
  bare = false,
}: {
  itemId: string;
  journey: FlightJourneyViewModel;
  date?: string;
  accentColor: string;
  tintColor: string;
  confirmationCode?: string;
  confirmationUris?: string[];
  passengerName?: string;
  passengerCount?: number;
  /** One entry per leg, in leg order; `undefined` where a leg can't be looked up. */
  statusRequests: (FlightStatusRequest | undefined)[];
  /** Parent already renders the route + meta header. */
  hideHero?: boolean;
  /** Drop the outer card chrome when nested inside a timeline node card. */
  bare?: boolean;
}) {
  const theme = useTheme();
  const { s, spacing: rs } = useResponsive();
  const status = useFlightStatus(statusRequests);
  const radius = Math.max(radii.md, s(14));
  const borderColor = travelCardBorder(theme);
  const fill = travelMainCardFill(theme);
  const passengerLabel = flightPassengerLabel({ passengerName, passengerCount });

  return (
    <View
      style={
        bare
          ? { gap: rs.md }
          : [
              styles.card,
              {
                backgroundColor: fill,
                borderColor,
                borderRadius: radius,
                borderWidth: StyleSheet.hairlineWidth,
                padding: rs.md,
                gap: rs.md,
              },
            ]
      }>
      {hideHero ? null : <JourneyHero journey={journey} date={date} />}

      <FlightBookingPanel
        itemId={itemId}
        confirmationCode={confirmationCode}
        confirmationUris={confirmationUris}
        passengerLabel={passengerLabel}
        accent={accentColor}
        fill={fill}
      />

      <JourneyStrip journey={journey} accent={accentColor} />

      <View>
        {journey.legs.map((leg, index) => {
          const flightNumber = formatFlightNumber(leg.departure.flightNumber);
          const carrier = [leg.departure.airline, flightNumber]
            .filter(Boolean)
            .join(' · ');
          const live = status.legs[index];
          const canSyncLeg = Boolean(statusRequests[index]);
          const isLastLeg = index === journey.legs.length - 1;
          const syncLabel = !status.canCheck && status.cooldownMinutesRemaining > 0
            ? `Status checked recently. Try again in ${status.cooldownMinutesRemaining} minute${
                status.cooldownMinutesRemaining === 1 ? '' : 's'
              }`
            : flightNumber
              ? `Check status for ${flightNumber}`
              : 'Check flight status';
          return (
            <View key={`leg-${index}`}>
              <VerticalStop
                timeMinutes={leg.departure.timeMinutes}
                label="DEPARTURE"
                airport={leg.departure.airport}
                terminal={leg.departure.terminal ?? live?.departureTerminal}
                gate={leg.departure.gate ?? live?.departureGate}
                showPlane
                accent={accentColor}
                tint={tintColor}
                airline={leg.departure.airline}
                flightNumber={flightNumber}
                carrier={carrier || undefined}
                aircraft={leg.departure.aircraft}
                statusLabel={live?.statusLabel}
                status={live?.status}
                statusTestID={AgentUiIds.travel.flight.legStatus(itemId, index)}
                statusSyncAvailable={canSyncLeg}
                statusSyncLoading={status.loading}
                statusSyncDisabled={!status.canCheck}
                statusSyncAccessibilityLabel={syncLabel}
                onStatusSync={canSyncLeg ? status.check : undefined}
                statusSyncTestID={AgentUiIds.travel.flight.status(itemId, index)}
                durationMinutes={leg.durationMinutes}
              />
              <VerticalStop
                timeMinutes={leg.arrival.timeMinutes}
                label="ARRIVAL"
                airport={leg.arrival.airport}
                terminal={leg.arrival.terminal ?? live?.arrivalTerminal}
                gate={leg.arrival.gate ?? live?.arrivalGate}
                accent={accentColor}
                tint={tintColor}
                isLast={isLastLeg && !leg.layoverAfter}
              />
              {leg.layoverAfter ? (
                <LayoverBanner
                  layover={leg.layoverAfter}
                  railColor={accentColor}
                />
              ) : null}
            </View>
          );
        })}
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
  },
  heroMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    minWidth: 0,
  },
  heroMetaRule: {
    width: StyleSheet.hairlineWidth * 2,
    alignSelf: 'stretch',
    minHeight: 12,
  },
});
