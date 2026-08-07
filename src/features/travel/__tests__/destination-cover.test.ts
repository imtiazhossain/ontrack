import {
    destinationCoverCandidates,
    enlargeWikimediaThumb,
    isAllowedDestinationCoverImageUrl,
    isDirectClientCoverUrl,
    isUsableDestinationPhotoUrl,
    localTripCoverUri,
    mergeDestinationCoverUrls,
    proxyDestinationCoverImageUrl,
    stayCoverCandidates,
} from '../destination-cover';
import type { TravelPlan } from '../types';

jest.mock('@/services/http/api-url', () => ({
  resolveExpoApiUrl: (path: string) => `http://localhost:8081${path}`,
}));

jest.mock('@/features/travel/travel-moment-media', () => ({
  persistTravelMomentPhotos: jest.fn(),
  resolveTravelPhotoUris: (uris?: string[]) =>
    (uris ?? []).filter((uri) => typeof uri === 'string' && uri.length > 0),
}));

function plan(partial: Partial<TravelPlan>): TravelPlan {
  return {
    id: 'plan-1',
    title: 'Trip',
    destination: '',
    startDate: '2026-08-01',
    endDate: '2026-08-08',
    itinerary: [],
    participants: [],
    baseCurrency: 'USD',
    expenses: [],
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    ...partial,
  };
}

describe('destinationCoverCandidates', () => {
  it('prefers the city before the country for comma destinations', () => {
    expect(
      destinationCoverCandidates(
        plan({ title: 'Iceland', destination: 'Reykjavík, Iceland' }),
      ),
    ).toEqual(['Reykjavík', 'Reykjavík, Iceland', 'Iceland']);
  });

  it('falls back to the trip title when destination is empty', () => {
    expect(destinationCoverCandidates(plan({ title: 'Lisbon', destination: '' }))).toEqual([
      'Lisbon',
    ]);
  });

  it('dedupes case-insensitively', () => {
    expect(
      destinationCoverCandidates(plan({ title: 'paris', destination: 'Paris' })),
    ).toEqual(['Paris']);
  });
});

describe('stayCoverCandidates', () => {
  it('prefers the hotel title then geographic address parts', () => {
    expect(
      stayCoverCandidates(
        'Hotel Avenida Palace',
        'Rua 1.º Dezembro 123, Lisboa, Portugal',
      ),
    ).toEqual([
      'Hotel Avenida Palace',
      'Lisboa',
      'Portugal',
      'Rua 1.º Dezembro 123, Lisboa, Portugal',
    ]);
  });

  it('skips generic stay titles and still uses the address', () => {
    expect(stayCoverCandidates('Demo Stay', 'Lisbon, Portugal')).toEqual([
      'Lisbon',
      'Portugal',
      'Lisbon, Portugal',
    ]);
  });
});

describe('isUsableDestinationPhotoUrl', () => {
  it('accepts https photo urls', () => {
    expect(
      isUsableDestinationPhotoUrl(
        'https://upload.wikimedia.org/wikipedia/commons/a/a1/Paris.jpg',
      ),
    ).toBe(true);
  });

  it('rejects svg flags and maps', () => {
    expect(
      isUsableDestinationPhotoUrl(
        'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/Flag_of_Iceland.svg/330px-Flag_of_Iceland.svg.png',
      ),
    ).toBe(false);
    expect(
      isUsableDestinationPhotoUrl(
        'https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Iceland_Mid-Atlantic_Ridge_map.svg/330px-map.svg.png',
      ),
    ).toBe(false);
  });

  it('rejects non-https urls', () => {
    expect(isUsableDestinationPhotoUrl('http://example.com/photo.jpg')).toBe(false);
  });

  it('rejects watermarked Unsplash+ preview urls', () => {
    expect(
      isUsableDestinationPhotoUrl(
        'https://plus.unsplash.com/premium_photo-1677344289076-b4e8d7325e94?w=1080',
      ),
    ).toBe(false);
    expect(
      isUsableDestinationPhotoUrl(
        'https://images.unsplash.com/photo-1585208798174-6cedd86e019a?w=1080',
      ),
    ).toBe(true);
  });
});

describe('enlargeWikimediaThumb', () => {
  it('bumps the thumb width segment', () => {
    expect(
      enlargeWikimediaThumb(
        'https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/Reykjavik.jpg/330px-Reykjavik.jpg',
      ),
    ).toBe(
      'https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/Reykjavik.jpg/800px-Reykjavik.jpg',
    );
  });
});

