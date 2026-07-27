import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
} from 'react-native-reanimated';

import {
  AppText,
  BackButton,
  Button,
  Card,
  DateField,
  EmptyState,
  ErrorMessage,
  Input,
  Screen,
  SectionHeader,
  Symbol,
  TimeField,
} from '@/components/primitives';
import { ChipRow } from '@/components/shared';
import { spacing } from '@/design-system';
import { travelCalendarDrafts } from '@/features/travel/calendar';
import { googleCurrencyConversionUrl } from '@/features/travel/currency-conversion-link';
import { validateTravelDateRange } from '@/features/travel/date-range';
import {
  importFlightConfirmation,
  type FlightConfirmationImportSource,
} from '@/features/travel/flight-confirmation-import';
import {
  expandedTripRangeForFlights,
  mergeImportedFlights,
} from '@/features/travel/flight-confirmation-itinerary';
import {
  emptyFlightDetailsDraft,
  flightDetailsDraft,
  validateFlightDetails,
  type FlightDetailsDraft,
} from '@/features/travel/flight-details';
import { FlightDetailsEditor } from '@/features/travel/flight-details-editor';
import { FlightDetailsSummary } from '@/features/travel/flight-details-summary';
import { googleFlightStatusUrl } from '@/features/travel/flight-status-link';
import { normalizeTravelPlan } from '@/features/travel/normalize';
import {
  loadTravelInviteStatuses,
  resendTravelInvite,
  revokeTravelInvite,
  shareTravelPlan,
} from '@/features/travel/share';
import { TripPeople } from '@/features/travel/trip-people';
import { TravelDateRangeEditor } from '@/features/travel/travel-date-range-editor';
import { validateTravelPlanDetails } from '@/features/travel/travel-plan-details';
import { TravelPlanDetailsEditor } from '@/features/travel/travel-plan-details-editor';
import type {
  TravelItemKind,
  TravelParticipant,
  TravelPlan,
} from '@/features/travel/types';
import { googleWeatherUrl } from '@/features/travel/weather';
import { FeatureThemeProvider, useTheme } from '@/hooks/use-theme';
import { usePreferences } from '@/store/preferences';
import { newId, useSchedule } from '@/store/schedule';
import { useTravel } from '@/store/travel';
import { formatDateKey, formatDuration } from '@/utils/date';

const ITEM_KINDS: { value: TravelItemKind; label: string }[] = [
  { value: 'flight', label: 'Flight' },
  { value: 'stay', label: 'Stay' },
  { value: 'activity', label: 'Activity' },
];

function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 || 12;
  return `${displayHour}:${minute.toString().padStart(2, '0')} ${suffix}`;
}

