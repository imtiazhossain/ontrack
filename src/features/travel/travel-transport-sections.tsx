import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/primitives';
import type { FlightDetailsDraft } from '@/features/travel/flight-details';
import type { FlightScheduleDraft } from '@/features/travel/flight-schedule';
import type { RentalDetailsDraft } from '@/features/travel/rental-details';
import type { StayDetailsDraft } from '@/features/travel/stay-details';
import type { TravelRangeScheduleDraft } from '@/features/travel/travel-range-schedule';
import { TravelCollapsibleSection } from '@/features/travel/travel-collapsible-section';
import { kindAccent } from '@/features/travel/travel-kind-chrome';
import { TravelTimelineNode } from '@/features/travel/travel-timeline-node';
import type { TravelPlan } from '@/features/travel/types';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import type { DateDisplayFormat } from '@/utils/date';

type TravelItineraryItemModel = TravelPlan['itinerary'][number];

/** Warm gold for the parent transport section chrome (not a kind accent). */
const TRANSPORT_SECTION_ACCENT = '#A9782C';

type TransportHandlers = {
  plan: TravelPlan;
  minimizedItemIds: Set<string>;
  dateDisplayFormat: DateDisplayFormat;
  editingFlightItemId?: string;
  editedFlightDetails: FlightDetailsDraft;
  editedFlightDetailsError?: string;
  editedFlightFileName?: string;
  importingFlightTarget?: string;
  editingRentalItemId?: string;
  editedRentalDetails: RentalDetailsDraft;
  editedRentalDetailsError?: string;
  editedRentalFileName?: string;
  importingRentalTarget?: string;
  editingStayItemId?: string;
  editedStayDetails: StayDetailsDraft;
  editedStayDetailsError?: string;
  editedStayFileName?: string;
  importingStayTarget?: string;
  onToggle: (itemId: string) => void;
  onEditedFlightDetailsChange: (value: FlightDetailsDraft) => void;
  onImportFlight: (itemId: string) => void;
  onSaveFlightDetails: (itemId: string, schedule: FlightScheduleDraft) => void;
  onCancelFlightEdit: () => void;
  onBeginFlightEdit: (
    itemId: string,
    flight: TravelItineraryItemModel['flight'],
  ) => void;
  onEditedRentalDetailsChange: (value: RentalDetailsDraft) => void;
  onImportRental: (itemId: string) => void;
  onSaveRentalDetails: (
    itemId: string,
    schedule: TravelRangeScheduleDraft,
  ) => void;
  onCancelRentalEdit: () => void;
  onBeginRentalEdit: (
    itemId: string,
    rental: TravelItineraryItemModel['rental'],
  ) => void;
  onEditedStayDetailsChange: (value: StayDetailsDraft) => void;
  onImportStay: (itemId: string) => void;
  onSaveStayDetails: (
    itemId: string,
    schedule: TravelRangeScheduleDraft,
  ) => void;
  onCancelStayEdit: () => void;
  onBeginStayEdit: (
    itemId: string,
    stay: TravelItineraryItemModel['stay'],
  ) => void;
  onAddPhotos: (itemId: string) => void;
  onRemovePhoto: (itemId: string, uri: string) => void;
  onRemove: (item: TravelItineraryItemModel) => void;
  onSaveNotes: (
    itemId: string,
    notes: NonNullable<TravelItineraryItemModel['notes']>,
  ) => void;
};