describe('destination cover image proxy', () => {
  it('allowlists Wikimedia upload hosts and rejects arbitrary https', () => {
    expect(
      isAllowedDestinationCoverImageUrl(
        'https://upload.wikimedia.org/wikipedia/commons/a/a1/Paris.jpg',
      ),
    ).toBe(true);
    expect(
      isAllowedDestinationCoverImageUrl('https://evil.example/photo.jpg'),
    ).toBe(false);
  });

  it('builds a proxied API URL for allowed remotes', () => {
    const remote =
      'https://upload.wikimedia.org/wikipedia/commons/a/a1/Paris.jpg';
    const proxied = proxyDestinationCoverImageUrl(remote);
    expect(proxied).toContain('/api/destination-cover-image?src=');
    expect(proxied).toContain(encodeURIComponent(remote));
  });
});

describe('isDirectClientCoverUrl', () => {
  it('accepts Unsplash CDN urls and rejects Wikimedia', () => {
    expect(
      isDirectClientCoverUrl(
        'https://images.unsplash.com/photo-1585208798174-6cedd86e019a?w=1080',
      ),
    ).toBe(true);
    expect(
      isDirectClientCoverUrl(
        'https://upload.wikimedia.org/wikipedia/commons/a/a1/Paris.jpg',
      ),
    ).toBe(false);
  });
});

describe('mergeDestinationCoverUrls', () => {
  it('keeps a direct-loadable backup when the primary list is proxy-only', () => {
    const wiki =
      'https://upload.wikimedia.org/wikipedia/commons/a/a1/Paris.jpg';
    const wiki2 =
      'https://upload.wikimedia.org/wikipedia/commons/b/b2/Louvre.jpg';
    const wiki3 =
      'https://upload.wikimedia.org/wikipedia/commons/c/c3/Seine.jpg';
    const unsplash =
      'https://images.unsplash.com/photo-1585208798174-6cedd86e019a?w=1080';
    expect(mergeDestinationCoverUrls([wiki, wiki2, wiki3], [unsplash], 3)).toEqual([
      wiki,
      wiki2,
      unsplash,
    ]);
  });
});

describe('localTripCoverUri', () => {
  it('uses an explicit cover before itinerary photos', () => {
    expect(
      localTripCoverUri(
        plan({
          coverUri: 'file:///Documents/travel-moments/cover.jpg',
          itinerary: [
            {
              id: 'm1',
              kind: 'moment',
              title: 'Sunset',
              date: '2026-08-01',
              startMinutes: 0,
              durationMinutes: 60,
              photoUris: ['file:///Documents/travel-moments/moment.jpg'],
            },
          ],
        }),
      ),
    ).toBe('file:///Documents/travel-moments/cover.jpg');
  });

  it('ignores flight/stay confirmation photos and prefers moment photos', () => {
    expect(
      localTripCoverUri(
        plan({
          itinerary: [
            {
              id: 'f1',
              kind: 'flight',
              title: 'Flight',
              date: '2026-08-01',
              startMinutes: 0,
              durationMinutes: 120,
              photoUris: ['file:///Documents/travel-moments/boarding-pass.jpg'],
            },
            {
              id: 'm1',
              kind: 'moment',
              title: 'Harbor',
              date: '2026-08-02',
              startMinutes: 0,
              durationMinutes: 60,
              photoUris: ['file:///Documents/travel-moments/harbor.jpg'],
            },
          ],
        }),
      ),
    ).toBe('file:///Documents/travel-moments/harbor.jpg');
  });
});

describe('rewriteDestinationCoverFetchUrl', () => {
  // Lazy import keeps the API route out of the main cover module graph.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { rewriteDestinationCoverFetchUrl } =
    require('../../../app/api/destination-cover-image+api') as typeof import('../../../app/api/destination-cover-image+api');

  it('maps commons originals and thumbs to Special:FilePath resize URLs', () => {
    expect(
      rewriteDestinationCoverFetchUrl(
        'https://upload.wikimedia.org/wikipedia/commons/6/61/Santa_Catalina_Arch_-_Antigua_Guatemala_Feb_2020.jpg',
      ),
    ).toBe(
      'https://commons.wikimedia.org/wiki/Special:FilePath/Santa_Catalina_Arch_-_Antigua_Guatemala_Feb_2020.jpg?width=1200',
    );
    expect(
      rewriteDestinationCoverFetchUrl(
        'https://upload.wikimedia.org/wikipedia/commons/thumb/6/61/Santa_Catalina_Arch_-_Antigua_Guatemala_Feb_2020.jpg/800px-Santa_Catalina_Arch_-_Antigua_Guatemala_Feb_2020.jpg',
      ),
    ).toBe(
      'https://commons.wikimedia.org/wiki/Special:FilePath/Santa_Catalina_Arch_-_Antigua_Guatemala_Feb_2020.jpg?width=1200',
    );
  });
});
