import { useFocusEffect } from 'expo-router';
import * as Linking from 'expo-linking';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  appPrompt,
  EmptyState,
  Screen,
} from '@/components/primitives';
import { spacing } from '@/design-system';
import { useAuthSession } from '@/features/auth/auth-provider';
import { applyImportedFlightsToPlan } from '@/features/travel/apply-imported-flights';
import { applyImportedRentalToPlan } from '@/features/travel/apply-imported-rental';
import { BookingOpenSheet } from '@/features/travel/booking-open-sheet';
import {
  resolveStayBookingOpen,
  type StayBookingOpen,
} from '@/features/travel/booking-open';
import { travelCalendarDrafts } from '@/features/travel/calendar';
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
import {
  validateFlightSchedule,
  type FlightScheduleDraft,
} from '@/features/travel/flight-schedule';
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
import {
  importStayConfirmation,
  type StayConfirmationImportSource,
} from '@/features/travel/stay-confirmation-import';
import {
  emptyStayDetailsDraft,
  stayDetailsDraft,
  validateStayDetails,
  type StayDetailsDraft,
} from '@/features/travel/stay-details';
import { applyStayExpenseFromImport } from '@/features/travel/stay-expense-from-import';
import { TravelCollapsibleSection } from '@/features/travel/travel-collapsible-section';
import { TravelItineraryAddSheet } from '@/features/travel/travel-itinerary-add-sheet';
import { DETAILS_MAX_LENGTH } from '@/features/travel/travel-itinerary-form';
import { TravelItineraryTimeline } from '@/features/travel/travel-itinerary-timeline';
import { persistTravelMomentPhotos } from '@/features/travel/travel-moment-media';
import { TravelPlanHero } from '@/features/travel/travel-plan-hero';
import { TravelTimelineAddModal } from '@/features/travel/travel-timeline-add-modal';
import { expandTimelineEntries } from '@/features/travel/travel-timeline-entries';
import {
  validateTravelRangeSchedule,
  type TravelRangeScheduleDraft,
} from '@/features/travel/travel-range-schedule';
import { TravelTransportSections } from '@/features/travel/travel-transport-sections';
import type { TravelItemKind, TravelPlan } from '@/features/travel/types';
import { usePreferences } from '@/store/preferences';
import { newId, useSchedule } from '@/store/schedule';
import { useTravel } from '@/store/travel';
import { confirmDestructiveAction } from '@/utils/confirm-destructive';
import { addDays, minutesBetween } from '@/utils/date';
import { pickCameraImage, pickLibraryImages } from '@/utils/pick-image';
import { isHttpsUrl } from '@/utils/safe-url';

type DetailSectionKey = 'transport' | 'flights' | 'stays' | 'rentals' | 'timeline';

