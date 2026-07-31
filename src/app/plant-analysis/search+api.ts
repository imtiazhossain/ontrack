import { compressResponse } from '@/services/http/compression';
import {
    assertPlantAuthenticated,
    plantCorsHeaders,
    plantError,
    plantOptionsResponse,
} from '@/services/plants/server';
import { searchPlantTaxa } from '@/services/plants/taxonomy';

export function OPTIONS(request: Request) {
  return plantOptionsResponse(request);
}

export async function GET(request: Request) {
  const unauthorized = await assertPlantAuthenticated(request);
  if (unauthorized) return unauthorized;
  const query = new URL(request.url).searchParams.get('q')?.trim() ?? '';
  if (query.length < 2 || query.length > 80) {
    return plantError('Enter at least two characters to search for a plant.', 'INVALID_INPUT', 400);
  }
  return compressResponse(
    request,
    Response.json({ results: await searchPlantTaxa(query) }, { headers: plantCorsHeaders }),
  );
}
