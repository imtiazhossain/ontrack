import { apiRequest } from '@/services/http/api-client';
import { resolveExpoApiUrl } from '@/services/http/api-url';

import type { ImportedFlightConfirmation } from './flight-confirmation-import';
import type {
  FlightStatusInput,
  FlightStatusResponse,
} from './flights/types';
import type { TravelFlightLeg } from './types';

export class FlightStatusError extends Error {
  constructor(
    message: string,
    readonly code = 'PROVIDER_FAILURE',
    readonly status = 0,
  ) {
    super(message);
    this.name = 'FlightStatusError';
  }
}

function statusUrl(): string {
  return resolveExpoApiUrl('/travel/flights/status', {
    configuredBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
    requireHttpsInProduction: true,
    createNotConfiguredError: () =>
      new FlightStatusError('Free flight-status data is not configured.', 'NOT_CONFIGURED'),
  });
}

export function lookupFlightData(
  input: FlightStatusInput,
  signal?: AbortSignal,
): Promise<FlightStatusResponse> {
  return apiRequest<FlightStatusResponse, FlightStatusError>({
    url: statusUrl(),
    method: 'POST',
    body: input,
    signal,
    offlineMessage: 'Flight-status data needs an internet connection.',
    unavailableMessage: 'Free flight-status data is unavailable right now.',
    createError: (message, code, status) =>
      new FlightStatusError(message, code, status),
  });
}

function lookupInput(
  leg: TravelFlightLeg,
  mode: FlightStatusInput['mode'],
): FlightStatusInput | undefined {
  if (!leg.flightNumber || !leg.date) return undefined;
  return {
    flightNumber: leg.flightNumber,
    date: leg.date,
    departureAirport: leg.departureAirport,
    arrivalAirport: leg.arrivalAirport,
    mode,
  };
}

export async function enrichFlightConfirmationTerminals(
  imported: ImportedFlightConfirmation,
): Promise<ImportedFlightConfirmation> {
  const segments = await Promise.all(
    imported.segments.map(async (segment) => {
      if (
        segment.flight.departureTerminal &&
        segment.flight.arrivalTerminal &&
        segment.flight.departureGate &&
        segment.flight.arrivalGate
      ) {
        return segment;
      }
      const input = lookupInput(
        {
          flightNumber: segment.flight.flightNumber,
          date: segment.date,
          departureAirport: segment.flight.departureAirport,
          arrivalAirport: segment.flight.arrivalAirport,
        },
        'terminals',
      );
      if (!input) return segment;
      try {
        const result = await lookupFlightData(input);
        return {
          ...segment,
          flight: {
            ...segment.flight,
            departureTerminal:
              segment.flight.departureTerminal ||
              result.departureTerminal ||
              '',
            departureGate:
              segment.flight.departureGate || result.departureGate || '',
            arrivalTerminal:
              segment.flight.arrivalTerminal || result.arrivalTerminal || '',
            arrivalGate:
              segment.flight.arrivalGate || result.arrivalGate || '',
          },
        };
      } catch {
        return segment;
      }
    }),
  );
  const first = segments[0] ?? imported;
  return { ...imported, ...first, segments };
}

export function legFlightStatusInput(
  leg: TravelFlightLeg,
): FlightStatusInput | undefined {
  return lookupInput(leg, 'status');
}
