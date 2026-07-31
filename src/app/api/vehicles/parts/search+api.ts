import {
  buildPartsSearchResults,
  jsonResponse,
  optionsResponse,
} from '@/services/vehicles/server';

export function OPTIONS(request: Request) {
  return optionsResponse(request);
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const yearRaw = params.get('year');
  const year = yearRaw ? Number(yearRaw) : undefined;
  const results = buildPartsSearchResults({
    year: Number.isFinite(year) ? year : undefined,
    make: params.get('make') ?? undefined,
    model: params.get('model') ?? undefined,
    trim: params.get('trim') ?? undefined,
    engine: params.get('engine') ?? undefined,
    query: params.get('q') ?? undefined,
  });
  return jsonResponse(request, { results });
}
