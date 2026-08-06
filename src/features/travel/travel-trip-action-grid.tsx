import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/primitives';
import { spacing } from '@/design-system';
import {
  TravelCoTravelerStack,
  type CoTravelerAvatarPerson,
} from '@/features/travel/travel-cotraveler-stack';
import { promotesFlightSearch } from '@/features/travel/travel-mode';
import type { TravelPlanMode } from '@/features/travel/types';
import { useResponsive } from '@/hooks/use-responsive';
import { AgentUiIds } from '@/utils/agent-ui';

import { TravelSheetAction } from './travel-list-actions';

interface TravelTripActionGridProps {
  tripId: string;
  tripTitle: string;
  destination: string;
  mode: TravelPlanMode;
  isOnCalendar: boolean;
  coTravelers: CoTravelerAvatarPerson[];
  coTravelersExpanded: boolean;
  onCoTravelersExpandedChange: (expanded: boolean) => void;
  onOpenItinerary: () => void;
  onOpenCalendar: () => void;
  onSearchFlights: () => void;
  onAddTransport: () => void;
  onSearchStays: () => void;
  onOpenWeather: () => void;
  onOpenCurrency: () => void;
  onOpenExpenses: () => void;
  onOpenChat: () => void;
  onOpenCoTravelers: () => void;
}

function ActionGroup({
  title,
  trailing,
  children,
}: {
  title: string;
  trailing?: ReactNode;
  children: ReactNode;
}) {
  return (
    <View style={styles.group}>
      <View style={styles.groupHeader}>
        <AppText
          variant="callout"
          color="secondary"
          bold
          fit
          align="center"
          numberOfLines={1}
          style={styles.groupTitle}>
          {title}
        </AppText>
        {trailing ? <View style={styles.groupTrailing}>{trailing}</View> : null}
      </View>
      <View style={styles.grid}>{children}</View>
    </View>
  );
}

/** Predictable trip action hierarchy: next step first, related tools grouped below. */
export function TravelTripActionGrid({
  tripId,
  tripTitle,
  destination,
  mode,
  isOnCalendar,
  coTravelers,
  coTravelersExpanded,
  onCoTravelersExpandedChange,
  onOpenItinerary,
  onOpenCalendar,
  onSearchFlights,
  onAddTransport,
  onSearchStays,
  onOpenWeather,
  onOpenCurrency,
  onOpenExpenses,
  onOpenChat,
  onOpenCoTravelers,
}: TravelTripActionGridProps) {
  const { s } = useResponsive();
  // Keep the stacked chip budget tight so many travelers overlap beside the title.
  const coTravelerPackWidth = Math.max(72, s(96));

  return (
    <View style={styles.container}>
      <View style={styles.itineraryAction}>
        <TravelSheetAction
          label="Trip Itinerary"
          icon="list"
          tone="flight"
          wide
          testID={AgentUiIds.travel.list.itinerary(tripId)}
          onPress={onOpenItinerary}
          accessibilityLabel="Trip Itinerary"
        />
      </View>

      <ActionGroup title="Book & Organize">
        <TravelSheetAction
          label="Calendar"
          icon="calendar"
          badgeIcon="repeat"
          tone="calendar"
          testID={AgentUiIds.travel.list.calendar(tripId)}
          onPress={onOpenCalendar}
          accessibilityLabel={
            isOnCalendar
              ? `Sync changes for ${tripTitle} with Calendar`
              : `Add ${tripTitle} to Calendar`
          }
        />
        {promotesFlightSearch(mode) ? (
          <TravelSheetAction
            label="Search Flights"
            icon="flight"
            tone="flight"
            testID={AgentUiIds.travel.list.searchFlights(tripId)}
            onPress={onSearchFlights}
            accessibilityLabel={`Search Flights for ${tripTitle}`}
          />
        ) : (
          <TravelSheetAction
            label="Add Transport"
            icon="route"
            tone="flight"
            testID={AgentUiIds.travel.list.addTransport(tripId)}
            onPress={onAddTransport}
            accessibilityLabel={`Add Transport for ${tripTitle}`}
          />
        )}
        <TravelSheetAction
          label="Search Stays"
          icon="lodging"
          tone="lodging"
          testID={AgentUiIds.travel.list.searchStays(tripId)}
          onPress={onSearchStays}
          accessibilityLabel={`Search Stays for ${tripTitle}`}
        />
        <TravelSheetAction
          label="Expenses"
          icon="receipt"
          tone="expense"
          testID={AgentUiIds.travel.list.expenses(tripId)}
          onPress={onOpenExpenses}
          accessibilityLabel={`Open Expenses for ${tripTitle}`}
        />
      </ActionGroup>

      <ActionGroup title="At Your Destination">
        <TravelSheetAction
          label="Trip Weather"
          icon="weather"
          tone="clock"
          testID={AgentUiIds.travel.list.tripWeather(tripId)}
          onPress={onOpenWeather}
          accessibilityLabel={`View Weather for ${destination}`}
        />
        <TravelSheetAction
          label="Currency"
          icon="calculator"
          tone="currency"
          testID={AgentUiIds.travel.list.currency(tripId)}
          onPress={onOpenCurrency}
          accessibilityLabel={`Convert Currency for ${destination}`}
        />
      </ActionGroup>

      <ActionGroup
        title="Travel Together"
        trailing={
          coTravelers.length > 0 ? (
            <TravelCoTravelerStack
              people={coTravelers}
              expanded={coTravelersExpanded}
              maxPackedWidth={coTravelerPackWidth}
              onExpandedChange={onCoTravelersExpandedChange}
            />
          ) : null
        }>
        <TravelSheetAction
          label="Group Chat"
          icon="chat"
          tone="chat"
          testID={AgentUiIds.travel.list.groupChat(tripId)}
          onPress={onOpenChat}
          accessibilityLabel={`Open Group Chat for ${tripTitle}`}
        />
        <TravelSheetAction
          label="Co-Travelers"
          icon="people"
          tone="people"
          testID={AgentUiIds.travel.list.coTravelers(tripId)}
          onPress={onOpenCoTravelers}
          accessibilityLabel={`Open Co-Travelers for ${tripTitle}`}
        />
      </ActionGroup>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  itineraryAction: {
    width: '75%',
    alignSelf: 'center',
  },
  group: {
    gap: spacing.sm,
  },
  groupHeader: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: 32,
    overflow: 'visible',
    zIndex: 4,
  },
  groupTitle: {
    alignSelf: 'stretch',
    width: '100%',
    textAlign: 'center',
    flexShrink: 1,
    minWidth: 0,
  },
  groupTrailing: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    overflow: 'visible',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
});
