import { nutritionCorsHeaders, nutritionError, nutritionOptionsResponse } from '@/services/nutrition/server';

export function OPTIONS() { return nutritionOptionsResponse(); }

export async function GET(request: Request) {
  if (process.env.CLINICAL_CLOUD_ENABLED !== 'true') {
    return nutritionError('Cloud nutrition insights are not configured.', 'NOT_CONFIGURED', 503);
  }
  const authorization = request.headers.get('authorization');
  const supabaseUrl = process.env.SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  const profileId = new URL(request.url).searchParams.get('profileId');
  if (!authorization || !supabaseUrl || !publishableKey || !profileId) {
    return nutritionError('Authentication and a profile are required.', 'PERMISSION_DENIED', 401);
  }
  const response = await fetch(`${supabaseUrl}/rest/v1/meals?profile_id=eq.${encodeURIComponent(profileId)}&select=*,meal_items(*)`, {
    headers: { Authorization: authorization, apikey: publishableKey },
  });
  if (!response.ok) return nutritionError('Insights could not be loaded.', 'PERMISSION_DENIED', response.status);
  return new Response(await response.text(), { headers: { ...nutritionCorsHeaders, 'Content-Type': 'application/json' } });
}
