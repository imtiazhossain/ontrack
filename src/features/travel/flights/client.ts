import Constants from 'expo-constants';
import { fetch } from 'expo/fetch';
import { Platform } from 'react-native';

import { authHeader } from '@/services/cloud/access-token';
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
  if (Platform.OS === 'web') return path;
  const developmentHost = __DEV__ ? Constants.expoConfig?.hostUri : undefined;
  const baseUrl = developmentHost
    ? `http://${developmentHost}`
    : process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, '');
  if (!baseUrl) {
    throw new FlightSearchError(
      'Live flight search is not connected in this build. Compare on Google Flights below.',
      'NOT_CONFIGURED',
    );
  }
  if (!__DEV__ && !baseUrl.startsWith('https://')) {
    throw new FlightSearchError(
      'Live flight search needs a secure hosted service. Compare on Google Flights below.',
      'NOT_CONFIGURED',
    );
  }
  return `${baseUrl}${path}`;
}

export async function searchFlights(
  input: FlightSearchInput,
  signal?: AbortSignal,
): Promise<FlightSearchResponse> {
  const requestController = new AbortController();
  const cancelRequest = () => requestController.abort();
  signal?.addEventListener('abort', cancelRequest, { once: true });
  const timeout = setTimeout(cancelRequest, FLIGHT_SEARCH_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(apiUrl('/travel/flights/search'), {
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
