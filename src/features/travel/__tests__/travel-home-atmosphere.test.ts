import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

import {
  filterCuratedAtmosphere,
  matchCuratedAtmosphereForPlace,
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
  travelHomeAtmosphereHeaderScrimColors,
  travelHomeSoloTripCardShadow,
} from '../travel-home-atmosphere-ink';
import {
  pickCuratedTravelHomeAtmosphere,
  resolveTravelHomeAtmosphereImage,
} from '../travel-home-atmosphere-resolve';
import { travelHomeAtmosphereScrimHeight } from '../travel-home-atmosphere-scrim';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

describe('Travel home atmosphere queries', () => {
  it('leads trip atmosphere with iconic draws (aurora) before weather stock', () => {
    const queries = travelHomeAtmosphereSearchQueries({
      mode: 'trip',
      destination: 'Reykjavik, Iceland',
      timeOfDay: 'dawn',
      weatherCode: 71,
    });
    expect(queries[0]).toMatch(/aurora|northern lights|Gullfoss|Blue Lagoon/i);
    expect(queries.some((query) => /aurora|northern lights/i.test(query))).toBe(
      true,
    );
    expect(queries.some((query) => /Gullfoss/i.test(query))).toBe(true);
    expect(queries.at(-1)).toBe('Reykjavik, Iceland');
  });

  it('boosts aurora queries for Iceland at night', () => {
    const queries = travelHomeAtmosphereSearchQueries({
      mode: 'trip',
      destination: 'Iceland',
      timeOfDay: 'night',
      weatherCode: 0,
    });
    expect(queries[0]).toMatch(/aurora|northern lights/i);
  });

  it('builds home wanderlust queries when planning without a trip', () => {
    const queries = travelHomeAtmosphereSearchQueries({
      mode: 'home',
      homeLabel: 'Austin',
      timeOfDay: 'night',
      weatherCode: 61,
    });
    expect(queries[0]).toMatch(/Austin/i);
    expect(queries.some((query) => /iconic|famous attraction/i.test(query))).toBe(
      true,
    );
    expect(queries.some((query) => /night|starry|city lights|skyline/i.test(query))).toBe(
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

  it('prefers curated people-free plates for labeled destinations', async () => {
    const resolved = await resolveTravelHomeAtmosphereImage({
      mode: 'trip',
      destination: 'Reykjavik, Iceland',
      timeOfDay: 'night',
      weatherCode: 0,
      salt: 1,
      fetchPool: async () => ['https://images.unsplash.com/photo-demo-label'],
    });
    expect(resolved.origin).toBe('curated');
    expect(resolved.label).toMatch(/Reykjavík|Iceland/i);
    expect(
      matchCuratedAtmosphereForPlace('Reykjavik, Iceland').length,
    ).toBeGreaterThan(0);
  });

  it('uses curated Antigua plate before remote stock', async () => {
    const resolved = await resolveTravelHomeAtmosphereImage({
      mode: 'trip',
      destinations: ['Iceland', 'Antigua', 'Lisbon'],
      timeOfDay: 'day',
      weatherCode: 0,
      salt: 0,
      recentKeys: [atmosphereDestinationKey('Iceland')],
      fetchPool: async () => ['https://images.unsplash.com/photo-demo-antigua'],
    });
    expect(resolved.origin).toBe('curated');
    expect(resolved.label).toBe('Antigua, Guatemala');
    expect(resolved.destinationKey).toBe(atmosphereDestinationKey('Antigua'));
  });

  it('falls back to remote when the place has no curated plate', async () => {
    const resolved = await resolveTravelHomeAtmosphereImage({
      mode: 'home',
      destinations: [],
      homeLabel: 'Austin, TX',
      timeOfDay: 'dusk',
      weatherCode: 0,
      salt: 0,
      recentKeys: [],
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
    const labeled = pickCuratedTravelHomeAtmosphere(
      'night',
      3,
      [],
      0,
      matchCuratedAtmosphereForPlace('Reykjavík, Iceland'),
    );
    expect(labeled.label).toMatch(/Reykjavík|Iceland/i);
  });

  it('tints the solo-trip card shadow from the atmosphere plate', () => {
    expect(parseHexRgb('#021734')).toEqual({ r: 2, g: 23, b: 52 });
    const iceland = travelHomeSoloTripCardShadow({
      averageColor: '#021734',
      dark: false,
    });
    expect(iceland).toContain('rgba(');
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
    // Pale sky midtones (under old 0.68 threshold) still flip to black.
    expect(
      resolveAtmosphereHeaderInk({
        themeDark: false,
        averageColor: '#B2C5DC',
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

  it('honors curated day-plate ink when whole-plate averages sit midtone', () => {
    // Guatemala catalog tone is dark; mid sky average must not force white.
    expect(
      resolveAtmosphereHeaderInk({
        themeDark: false,
        averageColor: '#7FA3C4',
        curatedTone: 'dark',
      }),
    ).toBe('dark');
    // Near-night sample still overrides a stale dark curated pin.
    expect(
      resolveAtmosphereHeaderInk({
        themeDark: false,
        averageColor: '#1A2430',
        curatedTone: 'dark',
      }),
    ).toBe('light');
    const guatemala = TRAVEL_HOME_CURATED_ATMOSPHERE.find(
      (item) => item.id === 'antigua-volcano',
    );
    expect(guatemala?.headerTone).toBe('dark');
    expect(
      resolveAtmosphereHeaderInk({
        themeDark: false,
        averageColor: guatemala?.averageColor,
        curatedTone: guatemala?.headerTone,
      }),
    ).toBe('dark');
  });

  it('adds a soft opposing header scrim when the plate washes out ink', () => {
    const brightWhiteInk = travelHomeAtmosphereHeaderScrimColors(
      'light',
      '#E8EEF5',
    );
    expect(brightWhiteInk?.[0]).toMatch(/^rgba\(0,0,0,/);
    expect(brightWhiteInk?.[3]).toBe('rgba(0,0,0,0)');

    // Midtone busy plates still get a veil (not only ultra-bright washes).
    const midWhiteInk = travelHomeAtmosphereHeaderScrimColors(
      'light',
      '#7A7A7A',
    );
    expect(midWhiteInk?.[0]).toMatch(/^rgba\(0,0,0,/);

    // Dark night plate + white ink → no veil (glyphs already contrast).
    expect(
      travelHomeAtmosphereHeaderScrimColors('light', '#0A1520'),
    ).toBeNull();

    const brightBlackInk = travelHomeAtmosphereHeaderScrimColors(
      'dark',
      '#E8EEF5',
    );
    expect(brightBlackInk?.[0]).toMatch(/^rgba\(255,255,255,/);
  });

  it('sizes the chrome scrim to cover the status-bar band plus header copy', () => {
    expect(travelHomeAtmosphereScrimHeight(59)).toBe(59 + 194);
  });
});



