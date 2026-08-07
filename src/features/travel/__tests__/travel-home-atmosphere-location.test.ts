import {
  ATMOSPHERE_LOCATION_WRAP_MIN_CHARS,
  wrapAtmosphereLocationCaption,
} from '../travel-home-atmosphere-location';

describe('wrapAtmosphereLocationCaption', () => {
  it('keeps short place labels on one line', () => {
    expect(wrapAtmosphereLocationCaption('Iceland')).toBe('Iceland');
    expect(wrapAtmosphereLocationCaption('Paris, France')).toBe('Paris, France');
  });

  it('always wraps city/region/country labels at the Brooklyn length', () => {
    expect(
      wrapAtmosphereLocationCaption('Brooklyn, New York, United States'),
    ).toBe('Brooklyn, New York\nUnited States');
    expect('Brooklyn, New York, United States'.length).toBeGreaterThanOrEqual(
      ATMOSPHERE_LOCATION_WRAP_MIN_CHARS,
    );
  });

  it('wraps other long comma labels before the final segment', () => {
    expect(
      wrapAtmosphereLocationCaption('Reykjavík, Capital Region, Iceland'),
    ).toBe('Reykjavík, Capital Region\nIceland');
  });

  it('normalizes whitespace before wrapping', () => {
    expect(
      wrapAtmosphereLocationCaption('  Brooklyn,   New York,  United States '),
    ).toBe('Brooklyn, New York\nUnited States');
  });
});
