import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  AppText,
  appPrompt,
  Button,
  EmptyState,
  ErrorMessage,
  Screen,
  SectionHeader,
  Symbol,
} from '@/components/primitives';
import { spacing } from '@/design-system';
import { applyImportedFlightsToPlan } from '@/features/travel/apply-imported-flights';
import { applyImportedRentalToPlan } from '@/features/travel/apply-imported-rental';
import { travelCalendarDrafts } from '@/features/travel/calendar';
import { validateTravelDateRange } from '@/features/travel/date-range';
import {
  importFlightConfirmation,
  type FlightConfirmationImportSource,
} from '@/features/travel/flight-confirmation-import';
import { applyFlightExpenseFromImport } from '@/features/travel/flight-expense-from-import';
import {
  emptyFlightDetailsDraft,
  flightDetailsDraft,
  validateFlightDetails,
  type FlightDetailsDraft,
} from '@/features/travel/flight-details';
import { normalizeTravelPlan } from '@/features/travel/normalize';
import {
  importRentalConfirmation,
  type RentalConfirmationImportSource,
} from '@/features/travel/rental-confirmation-import';
import {
  emptyRentalDetailsDraft,
  rentalDetailsDraft,
  validateRentalDetails,
  type RentalDetailsDraft,
} from '@/features/travel/rental-details';
import { TravelDateRangeEditor } from '@/features/travel/travel-date-range-editor';
import { TravelItineraryForm } from '@/features/travel/travel-itinerary-form';
import { TravelItineraryItem } from '@/features/travel/travel-itinerary-item';
import { validateTravelPlanDetails } from '@/features/travel/travel-plan-details';
import { TravelPlanDetailsEditor } from '@/features/travel/travel-plan-details-editor';
import type { TravelItemKind, TravelPlan } from '@/features/travel/types';
import { travelOverlineStyle } from '@/features/travel/travel-chrome';
import { FeatureThemeProvider, useTheme } from '@/hooks/use-theme';
import { usePreferences } from '@/store/preferences';
import { newId, useSchedule } from '@/store/schedule';
import { useTravel } from '@/store/travel';
import { confirmDestructiveAction } from '@/utils/confirm-destructive';
import { formatDateKey } from '@/utils/date';
import { isHttpsUrl } from '@/utils/safe-url';

