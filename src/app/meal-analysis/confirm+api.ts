import { validateMealAnalysis } from '@/services/ai/validate';
import { nutritionCorsHeaders, nutritionError, nutritionOptionsResponse } from '@/services/nutrition/server';

export function OPTIONS() { return nutritionOptionsResponse(); }

export async function POST(request: Request) {
  const input = await request.json().catch(() => undefined) as { draftId?: string; analysis?: unknown } | undefined;
  if (!input?.draftId) return nutritionError('A draft ID is required.', 'PROVIDER_FAILURE', 400);
  const analysis = validateMealAnalysis(input.analysis);
  if (!analysis) return nutritionError('The confirmed analysis is invalid.', 'PROVIDER_FAILURE', 400);
  return Response.json({ analysis }, { headers: nutritionCorsHeaders });
}
