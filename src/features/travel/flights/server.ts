import { normalizeFlightOffers } from './normalize';
import type { FlightSearchInput, FlightSearchResponse } from './types';
import { isDateKey } from '@/utils/date';

const TEST_BASE_URL = 'https://test.api.amadeus.com';
const LIVE_BASE_URL = 'https://api.amadeus.com';

let cachedToken: { value: string; expiresAt: number } | undefined;

export const flightCorsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-store',
};

export function flightOptionsResponse() {
  return new Response(null, { status: 204, headers: flightCorsHeaders });
}

function errorResponse(
  error: string,
  code: 'INVALID_SEARCH' | 'NOT_CONFIGURED' | 'NO_AIRPORT' | 'RATE_LIMITED' | 'PROVIDER_FAILURE',
  status: number,
) {
  return Response.json({ error, code }, { status, headers: flightCorsHeaders });
}

function providerConfig() {
  const clientId = process.env.AMADEUS_CLIENT_ID;
  const clientSecret = process.env.AMADEUS_CLIENT_SECRET;
  const dataMode = process.env.AMADEUS_ENVIRONMENT === 'production' ? 'live' as const : 'test' as const;
  return {
    clientId,
    clientSecret,
    dataMode,
    baseUrl: dataMode === 'live' ? LIVE_BASE_URL : TEST_BASE_URL,
  };
}

async function accessToken(baseUrl: string, clientId: string, clientSecret: string) {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
  });
  const response = await fetch(`${baseUrl}/v1/security/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error('AUTH_FAILED');
  const json = await response.json() as { access_token?: string; expires_in?: number };
  if (!json.access_token) throw new Error('AUTH_FAILED');
  cachedToken = {
    value: json.access_token,
    expiresAt: Date.now() + Math.max(60, json.expires_in ?? 1_800) * 1_000,
  };
  return cachedToken.value;
}

async function airportCode(baseUrl: string, token: string, value: string): Promise<string | undefined> {
  const normalized = value.trim().toUpperCase();
  if (/^[A-Z]{3}$/.test(normalized)) return normalized;
  const params = new URLSearchParams({
    subType: 'AIRPORT,CITY',
    keyword: value.trim(),
    view: 'LIGHT',
  });
  const response = await fetch(`${baseUrl}/v1/reference-data/locations?${params}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) return undefined;
  const body = await response.json() as {
    data?: { iataCode?: string; address?: { cityName?: string } }[];
  };
  return body.data?.find((item) => item.iataCode)?.iataCode;
}

export function validateFlightSearch(value: unknown): FlightSearchInput | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const input = value as Partial<FlightSearchInput>;
  if (
    typeof input.origin !== 'string' ||
    typeof input.destination !== 'string' ||
    input.origin.trim().length < 3 ||
    input.origin.length > 80 ||
    input.destination.trim().length < 3 ||
    input.destination.length > 80 ||
    !isDateKey(input.departureDate ?? '') ||
    !isDateKey(input.returnDate ?? '') ||
    input.returnDate! < input.departureDate! ||
    !Number.isInteger(input.adults) ||
    input.adults! < 1 ||
    input.adults! > 9 ||
    !/^[A-Z]{3}$/.test(input.currencyCode ?? '')
  ) {
    return undefined;
  }
  return input as FlightSearchInput;
}

export async function searchFlightOffers(input: FlightSearchInput): Promise<Response> {
  const { clientId, clientSecret, dataMode, baseUrl } = providerConfig();
  if (!clientId || !clientSecret) {
    return errorResponse('Live flight search is not configured yet.', 'NOT_CONFIGURED', 503);
  }

  try {
    const token = await accessToken(baseUrl, clientId, clientSecret);
    const [originCode, destinationCode] = await Promise.all([
      airportCode(baseUrl, token, input.origin),
      airportCode(baseUrl, token, input.destination),
    ]);
    if (!originCode || !destinationCode) {
      return errorResponse(
        'We could not find one of those airports. Try a three-letter airport code.',
        'NO_AIRPORT',
        422,
      );
    }
    const params = new URLSearchParams({
      originLocationCode: originCode,
      destinationLocationCode: destinationCode,
      departureDate: input.departureDate,
      returnDate: input.returnDate,
      adults: String(input.adults),
      currencyCode: input.currencyCode,
      max: '20',
    });
    const response = await fetch(`${baseUrl}/v2/shopping/flight-offers?${params}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(20_000),
    });
    if (response.status === 429) {
      return errorResponse('Flight search is busy. Try again shortly.', 'RATE_LIMITED', 429);
    }
    if (!response.ok) {
      return errorResponse('Flight prices are temporarily unavailable.', 'PROVIDER_FAILURE', 502);
    }
    const body = await response.json() as {
      data?: unknown[];
      dictionaries?: { carriers?: Record<string, string> };
    };
    const result: FlightSearchResponse = {
      originCode,
      destinationCode,
      offers: normalizeFlightOffers(
        Array.isArray(body.data) ? body.data : [],
        body.dictionaries?.carriers ?? {},
      ),
      searchedAt: new Date().toISOString(),
      dataMode,
    };
    return Response.json(result, { headers: flightCorsHeaders });
  } catch {
    return errorResponse('Flight prices are temporarily unavailable.', 'PROVIDER_FAILURE', 502);
  }
}
