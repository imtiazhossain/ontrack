import {
  moonIllumination,
  moonIsWaxing,
  moonPhaseCycle,
  moonPhaseShadowPath,
  moonTerminatorPath,
} from '@/features/travel/travel-sky-astronomy';
import { destinationSkyAccents } from '@/features/travel/travel-sky-accents';
import { destinationShowsAurora } from '@/features/travel/travel-sky-aurora-destinations';
import {
  atmosphereHeaderInkColors,
  resolveAtmosphereHeaderInk,
} from '@/features/travel/travel-home-atmosphere-ink';
import {
  headerSkyChromeColor,
  resolveHeaderSkyCloudCover,
  resolveHeaderSkyCondition,
  resolveHeaderSkyWashTop,
} from '@/features/travel/travel-sky-condition';

describe('moon phase helpers', () => {
  it('returns a 0–1 cycle and illumination fraction', () => {
    const date = new Date('2024-06-15T12:00:00Z');
    const cycle = moonPhaseCycle(date);
    expect(cycle).toBeGreaterThanOrEqual(0);
    expect(cycle).toBeLessThan(1);
    const illum = moonIllumination(date);
    expect(illum).toBeGreaterThanOrEqual(0);
    expect(illum).toBeLessThanOrEqual(1);
    expect(moonIsWaxing(date)).toBe(cycle < 0.5);
  });

  it('treats known new-moon epoch as near-new', () => {
    const nearNew = new Date(Date.UTC(2000, 0, 6, 18, 14, 0));
    expect(moonPhaseCycle(nearNew)).toBeLessThan(0.02);
    expect(moonIllumination(nearNew)).toBeLessThan(0.05);
  });
});

describe('moonTerminatorPath', () => {
  it('renders nothing near new moon', () => {
    expect(moonTerminatorPath(0, 100, 50, 10)).toBe('');
    expect(moonTerminatorPath(0.99, 100, 50, 10)).toBe('');
  });

  it('renders a full circle near full moon', () => {
    const d = moonTerminatorPath(0.5, 100, 50, 10);
    expect(d).toBe('M100 40 A10 10 0 1 1 100 60 A10 10 0 1 1 100 40 Z');
  });

  it('renders half moons with a straight terminator (rx 0)', () => {
    // First quarter — waxing, lit on the right. rx 0 draws a straight chord,
    // so the terminator sweep flag has no visual effect at quarters.
    expect(moonTerminatorPath(0.25, 100, 50, 10)).toBe(
      'M100 40 A10 10 0 0 1 100 60 A0 10 0 0 0 100 40 Z',
    );
    // Last quarter — waning, lit on the left.
    expect(moonTerminatorPath(0.75, 100, 50, 10)).toBe(
      'M100 40 A10 10 0 0 0 100 60 A0 10 0 0 0 100 40 Z',
    );
  });

  it('bulges the terminator toward the lit side for crescents', () => {
    // Waxing crescent: outer limb right (sweep 1), terminator passes right (sweep 0).
    const waxing = moonTerminatorPath(0.1, 100, 50, 10);
    expect(waxing).toBe('M100 40 A10 10 0 0 1 100 60 A8.09 10 0 0 0 100 40 Z');
    // Waning gibbous mirrors: outer limb left, terminator bulges right.
    const waning = moonTerminatorPath(0.6, 100, 50, 10);
    expect(waning).toContain('A10 10 0 0 0 100 60');
  });

  it('mirrors the lit side for southern-hemisphere observers', () => {
    const north = moonTerminatorPath(0.1, 100, 50, 10);
    const south = moonTerminatorPath(0.1, 100, 50, 10, true);
    expect(north).toContain('A10 10 0 0 1');
    expect(south).toContain('A10 10 0 0 0');
  });
});

describe('moonPhaseShadowPath', () => {
  it('covers the full disc near new moon so the orb stays visible', () => {
    const shadow = moonPhaseShadowPath(0, 100, 50, 10);
    expect(shadow).not.toBeNull();
    expect(shadow?.fillRule).toBeUndefined();
    expect(shadow?.d).toContain('A10 10 0 1 1');
  });

  it('omits shadow near full moon', () => {
    expect(moonPhaseShadowPath(0.5, 100, 50, 10)).toBeNull();
  });

  it('uses evenodd disc-minus-lit for crescents', () => {
    const shadow = moonPhaseShadowPath(0.1, 100, 50, 10);
    expect(shadow?.fillRule).toBe('evenodd');
    expect(shadow?.d).toContain(moonTerminatorPath(0.1, 100, 50, 10));
  });
});

