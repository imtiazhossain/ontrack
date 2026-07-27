import { plantCorsHeaders, plantError, plantOptionsResponse } from '@/services/plants/server';
import { searchPlantTaxa } from '@/services/plants/taxonomy';

export function OPTIONS() { return plantOptionsResponse(); }

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get('q')?.trim() ?? '';
  if (query.length < 2 || query.length > 80) {
    return plantError('Enter at least two characters to search for a plant.', 'INVALID_INPUT', 400);
  }
  return Response.json({ results: await searchPlantTaxa(query) }, { headers: plantCorsHeaders });
}
