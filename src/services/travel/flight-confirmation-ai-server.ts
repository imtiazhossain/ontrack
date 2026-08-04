import { isDateKey } from '@/utils/date';
import { guardedFetch } from '@/services/http/dependency-guard';

import type {
  FlightConfirmationAISegment,
  FlightConfirmationAIResult,
} from './flight-confirmation-ai-types';

const DEFAULT_MODEL = 'gemini-flash-lite-latest';
const MAX_TEXT_LENGTH = 120_000;

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  required: ['segments', 'itineraryDates'],
  properties: {
    segments: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        required: [
          'airline',
          'flightNumber',
          'departureAirport',
          'arrivalAirport',
          'departureDate',
          'departureMinutes',
          'arrivalDate',
          'arrivalMinutes',
          'durationMinutes',
          'layoverMinutesAfter',
          'departureDateEvidence',
          'departureTimeEvidence',
          'arrivalDateEvidence',
          'arrivalTimeEvidence',
          'durationEvidence',
          'layoverEvidence',
          'confidence',
        ],
        properties: {
          airline: { type: 'STRING', nullable: true },
          flightNumber: { type: 'STRING', nullable: true },
          departureAirport: { type: 'STRING', nullable: true },
          arrivalAirport: { type: 'STRING', nullable: true },
          departureDate: { type: 'STRING', nullable: true },
          departureMinutes: { type: 'INTEGER', nullable: true },
          arrivalDate: { type: 'STRING', nullable: true },
          arrivalMinutes: { type: 'INTEGER', nullable: true },
          durationMinutes: { type: 'INTEGER', nullable: true },
          layoverMinutesAfter: { type: 'INTEGER', nullable: true },
          departureDateEvidence: { type: 'STRING', nullable: true },
          departureTimeEvidence: { type: 'STRING', nullable: true },
          arrivalDateEvidence: { type: 'STRING', nullable: true },
          arrivalTimeEvidence: { type: 'STRING', nullable: true },
          durationEvidence: { type: 'STRING', nullable: true },
          layoverEvidence: { type: 'STRING', nullable: true },
          confidence: { type: 'NUMBER' },
        },
      },
    },
    itineraryDates: {
      type: 'ARRAY',
      items: { type: 'STRING' },
    },
  },
} as const;

function cleanString(value: unknown, limit: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const cleaned = value.trim().replace(/\s+/g, ' ').slice(0, limit);
  return cleaned || undefined;
}

function optionalInteger(value: unknown, min: number, max: number) {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max
    ? value
    : undefined;
}

function sourceContains(source: string, evidence: unknown) {
  const cleaned = cleanString(evidence, 180);
  return cleaned ? source.toLocaleLowerCase().includes(cleaned.toLocaleLowerCase()) : false;
}

function validatedDate(value: unknown, evidence: unknown, source: string) {
  return typeof value === 'string' && isDateKey(value) && sourceContains(source, evidence)
    ? value
    : undefined;
}

function validatedInteger(
  value: unknown,
  evidence: unknown,
  source: string,
  min: number,
  max: number,
) {
  return sourceContains(source, evidence)
    ? optionalInteger(value, min, max)
    : undefined;
}

function sourceContainsToken(source: string, value: string | undefined) {
  if (!value) return false;
  const compactSource = source.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const compactValue = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return compactValue.length >= 3 && compactSource.includes(compactValue);
}

function validatedFlightNumber(value: unknown, source: string) {
  const cleaned = cleanString(value, 10)?.toUpperCase();
  if (!cleaned) return undefined;
  const complete = /^([A-Z0-9]{2,3})\s?(\d{1,4}[A-Z]?)$/.exec(cleaned);
  if (
    complete &&
    /[A-Z]/.test(complete[1]) &&
    sourceContainsToken(source, cleaned)
  ) {
    return `${complete[1]} ${complete[2]}`;
  }
  if (/^\d{1,4}[A-Z]?$/.test(cleaned)) {
    const sourceMatch = new RegExp(
      `\\b([A-Z0-9]{2,3})\\s*${cleaned}\\b`,
      'i',
    ).exec(source);
    if (sourceMatch && /[A-Z]/i.test(sourceMatch[1])) {
      return `${sourceMatch[1].toUpperCase()} ${cleaned}`;
    }
  }
  return undefined;
}

