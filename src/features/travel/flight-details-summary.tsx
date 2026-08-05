import { kindAccent, kindTint } from '@/features/travel/travel-kind-chrome';
import { useTheme } from '@/hooks/use-theme';

import { FlightJourneyCard } from './flight-journey-card';
import {
    buildFlightJourneyViewModel,
    resolveFlightLegs,
} from './flight-journey-model';
import { legFlightStatusInput } from './flight-status-client';
import type { TravelFlightDetails } from './types';

export function FlightDetailsSummary({
  itemId,
  details,
  date,
  startMinutes,
  durationMinutes,
  hideHero = false,
  bare = false,
}: {
  itemId: string;
  details: TravelFlightDetails;
  date: string;
  startMinutes: number;
  durationMinutes: number;
  /** When the parent node already shows the route + meta header. */
  hideHero?: boolean;
  /** Nested inside a timeline node card — skip the inner card chrome. */
  bare?: boolean;
}) {
  const theme = useTheme();
  const accent = kindAccent('flight', theme);
  const tint = kindTint('flight', theme);
  const schedule = { details, date, startMinutes, durationMinutes };
  const journey = buildFlightJourneyViewModel(schedule);
  const statusRequests = resolveFlightLegs(schedule).map((leg) => {
    const input = legFlightStatusInput(leg);
    if (!input) return undefined;
    const label =
      journey.legs.length > 1 ? leg.flightNumber?.trim().toUpperCase() : undefined;
    return { input, ...(label ? { label } : {}) };
  });

  return (
    <FlightJourneyCard
      itemId={itemId}
      journey={journey}
      date={date}
      accentColor={accent}
      tintColor={tint}
      confirmationCode={details.confirmationCode}
      confirmationUris={details.confirmationUris}
      passengerName={details.passengerName}
      passengerCount={details.passengerCount}
      statusRequests={statusRequests}
      hideHero={hideHero}
      bare={bare}
    />
  );
}
