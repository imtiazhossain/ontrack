import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

import {
  filterCuratedAtmosphere,
  TRAVEL_HOME_CURATED_ATMOSPHERE,
} from '../travel-home-atmosphere-catalog';
import {
  atmosphereDestinationKey,
  mergeAtmospherePlaces,
  normalizeTripAtmosphereDestinations,
  pickAtmosphereDestination,
  pickRotatingIndex,
  rememberRecentKeys,
  travelHomeAtmosphereSearchQueries,
} from '../travel-home-atmosphere-queries';
import {
  atmosphereHeaderInkColors,
  headerInkFromLuminance,
  parseHexRgb,
  relativeLuminanceFromHex,
  resolveAtmosphereHeaderInk,
  travelHomeSoloTripCardShadow,
} from '../travel-home-atmosphere-ink';
import {
  pickCuratedTravelHomeAtmosphere,
  resolveTravelHomeAtmosphereImage,
} from '../travel-home-atmosphere-resolve';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

describe('Travel home atmosphere queries', () => {
  it('builds trip-aware destination queries with time and weather flavor', () => {
    const queries = travelHomeAtmosphereSearchQueries({
      mode: 'trip',
      destination: 'Reykjavik, Iceland',
      timeOfDay: 'dawn',
      weatherCode: 71,
    });
    expect(queries[0]).toMatch(/Reykjavik/i);
    expect(queries[0]).toMatch(/sunrise|dawn|golden hour/i);
    expect(queries.some((query) => /snow|winter/i.test(query))).toBe(true);
    expect(queries.at(-1)).toBe('Reykjavik, Iceland');
  });

  it('builds home wanderlust queries when planning without a trip', () => {
    const queries = travelHomeAtmosphereSearchQueries({
      mode: 'home',
      homeLabel: 'Austin',
      timeOfDay: 'night',
      weatherCode: 61,
    });
    expect(queries[0]).toMatch(/Austin/i);
    expect(queries.some((query) => /night|starry|city lights/i.test(query))).toBe(
      true,
    );
    expect(queries.some((query) => /rain|wet/i.test(query))).toBe(true);
    expect(queries.some((query) => /travel landscape|wanderlust/i.test(query))).toBe(
      true,
    );
  });

  it('rotates away from recently shown keys before wrapping', () => {
    const keys = ['a', 'b', 'c'];
    expect(pickRotatingIndex(3, ['a', 'b'], keys, 0)).toBe(2);
    expect(pickRotatingIndex(3, ['a', 'b', 'c'], keys, 1)).toBe(1);
  });

  it('remembers newest keys first', () => {
    expect(rememberRecentKeys(['b', 'c'], 'a', 2)).toEqual(['a', 'b']);
  });

  it('normalizes and rotates across every trip destination', () => {
    expect(
      normalizeTripAtmosphereDestinations([
        'Reykjavik, Iceland',
        '  Antigua, Guatemala ',
        'Reykjavik, Iceland',
        '',
        'Lisbon',
      ]),
    ).toEqual(['Reykjavik, Iceland', 'Antigua, Guatemala', 'Lisbon']);

    const destinations = ['Iceland', 'Antigua', 'Lisbon'];
    const first = pickAtmosphereDestination(destinations, [], 0);
    expect(first).toBe('Iceland');
    const second = pickAtmosphereDestination(
      destinations,
      [atmosphereDestinationKey('Iceland')],
      0,
    );
    expect(second).toBe('Antigua');
  });

  it('merges profile home into the atmosphere place pool', () => {
    expect(mergeAtmospherePlaces(['Iceland', 'Lisbon'], 'Austin, TX')).toEqual([
      'Iceland',
      'Lisbon',
      'Austin, TX',
    ]);
    expect(mergeAtmospherePlaces(['Austin, TX'], 'Austin, TX')).toEqual([
      'Austin, TX',
    ]);
    expect(mergeAtmospherePlaces([], 'Austin')).toEqual(['Austin']);
  });
});