function validBookingUrl(value: string): boolean {
  if (!value) return true;
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

export function TravelPlanDetail({ planId }: { planId: string }) {
  return (
    <FeatureThemeProvider feature="travel">
      <TravelPlanDetailContent planId={planId} />
    </FeatureThemeProvider>
  );
}

function TravelPlanDetailContent({ planId }: { planId: string }) {
  const theme = useTheme();
  const router = useRouter();
  const plan = useTravel((state) => state.plans.find((item) => item.id === planId));
  const savePlan = useTravel((state) => state.savePlan);
  const activities = useSchedule((state) => state.activities);
  const replaceTravelActivities = useSchedule((state) => state.replaceTravelActivities);
  const dateLocale = usePreferences((state) => state.dateLocale);
  const dateDisplayFormat = usePreferences((state) => state.dateDisplayFormat);
  const [editingDates, setEditingDates] = useState(false);
  const [editStartDate, setEditStartDate] = useState(plan?.startDate ?? '');
  const [editEndDate, setEditEndDate] = useState(plan?.endDate ?? '');
  const [editingDetails, setEditingDetails] = useState(false);
  const [editTitle, setEditTitle] = useState(plan?.title ?? '');
  const [editDestination, setEditDestination] = useState(plan?.destination ?? '');
  const [editNotes, setEditNotes] = useState(plan?.notes ?? '');
  const [kind, setKind] = useState<TravelItemKind>('activity');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(plan?.startDate ?? '');
  const [startMinutes, setStartMinutes] = useState(9 * 60);
  const [duration, setDuration] = useState('60');
  const [details, setDetails] = useState('');
  const [bookingUrl, setBookingUrl] = useState('');
  const [flightDetails, setFlightDetails] = useState<FlightDetailsDraft>(
    emptyFlightDetailsDraft,
  );
  const [flightDetailsError, setFlightDetailsError] = useState<string>();
  const [importedFlightFileName, setImportedFlightFileName] = useState<string>();
  const [editingFlightItemId, setEditingFlightItemId] = useState<string>();
  const [editedFlightDetails, setEditedFlightDetails] = useState<FlightDetailsDraft>(
    emptyFlightDetailsDraft,
  );
  const [editedFlightDetailsError, setEditedFlightDetailsError] = useState<string>();
  const [editedFlightFileName, setEditedFlightFileName] = useState<string>();
  const [importingFlightTarget, setImportingFlightTarget] = useState<string>();
  const [error, setError] = useState<string>();
  const [dateError, setDateError] = useState<string>();
  const [detailsError, setDetailsError] = useState<string>();
  const [sharingInvite, setSharingInvite] = useState(false);
  const [editingInvite, setEditingInvite] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteError, setInviteError] = useState<string>();
  const [managingParticipantId, setManagingParticipantId] = useState<string>();
  const [minimizedItemIds, setMinimizedItemIds] = useState<Set<string>>(
    () => new Set(),
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;
      let current = useTravel.getState().plans.find((item) => item.id === planId);
      const normalized = normalizeTravelPlan(current);
      if (
        current &&
        normalized &&
        JSON.stringify(normalized) !== JSON.stringify(current)
      ) {
        current = {
          ...normalized,
          updatedAt: new Date().toISOString(),
        };
        useTravel.getState().savePlan(current);
        const schedule = useSchedule.getState();
        if (
          schedule.activities.some(
            (activity) => activity.travelPlanId === current?.id,
          )
        ) {
          schedule.replaceTravelActivities(
            current.id,
            travelCalendarDrafts(current),
          );
        }
      }
      const inviteCodes = current?.participants.map((person) => person.inviteCode) ?? [];
      if (inviteCodes.length === 0) return () => {
        active = false;
      };

      void loadTravelInviteStatuses(inviteCodes)
        .then((statuses) => {
          if (!active || Object.keys(statuses).length === 0) return;
          const latest = useTravel.getState().plans.find((item) => item.id === planId);
          if (!latest) return;
          let changed = false;
          const participants = latest.participants.map((person) => {
            const acceptedAt = statuses[person.inviteCode];
            if (!acceptedAt || person.acceptedAt === acceptedAt) return person;
            changed = true;
            return { ...person, acceptedAt };
          });
          if (changed) {
            useTravel.getState().savePlan({
              ...latest,
              participants,
              updatedAt: new Date().toISOString(),
            });
          }
        })
        .catch(() => undefined);

      return () => {
        active = false;
      };
    }, [planId]),
  );

  if (!plan) {
    return (
      <Screen>
        <BackButton />
        <EmptyState
          icon="flight"
          title="Trip not found"
          message="This trip may have been removed on another device."
        />
      </Screen>
    );
  }

  // Store migration handles legacy records; this guard also protects the screen
  // while a malformed cloud update is being normalized.
  const itinerary = Array.isArray(plan.itinerary) ? plan.itinerary : [];

  const updatePlan = (next: TravelPlan) => {
    savePlan(next);
    replaceTravelActivities(next.id, travelCalendarDrafts(next));
  };

  const addItem = () => {
    setError(undefined);
    setFlightDetailsError(undefined);
    const durationMinutes = Number(duration);
    if (!title.trim()) return setError('Add a name for this itinerary item.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < plan.startDate || date > plan.endDate) {
      return setError(`Choose a date between ${plan.startDate} and ${plan.endDate}.`);
    }
    if (startMinutes < 0 || startMinutes >= 24 * 60) {
      return setError('Choose a valid start time.');
    }
    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0 || durationMinutes > 1440) {
      return setError('Duration must be between 1 and 1,440 minutes.');
    }
    if (!validBookingUrl(bookingUrl.trim())) {
      return setError('Booking links must use a complete HTTPS address.');
    }
    const validatedFlightDetails =
      kind === 'flight'
        ? validateFlightDetails(flightDetails)
        : ({ ok: true, value: undefined } as const);
    if (!validatedFlightDetails.ok) {
      return setFlightDetailsError(validatedFlightDetails.error);
    }
    const now = new Date().toISOString();
    updatePlan({
      ...plan,
      itinerary: [
        ...itinerary,
        {
          id: newId('trip-item'),
          kind,
          title: title.trim(),
          date,
          startMinutes,
          durationMinutes: Math.round(durationMinutes),
          details: details.trim() || undefined,
          bookingUrl: bookingUrl.trim() || undefined,
          flight: validatedFlightDetails.value,
        },
      ],
      updatedAt: now,
    });
    setTitle('');
    setDetails('');
    setBookingUrl('');
    setFlightDetails(emptyFlightDetailsDraft());
    setImportedFlightFileName(undefined);
  };

  const removeItem = (itemId: string) => {
    updatePlan({
      ...plan,
      itinerary: itinerary.filter((item) => item.id !== itemId),
      updatedAt: new Date().toISOString(),
    });
  };

  const confirmRemoveItem = (item: TravelPlan['itinerary'][number]) => {
    Alert.alert('Remove itinerary item?', item.title, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeItem(item.id) },
    ]);
  };

  const beginEditingFlightDetails = (
    itemId: string,
    currentDetails: TravelPlan['itinerary'][number]['flight'],
  ) => {
    setEditingFlightItemId(itemId);
    setEditedFlightDetails(flightDetailsDraft(currentDetails));
    setEditedFlightDetailsError(undefined);
    setEditedFlightFileName(undefined);
  };

  const saveEditedFlightDetails = (itemId: string) => {
    setEditedFlightDetailsError(undefined);
    const validation = validateFlightDetails(editedFlightDetails);
    if (!validation.ok) return setEditedFlightDetailsError(validation.error);
    updatePlan({
      ...plan,
      itinerary: itinerary.map((item) =>
        item.id === itemId
          ? {
              ...item,
              flight: validation.value,
            }
          : item,
      ),
      updatedAt: new Date().toISOString(),
    });
    setEditingFlightItemId(undefined);
  };

  const chooseConfirmationImport = (target: 'new' | string) => {
    Alert.alert(
      'Import flight confirmation',
      'Choose a document, saved email, or up to 6 screenshots from Photos.',
      [
        {
          text: 'Photo screenshots',
          onPress: () => void importConfirmation(target, 'screenshots'),
        },
        {
          text: 'Document or email',
          onPress: () => void importConfirmation(target, 'document'),
        },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  };

  const importConfirmation = async (
    target: 'new' | string,
    source: FlightConfirmationImportSource,
  ) => {
    setImportingFlightTarget(target);
    if (target === 'new') setFlightDetailsError(undefined);
    else setEditedFlightDetailsError(undefined);
    try {
      const imported = await importFlightConfirmation(
        {
          startDate: plan.startDate,
          endDate: plan.endDate,
        },
        source,
      );
      if (!imported) return;
      if (imported.segments.length > 1) {
        const importedRange = expandedTripRangeForFlights(plan, imported.segments);
        updatePlan({
          ...plan,
          ...importedRange,
          itinerary: mergeImportedFlights({
            itinerary,
            segments: imported.segments,
            tripRange: plan,
            createId: () => newId('trip-item'),
            targetItemId: target === 'new' ? undefined : target,
          }),
          updatedAt: new Date().toISOString(),
        });
        setEditingFlightItemId(undefined);
        if (target === 'new') {
          setTitle('');
          setDetails('');
          setBookingUrl('');
          setFlightDetails(emptyFlightDetailsDraft());
          setImportedFlightFileName(undefined);
        }
        return;
      }
      const mergeImportedDetails = (current: FlightDetailsDraft): FlightDetailsDraft => ({
        airline: imported.flight.airline || current.airline,
        flightNumber: imported.flight.flightNumber || current.flightNumber,
        confirmationCode:
          imported.flight.confirmationCode || current.confirmationCode,
        departureAirport:
          imported.flight.departureAirport || current.departureAirport,
        arrivalAirport: imported.flight.arrivalAirport || current.arrivalAirport,
        seat: imported.flight.seat || current.seat,
      });
      if (target === 'new') {
        setFlightDetails((current) => mergeImportedDetails(current));
        setImportedFlightFileName(imported.fileName);
        if (imported.title) setTitle(imported.title);
        if (imported.date) setDate(imported.date);
        if (imported.startMinutes !== undefined) {
          setStartMinutes(imported.startMinutes);
        }
        if (imported.durationMinutes !== undefined) {
          setDuration(String(imported.durationMinutes));
        }
      } else {
        setEditedFlightDetails((current) => mergeImportedDetails(current));
        setEditedFlightFileName(imported.fileName);
      }
    } catch (reason) {
      const message =
        reason instanceof Error
          ? reason.message
          : 'The confirmation document could not be read.';
      if (target === 'new') setFlightDetailsError(message);
      else setEditedFlightDetailsError(message);
    } finally {
      setImportingFlightTarget(undefined);
    }
  };

  const beginEditingDates = () => {
    setEditingDetails(false);
    setEditStartDate(plan.startDate);
    setEditEndDate(plan.endDate);
    setDateError(undefined);
    setEditingDates(true);
  };

  const saveEditedDates = () => {
    setDateError(undefined);
    const validation = validateTravelDateRange(editStartDate, editEndDate, itinerary);
    if (validation.error) return setDateError(validation.error);
    const next = {
      ...plan,
      startDate: editStartDate,
      endDate: editEndDate,
      updatedAt: new Date().toISOString(),
    };
    const isOnCalendar = activities.some((activity) => activity.travelPlanId === plan.id);
    savePlan(next);
    if (isOnCalendar) replaceTravelActivities(next.id, travelCalendarDrafts(next));
    setEditingDates(false);
  };

  const beginEditingDetails = () => {
    setEditingDates(false);
    setEditTitle(plan.title);
    setEditDestination(plan.destination);
    setEditNotes(plan.notes ?? '');
    setDetailsError(undefined);
    setEditingDetails(true);
  };

  const saveEditedDetails = () => {
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
    setEditingDetails(false);
  };

  const sortedItinerary = [...itinerary].sort(
    (left, right) =>
      left.date.localeCompare(right.date) || left.startMinutes - right.startMinutes,
  );

  const toggleItineraryItem = (itemId: string) => {
    setMinimizedItemIds((current) => {
      const next = new Set(current);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const inviteFriend = async () => {
    setInviteError(undefined);
    const name = inviteName.trim();
    const email = inviteEmail.trim().toLowerCase();
    if (!name) return setInviteError('Add your friend’s name.');
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return setInviteError('Enter a complete email address.');
    }
    setSharingInvite(true);
    try {
      const code = await shareTravelPlan(plan, { name, email: email || undefined });
      if (!code) return;
      const now = new Date().toISOString();
      updatePlan({
        ...plan,
        participants: [
          ...plan.participants,
          {
            id: newId('trip-person'),
            name,
            email: email || undefined,
            inviteCode: code,
            invitedAt: now,
          },
        ],
        updatedAt: now,
      });
      setInviteName('');
      setInviteEmail('');
      setEditingInvite(false);
    } catch (shareError) {
      setInviteError(
        shareError instanceof Error
          ? shareError.message
          : 'The invitation could not be created. Please try again.',
      );
    } finally {
      setSharingInvite(false);
    }
  };

  const resendInvite = async (participant: TravelParticipant) => {
    setManagingParticipantId(participant.id);
    try {
      await resendTravelInvite(
        plan,
        { name: participant.name, email: participant.email },
        participant.inviteCode,
      );
    } catch (reason) {
      Alert.alert(
        'Couldn’t resend invitation',
        reason instanceof Error
          ? reason.message
          : 'The invitation could not be shared. Please try again.',
      );
    } finally {
      setManagingParticipantId(undefined);
    }
  };

  const removeParticipant = async (participant: TravelParticipant) => {
    setManagingParticipantId(participant.id);
    try {
      await revokeTravelInvite(participant.inviteCode);
      updatePlan({
        ...plan,
        participants: plan.participants.filter((person) => person.id !== participant.id),
        updatedAt: new Date().toISOString(),
      });
    } catch (reason) {
      Alert.alert(
        participant.acceptedAt ? 'Couldn’t remove friend' : 'Couldn’t remove invitation',
        reason instanceof Error
          ? reason.message
          : 'This person could not be removed. Please try again.',
      );
    } finally {
      setManagingParticipantId(undefined);
    }
  };

  const confirmRemoveParticipant = (participant: TravelParticipant) => {
    const accepted = Boolean(participant.acceptedAt);
    Alert.alert(
      accepted ? 'Remove friend?' : 'Remove invitation?',
      accepted
        ? `${participant.name} will be removed from this trip and their invite link will stop working.`
        : `${participant.name}’s invite link will stop working.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: accepted ? 'Remove friend' : 'Remove invite',
          style: 'destructive',
          onPress: () => void removeParticipant(participant),
        },
      ],
    );
  };

  return (
    <Screen contentStyle={styles.screen}>
      <BackButton accessibilityLabel="Back to travel" />
      {editingDetails ? (
        <TravelPlanDetailsEditor
          title={editTitle}
          destination={editDestination}
          notes={editNotes}
          error={detailsError}
          onTitleChange={setEditTitle}
          onDestinationChange={setEditDestination}
          onNotesChange={setEditNotes}
          onSave={saveEditedDetails}
          onCancel={() => setEditingDetails(false)}
        />
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Edit details for ${plan.title}`}
          hitSlop={8}
          onPress={beginEditingDetails}
          style={({ pressed }) => [
            styles.detailsLink,
            pressed ? styles.pressed : undefined,
          ]}>
          <View style={styles.flex}>
            <AppText variant="overline" color="accent">{plan.destination}</AppText>
            <AppText variant="title">{plan.title}</AppText>
          </View>
          <Symbol name="pencil" size="sm" color={theme.textTertiary} />
        </Pressable>
      )}
      {plan.notes && !editingDetails ? (
        <AppText variant="body" color="secondary">{plan.notes}</AppText>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Edit dates for ${plan.title}`}
        hitSlop={8}
        onPress={beginEditingDates}
        style={({ pressed }) => [styles.dateLink, pressed ? styles.pressed : undefined]}>
        <AppText variant="body" color="accent">
          {formatDateKey(plan.startDate, dateDisplayFormat)} → {formatDateKey(plan.endDate, dateDisplayFormat)}
        </AppText>
      </Pressable>
      {editingDates ? (
        <View style={styles.dateEditor}>
          <TravelDateRangeEditor
            startDate={editStartDate}
            endDate={editEndDate}
            onStartDateChange={setEditStartDate}
            onEndDateChange={setEditEndDate}
          />
          {dateError ? <ErrorMessage message={dateError} /> : null}
          <View style={styles.dateEditorActions}>
            <Button onPress={saveEditedDates}>Save dates</Button>
            <Button variant="ghost" onPress={() => setEditingDates(false)}>Cancel</Button>
          </View>
        </View>
      ) : null}

      <View style={styles.actions}>
        <Button
          variant="secondary"
          icon="chat"
          onPress={() =>
            router.push({ pathname: '/travel/[id]/chat', params: { id: plan.id } } as never)
          }>
          Group chat
        </Button>
        <Button
          variant="secondary"
          onPress={() =>
            router.push({ pathname: '/travel/[id]/flights', params: { id: plan.id } } as never)
          }>
          Find flights
        </Button>
        <Button
          variant="secondary"
          onPress={() =>
            router.push({ pathname: '/travel/[id]/stays', params: { id: plan.id } } as never)
          }>
          Find stays
        </Button>
        <Button
          variant="secondary"
          icon="weather"
          onPress={() =>
            void WebBrowser.openBrowserAsync(
              googleWeatherUrl(plan.destination, plan.startDate, plan.endDate),
            )
          }>
          Weather
        </Button>
        <Button
          variant="secondary"
          icon="currency"
          onPress={() =>
            void WebBrowser.openBrowserAsync(
              googleCurrencyConversionUrl(plan.destination, dateLocale),
            )
          }
          accessibilityLabel={`Convert your home currency for ${plan.destination} with Google`}>
          Currency
        </Button>
      </View>

      <TripPeople
        participants={plan.participants}
        editing={editingInvite}
        name={inviteName}
        email={inviteEmail}
        error={inviteError}
        inviting={sharingInvite}
        onNameChange={setInviteName}
        onEmailChange={setInviteEmail}
        onBeginInvite={() => {
          setInviteError(undefined);
          setEditingInvite(true);
        }}
        onCancelInvite={() => {
          setInviteError(undefined);
          setEditingInvite(false);
        }}
        onInvite={() => void inviteFriend()}
        managingParticipantId={managingParticipantId}
        onResend={(participant) => void resendInvite(participant)}
        onRemove={confirmRemoveParticipant}
      />

      <SectionHeader title="Itinerary" detail={`${sortedItinerary.length} planned`} />
      {sortedItinerary.length === 0 ? (
        <AppText variant="body" color="secondary">
          Add flights, stays, and things to do. Each item is also added to the onTrack calendar.
        </AppText>
      ) : null}
      {sortedItinerary.map((item) => {
        const isExpanded = !minimizedItemIds.has(item.id);
        return (
          <Animated.View
            key={item.id}
            layout={LinearTransition.duration(180)}>
            <Card variant="sunken" style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <View style={styles.flex}>
                  <AppText variant="subheading">{item.title}</AppText>
                  <AppText variant="caption" color="accent">
                    {formatDateKey(item.date, dateDisplayFormat)} ·{' '}
                    {formatTime(item.startMinutes)} ·{' '}
                    {item.kind === 'flight'
                      ? formatDuration(item.durationMinutes)
                      : `${item.durationMinutes} min`}
                  </AppText>
                </View>
                <View style={styles.itemHeaderActions}>
                  <AppText variant="overline" color="tertiary">
                    {item.kind}
                  </AppText>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${isExpanded ? 'Minimize' : 'Maximize'} ${item.title}`}
                    accessibilityHint={
                      isExpanded
                        ? 'Hides the event details and actions'
                        : 'Shows the event details and actions'
                    }
                    accessibilityState={{ expanded: isExpanded }}
                    hitSlop={8}
                    onPress={() => toggleItineraryItem(item.id)}
                    style={({ pressed }) => [
                      styles.itemSizeAction,
                      pressed ? styles.pressed : undefined,
                    ]}>
                    <Symbol
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size="sm"
                      color={theme.textTertiary}
                    />
                  </Pressable>
                </View>
              </View>
              {isExpanded ? (
                <Animated.View
                  entering={FadeIn.duration(150)}
                  exiting={FadeOut.duration(120)}
                  style={styles.itemDetails}>
                  {item.details ? (
                    <AppText variant="body" color="secondary">
                      {item.details}
                    </AppText>
                  ) : null}
                  {item.kind === 'flight' &&
                  item.flight &&
                  editingFlightItemId !== item.id ? (
                    <FlightDetailsSummary details={item.flight} />
                  ) : null}
                  {item.kind === 'flight' && editingFlightItemId === item.id ? (
                    <View style={styles.flightEditor}>
                      <FlightDetailsEditor
                        value={editedFlightDetails}
                        onChange={setEditedFlightDetails}
                        error={editedFlightDetailsError}
                        importedFileName={editedFlightFileName}
                        importing={importingFlightTarget === item.id}
                        onImport={() => chooseConfirmationImport(item.id)}
                      />
                      <View style={styles.flightEditorActions}>
                        <Button
                          size="lg"
                          icon="check"
                          style={styles.fullWidthAction}
                          onPress={() => saveEditedFlightDetails(item.id)}>
                          Save flight details
                        </Button>
                        <View
                          style={[
                            styles.flightEditorSecondaryActions,
                            { borderTopColor: theme.separator },
                          ]}>
                          <Button
                            variant="ghost"
                            style={styles.flex}
                            onPress={() => setEditingFlightItemId(undefined)}>
                            Cancel
                          </Button>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Remove ${item.title}`}
                            hitSlop={8}
                            onPress={() => confirmRemoveItem(item)}
                            style={({ pressed }) => [
                              styles.removeFlightAction,
                              pressed ? styles.pressed : undefined,
                            ]}>
                            <Symbol name="trash" size="sm" color={theme.danger} />
                            <AppText variant="callout" color="danger">
                              Remove
                            </AppText>
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  ) : null}
                  {editingFlightItemId !== item.id ? (
                    <View style={styles.itineraryActions}>
                      {item.kind === 'flight' &&
                      googleFlightStatusUrl(item.flight, item.date) ? (
                        <Button
                          variant="secondary"
                          icon="clock"
                          style={styles.itineraryAction}
                          accessibilityLabel={`Check live status for ${item.flight?.flightNumber}`}
                          onPress={() =>
                            void Linking.openURL(
                              googleFlightStatusUrl(item.flight, item.date)!,
                            )
                          }>
                          Check live status
                        </Button>
                      ) : null}
                      {item.kind === 'flight' ? (
                        <Button
                          variant="secondary"
                          icon="flight"
                          style={styles.itineraryAction}
                          onPress={() =>
                            beginEditingFlightDetails(item.id, item.flight)
                          }>
                          {item.flight ? 'Edit flight' : 'Add flight details'}
                        </Button>
                      ) : null}
                      {item.bookingUrl && validBookingUrl(item.bookingUrl) ? (
                        <Button
                          variant="secondary"
                          style={styles.itineraryAction}
                          onPress={() =>
                            void WebBrowser.openBrowserAsync(item.bookingUrl!)
                          }>
                          Booking
                        </Button>
                      ) : null}
                      {item.kind !== 'flight' ? (
                        <Button
                          variant="ghost"
                          style={styles.itineraryAction}
                          onPress={() => confirmRemoveItem(item)}>
                          Remove
                        </Button>
                      ) : null}
                    </View>
                  ) : null}
                </Animated.View>
              ) : null}
            </Card>
          </Animated.View>
        );
      })}

      <SectionHeader title="Add to the plan" />
      <ChipRow options={ITEM_KINDS} selected={kind} onSelect={setKind} />
      <Input
        label="Name"
        value={title}
        onChangeText={setTitle}
        placeholder={kind === 'flight' ? 'Flight to Lisbon' : kind === 'stay' ? 'Hotel check-in' : 'Dinner in Alfama'}
      />
      <View style={styles.twoColumns}>
        <View style={styles.flex}>
          <DateField
            label="Date"
            value={date}
            minimumDate={plan.startDate}
            maximumDate={plan.endDate}
            onChange={setDate}
          />
        </View>
        <View style={styles.flex}>
          <TimeField label="Time" value={startMinutes} onChange={setStartMinutes} />
        </View>
      </View>
      <Input
        label="Duration (minutes)"
        value={duration}
        onChangeText={setDuration}
        keyboardType="number-pad"
      />
      {kind === 'flight' ? (
        <FlightDetailsEditor
          value={flightDetails}
          onChange={setFlightDetails}
          error={flightDetailsError}
          importedFileName={importedFlightFileName}
          importing={importingFlightTarget === 'new'}
          onImport={() => chooseConfirmationImport('new')}
        />
      ) : null}
      <Input
        label="Details"
        value={details}
        onChangeText={setDetails}
        placeholder={
          kind === 'flight'
            ? 'Terminal, baggage, or check-in notes…'
            : 'Confirmation number, meeting point, ideas…'
        }
        multiline
      />
      <Input
        label="Booking link (optional)"
        value={bookingUrl}
        onChangeText={setBookingUrl}
        placeholder="https://…"
        keyboardType="url"
        autoCapitalize="none"
        autoCorrect={false}
      />
      {error ? <ErrorMessage message={error} selectable /> : null}
      <Button onPress={addItem}>Add itinerary item</Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.sm },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  itineraryActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  itineraryAction: {
    flexBasis: 0,
    flexGrow: 1,
    minWidth: '45%',
    paddingHorizontal: spacing.sm,
  },
  detailsLink: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  itemCard: { gap: spacing.md },
  itemDetails: { gap: spacing.md },
  itemHeaderActions: { alignItems: 'flex-end', gap: spacing.xs },
  itemSizeAction: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flightEditor: { gap: spacing.md },
  flightEditorActions: { gap: spacing.sm },
  fullWidthAction: { width: '100%' },
  flightEditorSecondaryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.sm,
  },
  removeFlightAction: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  itemHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  dateEditor: { gap: spacing.md },
  dateEditorActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  dateLink: { alignSelf: 'flex-start' },
  pressed: { opacity: 0.6 },
  twoColumns: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1, gap: spacing.xxs },
});
