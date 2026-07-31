import { apiRequest } from '@/services/http/api-client';
import { resolveExpoApiUrl } from '@/services/http/api-url';
import type { MovieDetails, MovieSearchResponse } from './types';

export type { MovieDetails, MovieSearchResult } from './types';

export class MovieServiceError extends Error {
  constructor(message: string, readonly status = 0) {
    super(message);
    this.name = 'MovieServiceError';
  }
}

function apiUrl(path: string): string {
  return resolveExpoApiUrl(path, {
    configuredBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
    createNotConfiguredError: () =>
      new MovieServiceError('Movie search is not configured for this build.'),
  });
}


async function request<T>(path: string, signal?: AbortSignal): Promise<T> {
  return apiRequest<T, MovieServiceError>({
    url: apiUrl(path),
    method: 'GET',
    signal,
    offlineMessage: __DEV__
      ? 'Movie search needs the Expo server. Run npm run ios and leave that terminal open, then try again.'
      : 'Unable to connect. Check your internet connection and try again.',
    unavailableMessage: 'Movie search is temporarily unavailable.',
    createError: (message, _code, status) => new MovieServiceError(message, status ?? 0),
  });
}

export function searchMovies(query: string, signal?: AbortSignal) {
  return request<MovieSearchResponse>(`/api/movies/search?q=${encodeURIComponent(query.trim())}`, signal);
}

export function getMovieDetails(tmdbId: number, mediaType: 'movie' | 'tv' = 'movie', signal?: AbortSignal) {
  return request<MovieDetails>(`/api/movies/${tmdbId}?type=${mediaType}`, signal);
}
