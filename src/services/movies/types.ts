export interface MovieSearchResult {
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  title: string;
  releaseDate?: string;
  posterUrl?: string;
  overview: string;
}

export interface MovieDetails extends MovieSearchResult {
  runtimeMinutes?: number;
  genres: string[];
}

export interface MovieSearchResponse {
  results: MovieSearchResult[];
}
