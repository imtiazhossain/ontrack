import {
  assertAnalysisEnabled,
  assertNutritionAuthenticated,
  enhanceMealImage,
  nutritionCorsHeaders,
  nutritionError,
  nutritionOptionsResponse,
} from '@/services/nutrition/server';

const PHOTO_PROCESSING_VERSION = 1;

export function OPTIONS() { return nutritionOptionsResponse(); }

export async function POST(request: Request) {
  const disabled = assertAnalysisEnabled('cloud');
  if (disabled) return disabled;
  const unauthorized = await assertNutritionAuthenticated(request);
  if (unauthorized) return unauthorized;
  const input = await request.json().catch(() => undefined) as { imageDataUrl?: string; mealName?: string } | undefined;
  if (!input?.imageDataUrl) return nutritionError('A meal image is required.', 'INVALID_IMAGE', 400);
  try {
    const imageDataUrl = await enhanceMealImage({ imageDataUrl: input.imageDataUrl, mealName: input.mealName });
    return Response.json({ imageDataUrl, version: PHOTO_PROCESSING_VERSION }, { headers: nutritionCorsHeaders });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Meal image enhancement failure:', error instanceof Error ? error.message : 'unknown error');
    }
    if (error instanceof Error && error.message === 'INVALID_IMAGE') {
      return nutritionError('The image is invalid or too large.', 'INVALID_IMAGE', 400);
    }
    return nutritionError('The meal photo could not be cleaned up.', 'PROVIDER_FAILURE', 502);
  }
}
