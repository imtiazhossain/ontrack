import { apiRequest } from '@/services/http/api-client';
import { resolveExpoApiUrl } from '@/services/http/api-url';

import type {
  FlightConfirmationAIRequest,
  FlightConfirmationAIResult,
} from './flight-confirmation-ai-types';

class FlightConfirmationAIError extends Error {
  constructor(
    message: string,
    readonly code?: string,
    readonly status = 0,
  ) {
    super(message);
    this.name = 'FlightConfirmationAIError';
  }
}

function apiUrl() {
  return resolveExpoApiUrl('/travel-confirmations/parse', {
    configuredBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
    preferConfiguredFirst: true,
    requireHttpsInProduction: true,
    createNotConfiguredError: () =>
      new FlightConfirmationAIError('Flight import AI is not configured.', 'NOT_CONFIGURED'),
  });
}

export async function analyzeRedactedFlightConfirmation(
  request: FlightConfirmationAIRequest,
  signal?: AbortSignal,
): Promise<FlightConfirmationAIResult> {
  return apiRequest<FlightConfirmationAIResult, FlightConfirmationAIError>({
    url: apiUrl(),
    method: 'POST',
    body: request,
    signal,
    offlineMessage: 'Flight import AI is offline.',
    unavailableMessage: 'Flight import AI is temporarily unavailable.',
    defaultErrorCode: 'PROVIDER_FAILURE',
    createError: (message, code, status) =>
      new FlightConfirmationAIError(message, code, status ?? 0),
  });
}
