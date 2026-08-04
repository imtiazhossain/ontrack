import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import {
    appPrompt,
    AppText,
    EmptyState,
    ErrorMessage,
    Input,
    Screen,
    ScreenHeader,
    Symbol,
} from '@/components/primitives';
import { fontFamilies, spacing } from '@/design-system';
import { resolveSelfDisplayName } from '@/features/account/self-display-name';
import { useAuthSession } from '@/features/auth/auth-provider';
import {
    isTravelPlanOnCalendar,
    travelCalendarDrafts,
} from '@/features/travel/calendar';
import { tripDayCount, validateTravelDateRange } from '@/features/travel/date-range';
import { persistTravelCoverPhoto } from '@/features/travel/destination-cover';
import { currencyFromLocale } from '@/features/travel/expenses/format-money';
import { TravelExpensesSheet } from '@/features/travel/expenses/travel-expenses-sheet';
import {
    TravelCalendarUpdatedModal,
    type TravelCalendarUpdatedPayload,
} from '@/features/travel/travel-calendar-updated-modal';
import { TravelCoTravelerStack } from '@/features/travel/travel-cotraveler-stack';
import { TravelCurrencySheet } from '@/features/travel/travel-currency-sheet';
import { TravelDateRangeEditor } from '@/features/travel/travel-date-range-editor';
import { TravelFriendsSheet } from '@/features/travel/travel-friends-sheet';
import {
    itinerarySheetChrome,
    itinerarySheetFieldProps,
} from '@/features/travel/travel-itinerary-sheet-chrome';
import {
    TravelSheetIconControl,
    TravelSheetPrimaryAction,
} from '@/features/travel/travel-list-actions';
import { validateTravelPlanDetails } from '@/features/travel/travel-plan-details';
import { TravelPlanDetailsEditor } from '@/features/travel/travel-plan-details-editor';
import {
    TravelSectionLabel,
    TravelSurfaceCard,
    useTravelPageStyle,
} from '@/features/travel/travel-surface';
import { TravelTripCover } from '@/features/travel/travel-trip-cover';
import { TravelTripDatesRow } from '@/features/travel/travel-trip-dates-row';
import { TravelTripActionGrid } from '@/features/travel/travel-trip-action-grid';
import { TravelPlanModePicker } from '@/features/travel/travel-mode-picker';
import { travelPlanModeIcon, travelPlanModeLabel } from '@/features/travel/travel-mode';
import type { TravelPlan, TravelPlanMode } from '@/features/travel/types';
import { TravelWeatherSheet } from '@/features/travel/weather';
import { useResponsive } from '@/hooks/use-responsive';
import { FeatureThemeProvider, useTheme } from '@/hooks/use-theme';
import { usePreferences } from '@/store/preferences';
import { newId, useSchedule } from '@/store/schedule';
import { useTravel } from '@/store/travel';
import { useUI } from '@/store/ui';
import { AgentUiIds } from '@/utils/agent-ui';
import { formatDateKey, todayKey } from '@/utils/date';

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
  const chrome = itinerarySheetChrome(theme);
  const router = useRouter();
  const { editCover, tripId } = useLocalSearchParams<{
    editCover?: string;
    tripId?: string;
  }>();
  const { spacing: rs, s } = useResponsive();
  const { user } = useAuthSession();
  const plans = useTravel((state) => state.plans);
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
  const [startDate, setStartDate] = useState(todayKey());
  const [endDate, setEndDate] = useState(todayKey());
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string>();
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
  const tripOffsets = useRef<Record<string, number>>({});
  const [focusedTripOffset, setFocusedTripOffset] = useState<number>();
  const focusedTripId = typeof tripId === 'string' ? tripId : undefined;
  const toggleCollapsed = (planId: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(planId)) next.delete(planId);
      else next.add(planId);
      return next;
    });
  };
  const sortedPlans = useMemo(
    () => [...plans].sort((a, b) => a.startDate.localeCompare(b.startDate) || a.createdAt.localeCompare(b.createdAt)),
    [plans],
  );

  useEffect(() => {
    if (!focusedTripId || !sortedPlans.some((plan) => plan.id === focusedTripId)) return;

    setShowForm(false);
    setCollapsedIds((previous) => {
      if (!previous.has(focusedTripId)) return previous;
      const next = new Set(previous);
      next.delete(focusedTripId);
      return next;
    });

    const offset = tripOffsets.current[focusedTripId];
    if (offset === undefined) return;
    const frame = requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: Math.max(0, offset - rs.sm), animated: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [focusedTripId, focusedTripOffset, rs.sm, sortedPlans]);

  const rememberTripOffset = (planId: string, y: number) => {
    tripOffsets.current[planId] = y;
    if (planId !== focusedTripId) return;
    setFocusedTripOffset((previous) => (previous === y ? previous : y));
  };
  const expensesPlan = sortedPlans.find((plan) => plan.id === expensesPlanId);
  const currencyPlan = sortedPlans.find((plan) => plan.id === currencyPlanId);
  const weatherPlan = sortedPlans.find((plan) => plan.id === weatherPlanId);
  const friendsPlan = sortedPlans.find((plan) => plan.id === friendsPlanId);
  const openExpenses = (planId: string) => {
    setExpensesPlanId(planId);
    setExpensesVisible(true);
  };
  const closeExpenses = () => {
    appPrompt.dismiss();
    setExpensesVisible(false);
  };
  const openWeather = (planId: string) => {
    setWeatherPlanId(planId);
    setWeatherVisible(true);
  };
  const closeWeather = () => {
    appPrompt.dismiss();
    setWeatherVisible(false);
  };
  const openCurrency = (planId: string) => {
    setCurrencyPlanId(planId);
    setCurrencyVisible(true);
  };
  const closeCurrency = () => {
    appPrompt.dismiss();
    setCurrencyVisible(false);
  };
  const openFriends = (planId: string) => {
    setExpandedCoTravelerPlanId(undefined);
    setFriendsPlanId(planId);
    setFriendsVisible(true);
  };
  const closeFriends = () => {
    appPrompt.dismiss();
    setExpandedCoTravelerPlanId(undefined);
    setFriendsVisible(false);
  };

  const createPlan = () => {
    setError(undefined);
    const detailsValidation = validateTravelPlanDetails({ title, destination, notes });
    if (!detailsValidation.ok) return setError(detailsValidation.error);
    const validation = validateTravelDateRange(startDate, endDate);
    if (validation.error) return setError(validation.error);
    const now = new Date().toISOString();
    savePlan({
      id: newId('trip'),
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
    });
    setTitle('');
    setMode('flight');
    setOrigin('');
    setDestination('');
    setNotes('');
    setShowForm(false);
  };

  const beginEditingDetails = (plan: TravelPlan) => {
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

  if (editingPlan) {
    return (
      <Screen
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
              onPress={() => setShowForm(true)}
            />
          ) : null
        }
      />

      {showForm ? (
        <TravelSurfaceCard stripe>
          <ScreenHeader
            title="Start a New Trip"
            onClose={plans.length > 0 ? () => setShowForm(false) : undefined}
            closeAccessibilityLabel="Cancel New Trip"
            closeTestID={AgentUiIds.travel.newTrip.cancel}
          />
          <Input
            testID={AgentUiIds.travel.newTrip.title}
            icon="flight"
            stackedLabel="Trip Name"
            value={title}
            onChangeText={setTitle}
            placeholder="Birthday in Lisbon"
            accessibilityLabel="Trip Name"
            {...itinerarySheetFieldProps(chrome, 'flight')}
          />
          <TravelPlanModePicker value={mode} onChange={setMode} />
          <Input
            testID={AgentUiIds.travel.newTrip.origin}
            icon="route"
            stackedLabel="Starting Point"
            value={origin}
            onChangeText={setOrigin}
            placeholder="New York, NY (optional)"
            accessibilityLabel="Starting Point, optional"
            {...itinerarySheetFieldProps(chrome, 'location')}
          />
          <Input
            testID={AgentUiIds.travel.newTrip.destination}
            icon="location"
            stackedLabel="Destination"
            value={destination}
            onChangeText={setDestination}
            placeholder="Lisbon, Portugal"
            accessibilityLabel="Destination"
            {...itinerarySheetFieldProps(chrome, 'location')}
          />
          <TravelDateRangeEditor
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            stacked
            startTestID={AgentUiIds.travel.newTrip.startDate}
            endTestID={AgentUiIds.travel.newTrip.endDate}
          />
          <Input
            testID={AgentUiIds.travel.newTrip.notes}
            icon="note"
            stackedLabel="Notes"
            value={notes}
            onChangeText={setNotes}
            placeholder="Ideas, budgets, must-dos…"
            multiline
            textAlignVertical="top"
            style={{ minHeight: Math.max(32, s(36)) }}
            accessibilityLabel="Notes"
            {...itinerarySheetFieldProps(chrome, 'note')}
          />
          {error ? <ErrorMessage message={error} /> : null}
          <TravelSheetPrimaryAction
            label="Create Trip"
            icon="flight"
            testID={AgentUiIds.travel.newTrip.create}
            onPress={createPlan}
          />
        </TravelSurfaceCard>
      ) : null}

      {sortedPlans.length > 0 ? (
        <TravelSectionLabel title="Your Trips" count={sortedPlans.length} icon="flight" />
      ) : !showForm ? (
        <EmptyState
          icon="flight"
          title="No trips yet"
          message="Start planning your next adventure."
          actionLabel="New Trip"
          onAction={() => setShowForm(true)}
        />
      ) : null}

      {sortedPlans.map((plan) => {
        const collapsed = collapsedIds.has(plan.id);
        const days = tripDayCount(plan.startDate, plan.endDate);
        const showDestination =
          plan.title.trim().toLowerCase() !== plan.destination.trim().toLowerCase();
        return (
          <TravelSurfaceCard
            key={plan.id}
            stripe
            padding={0}
            onLayout={(event) => rememberTripOffset(plan.id, event.nativeEvent.layout.y)}>
            <View style={[styles.tripCardBody, { padding: rs.md, gap: rs.md }]}>
              <View style={[styles.tripHeader, { gap: rs.md }]}>
                <TravelTripCover plan={plan} />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${collapsed ? 'Expand' : 'Collapse'} ${plan.title}`}
                  accessibilityState={{ expanded: !collapsed }}
                  onPress={() => toggleCollapsed(plan.id)}
                  style={({ pressed }) => [
                    styles.tripHeaderToggle,
                    { gap: rs.md },
                    pressed ? styles.pressed : undefined,
                  ]}>
                  <View style={styles.heading}>
                    <AppText
                      style={[
                        styles.tripTitle,
                        {
                          color: theme.textPrimary,
                          fontSize: s(32),
                          lineHeight: s(38),
                        },
                      ]}
                      fit
                      numberOfLines={1}>
                      {plan.title}
                    </AppText>
                    {showDestination ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 0, flexShrink: 1 }}>
                        <Symbol name={travelPlanModeIcon(plan.mode ?? 'flight')} size={13} color={chrome.subtitle} />
                        <AppText
                          variant="caption"
                          style={{ color: chrome.subtitle, fontSize: s(14), lineHeight: s(18), flexShrink: 1, minWidth: 0 }}
                          fit
                          numberOfLines={1}>
                          {travelPlanModeLabel(plan.mode ?? 'flight')} · {plan.destination}
                        </AppText>
                      </View>
                    ) : null}
                  </View>
                </Pressable>
                <View style={[styles.tripHeaderActions, { gap: rs.xs }]}>
                  <TravelCoTravelerStack
                    people={[
                      {
                        id: `${plan.id}-self`,
                        name: selfDisplayName,
                        isSelf: true,
                      },
                      ...plan.participants.map((person) => ({
                        id: person.id,
                        name: person.name,
                      })),
                    ]}
                    expanded={expandedCoTravelerPlanId === plan.id}
                    onExpandedChange={(next) =>
                      setExpandedCoTravelerPlanId(next ? plan.id : undefined)
                    }
                  />
                  <View style={[styles.tripHeaderControls, { gap: rs.sm }]}>
                    <TravelSheetIconControl
                      icon="edit"
                      size={40}
                      testID={AgentUiIds.travel.list.editTrip}
                      accessibilityLabel={`Edit Details for ${plan.title}`}
                      onPress={() => beginEditingDetails(plan)}
                    />
                    <TravelSheetIconControl
                      icon={collapsed ? 'chevron-down' : 'chevron-up'}
                      size={40}
                      accessibilityLabel={`${collapsed ? 'Expand' : 'Collapse'} ${plan.title}`}
                      onPress={() => toggleCollapsed(plan.id)}
                    />
                  </View>
                </View>
              </View>
              <TravelTripDatesRow
                startLabel={formatDateKey(plan.startDate, dateDisplayFormat)}
                endLabel={formatDateKey(plan.endDate, dateDisplayFormat)}
                dayCount={days}
              />
              {!collapsed && plan.notes ? (
                <AppText variant="body" style={[styles.serif, { color: chrome.subtitle }]}>
                  {plan.notes}
                </AppText>
              ) : null}
              {!collapsed ? (
                <TravelTripActionGrid
                  tripTitle={plan.title}
                  destination={plan.destination}
                  mode={plan.mode ?? 'flight'}
                  isOnCalendar={isTripOnCalendar(plan.id)}
                  onOpenItinerary={() =>
                    router.push({
                      pathname: '/travel/[id]',
                      params: { id: plan.id },
                    } as never)
                  }
                  onOpenCalendar={() => {
                    if (isTripOnCalendar(plan.id)) {
                      goToTravelCalendar(plan.startDate);
                      return;
                    }
                    addTripToCalendar(plan);
                  }}
                  onSearchFlights={() =>
                    router.push({
                      pathname: '/travel/[id]/flights',
                      params: { id: plan.id },
                    } as never)
                  }
                  onAddTransport={() =>
                    router.push({
                      pathname: '/travel/[id]',
                      params: { id: plan.id, add: 'transport' },
                    } as never)
                  }
                  onSearchStays={() =>
                    router.push({
                      pathname: '/travel/[id]/stays',
                      params: { id: plan.id },
                    } as never)
                  }
                  onOpenWeather={() => openWeather(plan.id)}
                  onOpenCurrency={() => openCurrency(plan.id)}
                  onOpenExpenses={() => openExpenses(plan.id)}
                  onOpenChat={() =>
                    router.push({
                      pathname: '/travel/[id]/chat',
                      params: { id: plan.id },
                    } as never)
                  }
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
  header: {
    width: '100%',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  title: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    fontFamily: fontFamilies.serif,
    fontWeight: '400',
    letterSpacing: -1.3,
  },
  subtitle: {
    fontFamily: fontFamilies.serif,
    fontWeight: '400',
    letterSpacing: 0,
  },
  cardHeading: {
    fontFamily: fontFamilies.serif,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '400',
  },
  tripCardBody: {
    width: '100%',
  },
  heading: { flex: 1, flexShrink: 1, minWidth: 0, gap: spacing.xs, justifyContent: 'center' },
  tripTitle: {
    fontFamily: fontFamilies.serif,
    fontWeight: '400',
    letterSpacing: -0.65,
  },
  serif: {
    fontFamily: fontFamilies.serif,
    fontWeight: '400',
  },
  tripHeader: {
    minHeight: 96,
    flexDirection: 'row',
    alignItems: 'flex-start',
    overflow: 'visible',
    zIndex: 2,
  },
  tripHeaderToggle: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    minHeight: 96,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 0,
  },
  tripHeaderActions: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    flexShrink: 0,
    zIndex: 6,
    elevation: 6,
    gap: spacing.xs,
  },
  tripHeaderControls: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  pressed: { opacity: 0.6 },
  flex: { flex: 1 },
});
