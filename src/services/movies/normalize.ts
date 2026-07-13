import type { MovieDetails, MovieSearchResult } from './types';

const POSTER_BASE_URL = 'https://image.tmdb.org/t/p/w500';

type RawSearchMovie = {
  id?: unknown;
  title?: unknown;
  release_date?: unknown;
  poster_path?: unknown;
  overview?: unknown;
  adult?: unknown;
  media_type?: unknown;
  name?: unknown;
  first_air_date?: unknown;
};

type RawMovieDetails = RawSearchMovie & {
  runtime?: unknown;
  genres?: unknown;
  episode_run_time?: unknown;
};

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function posterUrl(path: unknown): string | undefined {
  const value = stringValue(path);
  return value ? `${POSTER_BASE_URL}${value.startsWith('/') ? value : `/${value}`}` : undefined;
}

export function normalizeSearchMovie(raw: RawSearchMovie): MovieSearchResult | undefined {
  if (raw.adult === true || typeof raw.id !== 'number') return undefined;
  const mediaType = raw.media_type === 'tv' ? 'tv' : raw.media_type === 'movie' || raw.media_type === undefined ? 'movie' : undefined;
  if (!mediaType) return undefined;
  const title = stringValue(mediaType === 'tv' ? raw.name : raw.title);
  if (!title) return undefined;
  return {
    tmdbId: raw.id,
    mediaType,
    title,
    releaseDate: stringValue(mediaType === 'tv' ? raw.first_air_date : raw.release_date),
    posterUrl: posterUrl(raw.poster_path),
    overview: stringValue(raw.overview) ?? '',
  };
}

export function normalizeMovieDetails(raw: RawMovieDetails, mediaType: 'movie' | 'tv' = 'movie'): MovieDetails | undefined {
  const base = normalizeSearchMovie({ ...raw, media_type: mediaType });
  if (!base) return undefined;
  const episodeRuntime = Array.isArray(raw.episode_run_time)
    ? raw.episode_run_time.find((value): value is number => typeof value === 'number' && value > 0)
    : undefined;
  const runtime = typeof raw.runtime === 'number' && raw.runtime > 0 ? raw.runtime : episodeRuntime;
  const genres = Array.isArray(raw.genres)
    ? raw.genres
        .map((genre) =>
          genre && typeof genre === 'object' && 'name' in genre ? stringValue(genre.name) : undefined,
        )
        .filter((genre): genre is string => Boolean(genre))
    : [];
  return { ...base, runtimeMinutes: runtime, genres };
}
