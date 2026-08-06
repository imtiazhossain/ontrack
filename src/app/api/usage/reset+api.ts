import {
  apiRateLimitSubject,
  authenticateApiRequest,
} from '@/services/http/api-auth';
import { resetApiRateLimitsForSubject } from '@/services/http/api-rate-limit';
import { apiCorsHeaders, apiOptionsResponse } from '@/services/http/cors';

export function OPTIONS(request: Request) {
  return apiOptionsResponse(request, 'POST, OPTIONS');
}

/** Clears in-process paid API buckets for the caller (dev diagnostic). */
export async function POST(request: Request) {
  if (process.env.NODE_ENV === 'production') {
    return Response.json(
      { error: 'Rate-limit reset is disabled in production.', code: 'FORBIDDEN' },
      { status: 403, headers: apiCorsHeaders(request, 'POST, OPTIONS') },
    );
  }
  const auth = await authenticateApiRequest(request);
  const subject = apiRateLimitSubject(request, auth);
  resetApiRateLimitsForSubject(subject);
  return Response.json(
    { ok: true, subject },
    { headers: apiCorsHeaders(request, 'POST, OPTIONS') },
  );
}