function sectionDefaultExpanded(
  key: DetailSectionKey,
  counts: { flights: number; stays: number; rentals: number },
): boolean {
  switch (key) {
    case 'transport':
      return counts.flights + counts.stays + counts.rentals > 0;
    case 'flights':
      return counts.flights > 0;
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

export function TravelPlanDetail({
  planId,
  initialAddKind,
  initialOpenAddPicker = false,
  autoOpenStayBooking = false,
  autoOpenReservationEmail,
}: {
  planId: string;
  initialAddKind?: TravelItemKind;
  /** DEV: open the timeline kind chooser after navigating to a trip. */
  initialOpenAddPicker?: boolean;
  /** DEV: open the first trivago stay booking sheet after mount. */
  autoOpenStayBooking?: boolean;
  /** DEV: reservation email override when account email is unavailable. */
  autoOpenReservationEmail?: string;
}) {
  const plan = useTravel((state) => state.plans.find((item) => item.id === planId));
  const savePlan = useTravel((state) => state.savePlan);
  const replaceTravelActivities = useSchedule((state) => state.replaceTravelActivities);
  const dateDisplayFormat = usePreferences((state) => state.dateDisplayFormat);
  const { user } = useAuthSession();
  const accountEmail = user?.email?.trim().toLowerCase() || undefined;
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
    initialAddKind === 'stay' ? '' : (plan?.startDate ?? ''),
  );
  const [startMinutes, setStartMinutes] = useState<number | null>(() =>
    initialAddKind === 'stay' ? null : 9 * 60,
  );
  const [endDate, setEndDate] = useState(() =>
    initialAddKind === 'stay' ? '' : (plan?.endDate ?? plan?.startDate ?? ''),
  );
  const [endMinutes, setEndMinutes] = useState<number | null>(() =>
    initialAddKind === 'stay' ? null : 11 * 60,
  );
  const [duration, setDuration] = useState('60');
  const [details, setDetails] = useState('');
  const [bookingUrl, setBookingUrl] = useState('');
  const [photoUris, setPhotoUris] = useState<string[]>([]);
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
  const [stayDetails, setStayDetails] = useState<StayDetailsDraft>(() =>
    emptyStayDetailsDraft({
      reservationEmail: '',
    }),
  );
  const [stayDetailsError, setStayDetailsError] = useState<string>();
  const [importedStayFileName, setImportedStayFileName] = useState<string>();
  const [editingStayItemId, setEditingStayItemId] = useState<string>();
  const [editedStayDetails, setEditedStayDetails] = useState<StayDetailsDraft>(
    () => emptyStayDetailsDraft(),
  );
  const [editedStayDetailsError, setEditedStayDetailsError] = useState<string>();
  const [editedStayFileName, setEditedStayFileName] = useState<string>();
  const [importingStayTarget, setImportingStayTarget] = useState<string>();
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
  /** Blocks dismiss/reset while a system picker or OCR import is in flight. */
  const importInProgressRef = useRef(false);
  const [importStatusLabel, setImportStatusLabel] = useState<string>();

  const runAddSheetImport = async <T,>(work: () => Promise<T>): Promise<T> => {
    importInProgressRef.current = true;
    try {
      return await work();
    } finally {
      importInProgressRef.current = false;
    }
  };

  /** Let the import spinner commit before the system picker covers the sheet. */
  const paintImportLoading = () =>
    new Promise<void>((resolve) => setTimeout(resolve, 48));

  const confirmationPickerUi = (args: {
    onOpening: () => void;
    onReading: () => void;
  }) => ({
    pickerWillPresent: () => {
      args.onOpening();
      setImportStatusLabel(undefined);
    },
    onPhase: (phase: 'picker' | 'reading') => {
      if (phase === 'reading') {
        args.onReading();
        setImportStatusLabel(undefined);
      }
    },
  });

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
    setStayDetailsError(undefined);
    const isMoment = kind === 'moment';
    const usesRange = kind === 'stay' || kind === 'flight' || kind === 'rental';
    if (!isMoment && !title.trim()) {
      return setError('Add a name for this itinerary item.');
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < plan.startDate || date > plan.endDate) {
      return setError(`Choose a date between ${plan.startDate} and ${plan.endDate}.`);
    }
    if (startMinutes === null || startMinutes < 0 || startMinutes >= 24 * 60) {
      return setError(
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
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(endDate) ||
        endDate < plan.startDate ||
        endDate > plan.endDate
      ) {
        return setError(`Choose an end date between ${plan.startDate} and ${plan.endDate}.`);
      }
      if (endMinutes === null || endMinutes < 0 || endMinutes >= 24 * 60) {
        return setError(
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
        return setError(
          kind === 'flight'
            ? 'Arrival must be after departure.'
            : kind === 'rental'
              ? 'Drop-off must be after pick-up.'
              : 'Check-out must be after check-in.',
        );
      }
      durationMinutes = kind === 'flight' ? span : 60;
      if (kind === 'flight' && span > 3 * 24 * 60) {
        return setError('Flight duration looks too long. Check the arrival time.');
      }
    } else if (
      !isMoment &&
      (!Number.isFinite(durationMinutes) || durationMinutes <= 0 || durationMinutes > 1440)
    ) {
      return setError('Duration must be between 1 and 1,440 minutes.');
    }
    if (!isMoment && !validBookingUrl(bookingUrl.trim())) {
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
        ? validateRentalDetails({
            ...rentalDetails,
            dropoffDate: endDate,
            dropoffMinutes: String(endMinutes),
          })
        : ({ ok: true, value: undefined } as const);
    if (!validatedRentalDetails.ok) {
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
      return setStayDetailsError(validatedStayDetails.error);
    }
    const itemId = newId('trip-item');
    const now = new Date().toISOString();
    void (async () => {
      const persistedPhotos = photoUris.length
        ? await persistTravelMomentPhotos(photoUris, itemId)
        : undefined;
      const latest = useTravel.getState().plans.find((entry) => entry.id === planId);
      if (!latest) return;
      updatePlan({
        ...latest,
        itinerary: [
          ...(Array.isArray(latest.itinerary) ? latest.itinerary : []),
          {
            id: itemId,
            kind,
            title: title.trim() || (isMoment ? 'Moment' : title.trim()),
            date,
            startMinutes,
            durationMinutes: Math.round(durationMinutes),
            details: details.trim() || undefined,
            bookingUrl: isMoment ? undefined : bookingUrl.trim() || undefined,
            photoUris: persistedPhotos,
            flight: validatedFlightDetails.value,
            rental: validatedRentalDetails.value,
            stay: validatedStayDetails.value,
          },
        ],
        updatedAt: now,
      });
      setTitle('');
      setDetails('');
      setBookingUrl('');
      setPhotoUris([]);
      setFlightDetails(emptyFlightDetailsDraft());
      setImportedFlightFileName(undefined);
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
    })();
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

  const setItemPhotos = (itemId: string, nextUris: string[]) => {
    updatePlan({
      ...plan,
      itinerary: itinerary.map((item) =>
        item.id === itemId
          ? {
              ...item,
              photoUris: nextUris.length ? nextUris : undefined,
            }
          : item,
      ),
      updatedAt: new Date().toISOString(),
    });
  };

  const saveItemNotes = (
    itemId: string,
    notes: NonNullable<TravelPlan['itinerary'][number]['notes']>,
  ) => {
    updatePlan({
      ...plan,
      itinerary: itinerary.map((item) =>
        item.id === itemId
          ? {
              ...item,
              notes: notes.length ? notes : undefined,
            }
          : item,
      ),
      updatedAt: new Date().toISOString(),
    });
  };

  const removePhotoFromItem = (itemId: string, uri: string) => {
    const current = itinerary.find((item) => item.id === itemId);
    if (!current) return;
    setItemPhotos(
      itemId,
      (current.photoUris ?? []).filter((entry) => entry !== uri),
    );
  };

  const addPhotosToItem = (itemId: string) => {
    const append = async (uris: string[]) => {
      if (!uris.length) return;
      try {
        const latest = useTravel.getState().plans.find((entry) => entry.id === planId);
        if (!latest) return;
        const current = latest.itinerary.find((entry) => entry.id === itemId);
        const persisted = await persistTravelMomentPhotos(uris, itemId);
        const next = [...(current?.photoUris ?? []), ...persisted];
        updatePlan({
          ...latest,
          itinerary: latest.itinerary.map((item) =>
            item.id === itemId
              ? { ...item, photoUris: next.length ? next : undefined }
              : item,
          ),
          updatedAt: new Date().toISOString(),
        });
      } catch (error) {
        if (__DEV__) console.warn('[addPhotosToItem]', error);
        appPrompt.alert(
          'Couldn’t save photo',
          'Something went wrong while saving. Try again with another image.',
        );
      }
    };

    appPrompt.alert('Add Photos', 'Attach pictures to this timeline entry.', [
      {
        text: 'Take Photo',
        onPress: () => {
          void (async () => {
            const uri = await pickCameraImage();
            if (uri) await append([uri]);
          })();
        },
      },
      {
        text: 'Choose from Photos',
        onPress: () => {
          void (async () => {
            const assets = await pickLibraryImages({
              allowsMultipleSelection: true,
              selectionLimit: 8,
            });
            if (assets?.length) {
              await append(assets.map((asset) => asset.uri));
            }
          })();
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const beginEditingFlightDetails = (
    itemId: string,
    currentDetails: TravelPlan['itinerary'][number]['flight'],
  ) => {
    setEditingRentalItemId(undefined);
    setEditingStayItemId(undefined);
    setEditingFlightItemId(itemId);
    setEditedFlightDetails(flightDetailsDraft(currentDetails));
    setEditedFlightDetailsError(undefined);
    setEditedFlightFileName(undefined);
  };

  const saveEditedFlightDetails = (
    itemId: string,
    schedule: FlightScheduleDraft,
  ) => {
    setEditedFlightDetailsError(undefined);
    const validation = validateFlightDetails(editedFlightDetails);
    if (!validation.ok) return setEditedFlightDetailsError(validation.error);
    const scheduleValidation = validateFlightSchedule(
      schedule,
      validation.value,
    );
    if (!scheduleValidation.ok) {
      return setEditedFlightDetailsError(scheduleValidation.error);
    }
    updatePlan({
      ...plan,
      itinerary: itinerary.map((item) =>
        item.id === itemId
          ? {
              ...item,
              ...scheduleValidation.value,
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
    setEditingStayItemId(undefined);
    setEditingRentalItemId(itemId);
    setEditedRentalDetails(rentalDetailsDraft(currentDetails));
    setEditedRentalDetailsError(undefined);
    setEditedRentalFileName(undefined);
  };

  const saveEditedRentalDetails = (
    itemId: string,
    schedule: TravelRangeScheduleDraft,
  ) => {
    setEditedRentalDetailsError(undefined);
    const validation = validateRentalDetails({
      ...editedRentalDetails,
      dropoffDate: schedule.endDate,
      dropoffMinutes:
        schedule.endMinutes === null ? '' : String(schedule.endMinutes),
    });
    if (!validation.ok) return setEditedRentalDetailsError(validation.error);
    const scheduleValidation = validateTravelRangeSchedule(schedule, {
      start: 'pick-up',
      end: 'drop-off',
    });
    if (!scheduleValidation.ok) {
      return setEditedRentalDetailsError(scheduleValidation.error);
    }
    updatePlan({
      ...plan,
      itinerary: itinerary.map((item) =>
        item.id === itemId
          ? {
              ...item,
              ...scheduleValidation.value,
              rental: validation.value,
            }
          : item,
      ),
      updatedAt: new Date().toISOString(),
    });
    setEditingRentalItemId(undefined);
  };

  const beginEditingStayDetails = (
    itemId: string,
    currentDetails: TravelPlan['itinerary'][number]['stay'],
  ) => {
    setEditingFlightItemId(undefined);
    setEditingRentalItemId(undefined);
    setEditingStayItemId(itemId);
    setEditedStayDetails(stayDetailsDraft(currentDetails));
    setEditedStayDetailsError(undefined);
    setEditedStayFileName(undefined);
  };

  const saveEditedStayDetails = (
    itemId: string,
    schedule: TravelRangeScheduleDraft,
  ) => {
    setEditedStayDetailsError(undefined);
    const validation = validateStayDetails({
      ...editedStayDetails,
      checkoutDate: schedule.endDate,
      checkoutMinutes:
        schedule.endMinutes === null ? '' : String(schedule.endMinutes),
    });
    if (!validation.ok) return setEditedStayDetailsError(validation.error);
    const scheduleValidation = validateTravelRangeSchedule(schedule, {
      start: 'check-in',
      end: 'check-out',
    });
    if (!scheduleValidation.ok) {
      return setEditedStayDetailsError(scheduleValidation.error);
    }
    updatePlan({
      ...plan,
      itinerary: itinerary.map((item) =>
        item.id === itemId
          ? {
              ...item,
              ...scheduleValidation.value,
              stay: validation.value,
            }
          : item,
      ),
      updatedAt: new Date().toISOString(),
    });
    setEditingStayItemId(undefined);
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
    if (target === 'new') {
      setFlightDetailsError(undefined);
      setImportStatusLabel(undefined);
    } else setEditedFlightDetailsError(undefined);
    await paintImportLoading();
    const pickerUi = confirmationPickerUi({
      onOpening: () => setImportingFlightTarget(undefined),
      onReading: () => setImportingFlightTarget(target),
    });
    try {
      const imported = await (target === 'new'
        ? runAddSheetImport(() =>
            importFlightConfirmation(
              {
                startDate: plan.startDate,
                endDate: plan.endDate,
              },
              source,
              pickerUi,
            ),
          )
        : importFlightConfirmation(
            {
              startDate: plan.startDate,
              endDate: plan.endDate,
            },
            source,
            pickerUi,
          ));
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
          setIsAddingItem(false);
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
        const nextDate = imported.date || date;
        const nextStart =
          imported.startMinutes !== undefined
            ? imported.startMinutes
            : (startMinutes ?? 9 * 60);
        if (imported.date) setDate(imported.date);
        if (imported.startMinutes !== undefined) {
          setStartMinutes(imported.startMinutes);
        }
        if (imported.durationMinutes !== undefined) {
          setDuration(String(imported.durationMinutes));
          const span = imported.durationMinutes;
          const dayOffset = Math.floor((nextStart + span) / (24 * 60));
          const arriveMinutes = (nextStart + span) % (24 * 60);
          setEndDate(addDays(nextDate, dayOffset));
          setEndMinutes(arriveMinutes);
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
      if (target === 'new') setImportStatusLabel(undefined);
    }
  };

  const importRental = async (
    target: 'new' | string,
    source: RentalConfirmationImportSource,
  ) => {
    setImportingRentalTarget(target);
    if (target === 'new') {
      setRentalDetailsError(undefined);
      setImportStatusLabel(undefined);
    } else setEditedRentalDetailsError(undefined);
    await paintImportLoading();
    const pickerUi = confirmationPickerUi({
      onOpening: () => setImportingRentalTarget(undefined),
      onReading: () => setImportingRentalTarget(target),
    });
    try {
      const imported = await (target === 'new'
        ? runAddSheetImport(() =>
            importRentalConfirmation(
              {
                startDate: plan.startDate,
                endDate: plan.endDate,
              },
              source,
              pickerUi,
            ),
          )
        : importRentalConfirmation(
            {
              startDate: plan.startDate,
              endDate: plan.endDate,
            },
            source,
            pickerUi,
          ));
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
        setIsAddingItem(false);
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
      if (target === 'new') setImportStatusLabel(undefined);
    }
  };

  const chooseStayConfirmationImport = (target: 'new' | string) => {
    appPrompt.alert(
      'Import Stay Confirmation',
      'Choose a document, saved email, or up to 6 screenshots from Photos.',
      [
        {
          text: 'Photo Screenshots',
          onPress: () => void importStay(target, 'screenshots'),
        },
        {
          text: 'Document or Email',
          onPress: () => void importStay(target, 'document'),
        },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  };

  const importStay = async (
    target: 'new' | string,
    source: StayConfirmationImportSource,
  ) => {
    setImportingStayTarget(target);
    if (target === 'new') {
      setStayDetailsError(undefined);
      setImportStatusLabel(undefined);
    } else setEditedStayDetailsError(undefined);
    await paintImportLoading();
    const pickerUi = confirmationPickerUi({
      onOpening: () => setImportingStayTarget(undefined),
      onReading: () => setImportingStayTarget(target),
    });
    try {
      const imported = await (target === 'new'
        ? runAddSheetImport(() =>
            importStayConfirmation(
              {
                startDate: plan.startDate,
                endDate: plan.endDate,
              },
              source,
              pickerUi,
            ),
          )
        : importStayConfirmation(
            {
              startDate: plan.startDate,
              endDate: plan.endDate,
            },
            source,
            pickerUi,
          ));
      if (!imported) return;
      if (imported.amount !== undefined && imported.amount > 0 && target === 'new') {
        updatePlan(applyStayExpenseFromImport(plan, imported));
        appPrompt.alert(
          'Stay Expense Added',
          `${imported.currency ?? plan.baseCurrency} ${imported.amount.toFixed(2)} was added under Expenses. Review the stay details before saving.`,
        );
      }
      const mergeImportedDetails = (current: StayDetailsDraft): StayDetailsDraft => ({
        ...current,
        confirmationCode:
          imported.stay.confirmationCode || current.confirmationCode,
        reservationEmail:
          target === 'new'
            ? current.reservationEmail.trim() || accountEmail || ''
            : imported.stay.reservationEmail || current.reservationEmail,
        checkoutDate: imported.stay.checkoutDate || current.checkoutDate,
        checkoutMinutes:
          imported.stay.checkoutMinutes || current.checkoutMinutes,
        confirmationUris: imported.confirmationUris.length
          ? imported.confirmationUris
          : current.confirmationUris,
        notes: imported.stay.notes || current.notes,
        price:
          imported.stay.price !== undefined
            ? String(imported.stay.price)
            : current.price,
        currency: imported.stay.currency || current.currency,
      });
      if (target === 'new') {
        setError(undefined);
        setStayDetails((current) => mergeImportedDetails(current));
        setImportedStayFileName(imported.fileName);
        if (imported.title) setTitle(imported.title);
        if (imported.date) setDate(imported.date);
        if (imported.startMinutes !== undefined) {
          setStartMinutes(imported.startMinutes);
        }
        if (imported.stay.checkoutDate) setEndDate(imported.stay.checkoutDate);
        if (imported.stay.checkoutMinutes) {
          const minutes = Number(imported.stay.checkoutMinutes);
          if (Number.isFinite(minutes)) setEndMinutes(minutes);
        }
        if (imported.details) setDetails(imported.details.slice(0, DETAILS_MAX_LENGTH));
        if (imported.bookingUrl) setBookingUrl(imported.bookingUrl);
      } else {
        setEditedStayDetails((current) => mergeImportedDetails(current));
        setEditedStayFileName(imported.fileName);
      }
    } catch (reason) {
      const message =
        reason instanceof Error
          ? reason.message
          : 'The confirmation document could not be saved.';
      if (target === 'new') setStayDetailsError(message);
      else setEditedStayDetailsError(message);
    } finally {
      setImportingStayTarget(undefined);
      if (target === 'new') setImportStatusLabel(undefined);
    }
  };

  const sortedItinerary = [...itinerary].sort(
    (left, right) =>
      left.date.localeCompare(right.date) || left.startMinutes - right.startMinutes,
  );

  const transportCounts = {
    flights: sortedItinerary.filter((item) => item.kind === 'flight').length,
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
    setImportedFlightFileName(undefined);
    setFlightDetailsError(undefined);
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
      setDate(plan.startDate);
      setStartMinutes(9 * 60);
      setEndDate(plan.startDate);
      setEndMinutes(12 * 60);
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
    onAddPhotos: addPhotosToItem,
    onRemovePhoto: removePhotoFromItem,
    onRemove: confirmRemoveItem,
    onSaveNotes: saveItemNotes,
  };

  return (
    <View style={styles.root}>
      <Screen contentStyle={styles.screen} refresh={false}>
        <TravelPlanHero
          plan={plan}
          dateDisplayFormat={dateDisplayFormat}
          onAddPress={beginAddToTimeline}
        />

        <TravelTransportSections
          items={sortedItinerary}
          transportExpanded={isSectionExpanded('transport')}
          flightsExpanded={isSectionExpanded('flights')}
          staysExpanded={isSectionExpanded('stays')}
          rentalsExpanded={isSectionExpanded('rentals')}
          onToggleTransport={() => toggleSection('transport')}
          onToggleFlights={() => toggleSection('flights')}
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

      <TravelTimelineAddModal
        visible={isChoosingAddKind}
        onClose={() => setIsChoosingAddKind(false)}
        onSelect={chooseAddKind}
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
        importedFlightFileName={importedFlightFileName}
        importingFlight={importingFlightTarget === 'new'}
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
        onImportFlight={(source) => void importConfirmation('new', source)}
        onRentalDetailsChange={setRentalDetails}
        onImportRental={(source) => void importRental('new', source)}
        onStayDetailsChange={setStayDetails}
        onImportStay={(source) => void importStay('new', source)}
        onAdd={addItem}
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
  screen: { gap: spacing.xs, paddingTop: 0 },
});