describe('destinationSkyAccents', () => {
  it('flags desert destinations', () => {
    expect(destinationSkyAccents('Dubai, UAE').desert).toBe(true);
    expect(destinationSkyAccents('Sahara trek').desert).toBe(true);
    expect(destinationSkyAccents('Paris, France').desert).toBe(false);
  });

  it('flags fog cities', () => {
    expect(destinationSkyAccents('San Francisco, CA').fog).toBe(true);
    expect(destinationSkyAccents('London, UK').fog).toBe(true);
    expect(destinationSkyAccents('Berlin').fog).toBe(false);
  });

  it('flags tropical destinations by keyword or latitude band', () => {
    expect(destinationSkyAccents('Maui, Hawaii').tropical).toBe(true);
    expect(destinationSkyAccents('Somewhere', 12).tropical).toBe(true);
    expect(destinationSkyAccents('Somewhere', -18).tropical).toBe(true);
    expect(destinationSkyAccents('Oslo, Norway', 60).tropical).toBe(false);
    // Desert wins over the tropical latitude band (Dubai is at 25°… but keyword-matched deserts inside the band stay deserts).
    expect(destinationSkyAccents('Riyadh', 20).desert).toBe(true);
    expect(destinationSkyAccents('Riyadh', 20).tropical).toBe(false);
  });

  it('falls back to no accents for unknown destinations', () => {
    const plain = destinationSkyAccents('Springfield');
    expect(plain).toEqual({ tropical: false, desert: false, fog: false });
    expect(destinationSkyAccents('')).toEqual({
      tropical: false,
      desert: false,
      fog: false,
    });
  });
});

describe('destinationShowsAurora', () => {
  it('enables aurora for Iceland and related high-latitude labels', () => {
    expect(destinationShowsAurora('Iceland')).toBe(true);
    expect(destinationShowsAurora('Reykjavík, Iceland')).toBe(true);
    expect(destinationShowsAurora('Tromsø, Norway')).toBe(true);
    expect(destinationShowsAurora('Lisbon, Portugal')).toBe(false);
    expect(destinationShowsAurora('')).toBe(false);
  });
});

