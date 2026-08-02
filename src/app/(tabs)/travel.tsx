import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  AppText,
  appPrompt,
  Button,
  EmptyState,
  ErrorMessage,
  Input,
  Screen,
} from '@/components/primitives';
import { fontFamilies, spacing } from '@/design-system';
import { travelCalendarDrafts } from '@/features/travel/calendar';
import { googleCurrencyConversionUrl } from '@/features/travel/currency-conversion-link';
import { currencyFromLocale } from '@/features/travel/expenses/format-money';
import { TravelExpensesSheet } from '@/features/travel/expenses/travel-expenses-sheet';
import { TravelFriendsSheet } from '@/features/travel/travel-friends-sheet';
import { tripDayCount, validateTravelDateRange } from '@/features/travel/date-range';
import { TravelDateRangeEditor } from '@/features/travel/travel-date-range-editor';
import { itinerarySheetChrome } from '@/features/travel/travel-itinerary-sheet-chrome';
import {
  TravelSheetAction,
  TravelSheetIconControl,
  TravelSheetPrimaryAction,
} from '@/features/travel/travel-list-actions';
import { validateTravelPlanDetails } from '@/features/travel/travel-plan-details';
import { TravelPlanDetailsEditor } from '@/features/travel/travel-plan-details-editor';
import {
  travelPageBg,
  TravelSectionLabel,
  TravelSurfaceCard,
} from '@/features/travel/travel-surface';
import { persistTravelCoverPhoto } from '@/features/travel/destination-cover';
import { TravelTripCover } from '@/features/travel/travel-trip-cover';
import { TravelTripDatesRow } from '@/features/travel/travel-trip-dates-row';
import type { TravelPlan } from '@/features/travel/types';
import { TravelWeatherAction } from '@/features/travel/weather';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { usePreferences } from '@/store/preferences';
import { newId, useSchedule } from '@/store/schedule';
import { useTravel } from '@/store/travel';
import { formatDateKey, todayKey } from '@/utils/date';

