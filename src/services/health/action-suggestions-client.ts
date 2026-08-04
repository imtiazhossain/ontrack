import { apiRequest } from '@/services/http/api-client';
import { resolveExpoApiUrl } from '@/services/http/api-url';
import type { MoodActionSuggestion, MoodSuggestionInput } from './action-suggestions';

class MoodSuggestionError extends Error {
  constructor(message: string, public code?: string, public status?: number) { super(message); }
}

export async function requestMoodSuggestions(input: MoodSuggestionInput) {
  const url = resolveExpoApiUrl('/health/action-suggestions', {
    configuredBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
    createNotConfiguredError: () => new MoodSuggestionError('AI suggestions require a connected onTrack server.', 'NOT_CONFIGURED'),
  });
  return apiRequest<{ suggestions: MoodActionSuggestion[] }, MoodSuggestionError>({
    url,
    body: input,
    offlineMessage: 'Connect to the internet to request suggestions.',
    unavailableMessage: 'AI suggestions are temporarily unavailable.',
    createError: (message, code, status) => new MoodSuggestionError(message, code, status),
  });
}
