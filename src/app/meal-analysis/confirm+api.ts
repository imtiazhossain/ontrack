import { validateMealAnalysis } from '@/services/ai/validate';
import { compressResponse } from '@/services/http/compression';
import {
    assertNutritionAuthenticated,
    nutritionCorsHeaders,
    nutritionError,
    nutritionOptionsResponse,
} from '@/services/nutrition/server';

export function OPTIONS(request: Request) {
  return nutritionOptionsResponse(request);
}

export async function POST(request: Request) {
  const unauthorized = await assertNutritionAuthenticated(request);
  if (unauthorized) return unauthorized;
  const input = await request.json().catch(() => undefined) as { draftId?: string; analysis?: unknown } | undefined;
  if (!input?.draftId) return nutritionError('A draft ID is required.', 'PROVIDER_FAILURE', 400);
  const analysis = validateMealAnalysis(input.analysis);
  if (!analysis) return nutritionError('The confirmed analysis is invalid.', 'PROVIDER_FAILURE', 400);
  return compressResponse(request, Response.json({ analysis }, { headers: nutritionCorsHeaders }));
}
