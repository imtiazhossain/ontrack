import { normalizeMovieDetails, normalizeSearchMovie } from './normalize';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export function optionsResponse() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function tmdbRequest(path: string) {
  const token = process.env.TMDB_READ_ACCESS_TOKEN;
  if (!token) return Response.json({ error: 'Movie service is not configured.' }, { status: 503, headers: corsHeaders });

  try {
    const response = await fetch(`${TMDB_BASE_URL}${path}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    if (response.status === 429) {
      return Response.json({ error: 'Too many movie searches. Please try again shortly.' }, { status: 429, headers: corsHeaders });
    }
    if (!response.ok) {
      const status = response.status === 404 ? 404 : 502;
      return Response.json({ error: status === 404 ? 'Movie not found.' : 'Movie provider is temporarily unavailable.' }, { status, headers: corsHeaders });
    }
    return response;
  } catch {
    return Response.json({ error: 'Movie provider is temporarily unavailable.' }, { status: 502, headers: corsHeaders });
  }
}

export { normalizeMovieDetails, normalizeSearchMovie };

