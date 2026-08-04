import { compressResponse } from '@/services/http/compression';
import { gatePaidApiRequest } from '@/services/http/api-gate';
import { apiCorsHeaders, apiOptionsResponse } from '@/services/http/cors';
import { analyzeFlightConfirmationWithGemini } from '@/services/travel/flight-confirmation-ai-server';
import { redactFlightConfirmationText } from '@/services/travel/flight-confirmation-redaction';

const MAX_REQUEST_TEXT = 140_000;

function errorResponse(error: string, code: string, status: number, request?: Request) {
  return Response.json(
    { error, code },
    { status, headers: apiCorsHeaders(request) },
  );
}

export function OPTIONS(request: Request) {
  return apiOptionsResponse(request);
}

export async function POST(request: Request) {
  if (!process.env.GEMINI_API_KEY?.trim()) {
    return errorResponse(
      'Flight import AI is not configured.',
      'NOT_CONFIGURED',
      503,
      request,
    );
  }
  const gate = await gatePaidApiRequest(request, 'flights');
  if (gate === 'unauthenticated') {
    return errorResponse('Sign in to use assisted flight import.', 'PERMISSION_DENIED', 401, request);
  }
  if (gate === 'rate_limited') {
    return errorResponse('Too many flight imports. Try again later.', 'RATE_LIMITED', 429, request);
  }

  const input = (await request.json().catch(() => undefined)) as
    | { redactedText?: unknown }
    | undefined;
  if (
    typeof input?.redactedText !== 'string' ||
    !input.redactedText.trim() ||
    input.redactedText.length > MAX_REQUEST_TEXT
  ) {
    return errorResponse('The itinerary text is invalid or too large.', 'INVALID_TEXT', 400, request);
  }

  try {
    // Defense in depth: never trust a client to have applied the privacy filter.
    const privacy = redactFlightConfirmationText(input.redactedText);
    const result = await analyzeFlightConfirmationWithGemini(privacy.text);
    return compressResponse(
      request,
      Response.json(result, { headers: apiCorsHeaders(request) }),
    );
  } catch (error) {
    const code = error instanceof Error ? error.message : 'PROVIDER_FAILURE';
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[flightConfirmationParse]', code);
    }
    if (code === 'RATE_LIMITED') {
      return errorResponse('The free parser quota is busy. Local import was kept.', code, 429, request);
    }
    if (code === 'NO_FLIGHTS_FOUND') {
      return errorResponse('No reliable flight segments were found.', code, 422, request);
    }
    return errorResponse('Assisted flight parsing is temporarily unavailable.', 'PROVIDER_FAILURE', 502, request);
  }
}
