import {
  analyzePhoto,
  assertAnalysisEnabled,
  nutritionCorsHeaders,
  nutritionError,
  nutritionOptionsResponse,
} from '@/services/nutrition/server';

export function OPTIONS() { return nutritionOptionsResponse(); }

export async function POST(request: Request) {
  const disabled = assertAnalysisEnabled('photo');
  if (disabled) return disabled;
  const input = await request.json().catch(() => undefined) as { imageDataUrl?: string; mealName?: string } | undefined;
  if (!input?.imageDataUrl) return nutritionError('A meal image is required.', 'INVALID_IMAGE', 400);
  try {
    const analysis = await analyzePhoto({ imageDataUrl: input.imageDataUrl, mealName: input.mealName });
    return Response.json({ draftId: crypto.randomUUID(), analysis }, { headers: nutritionCorsHeaders });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Meal analysis provider failure:', error instanceof Error ? error.message : 'unknown error');
    }
    if (error instanceof Error && error.message === 'INVALID_IMAGE') {
      return nutritionError('The image is invalid or too large.', 'INVALID_IMAGE', 400);
    }
    if (error instanceof Error && error.message === 'OLLAMA_UNAVAILABLE') {
      return nutritionError(
        'The local meal model is unavailable. Start Ollama and install the configured vision model.',
        'PROVIDER_FAILURE',
        503,
      );
    }
    return nutritionError('Meal analysis is temporarily unavailable.', 'PROVIDER_FAILURE', 502);
  }
}