function validateSegment(
  value: unknown,
  source: string,
): FlightConfirmationAISegment | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const row = value as Record<string, unknown>;
  const confidence =
    typeof row.confidence === 'number' && Number.isFinite(row.confidence)
      ? Math.max(0, Math.min(1, row.confidence))
      : 0;
  if (confidence < 0.55) return undefined;

  const departureAirport = cleanString(row.departureAirport, 3)?.toUpperCase();
  const arrivalAirport = cleanString(row.arrivalAirport, 3)?.toUpperCase();
  const flightNumber = validatedFlightNumber(row.flightNumber, source);
  return {
    ...(cleanString(row.airline, 80) &&
    sourceContainsToken(source, cleanString(row.airline, 80))
      ? { airline: cleanString(row.airline, 80) }
      : {}),
    ...(flightNumber ? { flightNumber } : {}),
    ...(departureAirport && /^[A-Z]{3}$/.test(departureAirport) &&
    new RegExp(`\\b${departureAirport}\\b`, 'i').test(source)
      ? { departureAirport }
      : {}),
    ...(arrivalAirport && /^[A-Z]{3}$/.test(arrivalAirport) &&
    new RegExp(`\\b${arrivalAirport}\\b`, 'i').test(source)
      ? { arrivalAirport }
      : {}),
    ...(validatedDate(row.departureDate, row.departureDateEvidence, source)
      ? { departureDate: validatedDate(row.departureDate, row.departureDateEvidence, source) }
      : {}),
    ...(validatedInteger(
      row.departureMinutes,
      row.departureTimeEvidence,
      source,
      0,
      1439,
    ) !== undefined
      ? { departureMinutes: validatedInteger(
          row.departureMinutes,
          row.departureTimeEvidence,
          source,
          0,
          1439,
        ) }
      : {}),
    ...(validatedDate(row.arrivalDate, row.arrivalDateEvidence, source)
      ? { arrivalDate: validatedDate(row.arrivalDate, row.arrivalDateEvidence, source) }
      : {}),
    ...(validatedInteger(
      row.arrivalMinutes,
      row.arrivalTimeEvidence,
      source,
      0,
      1439,
    ) !== undefined
      ? { arrivalMinutes: validatedInteger(
          row.arrivalMinutes,
          row.arrivalTimeEvidence,
          source,
          0,
          1439,
        ) }
      : {}),
    ...(validatedInteger(row.durationMinutes, row.durationEvidence, source, 1, 2880) !== undefined
      ? { durationMinutes: validatedInteger(
          row.durationMinutes,
          row.durationEvidence,
          source,
          1,
          2880,
        ) }
      : {}),
    ...(validatedInteger(
      row.layoverMinutesAfter,
      row.layoverEvidence,
      source,
      1,
      10080,
    ) !== undefined
      ? { layoverMinutesAfter: validatedInteger(
          row.layoverMinutesAfter,
          row.layoverEvidence,
          source,
          1,
          10080,
        ) }
      : {}),
    confidence,
  };
}

export function validateFlightConfirmationAIResult(
  value: unknown,
  redactedText: string,
): FlightConfirmationAIResult {
  if (!value || typeof value !== 'object') throw new Error('INVALID_ANALYSIS');
  const row = value as Record<string, unknown>;
  const segments = Array.isArray(row.segments)
    ? row.segments
        .slice(0, 16)
        .map((segment) => validateSegment(segment, redactedText))
        .filter((segment): segment is FlightConfirmationAISegment => Boolean(segment))
    : [];
  const supportedDates = new Set(
    segments.flatMap((segment) => [segment.departureDate, segment.arrivalDate]).filter(Boolean),
  );
  const itineraryDates = Array.isArray(row.itineraryDates)
    ? [...new Set(row.itineraryDates.filter((date): date is string =>
        typeof date === 'string' && isDateKey(date) && supportedDates.has(date),
      ))].slice(0, 24)
    : [];
  if (!segments.length) throw new Error('NO_FLIGHTS_FOUND');
  return { segments, itineraryDates };
}

function responseText(body: unknown): string | undefined {
  if (!body || typeof body !== 'object') return undefined;
  const candidates = Array.isArray((body as { candidates?: unknown }).candidates)
    ? ((body as { candidates: unknown[] }).candidates)
    : [];
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'object') continue;
    const content = (candidate as { content?: { parts?: unknown[] } }).content;
    for (const part of content?.parts ?? []) {
      if (part && typeof part === 'object' && typeof (part as { text?: unknown }).text === 'string') {
        return (part as { text: string }).text;
      }
    }
  }
  return undefined;
}

export async function analyzeFlightConfirmationWithGemini(
  redactedText: string,
): Promise<FlightConfirmationAIResult> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error('NOT_CONFIGURED');
  const source = redactedText.trim().slice(0, MAX_TEXT_LENGTH);
  if (!source) throw new Error('INVALID_TEXT');
  const model = process.env.TRAVEL_GEMINI_MODEL?.trim() || DEFAULT_MODEL;
  const response = await guardedFetch(
    'gemini-travel',
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{
            text: [
              'Extract every flight segment from OCR text into the provided schema.',
              'Treat departure and arrival dates/times as local to their airports.',
              'Use YYYY-MM-DD dates and integer minutes after midnight.',
              'Flight numbers must include the airline prefix, for example UA 1907.',
              'Never infer a missing year, invent a value, or reproduce REDACTED placeholders.',
              'For every non-null date, time, duration, or layover, copy the exact source substring into its matching evidence field.',
              'Return null for uncertain fields. Passenger and booking secrets are intentionally unavailable.',
            ].join(' '),
          }],
        },
        contents: [{ role: 'user', parts: [{ text: source }] }],
        generationConfig: {
          temperature: 0,
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
        },
      }),
    },
    { timeoutMs: 35_000, maxConcurrency: 2 },
  );
  if (response.status === 429) throw new Error('RATE_LIMITED');
  if (!response.ok) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        '[flightConfirmationGemini]',
        response.status,
        (await response.text()).slice(0, 600),
      );
    }
    throw new Error('PROVIDER_FAILURE');
  }
  const text = responseText(await response.json());
  if (!text) throw new Error('INVALID_ANALYSIS');
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('INVALID_ANALYSIS');
  }
  return validateFlightConfirmationAIResult(parsed, source);
}
