import { StyleSheet, View, type ViewStyle } from 'react-native';

import { Screen } from '@/components/primitives';
import { TravelCollapsibleSection } from '@/features/travel/travel-collapsible-section';
import { TRAVEL_HEADER_SKY_CONTENT_BAND } from '@/features/travel/travel-header-sky-height';
import { TravelItineraryTimeline } from '@/features/travel/travel-itinerary-timeline';
import { TravelPlanHero } from '@/features/travel/travel-plan-hero';
import { TravelPlanTripTools } from '@/features/travel/travel-plan-trip-tools';
import type { DetailSectionKey } from '@/features/travel/travel-plan-detail-sections';
import { HEADER_SKY_NIGHT_CHROME } from '@/features/travel/travel-sky-condition';
import { travelAccent } from '@/features/travel/travel-surface';
import { TravelTransportSections } from '@/features/travel/travel-transport-sections';
import type {
  TravelItemKind,
  TravelItineraryItem,
  TravelPlan,
} from '@/features/travel/types';
import type { TravelPlanDetailItemHandlers } from '@/features/travel/use-travel-plan-detail-item-handlers';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { AgentUiIds } from '@/utils/agent-ui';

type TravelPlanDetailBodyProps = {
  plan: TravelPlan;
  travelStyle: ViewStyle;
  sortedItinerary: TravelItineraryItem[];
  itemEditHandlers: TravelPlanDetailItemHandlers;
  collapsedDayDates: Set<string>;
  isSectionExpanded: (key: DetailSectionKey) => boolean;
  toggleSection: (key: DetailSectionKey) => void;
  onToggleDay: (date: string) => void;
  onAddPress: () => void;
  onAddKind: (kind: TravelItemKind) => void;
  onEditDates: () => void;
  onEditNotes: () => void;
  onOpenExpenses: () => void;
  notesExpanded: boolean;
  onNotesExpandedChange: (expanded: boolean) => void;
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
  onEditNotes,
  onOpenExpenses,
  notesExpanded,
  onNotesExpandedChange,
}: TravelPlanDetailBodyProps) {
  const theme = useTheme();
  const { s, spacing: rs } = useResponsive();
  // Match hero header→dates breathing room between Notes / Transport / Timeline.
  const sectionGap = Math.max(rs.md, s(20));
  // Clear the sky band so app-shell chrome can meet the in-header plate.
  const skyContentBand = Math.max(TRAVEL_HEADER_SKY_CONTENT_BAND, s(152));

  const washTop = theme.name === 'dark' ? HEADER_SKY_NIGHT_CHROME : '#DCE8F1';
  const paper =
    typeof travelStyle.backgroundColor === 'string'
      ? travelStyle.backgroundColor
      : theme.backgroundPrimary;

  return (
    <View style={styles.fill}>
      {/*
        Page wash starts below the header sky band. Soft gradient at the top
        edge so it blends into the sky instead of a hard cut line.
      */}
      <View
        pointerEvents="none"
        style={[
          styles.pageWash,
          {
            top: skyContentBand,
            backgroundColor: paper,
            experimental_backgroundImage: `linear-gradient(to bottom, ${washTop} 0%, ${paper} 48px, ${paper} 100%)`,
          },
        ]}
      />
      <Screen
        style={styles.transparentScreen}
        contentStyle={{ gap: sectionGap, paddingTop: rs.sm }}
        refresh={false}>
        <TravelPlanHero
          plan={plan}
          onAddPress={onAddPress}
          onEditDates={onEditDates}
          onEditNotes={onEditNotes}
          notesExpanded={notesExpanded}
          onNotesExpandedChange={onNotesExpandedChange}
        />
        <TravelPlanTripTools
          plan={plan}
          expanded={isSectionExpanded('tools')}
          onToggle={() => toggleSection('tools')}
          onOpenExpenses={onOpenExpenses}
          onAddTransport={() => onAddKind('transport')}
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
          accentColor={travelAccent(theme)}
          card
          compact
          tightHeader
          flushContent
          expanded={isSectionExpanded('timeline')}
          onToggle={() => toggleSection('timeline')}
          toggleTestID={AgentUiIds.travel.planDetail.timelineSection}
          titleVariant="subheading">
          <TravelItineraryTimeline
            items={sortedItinerary}
            collapsedDayDates={collapsedDayDates}
            onToggleDay={onToggleDay}
            {...itemEditHandlers}
          />
        </TravelCollapsibleSection>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  pageWash: {
    ...StyleSheet.absoluteFill,
  },
  transparentScreen: { backgroundColor: 'transparent' },
});
