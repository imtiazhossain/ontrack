import { guardedFetch } from '@/services/http/dependency-guard';
import { isDateKey } from '@/utils/date';

import type {
  FlightOperationalStatus,
  FlightStatusInput,
  FlightStatusResponse,
} from './types';

const RAPID_API_HOST = 'aerodatabox.p.rapidapi.com';
const TERMINAL_CACHE_MS = 24 * 60 * 60 * 1_000;
const STATUS_CACHE_MS = 5 * 60 * 1_000;

type CacheEntry = { value: FlightStatusResponse; expiresAt: number };
const cache = new Map<string, CacheEntry>();

function cleanText(value: unknown, limit: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const cleaned = value.trim().replace(/\s+/g, ' ').slice(0, limit);
  return cleaned || undefined;
}

function airportCode(value: unknown): string | undefined {
  const code = cleanText(value, 3)?.toUpperCase();
  return code && /^[A-Z]{3}$/.test(code) ? code : undefined;
}

export function validateFlightStatusInput(
  value: unknown,
): FlightStatusInput | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const input = value as Partial<FlightStatusInput>;
  const flightNumber = cleanText(input.flightNumber, 10)?.toUpperCase();
  if (
    !flightNumber ||
    !/^[A-Z0-9]{2,3}\s?\d{1,4}[A-Z]?$/.test(flightNumber) ||
    !isDateKey(input.date ?? '') ||
    (input.mode !== 'terminals' && input.mode !== 'status')
  ) {
    return undefined;
  }
  return {
    flightNumber,
    date: input.date!,
    departureAirport: airportCode(input.departureAirport),
    arrivalAirport: airportCode(input.arrivalAirport),
    mode: input.mode,
  };
}

function normalizedStatus(value: unknown): FlightOperationalStatus | undefined {
  const status = cleanText(value, 40)?.toLowerCase();
  if (!status) return undefined;
  const compact = status.replace(/[^a-z]/g, '');
  if (status.includes('cancel')) return 'cancelled';
  if (status.includes('divert')) return 'diverted';
  if (status.includes('land') || status.includes('arriv')) return 'landed';
  if (compact.includes('gateclosed')) return 'gate-closed';
  if (compact.includes('checkin')) return 'check-in';
  if (status.includes('board')) return 'boarding';
  if (status.includes('delay')) return 'delayed';
  if (status.includes('approach')) return 'approaching';
  if (
    status.includes('depart') ||
    status.includes('en route') ||
    compact.includes('enroute')
  ) {
    return 'departed';
  }
  if (status.includes('sched') || status.includes('expected')) return 'scheduled';
  return 'unknown';
}

function statusLabel(status?: FlightOperationalStatus): string | undefined {
  if (!status || status === 'unknown') return undefined;
  return {
    scheduled: 'On time',
    'check-in': 'Check-in open',
    boarding: 'Boarding',
    'gate-closed': 'Gate closed',
    departed: 'Departed',
    delayed: 'Delayed',
    approaching: 'Approaching',
    landed: 'Landed',
    cancelled: 'Cancelled',
    diverted: 'Diverted',
  }[status];
}

type ProviderAirport = {
  iata?: string;
  iataCode?: string;
};

type ProviderMovement = {
  airport?: ProviderAirport;
  terminal?: string;
  gate?: string;
};

type ProviderFlight = {
  status?: string;
  departure?: ProviderMovement;
  arrival?: ProviderMovement;
};

function movementAirport(movement?: ProviderMovement): string | undefined {
  return airportCode(movement?.airport?.iata ?? movement?.airport?.iataCode);
}

function selectFlight(
  rows: ProviderFlight[],
  input: FlightStatusInput,
): ProviderFlight | undefined {
  return (
    rows.find((row) => {
      const departure = movementAirport(row.departure);
      const arrival = movementAirport(row.arrival);
      return (
        (!input.departureAirport || departure === input.departureAirport) &&
        (!input.arrivalAirport || arrival === input.arrivalAirport)
      );
    }) ?? rows[0]
  );
}

function normalizedResponse(
  row: ProviderFlight,
  includeStatus: boolean,
): FlightStatusResponse {
  const status = includeStatus ? normalizedStatus(row.status) : undefined;
  return {
    departureTerminal: cleanText(row.departure?.terminal, 24),
    departureGate: cleanText(row.departure?.gate, 12),
    arrivalTerminal: cleanText(row.arrival?.terminal, 24),
    arrivalGate: cleanText(row.arrival?.gate, 12),
    ...(status ? { status, statusLabel: statusLabel(status) } : {}),
    checkedAt: new Date().toISOString(),
  };
}

export async function lookupFlightStatus(
  input: FlightStatusInput,
): Promise<FlightStatusResponse> {
  const apiKey = process.env.AERODATABOX_API_KEY?.trim();
  if (!apiKey) throw new Error('NOT_CONFIGURED');

  const cacheKey = [
    input.mode,
    input.flightNumber.replace(/\s/g, ''),
    input.date,
    input.departureAirport,
    input.arrivalAirport,
  ].join('|');
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const flightNumber = input.flightNumber.replace(/\s/g, '');
  const params = new URLSearchParams({
    dateLocalRole: 'Both',
    withAircraftImage: 'false',
    withLocation: 'false',
    withFlightPlan: 'false',
  });
  const response = await guardedFetch(
    'aerodatabox',
    `https://${RAPID_API_HOST}/flights/number/${encodeURIComponent(flightNumber)}/${input.date}?${params}`,
    {
      headers: {
        Accept: 'application/json',
        'x-rapidapi-host': RAPID_API_HOST,
        'x-rapidapi-key': apiKey,
      },
    },
    { timeoutMs: 12_000, maxConcurrency: 2 },
  );
  if (response.status === 429) throw new Error('RATE_LIMITED');
  if (response.status === 401 || response.status === 403) {
    throw new Error('NOT_CONFIGURED');
  }
  if (response.status === 204) throw new Error('NO_DATA');
  if (!response.ok) throw new Error('PROVIDER_FAILURE');

  const body = (await response.json()) as ProviderFlight | ProviderFlight[];
  const rows = Array.isArray(body) ? body : [body];
  const row = selectFlight(rows, input);
  if (!row) throw new Error('NO_DATA');
  const value = normalizedResponse(row, input.mode === 'status');
  cache.set(cacheKey, {
    value,
    expiresAt:
      Date.now() +
      (input.mode === 'status' ? STATUS_CACHE_MS : TERMINAL_CACHE_MS),
  });
  return value;
}
