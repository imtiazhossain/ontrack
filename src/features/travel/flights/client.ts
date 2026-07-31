import { fetch } from 'expo/fetch';

import { authHeader } from '@/services/cloud/access-token';
import { resolveExpoApiUrl } from '@/services/http/api-url';
import type { FlightApiError, FlightSearchInput, FlightSearchResponse } from './types';

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
  const requestController = new AbortController();
  const cancelRequest = () => requestController.abort();
  signal?.addEventListener('abort', cancelRequest, { once: true });
  const timeout = setTimeout(cancelRequest, FLIGHT_SEARCH_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
      body: JSON.stringify(input),
      signal: requestController.signal,
    });
  } catch (error) {
    if (signal?.aborted) {
      const abortError = new Error('Flight search cancelled.');
      abortError.name = 'AbortError';
      throw abortError;
    }
    if (requestController.signal.aborted) {
      throw new FlightSearchError(
        'The flight service did not respond. Try again or compare on Google Flights.',
        'TIMEOUT',
      );
    }
    if (error instanceof FlightSearchError) throw error;
    throw new FlightSearchError('Unable to connect. Check your internet connection.', 'OFFLINE');
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', cancelRequest);
  }
  if (!response.ok) {
    const body = await response.json().catch(() => undefined) as FlightApiError | undefined;
    throw new FlightSearchError(
      body?.error ?? 'Flight search is temporarily unavailable.',
      body?.code,
      response.status,
    );
  }
  return response.json() as Promise<FlightSearchResponse>;
}
