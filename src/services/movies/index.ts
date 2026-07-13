import { fetch } from 'expo/fetch';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import type { MovieDetails, MovieSearchResponse } from './types';

export type { MovieDetails, MovieSearchResult } from './types';

export class MovieServiceError extends Error {
  constructor(message: string, readonly status = 0) {
    super(message);
    this.name = 'MovieServiceError';
  }
}

function apiUrl(path: string): string {
  if (Platform.OS === 'web') return path;
  const developmentHost = __DEV__ ? Constants.expoConfig?.hostUri : undefined;
  const baseUrl = developmentHost
    ? `http://${developmentHost}`
    : process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, '');
  if (!baseUrl) throw new MovieServiceError('Movie search is not configured for this build.');
  return `${baseUrl}${path}`;
}

async function request<T>(path: string, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(apiUrl(path), { signal });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error;
    if (error instanceof MovieServiceError) throw error;
    throw new MovieServiceError('Unable to connect. Check your internet connection and try again.');
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => undefined)) as { error?: string } | undefined;
    throw new MovieServiceError(body?.error ?? 'Movie search is temporarily unavailable.', response.status);
  }
  return response.json() as Promise<T>;
}

export function searchMovies(query: string, signal?: AbortSignal) {
  return request<MovieSearchResponse>(`/api/movies/search?q=${encodeURIComponent(query.trim())}`, signal);
}

export function getMovieDetails(tmdbId: number, mediaType: 'movie' | 'tv' = 'movie', signal?: AbortSignal) {
  return request<MovieDetails>(`/api/movies/${tmdbId}?type=${mediaType}`, signal);
}
