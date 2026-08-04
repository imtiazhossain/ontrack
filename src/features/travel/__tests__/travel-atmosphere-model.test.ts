import { lightTravelTheme } from '@/design-system/themes';

import {
  selectTravelAtmospherePlan,
  travelAtmosphereScheme,
  travelTimeOfDay,
  travelWeatherMood,
  type TravelAtmosphere,
} from '../travel-atmosphere-model';
import type { TravelPlan } from '../types';

function plan(id: string, destination: string, startDate: string, endDate: string): TravelPlan {
  return {
    id,
    title: destination,
    destination,
    startDate,
    endDate,
    itinerary: [],
    participants: [],
    baseCurrency: 'USD',
    expenses: [],
    createdAt: `${startDate}T00:00:00.000Z`,
    updatedAt: `${startDate}T00:00:00.000Z`,
  };
}

describe('Travel atmosphere model', () => {
  it('uses the destination timezone for the time-of-day phase', () => {
    const instant = new Date('2026-08-04T12:00:00.000Z');
    expect(travelTimeOfDay(instant, 'Atlantic/Reykjavik')).toBe('day');
    expect(travelTimeOfDay(instant, 'Pacific/Honolulu')).toBe('night');
  });

  it('maps live weather codes to distinct visual moods', () => {
    expect(travelWeatherMood(0)).toBe('clear');
    expect(travelWeatherMood(61)).toBe('rain');
    expect(travelWeatherMood(71)).toBe('snow');
    expect(travelWeatherMood(95)).toBe('storm');
  });

  it('changes color stops for location, weather, and local time', () => {
    const base: TravelAtmosphere = {
      destination: 'Reykjavik, Iceland',
      latitude: 64.15,
      longitude: -21.94,
      timeOfDay: 'day',
      weatherCode: 0,
    };
    const clearDay = travelAtmosphereScheme(lightTravelTheme, base);
    const rainyDay = travelAtmosphereScheme(lightTravelTheme, { ...base, weatherCode: 61 });
    const rainyNight = travelAtmosphereScheme(lightTravelTheme, {
      ...base,
      weatherCode: 61,
      timeOfDay: 'night',
    });
    const lisbon = travelAtmosphereScheme(lightTravelTheme, {
      ...base,
      destination: 'Lisbon, Portugal',
      latitude: 38.72,
      longitude: -9.14,
    });

    expect(rainyDay.stops[2]).not.toBe(clearDay.stops[2]);
    expect(rainyNight.stops[0]).not.toBe(rainyDay.stops[0]);
    expect(lisbon.stops[1]).not.toBe(clearDay.stops[1]);
  });

  it('uses the exact detail trip, otherwise the active or nearest trip', () => {
    const plans = [
      plan('future', 'Lisbon', '2026-09-01', '2026-09-08'),
      plan('active', 'Iceland', '2026-08-01', '2026-08-10'),
    ];
    expect(selectTravelAtmospherePlan(plans, '/travel/future/chat', '2026-08-04')?.id)
      .toBe('future');
    expect(selectTravelAtmospherePlan(plans, '/travel', '2026-08-04')?.id)
      .toBe('active');
  });
});
