import * as Linking from 'expo-linking';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { EmptyState, Screen } from '@/components/primitives';
import { spacing } from '@/design-system';
import { useAuthSession } from '@/features/auth/auth-provider';
import { applyImportedFlightsToPlan } from '@/features/travel/apply-imported-flights';
import {
    isConnectingSegmentGroup,
    splitRoundTripDirections,
} from '@/features/travel/flight-confirmation-itinerary';
import {
    resolveStayBookingOpen,
    type StayBookingOpen,
} from '@/features/travel/booking-open';
import { BookingOpenSheet } from '@/features/travel/booking-open-sheet';
import { travelCalendarDrafts } from '@/features/travel/calendar';
import {
    attachOrphanedFlightConfirmationUris,
    mergeDuplicateItemConfirmationUris,
} from '@/features/travel/confirmation-uri-attach';
import {
    emptyExpenseForm,
    expenseFormFromExpense,
    type ExpenseFormState,
} from '@/features/travel/expenses/expense-form';
import { TravelExpensesSheet } from '@/features/travel/expenses/travel-expenses-sheet';
import { mergeFlightConfirmationDraftDetails } from '@/features/travel/flight-confirmation-draft';
import type { ImportedFlightConfirmation } from '@/features/travel/flight-confirmation-import';
import { parseFlightConfirmation } from '@/features/travel/flight-confirmation-parser';
import {
    flightConfirmationSchedule,
    flightDirectionSchedule,
} from '@/features/travel/flight-confirmation-schedule';
import {
    emptyFlightDetailsDraft,
    validateFlightDetails,
    type FlightDetailsDraft,
} from '@/features/travel/flight-details';
import { CHASE_ROUNDTRIP_CONFIRMATION } from '@/features/travel/fixtures/chase-roundtrip-confirmation';
import {
    emptyFlightLegScheduleDraft,
    flightLegScheduleFromImported,
    segmentsFromRoundTripForm,
    returnFlightTitle as suggestReturnFlightTitle,
    suggestReturnDraftFromOutbound,
    type FlightTripType,
} from '@/features/travel/flight-roundtrip-draft';
import {
    applyFlightTerminalPatches,
    fetchFlightTerminalPatches,
} from '@/features/travel/flight-terminal-enrichment';
import { isDuplicateItineraryItem, normalizeTravelPlan } from '@/features/travel/normalize';
import {
    emptyRentalDetailsDraft,
    validateRentalDetails,
    type RentalDetailsDraft,
} from '@/features/travel/rental-details';
import {
    emptyStayDetailsDraft,
    validateStayDetails,
    type StayDetailsDraft,
} from '@/features/travel/stay-details';
import {
    emptyTransportDetailsDraft,
    validateTransportDetails,
    type TransportDetailsDraft,
} from '@/features/travel/transport-details';
import { TravelAddPhotosModal } from '@/features/travel/travel-add-photos-modal';
import { TravelCollapsibleSection } from '@/features/travel/travel-collapsible-section';
import {
    TravelImportResultModal,
    type TravelImportResult,
} from '@/features/travel/travel-import-result-modal';
import { TravelItineraryAddSheet } from '@/features/travel/travel-itinerary-add-sheet';
import { ITEM_KINDS } from '@/features/travel/travel-itinerary-form';
import { TravelItineraryTimeline } from '@/features/travel/travel-itinerary-timeline';
import { persistTravelMomentPhotos } from '@/features/travel/travel-moment-media';
import { TravelPlanHero } from '@/features/travel/travel-plan-hero';
import type { TravelRangeScheduleDraft } from '@/features/travel/travel-range-schedule';
import { validateTravelRangeSchedule } from '@/features/travel/travel-range-schedule';
import { TravelRemoveConfirmModal } from '@/features/travel/travel-remove-confirm-modal';
import { useTravelPageStyle } from '@/features/travel/travel-surface';
import { TravelTimelineAddModal } from '@/features/travel/travel-timeline-add-modal';
import { expandTimelineEntries } from '@/features/travel/travel-timeline-entries';
import { TravelTransportSections } from '@/features/travel/travel-transport-sections';
import { TravelTripDatesSheet } from '@/features/travel/travel-trip-dates-sheet';
import type { TravelItemKind, TravelItineraryItem, TravelPlan } from '@/features/travel/types';
import { upgradeLegacyConnectingFlights } from '@/features/travel/upgrade-legacy-connecting-flights';
import { useTravelPlanConfirmationImports } from '@/features/travel/use-travel-plan-confirmation-imports';
import { useTravelPlanItemDetailsEdit } from '@/features/travel/use-travel-plan-item-details-edit';
import { useTravelPlanItemMedia } from '@/features/travel/use-travel-plan-item-media';
import { useTheme } from '@/hooks/use-theme';
import { usePreferences } from '@/store/preferences';
import { newId, useSchedule } from '@/store/schedule';
import { useTravel } from '@/store/travel';
import { addDays, formatDateKey, minutesBetween } from '@/utils/date';
import { pickCameraImage, pickLibraryImages } from '@/utils/pick-image';
import { isHttpsUrl } from '@/utils/safe-url';

type DetailSectionKey = 'transport' | 'flights' | 'ground' | 'stays' | 'rentals' | 'timeline';

function sectionDefaultExpanded(
  key: DetailSectionKey,
  counts: { flights: number; ground: number; stays: number; rentals: number },
): boolean {
  switch (key) {
    case 'transport':
      return counts.flights + counts.ground + counts.stays + counts.rentals > 0;
    case 'flights':
      return counts.flights > 0;
    case 'ground':
      return counts.ground > 0;
    case 'stays':
      return counts.stays > 0;
    case 'rentals':
      return counts.rentals > 0;
    case 'timeline':
      return true;
  }
}

function validBookingUrl(value: string): boolean {
  return !value || isHttpsUrl(value);
}

type TravelPlanDetailProps = {
  planId: string;
  initialAddKind?: TravelItemKind;
  /** DEV: open the timeline kind chooser after navigating to a trip. */
  initialOpenAddPicker?: boolean;
  /** DEV: open the first trivago stay booking sheet after mount. */
  autoOpenStayBooking?: boolean;
  /** DEV: reservation email override when account email is unavailable. */
  autoOpenReservationEmail?: string;
  /** DEV: open the Expenses sheet on mount for simulator QA. */
  initialOpenExpenses?: boolean;
  /** DEV: open an import-result sheet on mount for simulator QA. */
  initialImportResult?: TravelImportResult;
  /** DEV: prefill Add Flight from a known confirmation fixture (no document picker). */
  initialFlightImportFixture?: 'roundtrip';
};