describe('Travel home atmosphere resolve', () => {
  it('filters curated plates by time and weather mood', () => {
    const night = filterCuratedAtmosphere(
      TRAVEL_HOME_CURATED_ATMOSPHERE,
      'night',
      'clear',
    );
    expect(night.every((item) => item.timeOfDay.includes('night'))).toBe(true);
    expect(pickCuratedTravelHomeAtmosphere('night', 0).origin).toBe('curated');
  });

  it('prefers a live remote pool when available', async () => {
    const resolved = await resolveTravelHomeAtmosphereImage({
      mode: 'home',
      timeOfDay: 'day',
      weatherCode: 0,
      salt: 3,
      recentKeys: [],
      fetchPool: async () => [
        'https://images.unsplash.com/photo-demo-a',
        'https://images.unsplash.com/photo-demo-b',
      ],
    });
    expect(resolved.origin).toBe('remote');
    expect(
      typeof resolved.source === 'object' &&
        resolved.source &&
        'uri' in resolved.source,
    ).toBe(true);
  });

  it('falls back to curated when the remote pool is empty', async () => {
    const resolved = await resolveTravelHomeAtmosphereImage({
      mode: 'trip',
      destination: 'Lisbon',
      timeOfDay: 'dusk',
      weatherCode: 3,
      salt: 2,
      fetchPool: async () => [],
    });
    expect(resolved.origin).toBe('curated');
    expect(resolved.key.startsWith('curated:')).toBe(true);
  });

  it('labels trip-aware remote plates with the destination', async () => {
    const resolved = await resolveTravelHomeAtmosphereImage({
      mode: 'trip',
      destination: 'Reykjavik, Iceland',
      timeOfDay: 'day',
      weatherCode: 0,
      salt: 1,
      fetchPool: async () => ['https://images.unsplash.com/photo-demo-label'],
    });
    expect(resolved.origin).toBe('remote');
    expect(resolved.label).toBe('Reykjavik, Iceland');
  });

  it('rotates the remote label across all trip destinations', async () => {
    const resolved = await resolveTravelHomeAtmosphereImage({
      mode: 'trip',
      destinations: ['Iceland', 'Antigua', 'Lisbon'],
      timeOfDay: 'day',
      weatherCode: 0,
      salt: 0,
      recentKeys: [atmosphereDestinationKey('Iceland')],
      fetchPool: async (queries) => {
        expect(queries.some((query) => /Antigua/i.test(query))).toBe(true);
        return ['https://images.unsplash.com/photo-demo-antigua'];
      },
    });
    expect(resolved.origin).toBe('remote');
    expect(resolved.label).toBe('Antigua');
    expect(resolved.destinationKey).toBe(atmosphereDestinationKey('Antigua'));
  });

  it('can show profile home as a place-aware remote plate', async () => {
    const resolved = await resolveTravelHomeAtmosphereImage({
      mode: 'home',
      destinations: ['Iceland'],
      homeLabel: 'Austin, TX',
      timeOfDay: 'dusk',
      weatherCode: 0,
      salt: 0,
      recentKeys: [atmosphereDestinationKey('Iceland')],
      fetchPool: async (queries) => {
        expect(queries.some((query) => /Austin/i.test(query))).toBe(true);
        return ['https://images.unsplash.com/photo-demo-austin'];
      },
    });
    expect(resolved.origin).toBe('remote');
    expect(resolved.label).toBe('Austin, TX');
    expect(resolved.destinationKey).toBe(atmosphereDestinationKey('Austin, TX'));
  });

  it('keeps curated place labels when known', () => {
    const iceland = TRAVEL_HOME_CURATED_ATMOSPHERE.find(
      (item) => item.id === 'iceland-coast',
    );
    expect(iceland?.label).toBe('Reykjavík, Iceland');
    const labeled = pickCuratedTravelHomeAtmosphere('day', 3, [], 2);
    if (labeled.key === 'curated:iceland-coast') {
      expect(labeled.label).toBe('Reykjavík, Iceland');
    }
  });

  it('tints the solo-trip card shadow from the atmosphere plate', () => {
    expect(parseHexRgb('#B7C4D4')).toEqual({ r: 183, g: 196, b: 212 });
    const iceland = travelHomeSoloTripCardShadow({
      averageColor: '#B7C4D4',
      dark: false,
    });
    expect(iceland).toContain('rgba(59,78,110,');
    expect(iceland).toMatch(/^0 18px 40px/);
    expect(
      travelHomeSoloTripCardShadow({ dark: false }),
    ).toContain('rgba(17,74,110,');
    expect(
      travelHomeSoloTripCardShadow({ averageColor: '#021734', dark: true }),
    ).toContain('rgba(0,0,0,');
  });

  it('defaults header ink to white unless the plate is clearly bright', () => {
    expect(relativeLuminanceFromHex('#1A1A1A')).toBeLessThan(0.2);
    expect(headerInkFromLuminance(0.2)).toBe('light');
    expect(headerInkFromLuminance(0.8)).toBe('dark');
    expect(
      resolveAtmosphereHeaderInk({
        themeDark: false,
        averageColor: '#2C3340',
      }),
    ).toBe('light');
    expect(
      resolveAtmosphereHeaderInk({
        themeDark: false,
        averageColor: '#E8EEF5',
      }),
    ).toBe('dark');
    // No sample → white (dark remote midtones are common).
    expect(
      resolveAtmosphereHeaderInk({
        themeDark: false,
      }),
    ).toBe('light');
    expect(atmosphereHeaderInkColors('light').ink).toBe('#FFFFFF');
    expect(
      pickCuratedTravelHomeAtmosphere('night', 0, [], 0).curatedHeaderTone,
    ).toBe('light');
  });
});
