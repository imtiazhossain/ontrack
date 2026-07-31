import { compressResponse } from '@/services/http/compression';
import { apiCorsHeaders, apiOptionsResponse } from '@/services/http/cors';

export const corsHeaders = apiCorsHeaders(undefined, 'GET, POST, OPTIONS');

export function optionsResponse(request?: Request) {
  return apiOptionsResponse(request ?? new Request('http://localhost'), 'GET, POST, OPTIONS');
}

export type VinDecodeResult = {
  vin: string;
  year?: number;
  make?: string;
  model?: string;
  trim?: string;
  engine?: string;
  bodyClass?: string;
  errorText?: string;
};

function textField(row: Record<string, unknown>, key: string): string | undefined {
  const value = row[key];
  return typeof value === 'string' && value.trim() && value.trim() !== 'Not Applicable'
    ? value.trim()
    : undefined;
}

export function normalizeNhtsaDecode(
  vin: string,
  payload: unknown,
): VinDecodeResult {
  const results = (payload as { Results?: Record<string, unknown>[] })?.Results;
  const row = Array.isArray(results) ? results[0] : undefined;
  if (!row) {
    return { vin, errorText: 'No decode result returned.' };
  }
  const errorCode = textField(row, 'ErrorCode');
  const errorText = textField(row, 'ErrorText');
  if (errorCode && errorCode !== '0') {
    return { vin, errorText: errorText ?? 'VIN could not be decoded.' };
  }
  const yearRaw = textField(row, 'ModelYear');
  const year = yearRaw ? Number(yearRaw) : undefined;
  return {
    vin,
    year: Number.isFinite(year) ? year : undefined,
    make: textField(row, 'Make'),
    model: textField(row, 'Model'),
    trim: textField(row, 'Trim') ?? textField(row, 'Series'),
    engine:
      textField(row, 'DisplacementL')
        ? `${textField(row, 'DisplacementL')}L${textField(row, 'EngineCylinders') ? ` ${textField(row, 'EngineCylinders')}-cyl` : ''}`
        : textField(row, 'EngineModel'),
    bodyClass: textField(row, 'BodyClass'),
  };
}

export async function decodeVinWithNhtsa(vin: string): Promise<VinDecodeResult> {
  const cleaned = vin.trim().toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '');
  if (cleaned.length < 11 || cleaned.length > 17) {
    return { vin: cleaned, errorText: 'Enter an 11–17 character VIN.' };
  }
  const url = `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${encodeURIComponent(cleaned)}?format=json`;
  const response = await fetch(url);
  if (!response.ok) {
    return { vin: cleaned, errorText: 'NHTSA VIN service is temporarily unavailable.' };
  }
  const payload = await response.json();
  return normalizeNhtsaDecode(cleaned, payload);
}

export type PartsSearchItem = {
  id: string;
  name: string;
  category: string;
  vendor: 'RockAuto' | 'Amazon' | 'AutoZone';
  url: string;
  fitmentLabel: string;
};

const PART_CATEGORIES = [
  { id: 'oil-filter', name: 'Oil filter', query: 'oil filter' },
  { id: 'cabin-filter', name: 'Cabin air filter', query: 'cabin air filter' },
  { id: 'engine-filter', name: 'Engine air filter', query: 'engine air filter' },
  { id: 'brake-pads', name: 'Brake pads', query: 'brake pads' },
  { id: 'wipers', name: 'Wiper blades', query: 'wiper blades' },
  { id: 'spark-plugs', name: 'Spark plugs', query: 'spark plugs' },
  { id: 'battery', name: 'Battery', query: 'car battery' },
  { id: 'serpentine-belt', name: 'Serpentine belt', query: 'serpentine belt' },
] as const;

function fitmentLabel(input: {
  year?: number;
  make?: string;
  model?: string;
  trim?: string;
  engine?: string;
}): string {
  return [input.year, input.make, input.model, input.trim, input.engine]
    .filter((part) => part !== undefined && part !== '')
    .join(' ')
    .trim();
}

function retailerUrls(query: string, ymm: string) {
  const q = encodeURIComponent(`${ymm} ${query}`.trim());
  return {
    RockAuto: `https://www.rockauto.com/en/catalog/?s=${q}`,
    Amazon: `https://www.amazon.com/s?k=${q}`,
    AutoZone: `https://www.autozone.com/search?searchText=${q}`,
  } as const;
}

export function buildPartsSearchResults(input: {
  year?: number;
  make?: string;
  model?: string;
  trim?: string;
  engine?: string;
  query?: string;
}): PartsSearchItem[] {
  const label = fitmentLabel(input);
  const query = input.query?.trim();
  const categories = query
    ? [{ id: 'custom', name: query, query }]
    : PART_CATEGORIES.map((item) => ({ ...item }));

  return categories.flatMap((category) => {
    const urls = retailerUrls(category.query, label || 'vehicle');
    return (Object.keys(urls) as Array<keyof typeof urls>).map((vendor) => ({
      id: `${category.id}-${vendor.toLowerCase()}`,
      name: category.name,
      category: category.id,
      vendor,
      url: urls[vendor],
      fitmentLabel: label || 'Vehicle',
    }));
  });
}

export function jsonResponse(request: Request, body: unknown, status = 200) {
  return compressResponse(
    request,
    Response.json(body, { status, headers: corsHeaders }),
  );
}
