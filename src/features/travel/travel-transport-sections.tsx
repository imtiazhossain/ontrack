import { StyleSheet, View } from 'react-native';

import { AppText, Button } from '@/components/primitives';
import type { AppIconName } from '@/design-system';
import type { FlightDetailsDraft } from '@/features/travel/flight-details';
import type { FlightScheduleDraft } from '@/features/travel/flight-schedule';
import type { RentalDetailsDraft } from '@/features/travel/rental-details';
import type { StayDetailsDraft } from '@/features/travel/stay-details';
import { TravelCollapsibleSection } from '@/features/travel/travel-collapsible-section';
import { kindAccent } from '@/features/travel/travel-kind-chrome';
import type { TravelRangeScheduleDraft } from '@/features/travel/travel-range-schedule';
import {
  TRAVEL_EDITORIAL_ACCENT,
  travelCardFill,
} from '@/features/travel/travel-surface';
import { TravelTimelineNode } from '@/features/travel/travel-timeline-node';
import type {
  TravelItemKind,
  TravelPlan,
  TravelTransportDetails,
} from '@/features/travel/types';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { AgentUiIds } from '@/utils/agent-ui';
import type { DateDisplayFormat } from '@/utils/date';

type TravelItineraryItemModel = TravelPlan['itinerary'][number];

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
  onSaveTransportDetails: (
    itemId: string,
    details: TravelTransportDetails,
    schedule: TravelRangeScheduleDraft,
  ) => void;
  onAddPhotos: (itemId: string) => void;
  onRemovePhoto: (itemId: string, uri: string) => void;
  onRemove: (item: TravelItineraryItemModel) => void;
  onSaveNotes: (
    itemId: string,
    notes: NonNullable<TravelItineraryItemModel['notes']>,
  ) => void;
};

type EmptyAction = {
  message: string;
  actionLabel: string;
  actionIcon: AppIconName;
  actionTestID: string;
  onAction: () => void;
};

function TransportEmptyState({
  message,
  actionLabel,
  actionIcon,
  actionTestID,
  onAction,
}: EmptyAction) {
  const theme = useTheme();
  const { spacing: rs, s } = useResponsive();
  return (
    <View
      style={[
        styles.empty,
        {
          gap: rs.sm,
          paddingVertical: rs.md,
          paddingHorizontal: rs.md,
          borderRadius: Math.max(10, s(12)),
          backgroundColor: travelCardFill(theme),
        },
      ]}>
      <AppText
        variant="callout"
        color="secondary"
        align="center"
        style={styles.emptyMessage}>
        {message}
      </AppText>
      <Button
        variant="secondary"
        size="sm"
        icon={actionIcon}
        onPress={onAction}
        testID={actionTestID}
        accessibilityLabel={actionLabel}
        style={styles.emptyAction}>
        {actionLabel}
      </Button>
    </View>
  );
}

function TransportItemList({
  items,
  empty,
  ...handlers
}: TransportHandlers & {
  items: TravelItineraryItemModel[];
  empty: EmptyAction;
}) {
  const { spacing: rs } = useResponsive();
  if (items.length === 0) {
    return <TransportEmptyState {...empty} />;
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
          onSaveTransportDetails={(details, schedule) =>
            handlers.onSaveTransportDetails(item.id, details, schedule)
          }
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
  groundExpanded,
  staysExpanded,
  rentalsExpanded,
  onToggleTransport,
  onToggleFlights,
  onToggleGround,
  onToggleStays,
  onToggleRentals,
  onAddKind,
  ...handlers
}: TransportHandlers & {
  items: TravelItineraryItemModel[];
  transportExpanded: boolean;
  flightsExpanded: boolean;
  groundExpanded: boolean;
  staysExpanded: boolean;
  rentalsExpanded: boolean;
  onToggleTransport: () => void;
  onToggleFlights: () => void;
  onToggleGround: () => void;
  onToggleStays: () => void;
  onToggleRentals: () => void;
  onAddKind: (kind: TravelItemKind) => void;
}) {
  const { spacing: rs } = useResponsive();
  const theme = useTheme();
  const flights = items.filter((item) => item.kind === 'flight');
  const ground = items.filter((item) => item.kind === 'transport');
  const stays = items.filter((item) => item.kind === 'stay');
  const rentals = items.filter((item) => item.kind === 'rental');
  const flightAccent = kindAccent('flight', theme);
  const groundAccent = kindAccent('transport', theme);
  const stayAccent = kindAccent('stay', theme);
  const rentalAccent = kindAccent('rental', theme);

  return (
    <TravelCollapsibleSection
      title="Transport, Stays & Rentals"
      icon="suitcase"
      accentColor={TRAVEL_EDITORIAL_ACCENT}
      card
      compact
      tightHeader
      expanded={transportExpanded}
      onToggle={onToggleTransport}
      toggleTestID={AgentUiIds.travel.planDetail.transportSection}
      titleVariant="callout">
      <View
        style={[
          styles.stack,
          { gap: rs.xs, paddingHorizontal: rs.sm, paddingBottom: rs.sm },
        ]}>

        <TravelCollapsibleSection
          title="FLIGHTS"
          icon="flight"
          accentColor={flightAccent}
          compact
          expanded={flightsExpanded}
          onToggle={onToggleFlights}
          toggleTestID={AgentUiIds.travel.planDetail.flightsSection}
          nested>
          <TransportItemList
            items={flights}
            empty={{
              message: 'Track flights, confirmations, and airport details here.',
              actionLabel: 'Add Flight',
              actionIcon: 'flight',
              actionTestID: AgentUiIds.travel.planDetail.addFlight,
              onAction: () => onAddKind('flight'),
            }}
            {...handlers}
          />
        </TravelCollapsibleSection>
        <TravelCollapsibleSection
          title="GROUND & TRANSIT"
          icon="route"
          accentColor={groundAccent}
          compact
          expanded={groundExpanded}
          onToggle={onToggleGround}
          toggleTestID={AgentUiIds.travel.planDetail.groundSection}
          nested>
          <TransportItemList
            items={ground}
            empty={{
              message:
                'Train, bus, ferry, taxi, or drive — keep ground travel with the trip.',
              actionLabel: 'Add Transport',
              actionIcon: 'route',
              actionTestID: AgentUiIds.travel.planDetail.addTransport,
              onAction: () => onAddKind('transport'),
            }}
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
          toggleTestID={AgentUiIds.travel.planDetail.staysSection}
          nested>
          <TransportItemList
            items={stays}
            empty={{
              message: 'Hotels, hostels, and other lodging for this trip.',
              actionLabel: 'Add Stay',
              actionIcon: 'lodging',
              actionTestID: AgentUiIds.travel.planDetail.addStay,
              onAction: () => onAddKind('stay'),
            }}
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
          toggleTestID={AgentUiIds.travel.planDetail.rentalsSection}
          nested>
          <TransportItemList
            items={rentals}
            empty={{
              message: 'Car rentals with pickup, drop-off, and confirmation details.',
              actionLabel: 'Add Rental',
              actionIcon: 'vehicles',
              actionTestID: AgentUiIds.travel.planDetail.addRental,
              onAction: () => onAddKind('rental'),
            }}
            {...handlers}
          />
        </TravelCollapsibleSection>
      </View>
    </TravelCollapsibleSection>
  );
}

const styles = StyleSheet.create({
  stack: {},
  empty: {
    alignItems: 'center',
  },
  emptyMessage: {
    flexShrink: 1,
    minWidth: 0,
    width: '100%',
    textAlign: 'center',
  },
  emptyAction: {
    alignSelf: 'center',
  },
});