function TransportItemList({
  items,
  emptyMessage,
  ...handlers
}: TransportHandlers & {
  items: TravelItineraryItemModel[];
  emptyMessage: string;
}) {
  const { spacing: rs } = useResponsive();
  if (items.length === 0) {
    return (
      <AppText variant="body" color="secondary">
        {emptyMessage}
      </AppText>
    );
  }

  return (
    <View style={{ gap: rs.xs }}>
      {items.map((item) => (
        <TravelTimelineNode
          key={item.id}
          item={item}
          plan={handlers.plan}
          compact
          expanded={!handlers.minimizedItemIds.has(item.id)}
          dateDisplayFormat={handlers.dateDisplayFormat}
          editingFlightItemId={handlers.editingFlightItemId}
          editedFlightDetails={handlers.editedFlightDetails}
          editedFlightDetailsError={handlers.editedFlightDetailsError}
          editedFlightFileName={handlers.editedFlightFileName}
          importingFlight={handlers.importingFlightTarget === item.id}
          editingRentalItemId={handlers.editingRentalItemId}
          editedRentalDetails={handlers.editedRentalDetails}
          editedRentalDetailsError={handlers.editedRentalDetailsError}
          editedRentalFileName={handlers.editedRentalFileName}
          importingRental={handlers.importingRentalTarget === item.id}
          editingStayItemId={handlers.editingStayItemId}
          editedStayDetails={handlers.editedStayDetails}
          editedStayDetailsError={handlers.editedStayDetailsError}
          editedStayFileName={handlers.editedStayFileName}
          importingStay={handlers.importingStayTarget === item.id}
          planStartDate={handlers.plan.startDate}
          planEndDate={handlers.plan.endDate}
          onToggle={() => handlers.onToggle(item.id)}
          onEditedFlightDetailsChange={handlers.onEditedFlightDetailsChange}
          onImportFlight={() => handlers.onImportFlight(item.id)}
          onSaveFlightDetails={(schedule) =>
            handlers.onSaveFlightDetails(item.id, schedule)
          }
          onCancelFlightEdit={handlers.onCancelFlightEdit}
          onBeginFlightEdit={() =>
            handlers.onBeginFlightEdit(item.id, item.flight)
          }
          onEditedRentalDetailsChange={handlers.onEditedRentalDetailsChange}
          onImportRental={() => handlers.onImportRental(item.id)}
          onSaveRentalDetails={(schedule) =>
            handlers.onSaveRentalDetails(item.id, schedule)
          }
          onCancelRentalEdit={handlers.onCancelRentalEdit}
          onBeginRentalEdit={() =>
            handlers.onBeginRentalEdit(item.id, item.rental)
          }
          onEditedStayDetailsChange={handlers.onEditedStayDetailsChange}
          onImportStay={() => handlers.onImportStay(item.id)}
          onSaveStayDetails={(schedule) =>
            handlers.onSaveStayDetails(item.id, schedule)
          }
          onCancelStayEdit={handlers.onCancelStayEdit}
          onBeginStayEdit={() => handlers.onBeginStayEdit(item.id, item.stay)}
          onAddPhotos={() => handlers.onAddPhotos(item.id)}
          onRemovePhoto={(uri) => handlers.onRemovePhoto(item.id, uri)}
          onRemove={() => handlers.onRemove(item)}
          onSaveNotes={(notes) => handlers.onSaveNotes(item.id, notes)}
        />
      ))}
    </View>
  );
}

export function TravelTransportSections({
  items,
  transportExpanded,
  flightsExpanded,
  staysExpanded,
  rentalsExpanded,
  onToggleTransport,
  onToggleFlights,
  onToggleStays,
  onToggleRentals,
  ...handlers
}: TransportHandlers & {
  items: TravelItineraryItemModel[];
  transportExpanded: boolean;
  flightsExpanded: boolean;
  staysExpanded: boolean;
  rentalsExpanded: boolean;
  onToggleTransport: () => void;
  onToggleFlights: () => void;
  onToggleStays: () => void;
  onToggleRentals: () => void;
}) {
  const { spacing: rs } = useResponsive();
  const theme = useTheme();
  const flights = items.filter((item) => item.kind === 'flight');
  const stays = items.filter((item) => item.kind === 'stay');
  const rentals = items.filter((item) => item.kind === 'rental');
  const flightAccent = kindAccent('flight', theme);
  const stayAccent = kindAccent('stay', theme);
  const rentalAccent = kindAccent('rental', theme);

  return (
    <TravelCollapsibleSection
      title="Flights, Stays & Rentals"
      icon="itinerary"
      accentColor={TRANSPORT_SECTION_ACCENT}
      card
      compact
      expanded={transportExpanded}
      onToggle={onToggleTransport}
      titleVariant="caption">
      <View style={[styles.stack, { gap: rs.xs, paddingHorizontal: rs.sm }]}>
        <TravelCollapsibleSection
          title="FLIGHTS"
          icon="flight"
          accentColor={flightAccent}
          compact
          expanded={flightsExpanded}
          onToggle={onToggleFlights}
          nested>
          <TransportItemList
            items={flights}
            emptyMessage="No flights on this trip yet."
            {...handlers}
          />
        </TravelCollapsibleSection>
        <TravelCollapsibleSection
          title="STAYS"
          icon="lodging"
          accentColor={stayAccent}
          compact
          expanded={staysExpanded}
          onToggle={onToggleStays}
          nested>
          <TransportItemList
            items={stays}
            emptyMessage="No stays on this trip yet."
            {...handlers}
          />
        </TravelCollapsibleSection>
        <TravelCollapsibleSection
          title="RENTALS"
          icon="vehicles"
          accentColor={rentalAccent}
          compact
          expanded={rentalsExpanded}
          onToggle={onToggleRentals}
          nested>
          <TransportItemList
            items={rentals}
            emptyMessage="No car rentals on this trip yet."
            {...handlers}
          />
        </TravelCollapsibleSection>
      </View>
    </TravelCollapsibleSection>
  );
}

const styles = StyleSheet.create({
  stack: {},
});
