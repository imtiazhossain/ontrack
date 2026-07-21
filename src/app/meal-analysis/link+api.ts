import {
  analyzeLinkCandidate,
  assertAnalysisEnabled,
  nutritionCorsHeaders,
  nutritionError,
  nutritionOptionsResponse,
} from '@/services/nutrition/server';
import type { MealLinkCandidate } from '@/services/nutrition/types';

export function OPTIONS() { return nutritionOptionsResponse(); }

export async function POST(request: Request) {
  const disabled = assertAnalysisEnabled();
  if (disabled) return disabled;
  const input = await request.json().catch(() => undefined) as { candidate?: MealLinkCandidate } | undefined;
  if (!input?.candidate?.itemName) return nutritionError('Choose a meal candidate first.', 'AMBIGUOUS_MEAL', 400);
  try {
    const analysis = await analyzeLinkCandidate(input.candidate);
    return Response.json({ draftId: crypto.randomUUID(), analysis }, { headers: nutritionCorsHeaders });
  } catch {
    return nutritionError('Meal analysis is temporarily unavailable.', 'PROVIDER_FAILURE', 502);
  }
}
