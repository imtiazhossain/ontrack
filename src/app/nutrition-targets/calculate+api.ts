import { nutritionCorsHeaders, nutritionError, nutritionOptionsResponse } from '@/services/nutrition/server';
import type { NutritionProfile } from '@/types/models';
import { calculateNutritionTargets, NutritionTargetError } from '@/utils/nutrition';

export function OPTIONS() { return nutritionOptionsResponse(); }

export async function POST(request: Request) {
  const input = await request.json().catch(() => undefined) as { profile?: NutritionProfile } | undefined;
  if (!input?.profile) return nutritionError('A nutrition profile is required.', 'PROVIDER_FAILURE', 400);
  try {
    return Response.json({ targets: calculateNutritionTargets(input.profile) }, { headers: nutritionCorsHeaders });
  } catch (caught) {
    if (caught instanceof NutritionTargetError) {
      return nutritionError(caught.message, caught.code === 'CLINICAL_APPROVAL_REQUIRED' ? 'CLINICAL_APPROVAL_REQUIRED' : 'PROVIDER_FAILURE', 422);
    }
    return nutritionError('Targets could not be calculated.', 'PROVIDER_FAILURE', 400);
  }
}
