import * as WebBrowser from 'expo-web-browser';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, ErrorMessage, Input, Screen, Symbol } from '@/components/primitives';
import { radii, spacing } from '@/design-system';
import { travelCalendarDrafts } from '@/features/travel/calendar';
import { googleCurrencyConversionUrl } from '@/features/travel/currency-conversion-link';
import { validateTravelDateRange } from '@/features/travel/date-range';
import { decodeTravelInvite, travelInviteKey } from '@/features/travel/share';
import { TravelDateRangeEditor } from '@/features/travel/travel-date-range-editor';
import { validateTravelPlanDetails } from '@/features/travel/travel-plan-details';
import { TravelPlanDetailsEditor } from '@/features/travel/travel-plan-details-editor';
import type { TravelPlan } from '@/features/travel/types';
import { googleWeatherUrl } from '@/features/travel/weather';
import { FeatureThemeProvider, useTheme } from '@/hooks/use-theme';
import { usePreferences } from '@/store/preferences';
import { newId, useSchedule } from '@/store/schedule';
import { useTravel } from '@/store/travel';
import { formatDateKey, todayKey } from '@/utils/date';

export default function TravelScreen() {
  return (
    <FeatureThemeProvider feature="travel">
      <TravelScreenContent />
    </FeatureThemeProvider>
  );
}

