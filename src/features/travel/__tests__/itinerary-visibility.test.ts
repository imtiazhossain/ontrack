import {
  canViewerSeeItineraryItem,
  compactSharedItineraryPayload,
  isItineraryItemOwnedBy,
  mergeOwnedItineraryItemWithRemote,
  pickNewerItineraryItem,
  visibleItineraryForViewer,
} from '../itinerary-visibility';
import { normalizeTravelItineraryItem } from '../normalize';
import type { TravelItineraryItem } from '../types';

function flightItem(
  overrides: Partial<TravelItineraryItem> = {},
): TravelItineraryItem {
  return {
    id: 'item-1',
    kind: 'flight',
    title: 'Flight MIA → JFK',
    date: '2026-09-08',
    startMinutes: 600,
    durationMinutes: 180,
    shareMode: 'private',
    bookingUrl: 'https://example.com/book',
    flight: {
      airline: 'AA',
      flightNumber: '100',
      confirmationCode: 'ABC123',
      departureAirport: 'MIA',
      arrivalAirport: 'JFK',
      seat: '12A',
      passengerName: 'Alex Rivera',
    },
    ...overrides,
  };
}

describe('itinerary visibility', () => {
  it('defaults missing shareMode to private on normalize', () => {
    const normalized = normalizeTravelItineraryItem({
      id: 'item-legacy',
      kind: 'activity',
      title: 'Museum',
      date: '2026-09-09',
      startMinutes: 600,
      durationMinutes: 90,
    });
    expect(normalized?.shareMode).toBe('private');
    expect(normalized?.sharedWithUserIds).toBeUndefined();
  });

  it('keeps selected share targets and drops them for non-selected modes', () => {
    expect(
      normalizeTravelItineraryItem({
        ...flightItem({
          shareMode: 'selected',
          sharedWithUserIds: ['user-a', 'user-a', ''],
        }),
      })?.sharedWithUserIds,
    ).toEqual(['user-a']);
    expect(
      normalizeTravelItineraryItem({
        ...flightItem({
          shareMode: 'trip',
          sharedWithUserIds: ['user-a'],
        }),
      })?.sharedWithUserIds,
    ).toBeUndefined();
  });

  it('treats missing owner as owned by the viewer', () => {
    expect(isItineraryItemOwnedBy(flightItem(), 'user-me')).toBe(true);
    expect(
      isItineraryItemOwnedBy(
        flightItem({ ownerUserId: 'user-other' }),
        'user-me',
      ),
    ).toBe(false);
  });

  it('hides private peer flights from other travelers', () => {
    const privatePeer = flightItem({
      ownerUserId: 'user-host',
      shareMode: 'private',
    });
    expect(canViewerSeeItineraryItem(privatePeer, 'user-me')).toBe(false);
    expect(canViewerSeeItineraryItem(privatePeer, 'user-host')).toBe(true);
  });

  it('shows trip-shared and selected shares correctly', () => {
    const tripShared = flightItem({
      id: 'item-trip',
      ownerUserId: 'user-host',
      shareMode: 'trip',
    });
    const selected = flightItem({
      id: 'item-selected',
      ownerUserId: 'user-host',
      shareMode: 'selected',
      sharedWithUserIds: ['user-me'],
    });
    const selectedOther = flightItem({
      id: 'item-other',
      ownerUserId: 'user-host',
      shareMode: 'selected',
      sharedWithUserIds: ['user-other'],
    });
    expect(canViewerSeeItineraryItem(tripShared, 'user-me')).toBe(true);
    expect(canViewerSeeItineraryItem(selected, 'user-me')).toBe(true);
    expect(canViewerSeeItineraryItem(selectedOther, 'user-me')).toBe(false);
    expect(
      visibleItineraryForViewer(
        [privateItem(), tripShared, selected, selectedOther],
        'user-me',
      ).map((item) => item.id),
    ).toEqual(['item-mine', 'item-trip', 'item-selected']);
  });

  it('strips booking secrets from shared payloads', () => {
    const compact = compactSharedItineraryPayload(
      flightItem({
        ownerUserId: 'user-me',
        shareMode: 'trip',
        photoUris: ['file:///photo.jpg'],
      }),
    );
    expect(compact.bookingUrl).toBeUndefined();
    expect(compact.photoUris).toBeUndefined();
    expect(compact.flight?.confirmationCode).toBeUndefined();
    expect(compact.flight?.seat).toBeUndefined();
    expect(compact.flight?.passengerName).toBeUndefined();
    expect(compact.flight?.airline).toBe('AA');
    expect(compact.flight?.departureAirport).toBe('MIA');
    expect(compact.shareMode).toBe('trip');
  });

  it('merges remote share metadata onto owned local items without dropping secrets', () => {
    const local = flightItem({
      ownerUserId: 'user-me',
      shareMode: 'private',
    });
    const remote = flightItem({
      ownerUserId: 'user-me',
      shareMode: 'selected',
      sharedWithUserIds: ['user-a'],
      sharedUpdatedAt: '2026-08-07T12:00:00.000Z',
      flight: { airline: 'AA', flightNumber: '100' },
    });
    const merged = mergeOwnedItineraryItemWithRemote(local, remote);
    expect(merged.shareMode).toBe('selected');
    expect(merged.sharedWithUserIds).toEqual(['user-a']);
    expect(merged.flight?.confirmationCode).toBe('ABC123');
    expect(merged.flight?.seat).toBe('12A');
  });

  it('picks newer sharedUpdatedAt for LWW', () => {
    const older = flightItem({
      sharedUpdatedAt: '2026-08-07T10:00:00.000Z',
      title: 'Older',
    });
    const newer = flightItem({
      sharedUpdatedAt: '2026-08-07T12:00:00.000Z',
      title: 'Newer',
    });
    expect(pickNewerItineraryItem(older, newer).title).toBe('Newer');
    expect(pickNewerItineraryItem(newer, older).title).toBe('Newer');
  });
});

function privateItem(): TravelItineraryItem {
  return flightItem({
    id: 'item-mine',
    ownerUserId: 'user-me',
    shareMode: 'private',
  });
}
