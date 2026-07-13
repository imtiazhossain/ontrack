import { corsHeaders, normalizeMovieDetails, optionsResponse, tmdbRequest } from '@/services/movies/server';

export function OPTIONS() {
  return optionsResponse();
}

export async function GET(request: Request, { id }: { id: string }) {
  if (!/^\d+$/.test(id)) return Response.json({ error: 'Invalid movie ID.' }, { status: 400, headers: corsHeaders });
  const type = new URL(request.url).searchParams.get('type') ?? 'movie';
  if (type !== 'movie' && type !== 'tv') {
    return Response.json({ error: 'Invalid media type.' }, { status: 400, headers: corsHeaders });
  }
  const upstream = await tmdbRequest(`/${type}/${id}?language=en-US`);
  if (!(upstream instanceof Response) || !upstream.ok) return upstream;
  const movie = normalizeMovieDetails((await upstream.json()) as Record<string, unknown>, type);
  if (!movie) return Response.json({ error: 'Movie not found.' }, { status: 404, headers: corsHeaders });
  return Response.json(movie, { headers: corsHeaders });
}