function validBookingUrl(value: string): boolean {
  return !value || isHttpsUrl(value);
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
  const [rentalDetails, setRentalDetails] = useState<RentalDetailsDraft>(
    emptyRentalDetailsDraft,
  );
  const [rentalDetailsError, setRentalDetailsError] = useState<string>();
  const [importedRentalFileName, setImportedRentalFileName] = useState<string>();
  const [editingRentalItemId, setEditingRentalItemId] = useState<string>();
  const [editedRentalDetails, setEditedRentalDetails] = useState<RentalDetailsDraft>(
    emptyRentalDetailsDraft,
  );
  const [editedRentalDetailsError, setEditedRentalDetailsError] = useState<string>();
  const [editedRentalFileName, setEditedRentalFileName] = useState<string>();
  const [importingRentalTarget, setImportingRentalTarget] = useState<string>();
  const [error, setError] = useState<string>();
  const [dateError, setDateError] = useState<string>();
  const [detailsError, setDetailsError] = useState<string>();
  const [minimizedItemIds, setMinimizedItemIds] = useState<Set<string>>(
    () => new Set(),
  );

  useFocusEffect(
    useCallback(() => {
      const current = useTravel.getState().plans.find((item) => item.id === planId);
      const normalized = normalizeTravelPlan(current);
      if (
        current &&
        normalized &&
        JSON.stringify(normalized) !== JSON.stringify(current)
      ) {
        const next = {
          ...normalized,
          updatedAt: new Date().toISOString(),
        };
        useTravel.getState().savePlan(next);
        const schedule = useSchedule.getState();
        if (
          schedule.activities.some(
            (activity) => activity.travelPlanId === next.id,
          )
        ) {
          schedule.replaceTravelActivities(
            next.id,
            travelCalendarDrafts(next),
          );
        }
      }
    }, [planId]),
  );

  if (!plan) {
    return (
      <Screen>
        <EmptyState
          icon="flight"
          title="Trip Not Found"
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
    setRentalDetailsError(undefined);
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
    const validatedRentalDetails =
      kind === 'rental'
        ? validateRentalDetails(rentalDetails)
        : ({ ok: true, value: undefined } as const);
    if (!validatedRentalDetails.ok) {
      return setRentalDetailsError(validatedRentalDetails.error);
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
          rental: validatedRentalDetails.value,
        },
      ],
      updatedAt: now,
    });
    setTitle('');
    setDetails('');
    setBookingUrl('');
    setFlightDetails(emptyFlightDetailsDraft());
    setImportedFlightFileName(undefined);
    setRentalDetails(emptyRentalDetailsDraft());
    setImportedRentalFileName(undefined);
  };

  const removeItem = (itemId: string) => {
    updatePlan({
      ...plan,
      itinerary: itinerary.filter((item) => item.id !== itemId),
      updatedAt: new Date().toISOString(),
    });
  };

  const confirmRemoveItem = (item: TravelPlan['itinerary'][number]) => {
    confirmDestructiveAction({
      title: 'Remove Itinerary Item?',
      message: item.title,
      actionLabel: 'Remove',
      onConfirm: () => removeItem(item.id),
    });
  };

  const beginEditingFlightDetails = (
    itemId: string,
    currentDetails: TravelPlan['itinerary'][number]['flight'],
  ) => {
    setEditingRentalItemId(undefined);
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

  const beginEditingRentalDetails = (
    itemId: string,
    currentDetails: TravelPlan['itinerary'][number]['rental'],
  ) => {
    setEditingFlightItemId(undefined);
    setEditingRentalItemId(itemId);
    setEditedRentalDetails(rentalDetailsDraft(currentDetails));
    setEditedRentalDetailsError(undefined);
    setEditedRentalFileName(undefined);
  };

  const saveEditedRentalDetails = (itemId: string) => {
    setEditedRentalDetailsError(undefined);
    const validation = validateRentalDetails(editedRentalDetails);
    if (!validation.ok) return setEditedRentalDetailsError(validation.error);
    updatePlan({
      ...plan,
      itinerary: itinerary.map((item) =>
        item.id === itemId
          ? {
              ...item,
              rental: validation.value,
            }
          : item,
      ),
      updatedAt: new Date().toISOString(),
    });
    setEditingRentalItemId(undefined);
  };

  const chooseConfirmationImport = (target: 'new' | string) => {
    appPrompt.alert(
      'Import Flight Confirmation',
      'Choose a document, saved email, or up to 6 screenshots from Photos. The total is added to trip expenses when found.',
      [
        {
          text: 'Photo Screenshots',
          onPress: () => void importConfirmation(target, 'screenshots'),
        },
        {
          text: 'Document or Email',
          onPress: () => void importConfirmation(target, 'document'),
        },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  };

  const chooseRentalConfirmationImport = (target: 'new' | string) => {
    appPrompt.alert(
      'Import Rental Confirmation',
      'Choose a document, saved email, or up to 6 screenshots from Photos. The total is added to trip expenses when found.',
      [
        {
          text: 'Photo Screenshots',
          onPress: () => void importRental(target, 'screenshots'),
        },
        {
          text: 'Document or Email',
          onPress: () => void importRental(target, 'document'),
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
      const expenseAlert =
        imported.amount !== undefined && imported.amount > 0
          ? ` Added ${imported.currency ?? plan.baseCurrency} ${imported.amount.toFixed(2)} under Expenses.`
          : '';
      if (imported.segments.length > 1 || target !== 'new') {
        updatePlan(
          applyImportedFlightsToPlan({
            plan,
            imported,
            createId: () => newId('trip-item'),
            targetItemId: target === 'new' ? undefined : target,
          }),
        );
        setEditingFlightItemId(undefined);
        if (target === 'new') {
          setTitle('');
          setDetails('');
          setBookingUrl('');
          setFlightDetails(emptyFlightDetailsDraft());
          setImportedFlightFileName(undefined);
        }
        if (imported.segments.length > 1) {
          if (expenseAlert) {
            appPrompt.alert(
              'Flights Added',
              `Saved ${imported.segments.length} flights to your itinerary.${expenseAlert}`,
            );
          }
          return;
        }
        if (target !== 'new') {
          if (expenseAlert) {
            appPrompt.alert(
              'Flight Updated',
              `Updated this flight from the confirmation.${expenseAlert}`,
            );
          }
          return;
        }
      }
      if (imported.amount !== undefined && imported.amount > 0 && target === 'new') {
        updatePlan(applyFlightExpenseFromImport(plan, imported));
        appPrompt.alert(
          'Flight Expense Added',
          `${imported.currency ?? plan.baseCurrency} ${imported.amount.toFixed(2)} was added under Expenses. Review the flight details before saving.`,
        );
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
        confirmationUris: imported.confirmationUris?.length
          ? imported.confirmationUris
          : current.confirmationUris,
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

  const importRental = async (
    target: 'new' | string,
    source: RentalConfirmationImportSource,
  ) => {
    setImportingRentalTarget(target);
    if (target === 'new') setRentalDetailsError(undefined);
    else setEditedRentalDetailsError(undefined);
    try {
      const imported = await importRentalConfirmation(
        {
          startDate: plan.startDate,
          endDate: plan.endDate,
        },
        source,
      );
      if (!imported) return;
      updatePlan(
        applyImportedRentalToPlan({
          plan,
          imported,
          createId: () => newId('trip-item'),
          targetItemId: target === 'new' ? undefined : target,
        }),
      );
      setEditingRentalItemId(undefined);
      setKind('rental');
      if (target === 'new') {
        setTitle('');
        setDetails('');
        setBookingUrl('');
        setRentalDetails(emptyRentalDetailsDraft());
        setImportedRentalFileName(undefined);
      }
      if (imported.amount !== undefined && imported.amount > 0) {
        appPrompt.alert(
          'Rental Added',
          `Saved the rental to your itinerary and added ${imported.currency ?? plan.baseCurrency} ${imported.amount.toFixed(2)} under Expenses.`,
        );
      }
    } catch (reason) {
      const message =
        reason instanceof Error
          ? reason.message
          : 'The confirmation document could not be read.';
      if (target === 'new') setRentalDetailsError(message);
      else setEditedRentalDetailsError(message);
    } finally {
      setImportingRentalTarget(undefined);
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

  return (
    <Screen contentStyle={styles.screen}>
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
            {plan.title.trim().toLowerCase() !== plan.destination.trim().toLowerCase() ? (
              <AppText variant="overline" color="accent" style={travelOverlineStyle}>
                {plan.destination}
              </AppText>
            ) : null}
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
            <Button onPress={saveEditedDates}>Save Dates</Button>
            <Button variant="ghost" onPress={() => setEditingDates(false)}>Cancel</Button>
          </View>
        </View>
      ) : null}

      <SectionHeader
        title="Itinerary"
        detail={`${sortedItinerary.length} planned`}
        titleStyle={travelOverlineStyle}
      />
      {sortedItinerary.length === 0 ? (
        <AppText variant="body" color="secondary">
        Add flights, stays, rentals, and things to do. Each item is also added to the onTrack calendar.
        </AppText>
      ) : null}
      {sortedItinerary.map((item) => (
        <TravelItineraryItem
          key={item.id}
          item={item}
          expanded={!minimizedItemIds.has(item.id)}
          dateDisplayFormat={dateDisplayFormat}
          editingFlightItemId={editingFlightItemId}
          editedFlightDetails={editedFlightDetails}
          editedFlightDetailsError={editedFlightDetailsError}
          editedFlightFileName={editedFlightFileName}
          importingFlight={importingFlightTarget === item.id}
          editingRentalItemId={editingRentalItemId}
          editedRentalDetails={editedRentalDetails}
          editedRentalDetailsError={editedRentalDetailsError}
          editedRentalFileName={editedRentalFileName}
          importingRental={importingRentalTarget === item.id}
          planStartDate={plan.startDate}
          planEndDate={plan.endDate}
          onToggle={() => toggleItineraryItem(item.id)}
          onEditedFlightDetailsChange={setEditedFlightDetails}
          onImportFlight={() => chooseConfirmationImport(item.id)}
          onSaveFlightDetails={() => saveEditedFlightDetails(item.id)}
          onCancelFlightEdit={() => setEditingFlightItemId(undefined)}
          onBeginFlightEdit={() => beginEditingFlightDetails(item.id, item.flight)}
          onEditedRentalDetailsChange={setEditedRentalDetails}
          onImportRental={() => chooseRentalConfirmationImport(item.id)}
          onSaveRentalDetails={() => saveEditedRentalDetails(item.id)}
          onCancelRentalEdit={() => setEditingRentalItemId(undefined)}
          onBeginRentalEdit={() => beginEditingRentalDetails(item.id, item.rental)}
          onRemove={() => confirmRemoveItem(item)}
        />
      ))}

      <TravelItineraryForm
        kind={kind}
        title={title}
        date={date}
        startMinutes={startMinutes}
        duration={duration}
        details={details}
        bookingUrl={bookingUrl}
        flightDetails={flightDetails}
        flightDetailsError={flightDetailsError}
        importedFlightFileName={importedFlightFileName}
        importingFlight={importingFlightTarget === 'new'}
        rentalDetails={rentalDetails}
        rentalDetailsError={rentalDetailsError}
        importedRentalFileName={importedRentalFileName}
        importingRental={importingRentalTarget === 'new'}
        error={error}
        planStartDate={plan.startDate}
        planEndDate={plan.endDate}
        onKindChange={setKind}
        onTitleChange={setTitle}
        onDateChange={setDate}
        onStartMinutesChange={setStartMinutes}
        onDurationChange={setDuration}
        onDetailsChange={setDetails}
        onBookingUrlChange={setBookingUrl}
        onFlightDetailsChange={setFlightDetails}
        onImportFlight={() => chooseConfirmationImport('new')}
        onRentalDetailsChange={setRentalDetails}
        onImportRental={() => chooseRentalConfirmationImport('new')}
        onAdd={addItem}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.sm },
  detailsLink: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  dateEditor: { gap: spacing.md },
  dateEditorActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  dateLink: { alignSelf: 'flex-start' },
  pressed: { opacity: 0.6 },
  flex: { flex: 1, gap: spacing.xxs },
});
