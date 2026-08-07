import { ScreenHeader, type ScreenHeaderProps } from '@/components/primitives';

/**
 * Travel page header — same contract as {@link ScreenHeader}.
 * Flight-path flourish stays on the main itinerary hero only.
 */
export function TravelScreenHeader(props: ScreenHeaderProps) {
  return <ScreenHeader {...props} />;
}
