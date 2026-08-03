import { useState } from 'react';

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
import {
  emptyRentalDetailsDraft,
  rentalDetailsDraft,
  validateRentalDetails,
  type RentalDetailsDraft,
} from '@/features/travel/rental-details';
import {
  emptyStayDetailsDraft,
  stayDetailsDraft,
  validateStayDetails,
  type StayDetailsDraft,
} from '@/features/travel/stay-details';
import {
  validateTravelRangeSchedule,
  type TravelRangeScheduleDraft,
} from '@/features/travel/travel-range-schedule';
import type { TravelPlan } from '@/features/travel/types';

type ItineraryItem = TravelPlan['itinerary'][number];

/**
 * Inline flight/rental/stay details editing on the plan detail timeline.
 * Mutual exclusion: beginning one edit clears the others.
 */
export function useTravelPlanItemDetailsEdit({
  plan,
  itinerary,
  updatePlan,
}: {
  plan: TravelPlan;
  itinerary: TravelPlan['itinerary'];
  updatePlan: (next: TravelPlan) => void;
}) {
  const [editingFlightItemId, setEditingFlightItemId] = useState<string>();
  const [editedFlightDetails, setEditedFlightDetails] = useState<FlightDetailsDraft>(
    emptyFlightDetailsDraft,
  );
  const [editedFlightDetailsError, setEditedFlightDetailsError] = useState<string>();
  const [editedFlightFileName, setEditedFlightFileName] = useState<string>();

  const [editingRentalItemId, setEditingRentalItemId] = useState<string>();
  const [editedRentalDetails, setEditedRentalDetails] = useState<RentalDetailsDraft>(
    emptyRentalDetailsDraft,
  );
  const [editedRentalDetailsError, setEditedRentalDetailsError] = useState<string>();
  const [editedRentalFileName, setEditedRentalFileName] = useState<string>();

  const [editingStayItemId, setEditingStayItemId] = useState<string>();
  const [editedStayDetails, setEditedStayDetails] = useState<StayDetailsDraft>(
    emptyStayDetailsDraft,
  );
  const [editedStayDetailsError, setEditedStayDetailsError] = useState<string>();
  const [editedStayFileName, setEditedStayFileName] = useState<string>();

  const beginEditingFlightDetails = (
    itemId: string,
    currentDetails: ItineraryItem['flight'],
  ) => {
    setEditingRentalItemId(undefined);
    setEditingStayItemId(undefined);
    setEditingFlightItemId(itemId);
    setEditedFlightDetails(flightDetailsDraft(currentDetails));
    setEditedFlightDetailsError(undefined);
    setEditedFlightFileName(undefined);
  };

  const saveEditedFlightDetails = (itemId: string, schedule: FlightScheduleDraft) => {
    setEditedFlightDetailsError(undefined);
    const validation = validateFlightDetails(editedFlightDetails);
    if (!validation.ok) return setEditedFlightDetailsError(validation.error);
    const scheduleValidation = validateFlightSchedule(schedule, validation.value);
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
    currentDetails: ItineraryItem['rental'],
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
    currentDetails: ItineraryItem['stay'],
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

  return {
    editingFlightItemId,
    setEditingFlightItemId,
    editedFlightDetails,
    setEditedFlightDetails,
    editedFlightDetailsError,
    setEditedFlightDetailsError,
    editedFlightFileName,
    setEditedFlightFileName,
    editingRentalItemId,
    setEditingRentalItemId,
    editedRentalDetails,
    setEditedRentalDetails,
    editedRentalDetailsError,
    setEditedRentalDetailsError,
    editedRentalFileName,
    setEditedRentalFileName,
    editingStayItemId,
    setEditingStayItemId,
    editedStayDetails,
    setEditedStayDetails,
    editedStayDetailsError,
    setEditedStayDetailsError,
    editedStayFileName,
    setEditedStayFileName,
    beginEditingFlightDetails,
    saveEditedFlightDetails,
    beginEditingRentalDetails,
    saveEditedRentalDetails,
    beginEditingStayDetails,
    saveEditedStayDetails,
  };
}
