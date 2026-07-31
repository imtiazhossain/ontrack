import {
    assertFlightsAuthenticated,
    flightCorsHeaders,
    flightOptionsResponse,
    searchFlightOffers,
    validateFlightSearch,
} from '@/features/travel/flights/server';
import { compressResponse } from '@/services/http/compression';

const searchesByClient = new Map<string, { count: number; resetsAt: number }>();

export function OPTIONS(request: Request) {
  return flightOptionsResponse(request);
}

export async function POST(request: Request) {
  const unauthorized = await assertFlightsAuthenticated(request);
  if (unauthorized) return unauthorized;

  const now = Date.now();
  const client = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  const existing = searchesByClient.get(client);
  const usage = !existing || existing.resetsAt <= now
    ? { count: 0, resetsAt: now + 60_000 }
    : existing;
  usage.count += 1;
  searchesByClient.set(client, usage);
  if (usage.count > 10) {
    return Response.json(
      { error: 'Too many flight searches. Try again in a minute.', code: 'RATE_LIMITED' },
      { status: 429, headers: flightCorsHeaders },
    );
  }

  const input = validateFlightSearch(await request.json().catch(() => undefined));
  if (!input) {
    return Response.json(
      { error: 'Enter valid airports, dates, travelers, and currency.', code: 'INVALID_SEARCH' },
      { status: 400, headers: flightCorsHeaders },
    );
  }
  return compressResponse(request, await searchFlightOffers(input));
}
