import { apiRequest } from '@/services/http/api-client';
import { resolveExpoApiUrl } from '@/services/http/api-url';

import type { ApiUsageSnapshot } from './api-usage-catalog';

export class ApiUsageError extends Error {
  constructor(
    message: string,
    readonly code?: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'ApiUsageError';
  }
}

export async function fetchApiUsageSnapshot(
  signal?: AbortSignal,
): Promise<ApiUsageSnapshot> {
  const url = resolveExpoApiUrl('/api/usage', {
    configuredBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
    createNotConfiguredError: () =>
      new ApiUsageError('API host is not configured for this build.', 'NOT_CONFIGURED'),
  });
  return apiRequest<ApiUsageSnapshot, ApiUsageError>({
    url,
    method: 'GET',
    signal,
    timeoutMs: 12_000,
    offlineMessage: 'Connect to the API host to load usage.',
    unavailableMessage: 'API usage could not be loaded.',
    defaultErrorCode: 'USAGE_UNAVAILABLE',
    createError: (message, code, status) => new ApiUsageError(message, code, status),
  });
}