function TravelScreenContent() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ invite?: string }>();
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
  const [editingPlanId, setEditingPlanId] = useState<string>();
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editError, setEditError] = useState<string>();
  const [editingDetailsPlanId, setEditingDetailsPlanId] = useState<string>();
  const [editTitle, setEditTitle] = useState('');
  const [editDestination, setEditDestination] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [detailsError, setDetailsError] = useState<string>();
  const importedInvite = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (typeof params.invite !== 'string') return;
    if (importedInvite.current === params.invite) return;
    importedInvite.current = params.invite;
    const invite = params.invite;
    const timer = setTimeout(() => {
      const imported = decodeTravelInvite(invite);
      if (!imported) {
        setError('This travel invite is invalid or incomplete.');
        return;
      }
      const now = new Date().toISOString();
      const plan = {
        ...imported,
        id: `trip-invite-${travelInviteKey(invite)}`,
        createdAt: now,
        updatedAt: now,
      };
      savePlan(plan);
      replaceTravelActivities(plan.id, travelCalendarDrafts(plan));
      setShowForm(false);
    }, 0);
    return () => clearTimeout(timer);
  }, [params.invite, replaceTravelActivities, savePlan]);

  const sortedPlans = useMemo(
    () => [...plans].sort((a, b) => a.startDate.localeCompare(b.startDate)),
    [plans],
  );

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
      createdAt: now,
      updatedAt: now,
    });
    setTitle('');
    setDestination('');
    setNotes('');
    setShowForm(false);
  };

  const beginEditingDates = (plan: TravelPlan) => {
    setEditingDetailsPlanId(undefined);
    setEditingPlanId(plan.id);
    setEditStartDate(plan.startDate);
    setEditEndDate(plan.endDate);
    setEditError(undefined);
  };

  const saveEditedDates = (plan: TravelPlan) => {
    setEditError(undefined);
    const validation = validateTravelDateRange(editStartDate, editEndDate, plan.itinerary);
    if (validation.error) return setEditError(validation.error);
    const next = {
      ...plan,
      startDate: editStartDate,
      endDate: editEndDate,
      updatedAt: new Date().toISOString(),
    };
    const isOnCalendar = activities.some((activity) => activity.travelPlanId === plan.id);
    savePlan(next);
    if (isOnCalendar) replaceTravelActivities(next.id, travelCalendarDrafts(next));
    setEditingPlanId(undefined);
  };

  const beginEditingDetails = (plan: TravelPlan) => {
    setEditingPlanId(undefined);
    setEditingDetailsPlanId(plan.id);
    setEditTitle(plan.title);
    setEditDestination(plan.destination);
    setEditNotes(plan.notes ?? '');
    setDetailsError(undefined);
  };

  const saveEditedDetails = (plan: TravelPlan) => {
    setDetailsError(undefined);
    const validation = validateTravelPlanDetails({
      title: editTitle,
      destination: editDestination,
      notes: editNotes,
    });
    if (!validation.ok) return setDetailsError(validation.error);
    const next = {
      ...plan,
      ...validation.value,
      updatedAt: new Date().toISOString(),
    };
    const isOnCalendar = activities.some((activity) => activity.travelPlanId === plan.id);
    savePlan(next);
    if (isOnCalendar) replaceTravelActivities(next.id, travelCalendarDrafts(next));
    setEditingDetailsPlanId(undefined);
  };

  const addTripToCalendar = (plan: TravelPlan) => {
    const activities = replaceTravelActivities(plan.id, travelCalendarDrafts(plan));
    Alert.alert(
      'Calendar updated',
      `${activities.length} ${activities.length === 1 ? 'event' : 'events'} added for “${plan.title}”.`,
    );
  };

  return (
    <Screen contentStyle={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <AppText variant="overline" color="accent">Travel</AppText>
          {!showForm ? (
            <Button
              icon="plus"
              onPress={() => setShowForm(true)}
              accessibilityLabel="Plan a new trip">
              New trip
            </Button>
          ) : null}
        </View>
        <View style={styles.heroRow}>
          <AppText variant="title" style={styles.heroTitle}>Where to next?</AppText>
          <View style={[styles.planeBadge, { backgroundColor: theme.accentFaint }]}>
            <AppText variant="heading">✈️</AppText>
          </View>
        </View>
      </View>

      {showForm ? (
        <View style={[styles.formCard, { backgroundColor: theme.backgroundSunken, borderColor: theme.separator }]}>
          <AppText variant="subheading">Start the group chat’s favorite trip</AppText>
          <Input label="Trip name" value={title} onChangeText={setTitle} placeholder="Birthday in Lisbon" />
          <Input label="Destination" value={destination} onChangeText={setDestination} placeholder="Lisbon, Portugal" />
          <TravelDateRangeEditor
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
          />
          <Input label="Notes" value={notes} onChangeText={setNotes} placeholder="Ideas, budgets, must-dos…" multiline />
          {error ? <ErrorMessage message={error} /> : null}
          <View style={styles.row}>
            <Button onPress={createPlan} style={styles.flex} accessibilityLabel="Save trip">Let’s go</Button>
            {plans.length > 0 ? (
              <Button variant="ghost" onPress={() => setShowForm(false)} style={styles.flex} accessibilityLabel="Cancel new trip">
                Cancel
              </Button>
            ) : null}
          </View>
        </View>
      ) : null}

      {sortedPlans.length > 0 ? (
        <View style={styles.tripsHeader}>
          <AppText variant="overline" color="tertiary">Your trips</AppText>
          <AppText variant="caption" color="secondary">
            {sortedPlans.length} {sortedPlans.length === 1 ? 'trip' : 'trips'}
          </AppText>
        </View>
      ) : null}
      {sortedPlans.map((plan) => (
        <Card
          key={plan.id}
          variant="elevated"
          style={styles.tripCard}>
          {editingDetailsPlanId === plan.id ? (
            <TravelPlanDetailsEditor
              title={editTitle}
              destination={editDestination}
              notes={editNotes}
              error={detailsError}
              onTitleChange={setEditTitle}
              onDestinationChange={setEditDestination}
              onNotesChange={setEditNotes}
              onSave={() => saveEditedDetails(plan)}
              onCancel={() => setEditingDetailsPlanId(undefined)}
            />
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Edit details for ${plan.title}`}
              onPress={() => beginEditingDetails(plan)}
              style={({ pressed }) => [
                styles.tripHeader,
                pressed ? styles.pressed : undefined,
              ]}>
              <View style={styles.heading}>
                <AppText variant="subheading">{plan.title}</AppText>
                <AppText variant="callout" color="secondary">{plan.destination}</AppText>
              </View>
              <Symbol name="pencil" size="sm" color={theme.textTertiary} />
            </Pressable>
          )}
          {editingPlanId !== plan.id ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Edit dates for ${plan.title}`}
              hitSlop={8}
              onPress={() => beginEditingDates(plan)}
              style={({ pressed }) => [
                styles.dateLink,
                { backgroundColor: theme.accentFaint },
                pressed ? styles.pressed : undefined,
              ]}>
              <View style={styles.dateIcon}>
                <Symbol name="calendar" size="md" color={theme.accentPrimary} />
              </View>
              <View style={styles.dateCopy}>
                <AppText variant="overline" color="tertiary">Trip dates</AppText>
                <AppText variant="callout" color="accent">
                  {formatDateKey(plan.startDate, dateDisplayFormat)} → {formatDateKey(plan.endDate, dateDisplayFormat)}
                </AppText>
              </View>
              <Symbol name="pencil" size="sm" color={theme.textTertiary} />
            </Pressable>
          ) : null}
          {plan.notes && editingDetailsPlanId !== plan.id ? (
            <AppText variant="body" color="secondary">{plan.notes}</AppText>
          ) : null}
          {editingPlanId === plan.id ? (
            <View style={styles.dateEditor}>
              <TravelDateRangeEditor
                startDate={editStartDate}
                endDate={editEndDate}
                onStartDateChange={setEditStartDate}
                onEndDateChange={setEditEndDate}
              />
              {editError ? <ErrorMessage message={editError} /> : null}
              <View style={styles.row}>
                <Button onPress={() => saveEditedDates(plan)} style={styles.flex}>Save dates</Button>
                <Button variant="ghost" onPress={() => setEditingPlanId(undefined)} style={styles.flex}>
                  Cancel
                </Button>
              </View>
            </View>
          ) : null}
          <View style={styles.actionGrid}>
            <Button
              variant="secondary"
              icon="airplane"
              style={styles.actionButton}
              onPress={() =>
                router.push({ pathname: '/travel/[id]/flights', params: { id: plan.id } } as never)
              }
              accessibilityLabel={`Search flights for ${plan.title}`}>
              Flights
            </Button>
            <Button
              variant="secondary"
              icon="bed.double.fill"
              style={styles.actionButton}
              onPress={() =>
                router.push({ pathname: '/travel/[id]/stays', params: { id: plan.id } } as never)
              }
              accessibilityLabel={`Search stays for ${plan.title}`}>
              Stays
            </Button>
            <Button
              variant="secondary"
              icon="calendar.badge.plus"
              style={styles.actionButton}
              onPress={() => addTripToCalendar(plan)}
              accessibilityLabel={`Add ${plan.title} to calendar`}>
              Add to calendar
            </Button>
            <Button
              variant="secondary"
              icon="list.bullet"
              style={styles.actionButton}
              onPress={() =>
                router.push({ pathname: '/travel/[id]', params: { id: plan.id } } as never)
              }
              accessibilityLabel={`Plan itinerary for ${plan.title}`}>
              Itinerary
            </Button>
            <Button
              variant="secondary"
              icon="cloud.sun.fill"
              style={styles.actionButton}
              onPress={() =>
                void WebBrowser.openBrowserAsync(
                  googleWeatherUrl(plan.destination, plan.startDate, plan.endDate),
                )
              }
              accessibilityLabel={`View Google weather for ${plan.destination} during ${plan.title}`}>
              Weather
            </Button>
            <Button
              variant="secondary"
              icon="dollarsign.circle"
              style={styles.actionButton}
              onPress={() =>
                void WebBrowser.openBrowserAsync(
                  googleCurrencyConversionUrl(plan.destination, dateLocale),
                )
              }
              accessibilityLabel={`Convert your home currency for ${plan.destination} with Google`}>
              Currency
            </Button>
          </View>
          <Button
            icon="person.2.fill"
            style={styles.inviteButton}
            onPress={() =>
              router.push({ pathname: '/travel/[id]', params: { id: plan.id } } as never)
            }
            accessibilityLabel={`View friends on ${plan.title}`}>
            Friends
          </Button>
          <View style={[styles.cardFooter, { borderTopColor: theme.separator }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Delete ${plan.title}`}
              hitSlop={8}
              onPress={() =>
                Alert.alert('Delete trip?', `Remove “${plan.title}”?`, [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: () => removePlan(plan.id) },
                ])
              }
              style={({ pressed }) => [
                styles.deleteAction,
                pressed ? styles.pressed : undefined,
              ]}>
              <Symbol name="trash" size="sm" color={theme.accentPrimary} />
              <AppText variant="caption" color="accent">Delete trip</AppText>
            </Pressable>
          </View>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.lg },
  header: { gap: spacing.md },
  headerTop: {
    minHeight: 44,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  heroTitle: { flexShrink: 1 },
  planeBadge: {
    width: 52,
    height: 52,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tripsHeader: {
    paddingTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  heading: { flex: 1, gap: spacing.xxs },
  formCard: { borderWidth: 1, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.lg },
  tripCard: { gap: spacing.lg },
  tripHeader: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  row: { flexDirection: 'row', gap: spacing.sm },
  dateEditor: { gap: spacing.md },
  dateLink: {
    minHeight: 64,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  dateIcon: { width: 28, alignItems: 'center' },
  dateCopy: { flex: 1, gap: spacing.xxs },
  pressed: { opacity: 0.6 },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  actionButton: { flexGrow: 1, flexBasis: '47%', paddingHorizontal: spacing.md },
  inviteButton: { width: '100%' },
  cardFooter: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing.md },
  deleteAction: {
    minHeight: 36,
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  flex: { flex: 1 },
});
