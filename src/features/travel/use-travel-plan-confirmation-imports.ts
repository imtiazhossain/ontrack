import { useRef, useState, type Dispatch, type SetStateAction } from 'react';

import { appPrompt } from '@/components/primitives';
import { applyImportedFlightsToPlan } from '@/features/travel/apply-imported-flights';
import { applyImportedRentalToPlan } from '@/features/travel/apply-imported-rental';
import {
  importFlightConfirmation,
  type FlightConfirmationImportSource,
} from '@/features/travel/flight-confirmation-import';
import { applyFlightExpenseFromImport } from '@/features/travel/flight-expense-from-import';
import {
  emptyFlightDetailsDraft,
  type FlightDetailsDraft,
} from '@/features/travel/flight-details';
import {
  importRentalConfirmation,
  type RentalConfirmationImportSource,
} from '@/features/travel/rental-confirmation-import';
import {
  emptyRentalDetailsDraft,
  type RentalDetailsDraft,
} from '@/features/travel/rental-details';
import {
  importStayConfirmation,
  type StayConfirmationImportSource,
} from '@/features/travel/stay-confirmation-import';
import {
  emptyStayDetailsDraft,
  type StayDetailsDraft,
} from '@/features/travel/stay-details';
import { applyStayExpenseFromImport } from '@/features/travel/stay-expense-from-import';
import { DETAILS_MAX_LENGTH } from '@/features/travel/travel-itinerary-form';
import type { TravelItemKind, TravelPlan } from '@/features/travel/types';
import { newId } from '@/store/schedule';
import { addDays } from '@/utils/date';

type SetStr = Dispatch<SetStateAction<string>>;
type SetOptStr = Dispatch<SetStateAction<string | undefined>>;
type SetNum = Dispatch<SetStateAction<number | null>>;

/** Add-sheet field setters the confirmation importers write into for `target === 'new'`. */
export type TravelPlanAddSheetImportBindings = {
  date: string;
  startMinutes: number | null;
  setTitle: SetStr;
  setDetails: SetStr;
  setBookingUrl: SetStr;
  setDate: SetStr;
  setStartMinutes: SetNum;
  setEndDate: SetStr;
  setEndMinutes: SetNum;
  setDuration: SetStr;
  setKind: Dispatch<SetStateAction<TravelItemKind>>;
  setIsAddingItem: Dispatch<SetStateAction<boolean>>;
  setError: SetOptStr;
  setFlightDetails: Dispatch<SetStateAction<FlightDetailsDraft>>;
  setFlightDetailsError: SetOptStr;
  setImportedFlightFileName: SetOptStr;
  setRentalDetails: Dispatch<SetStateAction<RentalDetailsDraft>>;
  setRentalDetailsError: SetOptStr;
  setImportedRentalFileName: SetOptStr;
  setStayDetails: Dispatch<SetStateAction<StayDetailsDraft>>;
  setStayDetailsError: SetOptStr;
  setImportedStayFileName: SetOptStr;
};

type EditBindings = {
  setEditingFlightItemId: SetOptStr;
  setEditedFlightDetails: Dispatch<SetStateAction<FlightDetailsDraft>>;
  setEditedFlightDetailsError: SetOptStr;
  setEditedFlightFileName: SetOptStr;
  setEditingRentalItemId: SetOptStr;
  setEditedRentalDetailsError: SetOptStr;
  setEditingStayItemId: SetOptStr;
  setEditedStayDetails: Dispatch<SetStateAction<StayDetailsDraft>>;
  setEditedStayDetailsError: SetOptStr;
  setEditedStayFileName: SetOptStr;
};

/**
 * Flight/rental/stay confirmation document import for plan detail
 * (add sheet + inline item edit). Owns importing*Target + status label.
 */
