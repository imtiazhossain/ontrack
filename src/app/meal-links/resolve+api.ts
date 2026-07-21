import {
  assertAnalysisEnabled,
  nutritionCorsHeaders,
  nutritionError,
  nutritionOptionsResponse,
  resolveLink,
} from '@/services/nutrition/server';

export function OPTIONS() { return nutritionOptionsResponse(); }

export async function POST(request: Request) {
  const disabled = assertAnalysisEnabled();
  if (disabled) return disabled;
  const input = await request.json().catch(() => undefined) as { url?: string } | undefined;
  if (!input?.url || input.url.length > 2_000) return nutritionError('Enter a valid meal link.', 'INVALID_URL', 400);
  try {
    const result = await resolveLink(input.url);
    return Response.json(result, { headers: nutritionCorsHeaders });
  } catch (error) {
    const code = error instanceof Error ? error.message : '';
    if (code === 'BLOCKED_LINK') return nutritionError('This link could not be read safely.', 'BLOCKED_LINK', 422);
    if (/HTTPS|complete|credentials|Private/.test(code)) return nutritionError(code, 'INVALID_URL', 400);
    return nutritionError('The meal could not be identified from this link.', 'AMBIGUOUS_MEAL', 422);
  }
}
