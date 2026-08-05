import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { appPrompt, EmptyState, Screen, ScreenHeader, useSafeAreaChrome } from '@/components/primitives';
import { spacing } from '@/design-system';
import { resolveSelfDisplayName } from '@/features/account/self-display-name';
import { useAuthSession } from '@/features/auth/auth-provider';
import { applyImportedFlightsToPlan } from '@/features/travel/apply-imported-flights';
import { isTravelPlanOnCalendar, travelCalendarDrafts } from '@/features/travel/calendar';
import { tripDayCount, validateTravelDateRange } from '@/features/travel/date-range';
import { persistTravelCoverPhoto } from '@/features/travel/destination-cover';
import { currencyFromLocale } from '@/features/travel/expenses/format-money';
import { TravelExpensesSheet } from '@/features/travel/expenses/travel-expenses-sheet';
import { TravelCalendarUpdatedModal, type TravelCalendarUpdatedPayload } from '@/features/travel/travel-calendar-updated-modal';
import { TravelCurrencySheet } from '@/features/travel/travel-currency-sheet';
import { TravelFriendsSheet } from '@/features/travel/travel-friends-sheet';
import { TravelSheetIconControl } from '@/features/travel/travel-list-actions';
import { TravelNewTripCard } from '@/features/travel/travel-new-trip-card';
import { validateTravelPlanDetails } from '@/features/travel/travel-plan-details';
import { TravelPlanDetailsEditor } from '@/features/travel/travel-plan-details-editor';
import {
    travelSafeAreaBackground,
    TravelSectionLabel,
    TravelSurfaceCard,
    useTravelPageStyle,
} from '@/features/travel/travel-surface';
import { TravelTripActionGrid } from '@/features/travel/travel-trip-action-grid';
import { TravelTripCardHeader } from '@/features/travel/travel-trip-card-header';
import { TravelTripDatesRow } from '@/features/travel/travel-trip-dates-row';
import { TravelTripDatesSheet } from '@/features/travel/travel-trip-dates-sheet';
import { TravelTripNotesCard } from '@/features/travel/travel-trip-notes-card';
import type { TravelPlan, TravelPlanMode } from '@/features/travel/types';
import { useNewTripFlightImport } from '@/features/travel/use-new-trip-flight-import';
import { TravelWeatherSheet } from '@/features/travel/weather';
import { useResponsive } from '@/hooks/use-responsive';
import { FeatureThemeProvider, useTheme } from '@/hooks/use-theme';
import { usePreferences } from '@/store/preferences';
import { useSchedule } from '@/store/schedule';
import { orderTravelPlansByRecency, useTravel } from '@/store/travel';
import { useUI } from '@/store/ui';
import { AgentUiIds } from '@/utils/agent-ui';
import { formatDateKey } from '@/utils/date';
import { newId } from '@/utils/id';

/** Primary travel planning tab — Add Stay sheet chrome for light + dark. */
export default function TravelScreen() {
  return (
    <FeatureThemeProvider feature="travel">
      <TravelScreenContent />
    </FeatureThemeProvider>
  );
}

