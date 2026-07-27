import { describeWeatherCode, forecastWindow } from '../provider';

describe('travel weather provider', () => {
  it('does not request forecasts before the 16-day window', () => {
    expect(forecastWindow('2026-09-08', '2026-09-13', '2026-07-26')).toEqual({
      availability: 'too-early',
      availableOn: '2026-08-24',
    });
  });

  it('clips a partially available trip to the forecast window', () => {
    expect(forecastWindow('2026-08-08', '2026-08-15', '2026-07-26')).toEqual({
      availability: 'partial',
      requestStart: '2026-08-08',
      requestEnd: '2026-08-10',
      availableThrough: '2026-08-10',
    });
  });

  it('clips an active trip to today', () => {
    expect(forecastWindow('2026-07-24', '2026-07-30', '2026-07-26')).toEqual({
      availability: 'forecast',
      requestStart: '2026-07-26',
      requestEnd: '2026-07-30',
      availableThrough: undefined,
    });
  });

  it('maps WMO weather codes to readable conditions', () => {
    expect(describeWeatherCode(0)).toEqual({ condition: 'Clear', symbol: '☀️' });
    expect(describeWeatherCode(63)).toEqual({ condition: 'Rain', symbol: '🌧️' });
    expect(describeWeatherCode(95)).toEqual({ condition: 'Thunderstorms', symbol: '⛈️' });
  });
});