export function TravelPlanDetail(props: TravelPlanDetailProps) {
  const theme = useTheme();
  const travelStyle = useTravelPageStyle(theme);
  const plan = useTravel((state) => state.plans.find((item) => item.id === props.planId));
  if (!plan) {
    return (
      <Screen style={travelStyle}>
        <EmptyState
          icon="flight"
          title="Trip Not Found"
          message="This trip may have been removed on another device."
        />
      </Screen>
    );
  }
  return <TravelPlanDetailLoaded {...props} plan={plan} />;
}

function TravelPlanDetailLoaded({
  planId,
  plan,
  initialAddKind,
  initialOpenAddPicker = false,
  autoOpenStayBooking = false,
  autoOpenReservationEmail,
  initialOpenExpenses = false,
  initialImportResult,
  initialFlightImportFixture,
}: TravelPlanDetailProps & { plan: TravelPlan }) {
  const theme = useTheme();
  const travelStyle = useTravelPageStyle(theme);
  const savePlan = useTravel((state) => state.savePlan);
  const replaceTravelActivities = useSchedule((state) => state.replaceTravelActivities);
  const dateDisplayFormat = usePreferences((state) => state.dateDisplayFormat);
  const { user } = useAuthSession();
  const accountEmail = user?.email?.trim().toLowerCase() || undefined;
  const startsWithEmptySchedule =
    initialAddKind === 'stay' || initialAddKind === 'flight';
  const defaultStayDetails = (overrides?: Parameters<typeof emptyStayDetailsDraft>[0]) =>
    emptyStayDetailsDraft({
      reservationEmail: accountEmail ?? '',
      ...overrides,
    });
  const [kind, setKind] = useState<TravelItemKind>(initialAddKind ?? 'activity');
  const [devBookingOpen, setDevBookingOpen] = useState<Extract<
    StayBookingOpen,
    { mode: 'webview' }
  > | null>(null);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(() =>
    startsWithEmptySchedule ? '' : (plan?.startDate ?? ''),
  );
  const [startMinutes, setStartMinutes] = useState<number | null>(() =>
    startsWithEmptySchedule ? null : 9 * 60,
  );
  const [endDate, setEndDate] = useState(() =>
    startsWithEmptySchedule ? '' : (plan?.endDate ?? plan?.startDate ?? ''),
  );
  const [endMinutes, setEndMinutes] = useState<number | null>(() =>
    startsWithEmptySchedule ? null : 11 * 60,
  );
  const [duration, setDuration] = useState('60');
  const [details, setDetails] = useState('');
  const [bookingUrl, setBookingUrl] = useState('');
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [flightDetails, setFlightDetails] = useState<FlightDetailsDraft>(
    () => emptyFlightDetailsDraft(),
  );
  const [flightDetailsError, setFlightDetailsError] = useState<string>();
  const [flightTripType, setFlightTripType] = useState<FlightTripType>('one-way');
  const [returnFlightTitle, setReturnFlightTitle] = useState('');
  const [returnFlightDetails, setReturnFlightDetails] = useState<FlightDetailsDraft>(
    () => emptyFlightDetailsDraft(),
  );
  const [returnFlightSchedule, setReturnFlightSchedule] = useState(
    emptyFlightLegScheduleDraft,
  );
  const [importedFlightFileName, setImportedFlightFileName] = useState<string>();
  const [pendingFlightImport, setPendingFlightImport] = useState<
    ImportedFlightConfirmation | undefined
  >();
  const [transportDetails, setTransportDetails] = useState<TransportDetailsDraft>(() =>
    emptyTransportDetailsDraft({
      origin: plan.origin,
      destination: plan.destination,
      arrivalDate: plan.startDate,
      arrivalMinutes: 12 * 60,
      currency: plan.baseCurrency,
    }),
  );
  const [transportDetailsError, setTransportDetailsError] = useState<string>();
  const [rentalDetails, setRentalDetails] = useState<RentalDetailsDraft>(
    emptyRentalDetailsDraft,
  );
  const [rentalDetailsError, setRentalDetailsError] = useState<string>();
  const [importedRentalFileName, setImportedRentalFileName] = useState<string>();
  const [stayDetails, setStayDetails] = useState<StayDetailsDraft>(() =>
    emptyStayDetailsDraft({
      reservationEmail: '',
    }),
  );
  const [stayDetailsError, setStayDetailsError] = useState<string>();
  const [importedStayFileName, setImportedStayFileName] = useState<string>();
  const [error, setError] = useState<string>();
  const [minimizedItemIds, setMinimizedItemIds] = useState<Set<string> | undefined>(
    undefined,
  );
  const [sectionExpanded, setSectionExpanded] = useState<
    Partial<Record<DetailSectionKey, boolean>>
  >({});
  const [collapsedDayDates, setCollapsedDayDates] = useState<Set<string>>(
    () => new Set(),
  );
  const [isAddingItem, setIsAddingItem] = useState(Boolean(initialAddKind));
  const [isChoosingAddKind, setIsChoosingAddKind] = useState(initialOpenAddPicker);

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
        return;
      }

      // Link confirmation files that were saved during import but never attached
      // (e.g. Add-to-Timeline hit a duplicate and discarded the new item).
      if (current) {
        const repaired = attachOrphanedFlightConfirmationUris(current, {
          allPlans: useTravel.getState().plans,
        });
        if (repaired) useTravel.getState().savePlan(repaired);
      }
    }, [planId]),
  );

  const appliedFlightImportFixture = useRef(false);
  useEffect(() => {
    if (!__DEV__ || initialFlightImportFixture !== 'roundtrip') return;
    if (kind !== 'flight' || !isAddingItem || appliedFlightImportFixture.current) {
      return;
    }
    appliedFlightImportFixture.current = true;
    // Use the confirmation's own calendar window — the open trip may be unrelated.
    const parsed = parseFlightConfirmation(CHASE_ROUNDTRIP_CONFIRMATION, {
      startDate: '2026-09-08',
      endDate: '2026-09-14',
    });
    const imported: ImportedFlightConfirmation = {
      ...parsed,
      fileName: 'FARHANA TASMIN has shared their trip details with you.pdf',
      confirmationUris: [],
    };
    const directions = splitRoundTripDirections(imported.segments);
    const roundTrip = Boolean(directions);
    const outboundSegments = directions?.outbound ?? imported.segments;
    const schedule = directions
      ? flightDirectionSchedule(directions.outbound, imported)
      : flightConfirmationSchedule(imported);
    setPendingFlightImport(imported);
    setFlightDetails((current) =>
      mergeFlightConfirmationDraftDetails(current, {
        ...imported,
        segments: outboundSegments,
      }),
    );
    setImportedFlightFileName(imported.fileName);
    setFlightTripType(roundTrip ? 'round-trip' : 'one-way');
    if (directions) {
      const returnDetails = mergeFlightConfirmationDraftDetails(
        emptyFlightDetailsDraft(),
        { ...imported, segments: directions.returning },
      );
      setReturnFlightDetails(returnDetails);
      setReturnFlightSchedule(
        flightLegScheduleFromImported(
          flightDirectionSchedule(directions.returning, imported),
        ),
      );
      setReturnFlightTitle(
        directions.returning[0]?.title?.trim() ||
          suggestReturnFlightTitle(returnDetails),
      );
    }
    setTitle(
      roundTrip
        ? outboundSegments[0]?.title || imported.title || ''
        : imported.title || '',
    );
    if (schedule.departureDate) setDate(schedule.departureDate);
    if (schedule.departureMinutes !== undefined) {
      setStartMinutes(schedule.departureMinutes);
    }
    if (schedule.durationMinutes !== undefined) {
      setDuration(String(schedule.durationMinutes));
    }
    if (schedule.arrivalDate) setEndDate(schedule.arrivalDate);
    if (schedule.arrivalMinutes !== undefined) {
      setEndMinutes(schedule.arrivalMinutes);
    }
  }, [initialFlightImportFixture, kind, isAddingItem]);

  useEffect(() => {
    if (!__DEV__ || !plan) return;

    const tryOpenFromUrl = (url: string | null) => {
      if (!url || !/[?&]openStayBooking=(1|true)\b/.test(url)) return;
      const emailMatch = url.match(/[?&]reservationEmail=([^&]+)/i);
      const overrideEmail = emailMatch
        ? decodeURIComponent(emailMatch[1].replace(/\+/g, ' '))
        : undefined;
      const stayItem = (Array.isArray(plan.itinerary) ? plan.itinerary : []).find(
        (item) => item.kind === 'stay',
      );
      if (!stayItem) return;
      const resolved = resolveStayBookingOpen(stayItem, {
        fallbackEmail: overrideEmail || autoOpenReservationEmail || accountEmail,
      });
      if (resolved?.mode === 'webview') {
        setDevBookingOpen(resolved);
      }
    };

    void Linking.getInitialURL().then(tryOpenFromUrl);
    const sub = Linking.addEventListener('url', ({ url }) => tryOpenFromUrl(url));

    if (autoOpenStayBooking) {
      tryOpenFromUrl(
        `ontrack://travel/${planId}?openStayBooking=1${
          autoOpenReservationEmail
            ? `&reservationEmail=${encodeURIComponent(autoOpenReservationEmail)}`
            : ''
        }`,
      );
    }

    return () => sub.remove();
  }, [
    autoOpenStayBooking,
    autoOpenReservationEmail,
    plan,
    accountEmail,
    planId,
  ]);

  // Store migration handles legacy records; this guard also protects the screen
  // while a malformed cloud update is being normalized.
  const itinerary = Array.isArray(plan.itinerary) ? plan.itinerary : [];

  const updatePlan = (next: TravelPlan) => {
    savePlan(next);
    replaceTravelActivities(next.id, travelCalendarDrafts(next));
  };
  const terminalLookupFingerprintRef = useRef<string | undefined>(undefined);
  const terminalLookupFingerprint = itinerary
    .filter((item) => item.kind === 'flight' && item.flight)
    .map((item) => {
      const flight = item.flight!;
      const legs = flight.legs?.length
        ? flight.legs
            .map((leg) =>
              [
                leg.flightNumber,
                leg.date,
                leg.departureTerminal,
                leg.arrivalTerminal,
              ].join(':'),
            )
            .join(',')
        : [
            flight.flightNumber,
            item.date,
            flight.departureTerminal,
            flight.arrivalTerminal,
          ].join(':');
      return `${item.id}:${legs}`;
    })
    .join('|');

  useEffect(() => {
    if (
      !terminalLookupFingerprint ||
      terminalLookupFingerprintRef.current === terminalLookupFingerprint
    ) {
      return;
    }
    terminalLookupFingerprintRef.current = terminalLookupFingerprint;
    let cancelled = false;
    void fetchFlightTerminalPatches(plan).then((patches) => {
      if (cancelled || !Object.keys(patches).length) return;
      const latest = useTravel
        .getState()
        .plans.find((entry) => entry.id === plan.id);
      if (!latest) return;
      const next = applyFlightTerminalPatches(latest, patches);
      if (next) updatePlan(next);
    });
    return () => {
      cancelled = true;
    };
    // The fingerprint changes only when lookup-relevant fields change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan.id, terminalLookupFingerprint]);

  // One-shot: attach per-leg journey data onto legacy collapsed connecting flights.
  useEffect(() => {
    if (!plan) return;
    const upgraded = upgradeLegacyConnectingFlights(plan, () =>
      newId('trip-item'),
    );
    if (upgraded) updatePlan(upgraded);
    // Intentionally depend on plan.id + a cheap fingerprint so we don't loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    plan?.id,
    plan?.itinerary
      ?.map((item) =>
        item.kind === 'flight'
          ? `${item.id}:${item.flight?.legs?.length ?? 0}:${item.durationMinutes}:${item.flight?.connectionArrivalMinutes ?? ''}`
          : item.id,
      )
      .join('|'),
  ]);

  const itemEdit = useTravelPlanItemDetailsEdit({ plan, itinerary, updatePlan });
  const itemMedia = useTravelPlanItemMedia({ planId, plan, itinerary, updatePlan });
  const [openExpenseSheet, setOpenExpenseSheet] = useState(initialOpenExpenses);
  const [editingTripDates, setEditingTripDates] = useState(false);
  const [expenseDraft, setExpenseDraft] = useState<ExpenseFormState | undefined>();
  const [preparedExpenseDraft, setPreparedExpenseDraft] = useState<ExpenseFormState | undefined>();
  const [importResult, setImportResult] = useState<TravelImportResult | null>(
    initialImportResult ?? null,
  );
  const importResultExpenseRef = useRef<{
    plan: TravelPlan;
    draft: ExpenseFormState;
  } | null>(null);
  const addItemInProgressRef = useRef(false);
  const setAddItemInProgressState = (value: boolean) => {
    addItemInProgressRef.current = value;
  };
  const stopAddItem = () => setAddItemInProgressState(false);
  const addItemError = (message: string) => {
    stopAddItem();
    setError(message);
  };

  const goToItinerarySafely = () => {
    // Clear transient overlays before route transitions so no hidden modal
    // can keep intercepting touches after the prompt closes.
    setOpenExpenseSheet(false);
    setExpenseDraft(undefined);
    setPreparedExpenseDraft(undefined);
    setImportResult(null);
    importResultExpenseRef.current = null;
    setIsAddingItem(false);
    setIsChoosingAddKind(false);
    clearAddPhotos();
    setRemoveConfirm(null);
    setDevBookingOpen(null);
  };

  const confirmationImports = useTravelPlanConfirmationImports({
    plan,
    updatePlan,
    accountEmail,
    navigation: {
      onOpenExpenseDraft: (_planId, draft) => {
        setExpenseDraft(draft);
        setOpenExpenseSheet(true);
      },
      onPrepareExpenseDraft: (_planId, draft) => {
        setPreparedExpenseDraft(draft);
      },
      onGoToItinerary: () => {
        goToItinerarySafely();
      },
    },
    addSheet: {
      date,
      startMinutes,
      setTitle,
      setDetails,
      setBookingUrl,
      setDate,
      setStartMinutes,
      setEndDate,
      setEndMinutes,
      setDuration,
      setKind,
      setIsAddingItem,
      setError,
      setFlightDetails,
      setFlightDetailsError,
      setImportedFlightFileName,
      setFlightTripType,
      setReturnFlightTitle,
      setReturnFlightDetails,
      setReturnFlightSchedule,
      setPendingFlightImport,
      setRentalDetails,
      setRentalDetailsError,
      setImportedRentalFileName,
      setStayDetails,
      setStayDetailsError,
      setImportedStayFileName,
    },
    edit: {
      setEditingFlightItemId: itemEdit.setEditingFlightItemId,
      setEditedFlightDetails: itemEdit.setEditedFlightDetails,
      setEditedFlightDetailsError: itemEdit.setEditedFlightDetailsError,
      setEditedFlightFileName: itemEdit.setEditedFlightFileName,
      setEditingRentalItemId: itemEdit.setEditingRentalItemId,
      setEditedRentalDetailsError: itemEdit.setEditedRentalDetailsError,
      setEditingStayItemId: itemEdit.setEditingStayItemId,
      setEditedStayDetails: itemEdit.setEditedStayDetails,
      setEditedStayDetailsError: itemEdit.setEditedStayDetailsError,
      setEditedStayFileName: itemEdit.setEditedStayFileName,
    },
  });
  const {
    importingFlightTarget,
    importingRentalTarget,
    importingStayTarget,
    importInProgressRef,
    importStatusLabel,
    chooseConfirmationImport,
    chooseRentalConfirmationImport,
    chooseStayConfirmationImport,
    importConfirmation,
    importRental,
    importStay,
  } = confirmationImports;
  const {
    editingFlightItemId,
    editedFlightDetails,
    editedFlightDetailsError,
    editedFlightFileName,
    editingRentalItemId,
    editedRentalDetails,
    editedRentalDetailsError,
    editedRentalFileName,
    editingStayItemId,
    editedStayDetails,
    editedStayDetailsError,
    editedStayFileName,
    beginEditingFlightDetails,
    saveEditedFlightDetails,
    beginEditingRentalDetails,
    saveEditedRentalDetails,
    beginEditingStayDetails,
    saveEditedStayDetails,
    setEditedFlightDetails,
    setEditedRentalDetails,
    setEditedStayDetails,
    setEditingFlightItemId,
    setEditingRentalItemId,
    setEditingStayItemId,
  } = itemEdit;
  const {
    addPhotosItemId,
    addPhotosItemIdRef,
    removeConfirm,
    setRemoveConfirm,
    confirmRemoveItem,
    saveItemNotes,
    removePhotoFromItem,
    appendPhotosToItem,
    addPhotosToItem,
    clearAddPhotos,
  } = itemMedia;

  const matchingImportedExpense = (
    sourcePlan: TravelPlan,
    draft: ExpenseFormState,
  ) => {
    const draftNote = draft.notes.trim().toUpperCase();
    if (draftNote) {
      const byNote = sourcePlan.expenses.find(
        (expense) =>
          expense.category === draft.category &&
          (expense.notes ?? '').toUpperCase().includes(draftNote),
      );
      if (byNote) return byNote;
    }
    const amount = Number(draft.amountText);
    const normalizedTitle = draft.title.trim().toLowerCase();
    return sourcePlan.expenses.find((expense) => {
      if (expense.category !== draft.category) return false;
      if (expense.date !== draft.date || expense.currency !== draft.currency) return false;
      if (normalizedTitle && expense.title.trim().toLowerCase() !== normalizedTitle) return false;
      if (!Number.isFinite(amount)) return false;
      return expense.amount === amount;
    });
  };

  const openImportedExpenseReview = (sourcePlan: TravelPlan, draft: ExpenseFormState) => {
    const existing = matchingImportedExpense(sourcePlan, draft);
    setExpenseDraft(existing ? expenseFormFromExpense(existing) : draft);
    setOpenExpenseSheet(true);
  };

  const maybeShowImportedAddPrompt = (
    sourcePlan: TravelPlan,
    duplicateItinerary: boolean,
  ) => {
    if (!preparedExpenseDraft) return;
    const draft = preparedExpenseDraft;
    setPreparedExpenseDraft(undefined);
    const kindLabel =
      ITEM_KINDS.find((entry) => entry.value === kind)?.label ?? 'Item';
    importResultExpenseRef.current = { plan: sourcePlan, draft };
    setImportResult({ stage: 'imported', kindLabel, duplicateItinerary });
  };

  const addItem = () => {
    if (addItemInProgressRef.current) return;
    setAddItemInProgressState(true);
    setError(undefined);
    setFlightDetailsError(undefined);
    setTransportDetailsError(undefined);
    setRentalDetailsError(undefined);
    setStayDetailsError(undefined);
    const isMoment = kind === 'moment';
    const usesRange = kind === 'stay' || kind === 'flight' || kind === 'rental';
    if (!isMoment && !title.trim()) {
      return addItemError('Add a name for this itinerary item.');
    }
    // Flights may extend the trip on save (import / round-trip return).
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      (kind !== 'flight' && (date < plan.startDate || date > plan.endDate))
    ) {
      return addItemError(
        kind === 'flight'
          ? 'Choose a valid departure date.'
          : `Choose a date between ${formatDateKey(plan.startDate, dateDisplayFormat)} and ${formatDateKey(plan.endDate, dateDisplayFormat)}.`,
      );
    }
    if (startMinutes === null || startMinutes < 0 || startMinutes >= 24 * 60) {
      return addItemError(
        kind === 'stay'
          ? 'Choose a check-in time.'
          : kind === 'rental'
            ? 'Choose a pick-up time.'
            : kind === 'flight'
              ? 'Choose a departure time.'
              : 'Choose a valid start time.',
      );
    }

    let durationMinutes = isMoment ? 15 : Number(duration);
    if (usesRange) {
      const maxEndDate = kind === 'stay' ? addDays(plan.endDate, 1) : plan.endDate;
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(endDate) ||
        (kind !== 'flight' &&
          (endDate < plan.startDate || endDate > maxEndDate))
      ) {
        return addItemError(
          kind === 'flight'
            ? 'Choose a valid arrival date.'
            : `Choose an end date between ${formatDateKey(plan.startDate, dateDisplayFormat)} and ${formatDateKey(maxEndDate, dateDisplayFormat)}.`,
        );
      }
      if (endMinutes === null || endMinutes < 0 || endMinutes >= 24 * 60) {
        return addItemError(
          kind === 'stay'
            ? 'Choose a check-out time.'
            : kind === 'rental'
              ? 'Choose a drop-off time.'
              : kind === 'flight'
                ? 'Choose an arrival time.'
                : 'Choose a valid end time.',
        );
      }
      const span = minutesBetween(date, startMinutes, endDate, endMinutes);
      if (!Number.isFinite(span) || span <= 0) {
        return addItemError(
          kind === 'flight'
            ? 'Arrival must be after departure.'
            : kind === 'rental'
              ? 'Drop-off must be after pick-up.'
              : 'Check-out must be after check-in.',
        );
      }
      durationMinutes = kind === 'flight' ? span : 60;
      if (kind === 'flight' && span > 3 * 24 * 60) {
        return addItemError('Flight duration looks too long. Check the arrival time.');
      }
    } else if (
      !isMoment &&
      kind !== 'transport' &&
      (!Number.isFinite(durationMinutes) || durationMinutes <= 0 || durationMinutes > 1440)
    ) {
      return addItemError('Duration must be between 1 and 1,440 minutes.');
    }
    if (!isMoment && !validBookingUrl(bookingUrl.trim())) {
      return addItemError('Booking links must use a complete HTTPS address.');
    }
    const validatedFlightDetails =
      kind === 'flight'
        ? validateFlightDetails(flightDetails)
        : ({ ok: true, value: undefined } as const);
    if (!validatedFlightDetails.ok) {
      stopAddItem();
      return setFlightDetailsError(validatedFlightDetails.error);
    }
    const validatedTransportDetails =
      kind === 'transport'
        ? validateTransportDetails({
            draft: transportDetails,
            departureDate: date,
            departureMinutes: startMinutes,
            planStartDate: plan.startDate,
            planEndDate: plan.endDate,
          })
        : ({ ok: true, value: undefined } as const);
    if (!validatedTransportDetails.ok) {
      stopAddItem();
      return setTransportDetailsError(validatedTransportDetails.error);
    }
    if (validatedTransportDetails.value) {
      durationMinutes = minutesBetween(
        date,
        startMinutes,
        validatedTransportDetails.value.arrivalDate,
        validatedTransportDetails.value.arrivalMinutes,
      );
    }
    const validatedRentalDetails =
      kind === 'rental'
        ? validateRentalDetails({
            ...rentalDetails,
            dropoffDate: endDate,
            dropoffMinutes: String(endMinutes),
          })
        : ({ ok: true, value: undefined } as const);
    if (!validatedRentalDetails.ok) {
      stopAddItem();
      return setRentalDetailsError(validatedRentalDetails.error);
    }
    const validatedStayDetails =
      kind === 'stay'
        ? validateStayDetails({
            ...stayDetails,
            checkoutDate: endDate,
            checkoutMinutes: String(endMinutes),
          })
        : ({ ok: true, value: undefined } as const);
    if (!validatedStayDetails.ok) {
      stopAddItem();
      return setStayDetailsError(validatedStayDetails.error);
    }

    // Round-trip form (imported or manual) expands to outbound + return on submit.
    if (kind === 'flight' && flightTripType === 'round-trip') {
      const roundTripSegments = segmentsFromRoundTripForm({
        outboundDetails: flightDetails,
        outboundSchedule: {
          date,
          startMinutes,
          endDate,
          endMinutes,
        },
        outboundTitle: title,
        returnDetails: returnFlightDetails,
        returnSchedule: returnFlightSchedule,
        returnTitle: returnFlightTitle,
      });
      if (!roundTripSegments) {
        stopAddItem();
        return setFlightDetailsError(
          'Add return departure and arrival dates and times.',
        );
      }
      const planBeforeRoundTrip = useTravel
        .getState()
        .plans.find((entry) => entry.id === planId);
      if (!planBeforeRoundTrip) {
        stopAddItem();
        return;
      }
      const confirmationUris =
        validatedFlightDetails.value?.confirmationUris?.length
          ? validatedFlightDetails.value.confirmationUris
          : pendingFlightImport?.confirmationUris;
      const nextPlan = applyImportedFlightsToPlan({
        plan: planBeforeRoundTrip,
        imported: {
          ...(pendingFlightImport ?? {
            ...roundTripSegments[0]!,
            segments: roundTripSegments,
            detectedFieldCount: 1,
          }),
          segments: roundTripSegments,
          confirmationUris,
        },
        createId: () => newId('trip-item'),
      });
      updatePlan(nextPlan);
      resetAddForm();
      setIsAddingItem(false);
      stopAddItem();
      maybeShowImportedAddPrompt(nextPlan, false);
      return;
    }

    // Connecting confirmations expand via the shared import merger on submit.
    const connectingImport =
      kind === 'flight' &&
      pendingFlightImport &&
      isConnectingSegmentGroup(pendingFlightImport.segments)
        ? pendingFlightImport
        : undefined;
    if (connectingImport) {
      const planBeforeConnect = useTravel.getState().plans.find((entry) => entry.id === planId);
      if (!planBeforeConnect) {
        stopAddItem();
        return;
      }
      const confirmationUris =
        validatedFlightDetails.value?.confirmationUris?.length
          ? validatedFlightDetails.value.confirmationUris
          : connectingImport.confirmationUris;
      const nextPlan = applyImportedFlightsToPlan({
        plan: planBeforeConnect,
        imported: { ...connectingImport, confirmationUris },
        createId: () => newId('trip-item'),
      });
      updatePlan(nextPlan);
      resetAddForm();
      setIsAddingItem(false);
      stopAddItem();
      maybeShowImportedAddPrompt(nextPlan, false);
      return;
    }

    const itemId = newId('trip-item');
    const now = new Date().toISOString();
    const flightConfirmationUris =
      validatedFlightDetails.value?.confirmationUris?.length
        ? validatedFlightDetails.value.confirmationUris
        : pendingFlightImport?.confirmationUris;
    const flightDetailsForItem =
      kind === 'flight' && validatedFlightDetails.value
        ? {
            ...validatedFlightDetails.value,
            ...(flightConfirmationUris?.length
              ? { confirmationUris: flightConfirmationUris }
              : {}),
          }
        : validatedFlightDetails.value;
    const incomingItem: TravelItineraryItem = {
      id: itemId,
      kind,
      title: title.trim() || (isMoment ? 'Moment' : title.trim()),
      date,
      startMinutes,
      durationMinutes: Math.round(durationMinutes),
      details: details.trim() || undefined,
      bookingUrl: isMoment ? undefined : bookingUrl.trim() || undefined,
      photoUris: photoUris.length ? photoUris : undefined,
      flight: flightDetailsForItem,
      transport: validatedTransportDetails.value,
      rental: validatedRentalDetails.value,
      stay: validatedStayDetails.value,
    };
    void (async () => {
      // Capture plan state before async operation to avoid race conditions
      const planBeforeAsync = useTravel.getState().plans.find((entry) => entry.id === planId);
      if (!planBeforeAsync) {
        stopAddItem();
        return;
      }
      const itineraryBeforeAsync = Array.isArray(planBeforeAsync.itinerary) ? planBeforeAsync.itinerary : [];

      // Check for duplicates before async operation
      const duplicateExists = itineraryBeforeAsync.some((existing) =>
        isDuplicateItineraryItem(existing, incomingItem),
      );
      if (duplicateExists) {
        const merged = mergeDuplicateItemConfirmationUris(
          planBeforeAsync,
          incomingItem,
        );
        if (merged) updatePlan(merged);
        setTitle('');
        setDetails('');
        setBookingUrl('');
        setPhotoUris([]);
        setFlightDetails(emptyFlightDetailsDraft());
        setImportedFlightFileName(undefined);
        setPendingFlightImport(undefined);
        setRentalDetails(emptyRentalDetailsDraft());
        setImportedRentalFileName(undefined);
        setStayDetails(
          defaultStayDetails({
            checkoutDate: plan.endDate,
            checkoutMinutes: String(11 * 60),
          }),
        );
        setImportedStayFileName(undefined);
        setIsAddingItem(false);
        stopAddItem();
        maybeShowImportedAddPrompt(merged ?? planBeforeAsync, false);
        return;
      }

      const persistedPhotos = photoUris.length
        ? await persistTravelMomentPhotos(photoUris, itemId)
        : undefined;

      // After async operation, check if plan still exists and use it or fall back to captured state
      const latest = useTravel.getState().plans.find((entry) => entry.id === planId);
      const planToUpdate = latest || planBeforeAsync;
      const itineraryToUpdate = Array.isArray(planToUpdate.itinerary) ? planToUpdate.itinerary : itineraryBeforeAsync;

      // Re-check for duplicates in case something changed during async operation
      const duplicateExistsAfterAsync = itineraryToUpdate.some((existing) =>
        isDuplicateItineraryItem(existing, incomingItem),
      );
      if (duplicateExistsAfterAsync) {
        const merged = mergeDuplicateItemConfirmationUris(
          planToUpdate,
          incomingItem,
        );
        if (merged) updatePlan(merged);
        setTitle('');
        setDetails('');
        setBookingUrl('');
        setPhotoUris([]);
        setFlightDetails(emptyFlightDetailsDraft());
        setImportedFlightFileName(undefined);
        setPendingFlightImport(undefined);
        setRentalDetails(emptyRentalDetailsDraft());
        setImportedRentalFileName(undefined);
        setStayDetails(
          defaultStayDetails({
            checkoutDate: plan.endDate,
            checkoutMinutes: String(11 * 60),
          }),
        );
        setImportedStayFileName(undefined);
        setIsAddingItem(false);
        stopAddItem();
        maybeShowImportedAddPrompt(merged ?? planToUpdate, false);
        return;
      }

      updatePlan({
        ...planToUpdate,
        itinerary: [
          ...itineraryToUpdate,
          {
            ...incomingItem,
            photoUris: persistedPhotos,
          },
        ],
        updatedAt: now,
      });
      const transportFare = incomingItem.transport?.fare;
      const transportCurrency = incomingItem.transport?.currency;
      if (transportFare && transportCurrency) {
        setExpenseDraft({
          ...emptyExpenseForm(planToUpdate, transportCurrency),
          title: incomingItem.title,
          amountText: String(transportFare),
          currency: transportCurrency,
          date: incomingItem.date,
          category: 'transport',
          travelItemId: incomingItem.id,
        });
        setOpenExpenseSheet(true);
      }
      setTitle('');
      setDetails('');
      setBookingUrl('');
      setPhotoUris([]);
      setFlightDetails(emptyFlightDetailsDraft());
      setImportedFlightFileName(undefined);
      setPendingFlightImport(undefined);
      setTransportDetails(emptyTransportDetailsDraft({
        origin: plan.origin,
        destination: plan.destination,
        arrivalDate: plan.startDate,
        arrivalMinutes: 12 * 60,
        currency: plan.baseCurrency,
      }));
      setRentalDetails(emptyRentalDetailsDraft());
      setImportedRentalFileName(undefined);
      setStayDetails(
        defaultStayDetails({
          checkoutDate: plan.endDate,
          checkoutMinutes: String(11 * 60),
        }),
      );
      setImportedStayFileName(undefined);
      setIsAddingItem(false);
      stopAddItem();
      maybeShowImportedAddPrompt(planToUpdate, false);
    })().catch((caught: unknown) => {
      if (__DEV__) console.warn('[addTravelItineraryItem]', caught);
      stopAddItem();
      setError('Couldn’t save this itinerary item. Check its photos and try again.');
    });
  };

  const sortedItinerary = [...itinerary].sort(
    (left, right) =>
      left.date.localeCompare(right.date) || left.startMinutes - right.startMinutes,
  );

  const transportCounts = {
    flights: sortedItinerary.filter((item) => item.kind === 'flight').length,
    ground: sortedItinerary.filter((item) => item.kind === 'transport').length,
    stays: sortedItinerary.filter((item) => item.kind === 'stay').length,
    rentals: sortedItinerary.filter((item) => item.kind === 'rental').length,
  };

  const isSectionExpanded = (key: DetailSectionKey) =>
    sectionExpanded[key] ?? sectionDefaultExpanded(key, transportCounts);

  const toggleSection = (key: DetailSectionKey) => {
    setSectionExpanded((current) => ({
      ...current,
      [key]: !(current[key] ?? sectionDefaultExpanded(key, transportCounts)),
    }));
  };

  const defaultCollapsedItemIds = () => {
    const ids = itinerary.map((item) => item.id);
    const entryKeys = expandTimelineEntries(itinerary).map((entry) => entry.key);
    return new Set([...ids, ...entryKeys]);
  };

  const collapsedItemIds = minimizedItemIds ?? defaultCollapsedItemIds();

  const toggleItineraryItem = (itemId: string) => {
    setMinimizedItemIds((current) => {
      const next = new Set(current ?? defaultCollapsedItemIds());
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const toggleDay = (date: string) => {
    setCollapsedDayDates((current) => {
      const next = new Set(current);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

  const handleFlightTripTypeChange = (next: FlightTripType) => {
    setFlightTripType(next);
    if (next !== 'round-trip') return;
    const returnEmpty =
      !returnFlightDetails.flightNumber.trim() &&
      !returnFlightSchedule.date &&
      !returnFlightDetails.departureAirport.trim();
    if (!returnEmpty) return;
    const suggested = suggestReturnDraftFromOutbound(flightDetails, {
      date,
      startMinutes,
      endDate,
      endMinutes,
    });
    setReturnFlightDetails(suggested.details);
    setReturnFlightSchedule(suggested.schedule);
    setReturnFlightTitle(suggestReturnFlightTitle(suggested.details));
  };

  const resetAddForm = () => {
    setTitle('');
    setDetails('');
    setBookingUrl('');
    setPhotoUris([]);
    setDuration('60');
    setStartMinutes(9 * 60);
    setDate(plan.startDate);
    setEndDate(plan.endDate);
    setEndMinutes(11 * 60);
    setFlightDetails(emptyFlightDetailsDraft());
    setFlightTripType('one-way');
    setReturnFlightTitle('');
    setReturnFlightDetails(emptyFlightDetailsDraft());
    setReturnFlightSchedule(emptyFlightLegScheduleDraft());
    appliedFlightImportFixture.current = false;
    setImportedFlightFileName(undefined);
    setPendingFlightImport(undefined);
    setFlightDetailsError(undefined);
    setTransportDetails(emptyTransportDetailsDraft({
      origin: plan.origin,
      destination: plan.destination,
      arrivalDate: plan.startDate,
      arrivalMinutes: 12 * 60,
      currency: plan.baseCurrency,
    }));
    setTransportDetailsError(undefined);
    setRentalDetails(emptyRentalDetailsDraft());
    setImportedRentalFileName(undefined);
    setRentalDetailsError(undefined);
    setStayDetails(defaultStayDetails());
    setImportedStayFileName(undefined);
    setStayDetailsError(undefined);
    setError(undefined);
  };

  const cancelAddToTimeline = () => {
    if (importInProgressRef.current) return;
    setIsAddingItem(false);
    setPreparedExpenseDraft(undefined);
    resetAddForm();
  };

  const prepareAddKind = (nextKind: TravelItemKind) => {
    resetAddForm();
    setKind(nextKind);
    if (nextKind === 'stay') {
      setDate('');
      setStartMinutes(null);
      setEndDate('');
      setEndMinutes(null);
    } else if (nextKind === 'rental') {
      setDate(plan.startDate);
      setStartMinutes(9 * 60);
      setEndDate(plan.endDate);
      setEndMinutes(10 * 60);
    } else if (nextKind === 'flight') {
      setDate('');
      setStartMinutes(null);
      setEndDate('');
      setEndMinutes(null);
    } else if (nextKind === 'transport') {
      setDate(plan.startDate);
      setStartMinutes(9 * 60);
      setTransportDetails(emptyTransportDetailsDraft({
        origin: plan.origin,
        destination: plan.destination,
        arrivalDate: plan.startDate,
        arrivalMinutes: 12 * 60,
        currency: plan.baseCurrency,
      }));
    } else {
      setDate(plan.startDate);
      setStartMinutes(9 * 60);
    }
  };

  const beginAddToTimeline = () => {
    setIsChoosingAddKind(true);
  };

  const chooseAddKind = (nextKind: TravelItemKind) => {
    setIsChoosingAddKind(false);
    prepareAddKind(nextKind);
    setSectionExpanded((current) => ({
      ...current,
      timeline: true,
    }));
    setIsAddingItem(true);
  };

  const itemEditHandlers = {
    plan,
    minimizedItemIds: collapsedItemIds,
    dateDisplayFormat,
    editingFlightItemId,
    editedFlightDetails,
    editedFlightDetailsError,
    editedFlightFileName,
    importingFlightTarget,
    editingRentalItemId,
    editedRentalDetails,
    editedRentalDetailsError,
    editedRentalFileName,
    importingRentalTarget,
    editingStayItemId,
    editedStayDetails,
    editedStayDetailsError,
    editedStayFileName,
    importingStayTarget,
    onToggle: toggleItineraryItem,
    onEditedFlightDetailsChange: setEditedFlightDetails,
    onImportFlight: (itemId: string) => chooseConfirmationImport(itemId),
    onSaveFlightDetails: saveEditedFlightDetails,
    onCancelFlightEdit: () => setEditingFlightItemId(undefined),
    onBeginFlightEdit: beginEditingFlightDetails,
    onEditedRentalDetailsChange: setEditedRentalDetails,
    onImportRental: (itemId: string) => chooseRentalConfirmationImport(itemId),
    onSaveRentalDetails: saveEditedRentalDetails,
    onCancelRentalEdit: () => setEditingRentalItemId(undefined),
    onBeginRentalEdit: beginEditingRentalDetails,
    onEditedStayDetailsChange: setEditedStayDetails,
    onImportStay: (itemId: string) => chooseStayConfirmationImport(itemId),
    onSaveStayDetails: saveEditedStayDetails,
    onCancelStayEdit: () => setEditingStayItemId(undefined),
    onBeginStayEdit: beginEditingStayDetails,
    onSaveTransportDetails: (
      itemId: string,
      nextDetails: NonNullable<TravelItineraryItem['transport']>,
      schedule: TravelRangeScheduleDraft,
    ) => {
      const scheduleResult = validateTravelRangeSchedule(schedule, {
        start: 'departure',
        end: 'arrival',
      });
      if (!scheduleResult.ok || schedule.endMinutes === null) return;
      const latest = useTravel.getState().plans.find((entry) => entry.id === planId) ?? plan;
      const durationMinutes = minutesBetween(
        schedule.startDate,
        scheduleResult.value.startMinutes,
        schedule.endDate,
        schedule.endMinutes,
      );
      const nextPlan = {
        ...latest,
        itinerary: latest.itinerary.map((item) =>
          item.id === itemId
            ? {
                ...item,
                date: schedule.startDate,
                startMinutes: scheduleResult.value.startMinutes,
                durationMinutes,
                transport: nextDetails,
              }
            : item,
        ),
        updatedAt: new Date().toISOString(),
      };
      updatePlan(nextPlan);
      if (nextDetails.fare && nextDetails.currency) {
        const existing = latest.expenses.find((expense) => expense.travelItemId === itemId);
        setExpenseDraft({
          ...(existing
            ? expenseFormFromExpense(existing)
            : emptyExpenseForm(latest, nextDetails.currency)),
          title: latest.itinerary.find((item) => item.id === itemId)?.title ?? 'Transport',
          amountText: String(nextDetails.fare),
          currency: nextDetails.currency,
          date: schedule.startDate,
          category: 'transport',
          travelItemId: itemId,
        });
        setOpenExpenseSheet(true);
      }
    },
    onAddPhotos: addPhotosToItem,
    onRemovePhoto: removePhotoFromItem,
    onRemove: confirmRemoveItem,
    onSaveNotes: saveItemNotes,
  };

  return (
    <View style={styles.root}>
      <Screen style={travelStyle} contentStyle={styles.screen} refresh={false}>
        <TravelPlanHero
          plan={plan}
          dateDisplayFormat={dateDisplayFormat}
          onAddPress={beginAddToTimeline}
          onEditDates={() => setEditingTripDates(true)}
        />

        <TravelTransportSections
          items={sortedItinerary}
          transportExpanded={isSectionExpanded('transport')}
          flightsExpanded={isSectionExpanded('flights')}
          groundExpanded={isSectionExpanded('ground')}
          staysExpanded={isSectionExpanded('stays')}
          rentalsExpanded={isSectionExpanded('rentals')}
          onToggleTransport={() => toggleSection('transport')}
          onToggleFlights={() => toggleSection('flights')}
          onToggleGround={() => toggleSection('ground')}
          onToggleStays={() => toggleSection('stays')}
          onToggleRentals={() => toggleSection('rentals')}
          {...itemEditHandlers}
        />

        <TravelCollapsibleSection
          title="Timeline"
          icon="clock"
          card
          compact
          tightHeader
          flushContent
          expanded={isSectionExpanded('timeline')}
          onToggle={() => toggleSection('timeline')}>
          <TravelItineraryTimeline
            items={sortedItinerary}
            collapsedDayDates={collapsedDayDates}
            onToggleDay={toggleDay}
            {...itemEditHandlers}
          />
        </TravelCollapsibleSection>
      </Screen>

      <TravelTripDatesSheet
        visible={editingTripDates}
        tripTitle={plan.title}
        startDate={plan.startDate}
        endDate={plan.endDate}
        itinerary={itinerary}
        onClose={() => setEditingTripDates(false)}
        onSave={(nextStartDate, nextEndDate) => {
          updatePlan({
            ...plan,
            startDate: nextStartDate,
            endDate: nextEndDate,
            updatedAt: new Date().toISOString(),
          });
          setEditingTripDates(false);
        }}
      />

      <TravelTimelineAddModal
        visible={isChoosingAddKind}
        onClose={() => setIsChoosingAddKind(false)}
        onSelect={chooseAddKind}
      />

      <TravelRemoveConfirmModal
        payload={removeConfirm}
        onCancel={() => setRemoveConfirm(null)}
      />

      <TravelAddPhotosModal
        visible={addPhotosItemId != null}
        onClose={clearAddPhotos}
        onTakePhoto={() => {
          const itemId = addPhotosItemIdRef.current;
          if (!itemId) return;
          void (async () => {
            const uri = await pickCameraImage();
            if (uri) await appendPhotosToItem(itemId, [uri]);
          })();
        }}
        onChooseFromPhotos={() => {
          const itemId = addPhotosItemIdRef.current;
          if (!itemId) return;
          void (async () => {
            const assets = await pickLibraryImages({
              allowsMultipleSelection: true,
              selectionLimit: 8,
            });
            if (assets?.length) {
              await appendPhotosToItem(
                itemId,
                assets.map((asset) => asset.uri),
              );
            }
          })();
        }}
      />

      <TravelItineraryAddSheet
        visible={isAddingItem}
        kind={kind}
        title={title}
        date={date}
        startMinutes={startMinutes}
        endDate={endDate}
        endMinutes={endMinutes}
        duration={duration}
        details={details}
        bookingUrl={bookingUrl}
        photoUris={photoUris}
        flightDetails={flightDetails}
        flightDetailsError={flightDetailsError}
        flightTripType={flightTripType}
        returnFlightTitle={returnFlightTitle}
        returnFlightDetails={returnFlightDetails}
        returnFlightSchedule={returnFlightSchedule}
        importedFlightFileName={importedFlightFileName}
        importingFlight={importingFlightTarget === 'new'}
        transportDetails={transportDetails}
        transportDetailsError={transportDetailsError}
        rentalDetails={rentalDetails}
        rentalDetailsError={rentalDetailsError}
        importedRentalFileName={importedRentalFileName}
        importingRental={importingRentalTarget === 'new'}
        stayDetails={stayDetails}
        stayDetailsError={stayDetailsError}
        importedStayFileName={importedStayFileName}
        importingStay={importingStayTarget === 'new'}
        error={error}
        importStatusLabel={importStatusLabel}
        planStartDate={plan.startDate}
        planEndDate={plan.endDate}
        onClose={cancelAddToTimeline}
        onTitleChange={setTitle}
        onDateChange={setDate}
        onStartMinutesChange={setStartMinutes}
        onEndDateChange={setEndDate}
        onEndMinutesChange={setEndMinutes}
        onDurationChange={setDuration}
        onDetailsChange={setDetails}
        onBookingUrlChange={setBookingUrl}
        onPhotoUrisChange={setPhotoUris}
        onFlightDetailsChange={setFlightDetails}
        onFlightTripTypeChange={handleFlightTripTypeChange}
        onReturnFlightTitleChange={setReturnFlightTitle}
        onReturnFlightDetailsChange={setReturnFlightDetails}
        onReturnFlightScheduleChange={setReturnFlightSchedule}
        onImportFlight={(source) => void importConfirmation('new', source)}
        onTransportDetailsChange={setTransportDetails}
        onRentalDetailsChange={setRentalDetails}
        onImportRental={(source) => void importRental('new', source)}
        onStayDetailsChange={setStayDetails}
        onImportStay={(source) => void importStay('new', source)}
        onAdd={addItem}
      />
      <TravelExpensesSheet
        plan={plan}
        visible={openExpenseSheet}
        initialForm={expenseDraft}
        onClose={() => {
          setOpenExpenseSheet(false);
          setExpenseDraft(undefined);
        }}
        onSavePlan={updatePlan}
        onSaved={({ mode }) => {
          setOpenExpenseSheet(false);
          setExpenseDraft(undefined);
          if (mode === 'edit') return;
          importResultExpenseRef.current = null;
          setImportResult({ stage: 'expense-saved' });
        }}
      />
      <TravelImportResultModal
        result={importResult}
        onClose={goToItinerarySafely}
        onReviewExpense={() => {
          const pending = importResultExpenseRef.current;
          setImportResult(null);
          if (pending) {
            importResultExpenseRef.current = null;
            openImportedExpenseReview(pending.plan, pending.draft);
            return;
          }
          setOpenExpenseSheet(true);
        }}
      />
      <BookingOpenSheet
        target={devBookingOpen}
        onClose={() => setDevBookingOpen(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  screen: { gap: spacing.xs },
});