function TravelScreenContent() {
  const theme = useTheme();
  const travelStyle = useTravelPageStyle(theme);
  useSafeAreaChrome(travelSafeAreaBackground(theme));
  const router = useRouter();
  const { editCover, tripId } = useLocalSearchParams<{
    editCover?: string;
    tripId?: string;
  }>();
  const { spacing: rs, s } = useResponsive();
  const { user } = useAuthSession();
  const plans = useTravel((state) => state.plans);
  const recentPlanIds = useTravel((state) => state.recentPlanIds);
  const recordPlanInteraction = useTravel((state) => state.recordPlanInteraction);
  const savePlan = useTravel((state) => state.savePlan);
  const removePlan = useTravel((state) => state.removePlan);
  const activities = useSchedule((state) => state.activities);
  const replaceTravelActivities = useSchedule((state) => state.replaceTravelActivities);
  const dateLocale = usePreferences((state) => state.dateLocale);
  const dateDisplayFormat = usePreferences((state) => state.dateDisplayFormat);
  const preferencesName = usePreferences((state) => state.name);
  const selfDisplayName = useMemo(
    () => resolveSelfDisplayName({ preferencesName, user }),
    [preferencesName, user],
  );
  const [showForm, setShowForm] = useState(plans.length === 0);
  const [title, setTitle] = useState('');
  const [mode, setMode] = useState<TravelPlanMode>('flight');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string>();
  const flightImport = useNewTripFlightImport({ setMode, setOrigin, setDestination, setStartDate, setEndDate, setError });
  const [editingDetailsPlanId, setEditingDetailsPlanId] = useState<string>();
  const [editTitle, setEditTitle] = useState('');
  const [editMode, setEditMode] = useState<TravelPlanMode>('flight');
  const [editOrigin, setEditOrigin] = useState('');
  const [editDestination, setEditDestination] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editCoverUri, setEditCoverUri] = useState<string | undefined>();
  const [detailsError, setDetailsError] = useState<string>();
  const [expensesPlanId, setExpensesPlanId] = useState<string>();
  const [expensesVisible, setExpensesVisible] = useState(false);
  const [weatherPlanId, setWeatherPlanId] = useState<string>();
  const [weatherVisible, setWeatherVisible] = useState(false);
  const [currencyPlanId, setCurrencyPlanId] = useState<string>();
  const [currencyVisible, setCurrencyVisible] = useState(false);
  const [friendsPlanId, setFriendsPlanId] = useState<string>();
  const [friendsVisible, setFriendsVisible] = useState(false);
  const [datesPlanId, setDatesPlanId] = useState<string>();
  const [calendarUpdated, setCalendarUpdated] =
    useState<TravelCalendarUpdatedPayload | null>(null);
  const setSelectedDate = useUI((state) => state.setSelectedDate);
  const [expandedCoTravelerPlanId, setExpandedCoTravelerPlanId] = useState<
    string | undefined
  >();
  const [collapsedIds, setCollapsedIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const scrollRef = useRef<ScrollView>(null);
  const editScrollRef = useRef<ScrollView>(null);
  const tripOffsets = useRef<Record<string, number>>({});
  const [pendingCreatedTripId, setPendingCreatedTripId] = useState<string>();
  const [scrollTargetOffset, setScrollTargetOffset] = useState<number>();
  const focusedTripId = typeof tripId === 'string' ? tripId : undefined;
  const scrollTargetTripId = pendingCreatedTripId ?? focusedTripId;
  const toggleCollapsed = (planId: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(planId)) next.delete(planId);
      else next.add(planId);
      return next;
    });
  };
  const sortedPlans = useMemo(
    () => orderTravelPlansByRecency(plans, recentPlanIds),
    [plans, recentPlanIds],
  );

  useEffect(() => {
    if (!showForm) return;
    setStartDate('');
    setEndDate('');
  }, [showForm]);

  useEffect(() => {
    if (
      !scrollTargetTripId ||
      !sortedPlans.some((plan) => plan.id === scrollTargetTripId)
    ) {
      return;
    }

    recordPlanInteraction(scrollTargetTripId);
    setShowForm(false);
    setCollapsedIds((previous) => {
      if (!previous.has(scrollTargetTripId)) return previous;
      const next = new Set(previous);
      next.delete(scrollTargetTripId);
      return next;
    });

    const offset = tripOffsets.current[scrollTargetTripId];
    if (offset === undefined) return;
    if (pendingCreatedTripId === scrollTargetTripId) {
      const timer = setTimeout(() => {
        scrollRef.current?.scrollTo({ y: Math.max(0, offset - rs.sm), animated: true });
        setPendingCreatedTripId(undefined);
      }, 100);
      return () => clearTimeout(timer);
    }
    const frame = requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: Math.max(0, offset - rs.sm), animated: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [pendingCreatedTripId, recordPlanInteraction, rs.sm, scrollTargetOffset, scrollTargetTripId, sortedPlans]);

  const rememberTripOffset = (planId: string, y: number) => {
    tripOffsets.current[planId] = y;
    if (planId !== scrollTargetTripId) return;
    setScrollTargetOffset((previous) => (previous === y ? previous : y));
  };
  const expensesPlan = sortedPlans.find((plan) => plan.id === expensesPlanId);
  const currencyPlan = sortedPlans.find((plan) => plan.id === currencyPlanId);
  const weatherPlan = sortedPlans.find((plan) => plan.id === weatherPlanId);
  const friendsPlan = sortedPlans.find((plan) => plan.id === friendsPlanId);
  const datesPlan = sortedPlans.find((plan) => plan.id === datesPlanId);
  const openExpenses = (planId: string) => {
    recordPlanInteraction(planId);
    setExpensesPlanId(planId);
    setExpensesVisible(true);
  };
  const closeExpenses = () => {
    appPrompt.dismiss();
    setExpensesVisible(false);
  };
  const openWeather = (planId: string) => {
    recordPlanInteraction(planId);
    setWeatherPlanId(planId);
    setWeatherVisible(true);
  };
  const closeWeather = () => {
    appPrompt.dismiss();
    setWeatherVisible(false);
  };
  const openCurrency = (planId: string) => {
    recordPlanInteraction(planId);
    setCurrencyPlanId(planId);
    setCurrencyVisible(true);
  };
  const closeCurrency = () => {
    appPrompt.dismiss();
    setCurrencyVisible(false);
  };
  const openFriends = (planId: string) => {
    recordPlanInteraction(planId);
    setExpandedCoTravelerPlanId(undefined);
    setFriendsPlanId(planId);
    setFriendsVisible(true);
  };
  const closeFriends = () => {
    appPrompt.dismiss();
    setExpandedCoTravelerPlanId(undefined);
    setFriendsVisible(false);
  };
  const saveTripDates = (plan: TravelPlan, nextStartDate: string, nextEndDate: string) => {
    const next = {
      ...plan,
      startDate: nextStartDate,
      endDate: nextEndDate,
      updatedAt: new Date().toISOString(),
    };
    const isOnCalendar = isTripOnCalendar(plan.id);
    savePlan(next);
    if (isOnCalendar) replaceTravelActivities(next.id, travelCalendarDrafts(next));
    setDatesPlanId(undefined);
  };

  const createPlan = () => {
    setError(undefined);
    const detailsValidation = validateTravelPlanDetails({ title, destination, notes });
    if (!detailsValidation.ok) return setError(detailsValidation.error);
    const validation = validateTravelDateRange(startDate, endDate);
    if (validation.error) return setError(validation.error);
    const now = new Date().toISOString();
    const planId = newId('trip');
    const basePlan: TravelPlan = {
      id: planId,
      ...detailsValidation.value,
      mode,
      origin: origin.trim() || undefined,
      startDate,
      endDate,
      itinerary: [],
      participants: [],
      baseCurrency: currencyFromLocale(dateLocale),
      expenses: [],
      createdAt: now,
      updatedAt: now,
    };
    const withFlights = flightImport.pendingImport
      ? applyImportedFlightsToPlan({
          plan: basePlan,
          imported: flightImport.pendingImport,
          createId: () => newId('trip-item'),
        })
      : basePlan;
    const saved = savePlan(withFlights);
    if (!saved) {
      setError('Couldn’t create this trip. Your details are still here—please try again.');
      return;
    }
    recordPlanInteraction(planId);
    setTitle('');
    setMode('flight');
    setOrigin('');
    setDestination('');
    setStartDate('');
    setEndDate('');
    setNotes('');
    flightImport.clearPendingImport();
    setPendingCreatedTripId(planId);
    setShowForm(false);
  };

  const beginEditingDetails = (plan: TravelPlan) => {
    recordPlanInteraction(plan.id);
    setEditingDetailsPlanId(plan.id);
    setEditTitle(plan.title);
    setEditMode(plan.mode ?? 'flight');
    setEditOrigin(plan.origin ?? '');
    setEditDestination(plan.destination);
    setEditNotes(plan.notes ?? '');
    setEditStartDate(plan.startDate);
    setEditEndDate(plan.endDate);
    setEditCoverUri(plan.coverUri);
    setDetailsError(undefined);
  };

  // DEV: `ontrack://travel?editCover=1` opens Edit Trip + Trip Cover Photo modal.
  const openCoverPickerOnEdit =
    __DEV__ && (editCover === '1' || editCover === 'true');
  useEffect(() => {
    if (!openCoverPickerOnEdit) return;
    const plan = sortedPlans[0];
    if (!plan || editingDetailsPlanId) return;
    beginEditingDetails(plan);
  }, [openCoverPickerOnEdit, sortedPlans, editingDetailsPlanId]);

  const saveEditedDetails = async (plan: TravelPlan) => {
    setDetailsError(undefined);
    const validation = validateTravelPlanDetails({
      title: editTitle,
      destination: editDestination,
      notes: editNotes,
    });
    if (!validation.ok) return setDetailsError(validation.error);
    const dateValidation = validateTravelDateRange(editStartDate, editEndDate, plan.itinerary);
    if (dateValidation.error) return setDetailsError(dateValidation.error);
    let coverUri = editCoverUri;
    if (coverUri && coverUri !== plan.coverUri) {
      try {
        coverUri = await persistTravelCoverPhoto(coverUri, plan.id);
      } catch {
        return setDetailsError('Couldn’t save the cover photo. Try another image.');
      }
    }
    const next: TravelPlan = {
      ...plan,
      ...validation.value,
      mode: editMode,
      origin: editOrigin.trim() || undefined,
      startDate: editStartDate,
      endDate: editEndDate,
      updatedAt: new Date().toISOString(),
    };
    if (coverUri) next.coverUri = coverUri;
    else delete next.coverUri;
    const isOnCalendar = isTripOnCalendar(plan.id);
    savePlan(next);
    if (isOnCalendar) replaceTravelActivities(next.id, travelCalendarDrafts(next));
    setEditingDetailsPlanId(undefined);
  };

  const addTripToCalendar = (plan: TravelPlan) => {
    const nextActivities = replaceTravelActivities(plan.id, travelCalendarDrafts(plan));
    setCalendarUpdated({
      title: plan.title,
      eventCount: nextActivities.length,
      startDate: plan.startDate,
    });
  };

  const isTripOnCalendar = (planId: string) =>
    isTravelPlanOnCalendar(activities, planId);

  const closeCalendarUpdated = () => setCalendarUpdated(null);

  const goToTravelCalendar = (startDate: string) => {
    setCalendarUpdated(null);
    setSelectedDate(startDate);
    router.navigate('/(tabs)/calendar');
  };

  const editingPlan = sortedPlans.find((plan) => plan.id === editingDetailsPlanId);

  useEffect(() => {
    if (!editingDetailsPlanId) return;
    const timer = setTimeout(() => {
      editScrollRef.current?.scrollTo({ y: 0, animated: false });
    }, 500);
    return () => clearTimeout(timer);
  }, [editingDetailsPlanId]);

  if (editingPlan) {
    return (
      <Screen
        key={`edit-trip-${editingPlan.id}`}
        scrollRef={editScrollRef}
        style={travelStyle}
        contentStyle={styles.screen}
        refresh={false}>
        <TravelPlanDetailsEditor
          plan={editingPlan}
          title={editTitle}
          mode={editMode}
          origin={editOrigin}
          destination={editDestination}
          notes={editNotes}
          onNotesChange={setEditNotes}
          startDate={editStartDate}
          endDate={editEndDate}
          coverUri={editCoverUri}
          error={detailsError}
          initialCoverPickerOpen={openCoverPickerOnEdit}
          onTitleChange={setEditTitle}
          onModeChange={setEditMode}
          onOriginChange={setEditOrigin}
          onDestinationChange={setEditDestination}
          onStartDateChange={setEditStartDate}
          onEndDateChange={setEditEndDate}
          onCoverUriChange={setEditCoverUri}
          onSave={() => void saveEditedDetails(editingPlan)}
          onCancel={() => setEditingDetailsPlanId(undefined)}
          onDelete={() => {
            removePlan(editingPlan.id);
            setEditingDetailsPlanId(undefined);
          }}
        />
      </Screen>
    );
  }

  return (
    <Screen
      scrollRef={scrollRef}
      style={travelStyle}
      refresh={!showForm}
      contentStyle={{ gap: rs.sm }}>
      <ScreenHeader
        title="Travel"
        subtitle="Plan. Explore. Remember."
        style={{ paddingBottom: rs.sm }}
        trailing={
          !showForm ? (
            <TravelSheetIconControl
              icon="add"
              size={Math.max(48, s(52))}
              tone="accent"
              testID={AgentUiIds.travel.newTrip.open}
              accessibilityLabel="Plan a New Trip"
              onPress={() => {
                setError(undefined);
                setShowForm(true);
              }}
            />
          ) : null
        }
      />

      {showForm ? (
        <TravelNewTripCard
          title={title}
          mode={mode}
          origin={origin}
          destination={destination}
          startDate={startDate}
          endDate={endDate}
          notes={notes}
          error={error}
          importingItinerary={flightImport.importing}
          onTitleChange={setTitle}
          onModeChange={setMode}
          onOriginChange={setOrigin}
          onDestinationChange={setDestination}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          onNotesChange={setNotes}
          onImportItinerary={() => void flightImport.importItinerary()}
          onCreate={createPlan}
          onClose={plans.length > 0 ? () => setShowForm(false) : undefined}
        />
      ) : null}

      {sortedPlans.length > 0 ? (
        <TravelSectionLabel title="Your Trips" count={sortedPlans.length} icon="flight" />
      ) : !showForm ? (
        <EmptyState
          icon="flight"
          title="No trips yet"
          message="Start planning your next adventure."
          actionLabel="New Trip"
          onAction={() => {
            setError(undefined);
            setShowForm(true);
          }}
        />
      ) : null}

      {sortedPlans.map((plan) => {
        const collapsed = collapsedIds.has(plan.id);
        const days = tripDayCount(plan.startDate, plan.endDate);
        return (
          <TravelSurfaceCard
            key={plan.id}
            stripe
            padding={0}
            onLayout={(event) => rememberTripOffset(plan.id, event.nativeEvent.layout.y)}>
            <View style={[styles.tripCardBody, { padding: rs.md, gap: rs.md }]}>
              <TravelTripCardHeader
                plan={plan}
                collapsed={collapsed}
                onOpenCover={() => recordPlanInteraction(plan.id)}
                onEdit={() => beginEditingDetails(plan)}
                onToggleCollapsed={() => toggleCollapsed(plan.id)}>
                <TravelTripDatesRow
                  startLabel={formatDateKey(plan.startDate, dateDisplayFormat)}
                  endLabel={formatDateKey(plan.endDate, dateDisplayFormat)}
                  dayCount={days}
                  testID={AgentUiIds.travel.list.editDates(plan.id)}
                  onPress={() => {
                    recordPlanInteraction(plan.id);
                    setDatesPlanId(plan.id);
                  }}
                />
              </TravelTripCardHeader>
              {!collapsed && plan.notes ? (
                <TravelTripNotesCard
                  notes={plan.notes}
                  toggleTestID={AgentUiIds.travel.list.notesSection(plan.id)}
                />
              ) : null}
              {!collapsed ? (
                <TravelTripActionGrid
                  tripId={plan.id}
                  tripTitle={plan.title}
                  destination={plan.destination}
                  mode={plan.mode ?? 'flight'}
                  isOnCalendar={isTripOnCalendar(plan.id)}
                  coTravelers={[
                    { id: `${plan.id}-self`, name: selfDisplayName, isSelf: true },
                    ...plan.participants.map((person) => ({
                      id: person.id,
                      name: person.name,
                    })),
                  ]}
                  coTravelersExpanded={expandedCoTravelerPlanId === plan.id}
                  onCoTravelersExpandedChange={(next) => {
                    if (next) recordPlanInteraction(plan.id);
                    setExpandedCoTravelerPlanId(next ? plan.id : undefined);
                  }}
                  onOpenItinerary={() => {
                    recordPlanInteraction(plan.id);
                    router.push({
                      pathname: '/travel/[id]',
                      params: { id: plan.id },
                    } as never);
                  }}
                  onOpenCalendar={() => {
                    recordPlanInteraction(plan.id);
                    addTripToCalendar(plan);
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
                  onOpenWeather={() => openWeather(plan.id)}
                  onOpenCurrency={() => openCurrency(plan.id)}
                  onOpenExpenses={() => openExpenses(plan.id)}
                  onOpenChat={() => {
                    recordPlanInteraction(plan.id);
                    router.push({
                      pathname: '/travel/[id]/chat',
                      params: { id: plan.id },
                    } as never);
                  }}
                  onOpenCoTravelers={() => openFriends(plan.id)}
                />
              ) : null}
            </View>
          </TravelSurfaceCard>
        );
      })}

      {expensesPlan ? (
        <TravelExpensesSheet
          plan={expensesPlan}
          visible={expensesVisible}
          onClose={closeExpenses}
          onSavePlan={savePlan}
        />
      ) : null}
      {weatherPlan ? (
        <TravelWeatherSheet
          plan={weatherPlan}
          visible={weatherVisible}
          onClose={closeWeather}
          dateDisplayFormat={dateDisplayFormat}
        />
      ) : null}
      {currencyPlan ? (
        <TravelCurrencySheet
          plan={currencyPlan}
          visible={currencyVisible}
          onClose={closeCurrency}
        />
      ) : null}
      {friendsPlan ? (
        <TravelFriendsSheet
          plan={friendsPlan}
          visible={friendsVisible}
          onClose={closeFriends}
          onSavePlan={savePlan}
        />
      ) : null}
      {datesPlan ? (
        <TravelTripDatesSheet
          visible
          tripTitle={datesPlan.title}
          startDate={datesPlan.startDate}
          endDate={datesPlan.endDate}
          itinerary={datesPlan.itinerary}
          onClose={() => setDatesPlanId(undefined)}
          onSave={(nextStartDate, nextEndDate) =>
            saveTripDates(datesPlan, nextStartDate, nextEndDate)
          }
        />
      ) : null}
      <TravelCalendarUpdatedModal
        payload={calendarUpdated}
        onGoToCalendar={goToTravelCalendar}
        onBackToTravel={closeCalendarUpdated}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.md },
  tripCardBody: {
    width: '100%',
  },
});
