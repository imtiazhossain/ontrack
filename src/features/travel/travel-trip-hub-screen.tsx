import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  appPrompt,
  EmptyState,
  Screen,
  useSafeAreaChrome,
} from '@/components/primitives';
import { resolveSelfDisplayName } from '@/features/account/self-display-name';
import { useAuthSession } from '@/features/auth/auth-provider';
import { isTravelPlanOnCalendar, travelCalendarDrafts } from '@/features/travel/calendar';
import { TravelExpensesSheet } from '@/features/travel/expenses/travel-expenses-sheet';
import {
  TravelCalendarUpdatedModal,
  type TravelCalendarUpdatedPayload,
} from '@/features/travel/travel-calendar-updated-modal';
import { TravelCurrencySheet } from '@/features/travel/travel-currency-sheet';
import { TravelFriendsSheet } from '@/features/travel/travel-friends-sheet';
import { TravelScreenHeader } from '@/features/travel/travel-screen-header';
import {
  travelSafeAreaBackground,
  TravelSurfaceCard,
  useTravelPageStyle,
} from '@/features/travel/travel-surface';
import { resolveTravelCoTravelerPeople } from '@/features/travel/travel-cotraveler-people';
import { TravelTripActionGrid } from '@/features/travel/travel-trip-action-grid';
import { TravelTripCover } from '@/features/travel/travel-trip-cover';
import { TravelWeatherSheet } from '@/features/travel/weather';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { usePreferences } from '@/store/preferences';
import { useSchedule } from '@/store/schedule';
import { useTravel } from '@/store/travel';
import { useUI } from '@/store/ui';
import { AgentTestId, AgentUiIds } from '@/utils/agent-ui';

type TravelTripHubScreenProps = {
  planId: string;
};

function closeTripHub(router: ReturnType<typeof useRouter>) {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace('/(tabs)/travel' as never);
}

/**
 * Temporary home for trip utility actions moved off Travel Home
 * (calendar, flights/stays, weather, currency, expenses, chat, co-travelers).
 */
