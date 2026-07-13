import { corsHeaders, normalizeSearchMovie, optionsResponse, tmdbRequest } from '@/services/movies/server';

export function OPTIONS() {
  return optionsResponse();
}

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get('q')?.trim() ?? '';
  if (query.length < 2 || query.length > 100) {
    return Response.json({ error: 'Search must be between 2 and 100 characters.' }, { status: 400, headers: corsHeaders });
  }
  const upstream = await tmdbRequest(`/search/multi?query=${encodeURIComponent(query)}&include_adult=false&language=en-US&page=1`);
  if (!(upstream instanceof Response) || !upstream.ok) return upstream;
  const body = (await upstream.json()) as { results?: unknown[] };
  const results = Array.isArray(body.results)
    ? body.results
        .map((item) => normalizeSearchMovie(item as Record<string, unknown>))
        .filter((movie) => movie !== undefined)
    : [];
  return Response.json({ results }, { headers: corsHeaders });
}
