import { apiRequest } from '@/services/http/api-client';
import { resolveExpoApiUrl } from '@/services/http/api-url';

import type { PartsSearchItem, VinDecodeResult } from './server';

export class VehicleServiceError extends Error {
  code?: string;
  status?: number;

  constructor(message: string, code?: string, status?: number) {
    super(message);
    this.name = 'VehicleServiceError';
    this.code = code;
    this.status = status;
  }
}

function vehicleApiUrl(path: string): string {
  return resolveExpoApiUrl(path, {
    configuredBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
    createNotConfiguredError: () =>
      new VehicleServiceError(
        'Vehicle services are not configured for this build.',
        'NOT_CONFIGURED',
      ),
  });
}

export async function decodeVehicleVin(
  vin: string,
  signal?: AbortSignal,
): Promise<VinDecodeResult> {
  const data = await apiRequest<{ result: VinDecodeResult }, VehicleServiceError>({
    url: vehicleApiUrl(
      `/api/vehicles/vin-decode?vin=${encodeURIComponent(vin.trim())}`,
    ),
    method: 'GET',
    signal,
    authenticate: false,
    offlineMessage: 'Connect to the internet to decode a VIN.',
    unavailableMessage: 'VIN decode is temporarily unavailable.',
    createError: (message, code, status) =>
      new VehicleServiceError(message, code, status),
  });
  return data.result;
}

export async function searchVehicleParts(
  input: {
    year?: number;
    make?: string;
    model?: string;
    trim?: string;
    engine?: string;
    query?: string;
  },
  signal?: AbortSignal,
): Promise<PartsSearchItem[]> {
  const params = new URLSearchParams();
  if (input.year) params.set('year', String(input.year));
  if (input.make) params.set('make', input.make);
  if (input.model) params.set('model', input.model);
  if (input.trim) params.set('trim', input.trim);
  if (input.engine) params.set('engine', input.engine);
  if (input.query) params.set('q', input.query);
  const data = await apiRequest<{ results: PartsSearchItem[] }, VehicleServiceError>({
    url: vehicleApiUrl(`/api/vehicles/parts/search?${params.toString()}`),
    method: 'GET',
    signal,
    authenticate: false,
    offlineMessage: 'Connect to the internet to search parts.',
    unavailableMessage: 'Parts search is temporarily unavailable.',
    createError: (message, code, status) =>
      new VehicleServiceError(message, code, status),
  });
  return data.results;
}

export type { PartsSearchItem, VinDecodeResult };
