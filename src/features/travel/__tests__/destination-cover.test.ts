import {
    destinationCoverCandidates,
    enlargeWikimediaThumb,
    isUsableDestinationPhotoUrl,
    stayCoverCandidates,
} from '../destination-cover';
import type { TravelPlan } from '../types';

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
