/**
 * Carrier metadata shared by confirmation parsing and flight brand chrome.
 *
 * `CONFIRMATION_AIRLINE_CODES` stays intentionally narrow because the parser
 * scans loose OCR prose for `<code><number>`; broader codes (`CA`, `LA`, `OK`…)
 * collide with addresses and label noise. Every other carrier is still matched
 * when a code or airline name is already known (imports, manual entry).
 */

type AirlineEntry = { name: string; aliases?: string[] };

/** Codes trusted inside confirmation prose. Order feeds the parser regex. */
const CONFIRMATION_AIRLINES: Record<string, AirlineEntry> = {
  AA: { name: 'American Airlines', aliases: ['American'] },
  AC: { name: 'Air Canada' },
  AF: { name: 'Air France' },
  AS: { name: 'Alaska Airlines', aliases: ['Alaska'] },
  BA: { name: 'British Airways' },
  B6: { name: 'JetBlue', aliases: ['JetBlue Airways'] },
  DL: { name: 'Delta', aliases: ['Delta Air Lines', 'Delta Airlines'] },
  EI: { name: 'Aer Lingus' },
  EK: { name: 'Emirates' },
  FI: { name: 'Icelandair' },
  IB: { name: 'Iberia' },
  KL: { name: 'KLM', aliases: ['KLM Royal Dutch Airlines'] },
  LH: { name: 'Lufthansa' },
  NK: { name: 'Spirit', aliases: ['Spirit Airlines'] },
  QF: { name: 'Qantas' },
  QR: { name: 'Qatar Airways' },
  SK: { name: 'SAS', aliases: ['Scandinavian Airlines'] },
  TK: { name: 'Turkish Airlines' },
  TP: { name: 'TAP Air Portugal', aliases: ['TAP Portugal'] },
  UA: { name: 'United Airlines', aliases: ['United'] },
  VS: { name: 'Virgin Atlantic' },
  WN: { name: 'Southwest', aliases: ['Southwest Airlines'] },
};

/** Recognized only from an explicit code or airline name — never scanned. */
const ADDITIONAL_AIRLINES: Record<string, AirlineEntry> = {
  AD: { name: 'Azul' },
  AI: { name: 'Air India' },
  AM: { name: 'Aeroméxico', aliases: ['Aeromexico'] },
  AR: { name: 'Aerolíneas Argentinas', aliases: ['Aerolineas Argentinas'] },
  AV: { name: 'Avianca' },
  AY: { name: 'Finnair' },
  AZ: { name: 'ITA Airways' },
  BR: { name: 'EVA Air' },
  CA: { name: 'Air China' },
  CI: { name: 'China Airlines' },
  CM: { name: 'Copa Airlines', aliases: ['Copa'] },
  CX: { name: 'Cathay Pacific' },
  CZ: { name: 'China Southern' },
  DY: { name: 'Norwegian' },
  ET: { name: 'Ethiopian Airlines' },
  EY: { name: 'Etihad Airways', aliases: ['Etihad'] },
  FR: { name: 'Ryanair' },
  F9: { name: 'Frontier', aliases: ['Frontier Airlines'] },
  G3: { name: 'GOL' },
  G4: { name: 'Allegiant Air', aliases: ['Allegiant'] },
  HA: { name: 'Hawaiian Airlines', aliases: ['Hawaiian'] },
  JL: { name: 'Japan Airlines', aliases: ['JAL'] },
  JQ: { name: 'Jetstar' },
  KE: { name: 'Korean Air' },
  LA: { name: 'LATAM', aliases: ['LATAM Airlines'] },
  LO: { name: 'LOT Polish Airlines', aliases: ['LOT'] },
  LX: { name: 'SWISS', aliases: ['Swiss International Air Lines'] },
  MH: { name: 'Malaysia Airlines' },
  MS: { name: 'EgyptAir' },
  MU: { name: 'China Eastern' },
  NH: { name: 'ANA', aliases: ['All Nippon Airways'] },
  NZ: { name: 'Air New Zealand' },
  OS: { name: 'Austrian Airlines', aliases: ['Austrian'] },
  OZ: { name: 'Asiana Airlines', aliases: ['Asiana'] },
  PC: { name: 'Pegasus Airlines', aliases: ['Pegasus'] },
  SA: { name: 'South African Airways' },
  SN: { name: 'Brussels Airlines' },
  SQ: { name: 'Singapore Airlines' },
  SU: { name: 'Aeroflot' },
  SV: { name: 'Saudia' },
  TG: { name: 'Thai Airways' },
  TR: { name: 'Scoot' },
  UX: { name: 'Air Europa' },
  U2: { name: 'easyJet' },
  VN: { name: 'Vietnam Airlines' },
  VY: { name: 'Vueling' },
  WS: { name: 'WestJet' },
  W6: { name: 'Wizz Air' },
  Y4: { name: 'Volaris' },
  '6E': { name: 'IndiGo' },
};

