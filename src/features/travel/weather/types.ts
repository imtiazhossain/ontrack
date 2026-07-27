export type TemperatureUnit = 'celsius' | 'fahrenheit';

export interface TravelWeatherDay {
  date: string;
  weatherCode: number;
  condition: string;
  symbol: string;
  temperatureMin: number;
  temperatureMax: number;
  precipitationProbability: number;
}

export type TravelWeatherAvailability =
  | 'forecast'
  | 'partial'
  | 'too-early'
  | 'past';

export interface TravelWeather {
  availability: TravelWeatherAvailability;
  locationLabel: string;
  timezone?: string;
  temperatureUnit: TemperatureUnit;
  days: TravelWeatherDay[];
  availableOn?: string;
  availableThrough?: string;
}
