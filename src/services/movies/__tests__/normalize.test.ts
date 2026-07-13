import { normalizeMovieDetails, normalizeSearchMovie } from '@/services/movies/normalize';

describe('TMDB movie normalization', () => {
  it('normalizes search fields and poster URLs', () => {
    expect(
      normalizeSearchMovie({
        id: 1,
        title: 'Arrival',
        release_date: '2016-11-10',
        poster_path: '/poster.jpg',
        overview: 'First contact.',
        adult: false,
      }),
    ).toEqual({
      tmdbId: 1,
      mediaType: 'movie',
      title: 'Arrival',
      releaseDate: '2016-11-10',
      posterUrl: 'https://image.tmdb.org/t/p/w500/poster.jpg',
      overview: 'First contact.',
    });
  });

  it('handles missing optional metadata', () => {
    expect(normalizeMovieDetails({ id: 2, title: 'Unknown', overview: '', genres: [] })).toEqual({
      tmdbId: 2,
      mediaType: 'movie',
      title: 'Unknown',
      overview: '',
      genres: [],
    });
  });

  it('filters adult and malformed search results', () => {
    expect(normalizeSearchMovie({ id: 3, title: 'Hidden', adult: true })).toBeUndefined();
    expect(normalizeSearchMovie({ id: 'bad', title: 'Bad ID' })).toBeUndefined();
    expect(normalizeSearchMovie({ id: 4, title: '' })).toBeUndefined();
  });

  it('normalizes runtime and valid genre names', () => {
    expect(
      normalizeMovieDetails({
        id: 5,
        title: 'Dune',
        runtime: 155,
        genres: [{ id: 1, name: 'Science Fiction' }, { id: 2 }, null],
      }),
    ).toMatchObject({ runtimeMinutes: 155, genres: ['Science Fiction'] });
  });

  it('normalizes TV search and episode runtime', () => {
    expect(
      normalizeSearchMovie({
        id: 6,
        media_type: 'tv',
        name: 'The Bear',
        first_air_date: '2022-06-23',
        overview: 'A chef returns home.',
      }),
    ).toMatchObject({ tmdbId: 6, mediaType: 'tv', title: 'The Bear', releaseDate: '2022-06-23' });

    expect(
      normalizeMovieDetails(
        { id: 6, name: 'The Bear', episode_run_time: [31], genres: [{ name: 'Drama' }] },
        'tv',
      ),
    ).toMatchObject({ mediaType: 'tv', title: 'The Bear', runtimeMinutes: 31, genres: ['Drama'] });
  });

  it('filters people from multi-search results', () => {
    expect(normalizeSearchMovie({ id: 7, media_type: 'person', name: 'Someone' })).toBeUndefined();
  });
});