const AIRLINES: Record<string, AirlineEntry> = {
  ...CONFIRMATION_AIRLINES,
  ...ADDITIONAL_AIRLINES,
};

/** Codes the confirmation parser may match inside free text. */
export const CONFIRMATION_AIRLINE_CODES = Object.keys(CONFIRMATION_AIRLINES);

function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/** "United Airlines" and "United" must resolve to the same carrier. */
function nameKeys(value: string): string[] {
  const normalized = normalizeName(value);
  if (!normalized) return [];
  const core = normalized.replace(/(airlines|airways|airline|airlink|air)$/, '');
  return core && core !== normalized ? [normalized, core] : [normalized];
}

const CODE_BY_NAME = new Map<string, string>();
for (const [code, entry] of Object.entries(AIRLINES)) {
  for (const label of [entry.name, ...(entry.aliases ?? [])]) {
    for (const key of nameKeys(label)) {
      if (!CODE_BY_NAME.has(key)) CODE_BY_NAME.set(key, code);
    }
  }
}

export function airlineName(code?: string): string | undefined {
  if (!code) return undefined;
  return AIRLINES[code.trim().toUpperCase()]?.name;
}

/** IATA designator from a stored flight number such as "UA 1234" / "b6202". */
function codeFromFlightNumber(flightNumber?: string): string | undefined {
  if (!flightNumber) return undefined;
  const compact = flightNumber.replace(/[\s-]/g, '').toUpperCase();
  const code = /^([A-Z]{2}|[A-Z]\d|\d[A-Z])\d{1,4}[A-Z]?$/.exec(compact)?.[1];
  return code && AIRLINES[code] ? code : undefined;
}

/** Display form like "UA 1907" from "UA1907" / "ua-1907" / "UA 1907". */
export function formatFlightNumber(flightNumber?: string): string | undefined {
  const raw = flightNumber?.trim();
  if (!raw) return undefined;
  const compact = raw.replace(/[\s-]/g, '').toUpperCase();
  const match = /^([A-Z]{2}|[A-Z]\d|\d[A-Z])(\d{1,4}[A-Z]?)$/.exec(compact);
  if (!match) return raw;
  return `${match[1]} ${match[2]}`;
}

function codeFromName(airline?: string): string | undefined {
  if (!airline) return undefined;
  for (const key of nameKeys(airline)) {
    const code = CODE_BY_NAME.get(key);
    if (code) return code;
  }
  return undefined;
}

/**
 * Resolve a known carrier code from flight details. Returns `undefined` for
 * unknown carriers so callers never render another airline's brand mark.
 */
export function airlineIataCode(input: {
  airline?: string;
  flightNumber?: string;
}): string | undefined {
  return (
    codeFromFlightNumber(input.flightNumber) ?? codeFromName(input.airline)
  );
}

/** Square brand mark for a carrier code, sized for the requesting plate. */
export function airlineLogoUrl(code: string, pixelSize = 256): string {
  const size = Math.min(512, Math.max(96, Math.round(pixelSize)));
  return `https://pics.avs.io/al_square/${size}/${size}/${code.toUpperCase()}.png`;
}