/** Primary travel planning tab — Add Stay sheet chrome for light + dark. */
export default function TravelScreen() {
  const theme = useTheme();
  const chrome = itinerarySheetChrome(theme);
  const router = useRouter();
  const { spacing: rs } = useResponsive();
  const plans = useTravel((state) => state.plans);
  const savePlan = useTravel((state) => state.savePlan);
  const removePlan = useTravel((state) => state.removePlan);
  const activities = useSchedule((state) => state.activities);
  const replaceTravelActivities = useSchedule((state) => state.replaceTravelActivities);
  const dateLocale = usePreferences((state) => state.dateLocale);
  const dateDisplayFormat = usePreferences((state) => state.dateDisplayFormat);
  const [showForm, setShowForm] = useState(plans.length === 0);
  const [title, setTitle] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState(todayKey());
  const [endDate, setEndDate] = useState(todayKey());
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string>();
  const [editingDetailsPlanId, setEditingDetailsPlanId] = useState<string>();
  const [editTitle, setEditTitle] = useState('');
  const [editDestination, setEditDestination] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editCoverUri, setEditCoverUri] = useState<string | undefined>();
  const [detailsError, setDetailsError] = useState<string>();
  const [expensesPlanId, setExpensesPlanId] = useState<string>();
  const [expensesVisible, setExpensesVisible] = useState(false);
  const [friendsPlanId, setFriendsPlanId] = useState<string>();
  const [friendsVisible, setFriendsVisible] = useState(false);
  const [collapsedIds, setCollapsedIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const toggleCollapsed = (planId: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(planId)) next.delete(planId);
      else next.add(planId);
      return next;
    });
  };
  const sortedPlans = useMemo(
    () => [...plans].sort((a, b) => a.startDate.localeCompare(b.startDate)),
    [plans],
  );
  const expensesPlan = sortedPlans.find((plan) => plan.id === expensesPlanId);
  const friendsPlan = sortedPlans.find((plan) => plan.id === friendsPlanId);
  const openExpenses = (planId: string) => {
    setExpensesPlanId(planId);
    setExpensesVisible(true);
  };
  const closeExpenses = () => {
    appPrompt.dismiss();
    setExpensesVisible(false);
  };
  const openFriends = (planId: string) => {
    setFriendsPlanId(planId);
    setFriendsVisible(true);
  };
  const closeFriends = () => {
    appPrompt.dismiss();
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
    setDestination('');
    setNotes('');
    setShowForm(false);
  };

  const beginEditingDetails = (plan: TravelPlan) => {
    setEditingDetailsPlanId(plan.id);
    setEditTitle(plan.title);
    setEditDestination(plan.destination);
    setEditStartDate(plan.startDate);
    setEditEndDate(plan.endDate);
    setEditCoverUri(plan.coverUri);
    setDetailsError(undefined);
  };

  const saveEditedDetails = async (plan: TravelPlan) => {
    setDetailsError(undefined);
    const validation = validateTravelPlanDetails({
      title: editTitle,
      destination: editDestination,
      notes: plan.notes ?? '',
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
      startDate: editStartDate,
      endDate: editEndDate,
      updatedAt: new Date().toISOString(),
    };
    if (coverUri) next.coverUri = coverUri;
    else delete next.coverUri;
    const isOnCalendar = activities.some((activity) => activity.travelPlanId === plan.id);
    savePlan(next);
    if (isOnCalendar) replaceTravelActivities(next.id, travelCalendarDrafts(next));
    setEditingDetailsPlanId(undefined);
  };

  const addTripToCalendar = (plan: TravelPlan) => {
    const nextActivities = replaceTravelActivities(plan.id, travelCalendarDrafts(plan));
    appPrompt.alert(
      'Calendar Updated',
      `${nextActivities.length} ${nextActivities.length === 1 ? 'Event' : 'Events'} Added for “${plan.title}”.`,
    );
  };

  const editingPlan = sortedPlans.find((plan) => plan.id === editingDetailsPlanId);

  if (editingPlan) {
    return (
      <Screen
        style={{ backgroundColor: travelPageBg(theme) }}
        contentStyle={styles.screen}
        refresh={false}>
        <TravelPlanDetailsEditor
          plan={editingPlan}
          title={editTitle}
          destination={editDestination}
          startDate={editStartDate}
          endDate={editEndDate}
          coverUri={editCoverUri}
          error={detailsError}
          onTitleChange={setEditTitle}
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
      style={{ backgroundColor: travelPageBg(theme) }}
      contentStyle={styles.screen}>
      <View style={[styles.header, { gap: rs.sm }]}>
        <View style={[styles.headerTitleRow, { gap: rs.sm }]}>
          <AppText style={[styles.title, { color: chrome.title }]} fit numberOfLines={1}>
            Travel
          </AppText>
          {!showForm ? (
            <TravelSheetIconControl
              icon="add"
              size={40}
              tone="accent"
              accessibilityLabel="Plan a New Trip"
              onPress={() => setShowForm(true)}
            />
          ) : null}
        </View>
        <AppText style={[styles.subtitle, { color: chrome.subtitle }]} fit numberOfLines={1}>
          Plan. Explore. Remember.
        </AppText>
      </View>

      {showForm ? (
        <TravelSurfaceCard stripe>
          <AppText style={[styles.cardHeading, { color: chrome.title }]}>
            Start a New Trip
          </AppText>
          <Input
            label="Trip Name"
            value={title}
            onChangeText={setTitle}
            placeholder="Birthday in Lisbon"
            fieldBackground={chrome.fieldBg}
            stackedLabelColor={chrome.label}
            placeholderTextColor={chrome.placeholder}
          />
          <Input
            label="Destination"
            value={destination}
            onChangeText={setDestination}
            placeholder="Lisbon, Portugal"
            fieldBackground={chrome.fieldBg}
            stackedLabelColor={chrome.label}
            placeholderTextColor={chrome.placeholder}
          />
          <TravelDateRangeEditor
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
          />
          <Input
            label="Notes"
            value={notes}
            onChangeText={setNotes}
            placeholder="Ideas, budgets, must-dos…"
            multiline
            fieldBackground={chrome.fieldBg}
            stackedLabelColor={chrome.label}
            placeholderTextColor={chrome.placeholder}
          />
          {error ? <ErrorMessage message={error} /> : null}
          <View style={styles.row}>
            <View style={styles.flex}>
              <TravelSheetPrimaryAction label="Let’s Go" icon="flight" onPress={createPlan} />
            </View>
            {plans.length > 0 ? (
              <Button
                variant="ghost"
                onPress={() => setShowForm(false)}
                style={styles.flex}
                textStyle={{ color: chrome.subtitle }}
                accessibilityLabel="Cancel New Trip">
                Cancel
              </Button>
            ) : null}
          </View>
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
          <TravelSurfaceCard key={plan.id} stripe padding={0}>
            <View style={[styles.tripCardBody, { padding: rs.md, gap: rs.md }]}>
              <View style={[styles.tripHeader, { gap: rs.md }]}>
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
                  <TravelTripCover plan={plan} />
                  <View style={styles.heading}>
                    <AppText
                      style={[
                        styles.tripTitle,
                        { color: theme.name === 'light' ? '#1A1410' : theme.textPrimary },
                      ]}
                      fit
                      numberOfLines={1}>
                      {plan.title}
                    </AppText>
                    {showDestination ? (
                      <AppText
                        variant="caption"
                        style={[styles.serif, { color: chrome.subtitle }]}
                        fit
                        numberOfLines={1}>
                        {plan.destination}
                      </AppText>
                    ) : null}
                  </View>
                </Pressable>
                <View style={[styles.tripHeaderActions, { gap: rs.sm }]}>
                  <TravelSheetIconControl
                    icon="edit"
                    size={40}
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
                <>
                  <View style={[styles.actionGrid, { gap: rs.sm }]}>
                    <TravelSheetAction
                      label="Itinerary"
                      icon="list"
                      tone="note"
                      onPress={() =>
                        router.push({
                          pathname: '/travel/[id]',
                          params: { id: plan.id },
                        } as never)
                      }
                      accessibilityLabel={`Plan Itinerary for ${plan.title}`}
                    />
                    <TravelSheetAction
                      label="Search Flights"
                      icon="flight"
                      tone="flight"
                      onPress={() =>
                        router.push({
                          pathname: '/travel/[id]/flights',
                          params: { id: plan.id },
                        } as never)
                      }
                      accessibilityLabel={`Search Flights for ${plan.title}`}
                    />
                    <TravelSheetAction
                      label="Search Stays"
                      icon="lodging"
                      tone="lodging"
                      onPress={() =>
                        router.push({
                          pathname: '/travel/[id]/stays',
                          params: { id: plan.id },
                        } as never)
                      }
                      accessibilityLabel={`Search Stays for ${plan.title}`}
                    />
                    <TravelSheetAction
                      label="Add to Calendar"
                      icon="calendar-add"
                      tone="calendar"
                      onPress={() => addTripToCalendar(plan)}
                      accessibilityLabel={`Add ${plan.title} to Calendar`}
                    />
                    <TravelWeatherAction
                      destination={plan.destination}
                      startDate={plan.startDate}
                      endDate={plan.endDate}
                      dateDisplayFormat={dateDisplayFormat}
                    />
                    <TravelSheetAction
                      label="Currency"
                      icon="currency"
                      tone="link"
                      onPress={() =>
                        void WebBrowser.openBrowserAsync(
                          googleCurrencyConversionUrl(plan.destination, dateLocale),
                        )
                      }
                      accessibilityLabel={`Convert Currency for ${plan.destination}`}
                    />
                    <TravelSheetAction
                      label={
                        plan.expenses.length > 0
                          ? `Expenses · ${plan.expenses.length}`
                          : 'Expenses'
                      }
                      icon="receipt"
                      tone="note"
                      onPress={() => openExpenses(plan.id)}
                      accessibilityLabel={`Open Expenses for ${plan.title}`}
                    />
                    <TravelSheetAction
                      label="Group Chat"
                      icon="chat"
                      tone="location"
                      onPress={() =>
                        router.push({
                          pathname: '/travel/[id]/chat',
                          params: { id: plan.id },
                        } as never)
                      }
                      accessibilityLabel={`Open Group Chat for ${plan.title}`}
                    />
                  </View>
                  <TravelSheetPrimaryAction
                    label={
                      plan.participants.length > 0
                        ? `Friends · ${plan.participants.length}`
                        : 'Friends'
                    }
                    icon="people"
                    onPress={() => openFriends(plan.id)}
                  />
                </>
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
          onSavePlan={(next) => savePlan(next)}
        />
      ) : null}
      {friendsPlan ? (
        <TravelFriendsSheet
          plan={friendsPlan}
          visible={friendsVisible}
          onClose={closeFriends}
          onSavePlan={(next) => savePlan(next)}
        />
      ) : null}
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
    fontSize: 40,
    lineHeight: 46,
    fontWeight: '400',
    letterSpacing: -1,
  },
  subtitle: {
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '400',
    letterSpacing: 0.1,
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
  heading: { flex: 1, flexShrink: 1, minWidth: 0, gap: spacing.xxs },
  tripTitle: {
    fontFamily: fontFamilies.serif,
    fontSize: 23,
    lineHeight: 28,
    fontWeight: '400',
    letterSpacing: -0.4,
  },
  serif: {
    fontFamily: fontFamilies.serif,
    fontWeight: '400',
  },
  tripHeader: {
    minHeight: 80,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tripHeaderToggle: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    minHeight: 80,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tripHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  pressed: { opacity: 0.6 },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  flex: { flex: 1 },
});
