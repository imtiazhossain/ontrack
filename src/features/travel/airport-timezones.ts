/** IATA → IANA time zone for arrival-time math. Expand as itineraries need. */
const AIRPORT_TIME_ZONES: Record<string, string> = {
  // Northeast US
  EWR: 'America/New_York',
  JFK: 'America/New_York',
  LGA: 'America/New_York',
  BOS: 'America/New_York',
  PHL: 'America/New_York',
  IAD: 'America/New_York',
  DCA: 'America/New_York',
  BWI: 'America/New_York',
  BUF: 'America/New_York',
  // Southeast / Florida
  ATL: 'America/New_York',
  MIA: 'America/New_York',
  FLL: 'America/New_York',
  MCO: 'America/New_York',
  TPA: 'America/New_York',
  CLT: 'America/New_York',
  RDU: 'America/New_York',
  // Central
  ORD: 'America/Chicago',
  MDW: 'America/Chicago',
  DFW: 'America/Chicago',
  DAL: 'America/Chicago',
  IAH: 'America/Chicago',
  HOU: 'America/Chicago',
  MSP: 'America/Chicago',
  STL: 'America/Chicago',
  MSN: 'America/Chicago',
  MKE: 'America/Chicago',
  BNA: 'America/Chicago',
  AUS: 'America/Chicago',
  SAT: 'America/Chicago',
  MSY: 'America/Chicago',
  // Mountain
  DEN: 'America/Denver',
  SLC: 'America/Denver',
  PHX: 'America/Phoenix',
  ABQ: 'America/Denver',
  // Pacific
  LAX: 'America/Los_Angeles',
  LGB: 'America/Los_Angeles',
  SNA: 'America/Los_Angeles',
  SAN: 'America/Los_Angeles',
  SFO: 'America/Los_Angeles',
  SJC: 'America/Los_Angeles',
  OAK: 'America/Los_Angeles',
  SEA: 'America/Los_Angeles',
  PDX: 'America/Los_Angeles',
  LAS: 'America/Los_Angeles',
  // Alaska / Hawaii
  ANC: 'America/Anchorage',
  HNL: 'Pacific/Honolulu',
  // Canada
  YYZ: 'America/Toronto',
  YUL: 'America/Toronto',
  YOW: 'America/Toronto',
  YVR: 'America/Vancouver',
  YYC: 'America/Edmonton',
  YEG: 'America/Edmonton',
  // Mexico / Caribbean
  MEX: 'America/Mexico_City',
  CUN: 'America/Cancun',
  SJU: 'America/Puerto_Rico',
  // Iceland / UK / Ireland
  KEF: 'Atlantic/Reykjavik',
  RKV: 'Atlantic/Reykjavik',
  LHR: 'Europe/London',
  LGW: 'Europe/London',
  STN: 'Europe/London',
  MAN: 'Europe/London',
  EDI: 'Europe/London',
  DUB: 'Europe/Dublin',
  // Western Europe
  CDG: 'Europe/Paris',
  ORY: 'Europe/Paris',
  AMS: 'Europe/Amsterdam',
  BRU: 'Europe/Brussels',
  FRA: 'Europe/Berlin',
  MUC: 'Europe/Berlin',
  BER: 'Europe/Berlin',
  ZRH: 'Europe/Zurich',
  GVA: 'Europe/Zurich',
  VIE: 'Europe/Vienna',
  MAD: 'Europe/Madrid',
  BCN: 'Europe/Madrid',
  LIS: 'Europe/Lisbon',
  OPO: 'Europe/Lisbon',
  FCO: 'Europe/Rome',
  MXP: 'Europe/Rome',
  // Nordics
  CPH: 'Europe/Copenhagen',
  OSL: 'Europe/Oslo',
  ARN: 'Europe/Stockholm',
  HEL: 'Europe/Helsinki',
  // Eastern Europe / Middle East
  WAW: 'Europe/Warsaw',
  PRG: 'Europe/Prague',
  BUD: 'Europe/Budapest',
  ATH: 'Europe/Athens',
  IST: 'Europe/Istanbul',
  DXB: 'Asia/Dubai',
  AUH: 'Asia/Dubai',
  DOH: 'Asia/Qatar',
  TLV: 'Asia/Jerusalem',
  // Asia-Pacific
  NRT: 'Asia/Tokyo',
  HND: 'Asia/Tokyo',
  ICN: 'Asia/Seoul',
  PEK: 'Asia/Shanghai',
  PVG: 'Asia/Shanghai',
  HKG: 'Asia/Hong_Kong',
  TPE: 'Asia/Taipei',
  SIN: 'Asia/Singapore',
  BKK: 'Asia/Bangkok',
  KUL: 'Asia/Kuala_Lumpur',
  MNL: 'Asia/Manila',
  DEL: 'Asia/Kolkata',
  BOM: 'Asia/Kolkata',
  SYD: 'Australia/Sydney',
  MEL: 'Australia/Melbourne',
  BNE: 'Australia/Brisbane',
  AKL: 'Pacific/Auckland',
};

/** Prefer a bare IATA code; also accept `City (EWR)`. */
export function normalizeAirportCode(value?: string): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim().toUpperCase();
  if (/^[A-Z]{3}$/.test(trimmed)) return trimmed;
  const paren = trimmed.match(/\(([A-Z]{3})\)/);
  return paren?.[1];
}

export function airportTimeZone(code?: string): string | undefined {
  const iata = normalizeAirportCode(code);
  return iata ? AIRPORT_TIME_ZONES[iata] : undefined;
}
