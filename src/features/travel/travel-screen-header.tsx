import { ScreenHeader, type ScreenHeaderProps } from '@/components/primitives';

import { TravelFlightPathArc } from '@/features/travel/travel-flight-path-arc';

/**
 * Travel page header — same contract as {@link ScreenHeader}, with the
 * itinerary flight-path flourish behind the title copy.
 */
export function TravelScreenHeader(props: Omit<ScreenHeaderProps, 'decoration'>) {
  return <ScreenHeader {...props} decoration={<TravelFlightPathArc />} />;
}