describe('resolveHeaderSkyCondition', () => {
  it('maps rain and storm weather codes to rain/lightning flags', () => {
    const rain = resolveHeaderSkyCondition({
      themeDark: false,
      timeOfDay: 'day',
      weatherCode: 61,
    });
    expect(rain.look).toBe('rain');
    expect(rain.rain).toBe(true);
    expect(rain.lightning).toBe(false);

    const storm = resolveHeaderSkyCondition({
      themeDark: false,
      timeOfDay: 'day',
      weatherCode: 95,
    });
    expect(storm.look).toBe('storm');
    expect(storm.rain).toBe(true);
    expect(storm.lightning).toBe(true);
  });

  it('keeps night rain/storm looks under dark theme', () => {
    const nightRain = resolveHeaderSkyCondition({
      themeDark: true,
      timeOfDay: 'day',
      weatherCode: 63,
    });
    expect(nightRain.look).toBe('night-rain');
    expect(nightRain.rain).toBe(true);
    expect(nightRain.cloudyNight).toBe(true);

    const nightStorm = resolveHeaderSkyCondition({
      themeDark: true,
      weatherCode: 96,
    });
    expect(nightStorm.look).toBe('night-storm');
    expect(nightStorm.lightning).toBe(true);
  });

  it('uses sunrise/sunset looks for clear dawn/dusk', () => {
    expect(
      resolveHeaderSkyCondition({
        themeDark: false,
        timeOfDay: 'dawn',
        weatherCode: 0,
      }).look,
    ).toBe('sunrise');
    expect(
      resolveHeaderSkyCondition({
        themeDark: false,
        timeOfDay: 'dusk',
        weatherCode: 0,
      }).look,
    ).toBe('sunset');
  });

  it('prefers rainy dawn/dusk over clear sunrise/sunset', () => {
    expect(
      resolveHeaderSkyCondition({
        themeDark: false,
        timeOfDay: 'dawn',
        weatherCode: 61,
      }).look,
    ).toBe('rain');
    expect(
      resolveHeaderSkyCondition({
        themeDark: false,
        timeOfDay: 'dusk',
        weatherCode: 95,
      }).look,
    ).toBe('storm');
  });

  it('attaches destination accents to the condition', () => {
    const desert = resolveHeaderSkyCondition({
      themeDark: false,
      timeOfDay: 'day',
      weatherCode: 0,
      destination: 'Dubai, UAE',
    });
    expect(desert.accents.desert).toBe(true);

    const plain = resolveHeaderSkyCondition({
      themeDark: false,
      timeOfDay: 'day',
      weatherCode: 0,
    });
    expect(plain.accents).toEqual({
      tropical: false,
      desert: false,
      fog: false,
    });
  });

  it('keeps the sun for partly cloudy / mainly clear, dense pack only for overcast', () => {
    expect(resolveHeaderSkyCloudCover('cloudy', 1)).toBe('partly');
    expect(resolveHeaderSkyCloudCover('cloudy', 2)).toBe('partly');
    expect(resolveHeaderSkyCloudCover('cloudy', 3)).toBe('dense');
    expect(resolveHeaderSkyCloudCover('clear', 0)).toBe('light');

    const partly = resolveHeaderSkyCondition({
      themeDark: false,
      timeOfDay: 'day',
      weatherCode: 2,
    });
    expect(partly.look).toBe('sunny');
    expect(partly.cloudCover).toBe('partly');

    const mainlyClear = resolveHeaderSkyCondition({
      themeDark: false,
      timeOfDay: 'day',
      weatherCode: 1,
    });
    expect(mainlyClear.look).toBe('sunny');
    expect(mainlyClear.cloudCover).toBe('partly');

    const overcast = resolveHeaderSkyCondition({
      themeDark: false,
      timeOfDay: 'day',
      weatherCode: 3,
    });
    expect(overcast.look).toBe('cloudy');
    expect(overcast.cloudCover).toBe('dense');

    const rain = resolveHeaderSkyCondition({
      themeDark: false,
      timeOfDay: 'day',
      weatherCode: 61,
    });
    expect(rain.look).toBe('rain');
    expect(rain.cloudCover).toBe('dense');
  });
});

describe('headerSkyChromeColor', () => {
  it('returns a night wash under dark theme and matching day washes', () => {
    expect(
      headerSkyChromeColor({ themeDark: true, look: 'sunny' }),
    ).toBe('#0C1423');
    expect(
      headerSkyChromeColor({ themeDark: false, look: 'night-clear' }),
    ).toBe('#0C1423');
    expect(
      headerSkyChromeColor({
        themeDark: true,
        look: 'night-clear',
        destination: 'Reykjavík, Iceland',
      }),
    ).toBe('#1E3A42');
    expect(
      headerSkyChromeColor({ themeDark: false, look: 'sunny' }),
    ).toBe('#DCE8F1');
    expect(
      headerSkyChromeColor({ themeDark: false, look: 'sunrise' }),
    ).toBe('#E8B896');
  });

  it('maps chrome luminance to readable hero ink (white on night, black on bright day)', () => {
    const nightInk = atmosphereHeaderInkColors(
      resolveAtmosphereHeaderInk({
        themeDark: false,
        averageColor: headerSkyChromeColor({
          themeDark: false,
          look: 'night-clear',
          destination: 'Reykjavík, Iceland',
        }),
      }),
    );
    expect(nightInk.ink).toBe('#FFFFFF');

    const dayInk = atmosphereHeaderInkColors(
      resolveAtmosphereHeaderInk({
        themeDark: false,
        averageColor: headerSkyChromeColor({
          themeDark: false,
          look: 'sunny',
        }),
      }),
    );
    expect(dayInk.ink).toBe('#000000');
  });
});

describe('resolveHeaderSkyWashTop', () => {
  it('matches aurora chrome for Iceland so page wash does not hard-cut the sky', () => {
    expect(
      resolveHeaderSkyWashTop({
        themeDark: true,
        destination: 'Reykjavík, Iceland',
      }),
    ).toBe('#1E3A42');
    expect(
      resolveHeaderSkyWashTop({
        themeDark: true,
        destination: 'Lisbon, Portugal',
      }),
    ).toBe('#0C1423');
  });
});