export function useTravelPlanConfirmationImports({
  plan,
  updatePlan,
  accountEmail,
  addSheet,
  edit,
}: {
  plan: TravelPlan;
  updatePlan: (next: TravelPlan) => void;
  accountEmail?: string;
  addSheet: TravelPlanAddSheetImportBindings;
  edit: EditBindings;
}) {
  const [importingFlightTarget, setImportingFlightTarget] = useState<string>();
  const [importingRentalTarget, setImportingRentalTarget] = useState<string>();
  const [importingStayTarget, setImportingStayTarget] = useState<string>();
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

  const importConfirmation = async (
    target: 'new' | string,
    source: FlightConfirmationImportSource,
  ) => {
    setImportingFlightTarget(target);
    if (target === 'new') {
      addSheet.setFlightDetailsError(undefined);
      setImportStatusLabel(undefined);
    } else edit.setEditedFlightDetailsError(undefined);
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
        edit.setEditingFlightItemId(undefined);
        if (target === 'new') {
          addSheet.setTitle('');
          addSheet.setDetails('');
          addSheet.setBookingUrl('');
          addSheet.setFlightDetails(emptyFlightDetailsDraft());
          addSheet.setImportedFlightFileName(undefined);
          addSheet.setIsAddingItem(false);
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
        addSheet.setFlightDetails((current) => mergeImportedDetails(current));
        addSheet.setImportedFlightFileName(imported.fileName);
        if (imported.title) addSheet.setTitle(imported.title);
        const nextDate = imported.date || addSheet.date;
        const nextStart =
          imported.startMinutes !== undefined
            ? imported.startMinutes
            : (addSheet.startMinutes ?? 9 * 60);
        if (imported.date) addSheet.setDate(imported.date);
        if (imported.startMinutes !== undefined) {
          addSheet.setStartMinutes(imported.startMinutes);
        }
        if (imported.durationMinutes !== undefined) {
          addSheet.setDuration(String(imported.durationMinutes));
          const span = imported.durationMinutes;
          const dayOffset = Math.floor((nextStart + span) / (24 * 60));
          const arriveMinutes = (nextStart + span) % (24 * 60);
          addSheet.setEndDate(addDays(nextDate, dayOffset));
          addSheet.setEndMinutes(arriveMinutes);
        }
      } else {
        edit.setEditedFlightDetails((current) => mergeImportedDetails(current));
        edit.setEditedFlightFileName(imported.fileName);
      }
    } catch (reason) {
      const message =
        reason instanceof Error
          ? reason.message
          : 'The confirmation document could not be read.';
      if (target === 'new') addSheet.setFlightDetailsError(message);
      else edit.setEditedFlightDetailsError(message);
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
      addSheet.setRentalDetailsError(undefined);
      setImportStatusLabel(undefined);
    } else edit.setEditedRentalDetailsError(undefined);
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
      edit.setEditingRentalItemId(undefined);
      addSheet.setKind('rental');
      if (target === 'new') {
        addSheet.setTitle('');
        addSheet.setDetails('');
        addSheet.setBookingUrl('');
        addSheet.setRentalDetails(emptyRentalDetailsDraft());
        addSheet.setImportedRentalFileName(undefined);
        addSheet.setIsAddingItem(false);
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
      if (target === 'new') addSheet.setRentalDetailsError(message);
      else edit.setEditedRentalDetailsError(message);
    } finally {
      setImportingRentalTarget(undefined);
      if (target === 'new') setImportStatusLabel(undefined);
    }
  };

  const importStay = async (
    target: 'new' | string,
    source: StayConfirmationImportSource,
  ) => {
    setImportingStayTarget(target);
    if (target === 'new') {
      addSheet.setStayDetailsError(undefined);
      setImportStatusLabel(undefined);
    } else edit.setEditedStayDetailsError(undefined);
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
        addSheet.setError(undefined);
        addSheet.setStayDetails((current) => mergeImportedDetails(current));
        addSheet.setImportedStayFileName(imported.fileName);
        if (imported.title) addSheet.setTitle(imported.title);
        if (imported.date) addSheet.setDate(imported.date);
        if (imported.startMinutes !== undefined) {
          addSheet.setStartMinutes(imported.startMinutes);
        }
        if (imported.stay.checkoutDate) addSheet.setEndDate(imported.stay.checkoutDate);
        if (imported.stay.checkoutMinutes) {
          const minutes = Number(imported.stay.checkoutMinutes);
          if (Number.isFinite(minutes)) addSheet.setEndMinutes(minutes);
        }
        if (imported.details) {
          addSheet.setDetails(imported.details.slice(0, DETAILS_MAX_LENGTH));
        }
        if (imported.bookingUrl) addSheet.setBookingUrl(imported.bookingUrl);
      } else {
        edit.setEditedStayDetails((current) => mergeImportedDetails(current));
        edit.setEditedStayFileName(imported.fileName);
      }
    } catch (reason) {
      const message =
        reason instanceof Error
          ? reason.message
          : 'The confirmation document could not be saved.';
      if (target === 'new') addSheet.setStayDetailsError(message);
      else edit.setEditedStayDetailsError(message);
    } finally {
      setImportingStayTarget(undefined);
      if (target === 'new') setImportStatusLabel(undefined);
    }
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

  return {
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
  };
}
