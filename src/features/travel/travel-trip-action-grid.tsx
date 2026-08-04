import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/primitives';
import { spacing } from '@/design-system';
import { AgentUiIds } from '@/utils/agent-ui';
import { promotesFlightSearch } from '@/features/travel/travel-mode';
import type { TravelPlanMode } from '@/features/travel/types';

import {
  TravelSheetAction,
  TravelSheetPrimaryAction,
} from './travel-list-actions';

interface TravelTripActionGridProps {
  tripTitle: string;
  destination: string;
  mode: TravelPlanMode;
  isOnCalendar: boolean;
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
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.group}>
      <AppText variant="callout" color="secondary" bold>
        {title}
      </AppText>
      <View style={styles.grid}>{children}</View>
    </View>
  );
}

/** Predictable trip action hierarchy: next step first, related tools grouped below. */
export function TravelTripActionGrid({
  tripTitle,
  destination,
  mode,
  isOnCalendar,
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
  return (
    <View style={styles.container}>
      <TravelSheetPrimaryAction
        label="Open Trip Itinerary"
        icon="list"
        testID={AgentUiIds.travel.list.itinerary}
        onPress={onOpenItinerary}
      />

      <ActionGroup title="Book & organize">
        <TravelSheetAction
          label="Calendar"
          icon="calendar"
          tone="calendar"
          testID={AgentUiIds.travel.list.calendar}
          onPress={onOpenCalendar}
          accessibilityLabel={
            isOnCalendar
              ? `Open Calendar for ${tripTitle}`
              : `Add ${tripTitle} to Calendar`
          }
        />
        {promotesFlightSearch(mode) ? (
          <TravelSheetAction
            label="Search Flights"
            icon="flight"
            tone="flight"
            testID={AgentUiIds.travel.list.searchFlights}
            onPress={onSearchFlights}
            accessibilityLabel={`Search Flights for ${tripTitle}`}
          />
        ) : (
          <TravelSheetAction
            label="Add Transport"
            icon="route"
            tone="flight"
            testID={AgentUiIds.travel.list.addTransport}
            onPress={onAddTransport}
            accessibilityLabel={`Add Transport for ${tripTitle}`}
          />
        )}
        <TravelSheetAction
          label="Search Stays"
          icon="lodging"
          tone="lodging"
          testID={AgentUiIds.travel.list.searchStays}
          onPress={onSearchStays}
          accessibilityLabel={`Search Stays for ${tripTitle}`}
        />
        <TravelSheetAction
          label="Expenses"
          icon="receipt"
          tone="expense"
          testID={AgentUiIds.travel.list.expenses}
          onPress={onOpenExpenses}
          accessibilityLabel={`Open Expenses for ${tripTitle}`}
        />
      </ActionGroup>

      <ActionGroup title="At your destination">
        <TravelSheetAction
          label="Trip Weather"
          icon="weather"
          tone="clock"
          testID={AgentUiIds.travel.list.tripWeather}
          onPress={onOpenWeather}
          accessibilityLabel={`View Weather for ${destination}`}
        />
        <TravelSheetAction
          label="Currency Calculator"
          icon="calculator"
          tone="currency"
          testID={AgentUiIds.travel.list.currency}
          onPress={onOpenCurrency}
          accessibilityLabel={`Convert Currency for ${destination}`}
        />
      </ActionGroup>

      <ActionGroup title="Travel together">
        <TravelSheetAction
          label="Group Chat"
          icon="chat"
          tone="chat"
          testID={AgentUiIds.travel.list.groupChat}
          onPress={onOpenChat}
          accessibilityLabel={`Open Group Chat for ${tripTitle}`}
        />
        <TravelSheetAction
          label="Co-Travelers"
          icon="people"
          tone="people"
          testID={AgentUiIds.travel.list.coTravelers}
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
  group: {
    gap: spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
});