export function TravelTripHubScreen({ planId }: TravelTripHubScreenProps) {
  const theme = useTheme();
  const travelStyle = useTravelPageStyle(theme);
  useSafeAreaChrome(travelSafeAreaBackground(theme));
  const router = useRouter();
  const { spacing: rs, s } = useResponsive();
  const { user } = useAuthSession();
  const plan = useTravel((state) => state.plans.find((item) => item.id === planId));
  const savePlan = useTravel((state) => state.savePlan);
  const recordPlanInteraction = useTravel((state) => state.recordPlanInteraction);
  const activities = useSchedule((state) => state.activities);
  const replaceTravelActivities = useSchedule((state) => state.replaceTravelActivities);
  const preferencesName = usePreferences((state) => state.name);
  const dateDisplayFormat = usePreferences((state) => state.dateDisplayFormat);
  const selfDisplayName = useMemo(
    () => resolveSelfDisplayName({ preferencesName, user }),
    [preferencesName, user],
  );
  const [expensesVisible, setExpensesVisible] = useState(false);
  const [weatherVisible, setWeatherVisible] = useState(false);
  const [currencyVisible, setCurrencyVisible] = useState(false);
  const [friendsVisible, setFriendsVisible] = useState(false);
  const [coTravelersExpanded, setCoTravelersExpanded] = useState(false);
  const [calendarUpdated, setCalendarUpdated] =
    useState<TravelCalendarUpdatedPayload | null>(null);
  const setSelectedDate = useUI((state) => state.setSelectedDate);

  if (!plan) {
    return (
      <Screen style={travelStyle} refresh={false}>
        <TravelScreenHeader
          title="Trip"
          subtitle="Tools"
          onClose={() => closeTripHub(router)}
          closeAccessibilityLabel="Close trip tools"
          closeTestID={AgentUiIds.travel.hub.close}
        />
        <EmptyState
          icon="flight"
          title="Trip not found"
          message="This trip is no longer available."
          actionLabel="Back to Travel"
          actionTestID={AgentUiIds.travel.hub.backToTravel}
          onAction={() => closeTripHub(router)}
        />
      </Screen>
    );
  }

  const coTravelers = resolveTravelCoTravelerPeople(plan, selfDisplayName);
  const isOnCalendar = isTravelPlanOnCalendar(activities, plan.id);

  const openItinerary = () => {
    recordPlanInteraction(plan.id);
    router.push({
      pathname: '/travel/[id]',
      params: { id: plan.id },
    } as never);
  };

  return (
    <Screen style={travelStyle} contentStyle={{ gap: rs.md }} refresh={false}>
      <TravelScreenHeader
        title={plan.title}
        subtitle="Trip tools"
        onClose={() => closeTripHub(router)}
        closeAccessibilityLabel="Close trip tools"
        closeTestID={AgentUiIds.travel.hub.close}
      />

      <TravelSurfaceCard>
        <AgentTestId testID={AgentUiIds.travel.hub.section(plan.id)}>
          <View style={[styles.identity, { gap: rs.md }]}>
            <TravelTripCover
              plan={plan}
              width={Math.max(88, s(96))}
              height={Math.max(88, s(96))}
            />
            <View style={styles.identityCopy}>
              <TravelTripActionGrid
                tripId={plan.id}
                tripTitle={plan.title}
                destination={plan.destination}
                mode={plan.mode ?? 'flight'}
                isOnCalendar={isOnCalendar}
                coTravelers={coTravelers}
                coTravelersExpanded={coTravelersExpanded}
                onCoTravelersExpandedChange={setCoTravelersExpanded}
                onOpenItinerary={openItinerary}
                onOpenCalendar={() => {
                  recordPlanInteraction(plan.id);
                  const nextActivities = replaceTravelActivities(
                    plan.id,
                    travelCalendarDrafts(plan),
                  );
                  setCalendarUpdated({
                    title: plan.title,
                    eventCount: nextActivities.length,
                    startDate: plan.startDate,
                  });
                }}
                onSearchFlights={() => {
                  recordPlanInteraction(plan.id);
                  router.push({
                    pathname: '/travel/[id]/flights',
                    params: { id: plan.id },
                  } as never);
                }}
                onAddTransport={() => {
                  recordPlanInteraction(plan.id);
                  router.push({
                    pathname: '/travel/[id]',
                    params: { id: plan.id, add: 'transport' },
                  } as never);
                }}
                onSearchStays={() => {
                  recordPlanInteraction(plan.id);
                  router.push({
                    pathname: '/travel/[id]/stays',
                    params: { id: plan.id },
                  } as never);
                }}
                onOpenWeather={() => {
                  recordPlanInteraction(plan.id);
                  setWeatherVisible(true);
                }}
                onOpenCurrency={() => {
                  recordPlanInteraction(plan.id);
                  setCurrencyVisible(true);
                }}
                onOpenExpenses={() => {
                  recordPlanInteraction(plan.id);
                  setExpensesVisible(true);
                }}
                onOpenChat={() => {
                  recordPlanInteraction(plan.id);
                  router.push({
                    pathname: '/travel/[id]/chat',
                    params: { id: plan.id },
                  } as never);
                }}
                onOpenCoTravelers={() => {
                  recordPlanInteraction(plan.id);
                  setFriendsVisible(true);
                }}
              />
            </View>
          </View>
        </AgentTestId>
      </TravelSurfaceCard>

      <TravelExpensesSheet
        plan={plan}
        visible={expensesVisible}
        onClose={() => {
          appPrompt.dismiss();
          setExpensesVisible(false);
        }}
        onSavePlan={savePlan}
      />
      <TravelWeatherSheet
        plan={plan}
        visible={weatherVisible}
        onClose={() => {
          appPrompt.dismiss();
          setWeatherVisible(false);
        }}
        dateDisplayFormat={dateDisplayFormat}
      />
      <TravelCurrencySheet
        plan={plan}
        visible={currencyVisible}
        onClose={() => {
          appPrompt.dismiss();
          setCurrencyVisible(false);
        }}
      />
      <TravelFriendsSheet
        plan={plan}
        visible={friendsVisible}
        onClose={() => {
          appPrompt.dismiss();
          setFriendsVisible(false);
        }}
        onSavePlan={savePlan}
      />
      <TravelCalendarUpdatedModal
        payload={calendarUpdated}
        onGoToCalendar={(startDate) => {
          setCalendarUpdated(null);
          setSelectedDate(startDate);
          router.navigate('/(tabs)/calendar');
        }}
        onBackToTravel={() => setCalendarUpdated(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  identity: {
    width: '100%',
  },
  identityCopy: {
    width: '100%',
    minWidth: 0,
  },
});
