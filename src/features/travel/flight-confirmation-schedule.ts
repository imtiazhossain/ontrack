import { calculateFlightArrival } from './flight-arrival';
import type { ParsedFlightConfirmation } from './flight-confirmation-parser';

export interface ImportedFlightSchedule {
  departureDate?: string;
  departureMinutes?: number;
  arrivalDate?: string;
  arrivalMinutes?: number;
  durationMinutes?: number;
}

/** Dates/times for confirmation-driven editors, including connecting itineraries. */
export function flightConfirmationSchedule(
  imported: ParsedFlightConfirmation,
  fallback?: { date?: string; startMinutes?: number },
): ImportedFlightSchedule {
  const recognizedDates = imported.itineraryDates ?? [];
  const departureDate = imported.date || recognizedDates[0] || fallback?.date;
  const departureMinutes = imported.startMinutes ?? fallback?.startMinutes;
  const lastSegment = imported.segments.at(-1);
  const finalLegDate =
    lastSegment?.date || recognizedDates.at(-1) || departureDate;
  const finalLegStart = lastSegment?.startMinutes;
  const finalLegDuration = lastSegment?.durationMinutes;

  if (lastSegment?.arrivalDate && lastSegment.arrivalMinutes !== undefined) {
    return {
      departureDate,
      departureMinutes,
      arrivalDate: lastSegment.arrivalDate,
      arrivalMinutes: lastSegment.arrivalMinutes,
      durationMinutes: imported.durationMinutes,
    };
  }

  if (
    lastSegment &&
    finalLegDate &&
    finalLegStart !== undefined &&
    finalLegDuration !== undefined
  ) {
    const arrival = calculateFlightArrival({
      date: finalLegDate,
      startMinutes: finalLegStart,
      durationMinutes: finalLegDuration,
      departureAirport: lastSegment.flight.departureAirport,
      arrivalAirport: lastSegment.flight.arrivalAirport,
    });
    return {
      departureDate,
      departureMinutes,
      arrivalDate: arrival.date,
      arrivalMinutes: arrival.startMinutes,
      durationMinutes: imported.durationMinutes,
    };
  }

  if (
    departureDate &&
    departureMinutes !== undefined &&
    imported.durationMinutes !== undefined
  ) {
    const arrival = calculateFlightArrival({
      date: departureDate,
      startMinutes: departureMinutes,
      durationMinutes: imported.durationMinutes,
      departureAirport: imported.flight.departureAirport,
      arrivalAirport: imported.flight.arrivalAirport,
    });
    return {
      departureDate,
      departureMinutes,
      arrivalDate: arrival.date,
      arrivalMinutes: arrival.startMinutes,
      durationMinutes: imported.durationMinutes,
    };
  }

  return {
    departureDate,
    departureMinutes,
    arrivalDate: finalLegDate,
    durationMinutes: imported.durationMinutes,
  };
}
