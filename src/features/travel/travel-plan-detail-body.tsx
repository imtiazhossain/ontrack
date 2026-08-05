import { StyleSheet, type ViewStyle } from 'react-native';

import { Screen } from '@/components/primitives';
import { spacing } from '@/design-system';
import { TravelCollapsibleSection } from '@/features/travel/travel-collapsible-section';
import { TravelItineraryTimeline } from '@/features/travel/travel-itinerary-timeline';
import { TravelPlanHero } from '@/features/travel/travel-plan-hero';
import { TravelTransportSections } from '@/features/travel/travel-transport-sections';
import type { TravelItineraryItem, TravelPlan } from '@/features/travel/types';
import type { TravelPlanDetailItemHandlers } from '@/features/travel/use-travel-plan-detail-item-handlers';
import { formatDateKey } from '@/utils/date';

type TravelPlanDetailBodyProps = {
  plan: TravelPlan;
  travelStyle: ViewStyle;
  dateDisplayFormat: Parameters<typeof formatDateKey>[1];
  sortedItinerary: TravelItineraryItem[];
  itemEditHandlers: TravelPlanDetailItemHandlers;
  collapsedDayDates: Set<string>;
  isSectionExpanded: (
    key: 'transport' | 'flights' | 'ground' | 'stays' | 'rentals' | 'timeline',
  ) => boolean;
  toggleSection: (
    key: 'transport' | 'flights' | 'ground' | 'stays' | 'rentals' | 'timeline',
  ) => void;
  onToggleDay: (date: string) => void;
  onAddPress: () => void;
  onEditDates: () => void;
};

export function TravelPlanDetailBody({
  plan,
  travelStyle,
  dateDisplayFormat,
  sortedItinerary,
  itemEditHandlers,
  collapsedDayDates,
  isSectionExpanded,
  toggleSection,
  onToggleDay,
  onAddPress,
  onEditDates,
}: TravelPlanDetailBodyProps) {
  return (
    <Screen style={travelStyle} contentStyle={styles.screen} refresh={false}>
      <TravelPlanHero
        plan={plan}
        dateDisplayFormat={dateDisplayFormat}
        onAddPress={onAddPress}
        onEditDates={onEditDates}
      />
      <TravelTransportSections
        items={sortedItinerary}
        transportExpanded={isSectionExpanded('transport')}
        flightsExpanded={isSectionExpanded('flights')}
        groundExpanded={isSectionExpanded('ground')}
        staysExpanded={isSectionExpanded('stays')}
        rentalsExpanded={isSectionExpanded('rentals')}
        onToggleTransport={() => toggleSection('transport')}
        onToggleFlights={() => toggleSection('flights')}
        onToggleGround={() => toggleSection('ground')}
        onToggleStays={() => toggleSection('stays')}
        onToggleRentals={() => toggleSection('rentals')}
        {...itemEditHandlers}
      />
      <TravelCollapsibleSection
        title="Timeline"
        icon="clock"
        card
        compact
        tightHeader
        flushContent
        expanded={isSectionExpanded('timeline')}
        onToggle={() => toggleSection('timeline')}>
        <TravelItineraryTimeline
          items={sortedItinerary}
          collapsedDayDates={collapsedDayDates}
          onToggleDay={onToggleDay}
          {...itemEditHandlers}
        />
      </TravelCollapsibleSection>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.xs },
});
