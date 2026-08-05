import { apiRequest } from '@/services/http/api-client';
import { resolveExpoApiUrl } from '@/services/http/api-url';
import type { FlightSearchInput, FlightSearchResponse } from './types';

const FLIGHT_SEARCH_TIMEOUT_MS = 25_000;

export class FlightSearchError extends Error {
  constructor(
    message: string,
    readonly code = 'PROVIDER_FAILURE',
    readonly status = 0,
  ) {
    super(message);
    this.name = 'FlightSearchError';
  }
}

function apiUrl(path: string): string {
  return resolveExpoApiUrl(path, {
    configuredBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
    requireHttpsInProduction: true,
    createNotConfiguredError: (reason) =>
      new FlightSearchError(
        reason === 'insecure'
          ? 'Live flight search needs a secure hosted service. Compare on Google Flights below.'
          : 'Live flight search is not connected in this build. Compare on Google Flights below.',
        'NOT_CONFIGURED',
      ),
  });
}

export async function searchFlights(
  input: FlightSearchInput,
  signal?: AbortSignal,
): Promise<FlightSearchResponse> {
  const url = apiUrl('/travel/flights/search');
  try {
    return await apiRequest<FlightSearchResponse, FlightSearchError>({
      url,
      method: 'POST',
      body: input,
      signal,
      timeoutMs: FLIGHT_SEARCH_TIMEOUT_MS,
      offlineMessage: 'Unable to connect. Check your internet connection.',
      unavailableMessage: 'Flight search is temporarily unavailable.',
      createError: (message, code, status) =>
        new FlightSearchError(message, code, status),
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      if (signal?.aborted) {
        const abortError = new Error('Flight search cancelled.');
        abortError.name = 'AbortError';
        throw abortError;
      }
      throw new FlightSearchError(
        'The flight service did not respond. Try again or compare on Google Flights.',
        'TIMEOUT',
      );
    }
    if (error instanceof FlightSearchError) throw error;
    throw new FlightSearchError('Unable to connect. Check your internet connection.', 'OFFLINE');
  }
}
