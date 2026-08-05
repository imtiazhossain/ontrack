import {
  lookupFlightStatus,
  validateFlightStatusInput,
} from '@/features/travel/flights/status-server';
import {
  assertFlightsAuthenticated,
  flightCorsHeaders,
  flightOptionsResponse,
} from '@/features/travel/flights/server';

const lookupsByClient = new Map<string, { count: number; resetsAt: number }>();

export function OPTIONS(request: Request) {
  return flightOptionsResponse(request);
}

function errorResponse(reason: unknown) {
  const code =
    reason instanceof Error ? reason.message : 'PROVIDER_FAILURE';
  const status =
    code === 'NOT_CONFIGURED'
      ? 503
      : code === 'RATE_LIMITED'
        ? 429
        : code === 'NO_DATA'
          ? 404
          : 502;
  const error =
    code === 'RATE_LIMITED'
      ? 'Free flight-status data is unavailable right now.'
      : code === 'NO_DATA'
        ? 'No current flight-status data was found.'
        : code === 'NOT_CONFIGURED'
          ? 'Free flight-status data is not configured.'
          : 'Flight-status data is temporarily unavailable.';
  return Response.json(
    { error, code },
    { status, headers: flightCorsHeaders },
  );
}

export async function POST(request: Request) {
  const unauthorized = await assertFlightsAuthenticated(request);
  if (unauthorized) return unauthorized;

  const now = Date.now();
  const client =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  const existing = lookupsByClient.get(client);
  const usage =
    !existing || existing.resetsAt <= now
      ? { count: 0, resetsAt: now + 60_000 }
      : existing;
  usage.count += 1;
  lookupsByClient.set(client, usage);
  if (usage.count > 10) return errorResponse(new Error('RATE_LIMITED'));

  const input = validateFlightStatusInput(
    await request.json().catch(() => undefined),
  );
  if (!input) {
    return Response.json(
      { error: 'Enter a valid flight number and date.', code: 'INVALID_SEARCH' },
      { status: 400, headers: flightCorsHeaders },
    );
  }
  try {
    return Response.json(await lookupFlightStatus(input), {
      headers: flightCorsHeaders,
    });
  } catch (reason) {
    return errorResponse(reason);
  }
}
