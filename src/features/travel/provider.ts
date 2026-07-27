import * as WebBrowser from 'expo-web-browser';

import { resolveFlightLocation } from './flights/location-resolver';

export interface GoogleFlightComparison {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate: string;
  adults: number;
}

interface ResolvedGoogleFlightComparison
  extends Omit<GoogleFlightComparison, 'origin' | 'destination'> {
  origins: string[];
  destinations: string[];
}

function encodeVarint(value: number): number[] {
  const bytes: number[] = [];
  let remaining = value;
  while (remaining >= 0x80) {
    bytes.push((remaining & 0x7f) | 0x80);
    remaining = Math.floor(remaining / 0x80);
  }
  bytes.push(remaining);
  return bytes;
}

function encodeField(field: number, wireType: number, value: number[]): number[] {
  return [...encodeVarint(field * 8 + wireType), ...value];
}

function encodeString(value: string): number[] {
  const bytes = [...value].map((character) => character.charCodeAt(0));
  return [...encodeVarint(bytes.length), ...bytes];
}

function encodeMessage(value: number[]): number[] {
  return [...encodeVarint(value.length), ...value];
}

function encodeAirport(code: string): number[] {
  return [
    ...encodeField(1, 0, encodeVarint(1)),
    ...encodeField(2, 2, encodeString(code)),
  ];
}

function encodeFlightLeg(
  date: string,
  origins: string[],
  destinations: string[],
): number[] {
  return [
    ...encodeField(2, 2, encodeString(date)),
    ...origins.flatMap((origin) =>
      encodeField(13, 2, encodeMessage(encodeAirport(origin))),
    ),
    ...destinations.flatMap((destination) =>
      encodeField(14, 2, encodeMessage(encodeAirport(destination))),
    ),
  ];
}

function base64UrlEncode(bytes: number[]): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  let result = '';
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index];
    const second = bytes[index + 1];
    const third = bytes[index + 2];
    const value = (first << 16) | ((second ?? 0) << 8) | (third ?? 0);
    result += alphabet[(value >> 18) & 0x3f];
    result += alphabet[(value >> 12) & 0x3f];
    if (second !== undefined) result += alphabet[(value >> 6) & 0x3f];
    if (third !== undefined) result += alphabet[value & 0x3f];
  }
  return result;
}

export function googleFlightsSearchUrl(input: ResolvedGoogleFlightComparison): string {
  if (input.origins.length === 0 || input.destinations.length === 0) {
    throw new Error('Google Flights comparisons require resolved airports.');
  }
  if (!Number.isInteger(input.adults) || input.adults < 1 || input.adults > 9) {
    throw new Error('Google Flights comparisons require 1–9 travelers.');
  }

  const allResults = [8, 255, 255, 255, 255, 255, 255, 255, 255, 255, 1];
  const payload = [
    ...encodeField(1, 0, encodeVarint(28)),
    ...encodeField(2, 0, encodeVarint(2)),
    ...encodeField(
      3,
      2,
      encodeMessage(
        encodeFlightLeg(input.departureDate, input.origins, input.destinations),
      ),
    ),
    ...encodeField(
      3,
      2,
      encodeMessage(
        encodeFlightLeg(input.returnDate, input.destinations, input.origins),
      ),
    ),
    ...Array.from(
      { length: input.adults },
      () => encodeField(8, 0, encodeVarint(1)),
    ).flat(),
    ...encodeField(9, 0, encodeVarint(1)),
    ...encodeField(14, 0, encodeVarint(1)),
    ...encodeField(16, 2, encodeMessage(allResults)),
    ...encodeField(19, 0, encodeVarint(1)),
  ];
  return `https://www.google.com/travel/flights/search?tfs=${base64UrlEncode(payload)}&hl=en`;
}

export async function compareOnGoogleFlights(input: GoogleFlightComparison): Promise<void> {
  const [origins, destinations] = await Promise.all([
    resolveFlightLocation(input.origin),
    resolveFlightLocation(input.destination),
  ]);
  await WebBrowser.openBrowserAsync(
    googleFlightsSearchUrl({
      ...input,
      origins,
      destinations,
    }),
  );
}
