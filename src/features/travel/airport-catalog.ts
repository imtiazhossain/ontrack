import { normalizeAirportCode } from './airport-timezones';

/** Display metadata for common IATA codes used in flight summaries. */

export type AirportPlace = {
  code: string;
  /** e.g. "Guatemala City, GT (GUA)" */
  cityLabel: string;
  /** e.g. "La Aurora International Airport" */
  airportName: string;
  /** Short city for layover copy, e.g. "Houston" */
  city: string;
};

const AIRPORTS: Record<string, Omit<AirportPlace, 'code'>> = {
  EWR: {
    city: 'Newark',
    cityLabel: 'Newark, US (EWR)',
    airportName: 'Newark Liberty International Airport',
  },
  GUA: {
    city: 'Guatemala City',
    cityLabel: 'Guatemala City, GT (GUA)',
    airportName: 'La Aurora International Airport',
  },
  IAH: {
    city: 'Houston',
    cityLabel: 'Houston, US (IAH)',
    airportName: 'George Bush Intercontinental Airport',
  },
  JFK: {
    city: 'New York',
    cityLabel: 'New York, US (JFK)',
    airportName: 'John F. Kennedy International Airport',
  },
  KEF: {
    city: 'Reykjavík',
    cityLabel: 'Reykjavík, IS (KEF)',
    airportName: 'Keflavík International Airport',
  },
  LGA: {
    city: 'New York',
    cityLabel: 'New York, US (LGA)',
    airportName: 'New York LaGuardia Airport',
  },
  LHR: {
    city: 'London',
    cityLabel: 'London, GB (LHR)',
    airportName: 'London Heathrow Airport',
  },
};

export function airportPlace(codeOrLabel?: string): AirportPlace | undefined {
  const code = normalizeAirportCode(codeOrLabel);
  if (!code) return undefined;
  const known = AIRPORTS[code];
  if (known) return { code, ...known };
  return {
    code,
    city: code,
    cityLabel: code,
    airportName: code,
  };
}

export function airportCityLabel(codeOrLabel?: string): string | undefined {
  return airportPlace(codeOrLabel)?.cityLabel;
}

export function airportName(codeOrLabel?: string): string | undefined {
  return airportPlace(codeOrLabel)?.airportName;
}

export function airportCity(codeOrLabel?: string): string | undefined {
  return airportPlace(codeOrLabel)?.city;
}
