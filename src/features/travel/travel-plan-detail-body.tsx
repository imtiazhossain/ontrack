import type { ViewStyle } from 'react-native';

import { Screen } from '@/components/primitives';
import { TravelCollapsibleSection } from '@/features/travel/travel-collapsible-section';
import { TravelItineraryTimeline } from '@/features/travel/travel-itinerary-timeline';
import { TravelPlanHero } from '@/features/travel/travel-plan-hero';
import { TRAVEL_EDITORIAL_ACCENT } from '@/features/travel/travel-surface';
import { TravelTransportSections } from '@/features/travel/travel-transport-sections';
import type {
  TravelItemKind,
  TravelItineraryItem,
  TravelPlan,
} from '@/features/travel/types';
import type { TravelPlanDetailItemHandlers } from '@/features/travel/use-travel-plan-detail-item-handlers';
import { useResponsive } from '@/hooks/use-responsive';
import { AgentUiIds } from '@/utils/agent-ui';

type TravelPlanDetailBodyProps = {
  plan: TravelPlan;
  travelStyle: ViewStyle;
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
  onAddKind: (kind: TravelItemKind) => void;
  onEditDates: () => void;
};

export function TravelPlanDetailBody({
  plan,
  travelStyle,
  sortedItinerary,
  itemEditHandlers,
  collapsedDayDates,
  isSectionExpanded,
  toggleSection,
  onToggleDay,
  onAddPress,
  onAddKind,
  onEditDates,
}: TravelPlanDetailBodyProps) {
  const { s, spacing: rs } = useResponsive();
  // Match hero header→dates breathing room between Notes / Transport / Timeline.
  const sectionGap = Math.max(rs.md, s(20));

  return (
    <Screen
      style={travelStyle}
      contentStyle={{ gap: sectionGap }}
      refresh={false}>
      <TravelPlanHero
        plan={plan}
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
        onAddKind={onAddKind}
        {...itemEditHandlers}
      />
      <TravelCollapsibleSection
        title="Timeline"
        icon="clock"
        accentColor={TRAVEL_EDITORIAL_ACCENT}
        card
        compact
        tightHeader
        flushContent
        expanded={isSectionExpanded('timeline')}
        onToggle={() => toggleSection('timeline')}
        toggleTestID={AgentUiIds.travel.planDetail.timelineSection}
        titleVariant="callout">
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
