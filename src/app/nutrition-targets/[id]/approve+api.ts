import { nutritionCorsHeaders, nutritionError, nutritionOptionsResponse } from '@/services/nutrition/server';

export function OPTIONS() { return nutritionOptionsResponse(); }

export async function POST(request: Request, { id }: { id: string }) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  const authorization = request.headers.get('authorization');
  if (process.env.CLINICAL_CLOUD_ENABLED !== 'true' || !supabaseUrl || !publishableKey) {
    return nutritionError('Clinical target approval is not configured.', 'NOT_CONFIGURED', 503);
  }
  if (!authorization) return nutritionError('Authentication is required.', 'PERMISSION_DENIED', 401);
  const response = await fetch(`${supabaseUrl}/rest/v1/nutrition_target_versions?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { Authorization: authorization, apikey: publishableKey, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify({ status: 'approved', approved_at: new Date().toISOString() }),
  });
  if (!response.ok) return nutritionError('Only a verified assigned clinician can approve this target.', 'PERMISSION_DENIED', 403);
  return Response.json({ target: (await response.json() as unknown[])[0] }, { headers: nutritionCorsHeaders });
}
