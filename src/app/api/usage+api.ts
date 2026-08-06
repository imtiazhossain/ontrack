import { apiCorsHeaders, apiOptionsResponse } from '@/services/http/cors';
import { buildApiUsageSnapshot } from '@/services/http/api-usage';

export function OPTIONS(request: Request) {
  return apiOptionsResponse(request, 'GET, OPTIONS');
}

/** Dev-facing snapshot of third-party services and in-process app rate limits. */
export async function GET(request: Request) {
  const snapshot = await buildApiUsageSnapshot(request);
  return Response.json(snapshot, {
    headers: apiCorsHeaders(request, 'GET, OPTIONS'),
  });
}
