import { nutritionCorsHeaders, nutritionError, nutritionOptionsResponse } from '@/services/nutrition/server';

export function OPTIONS() { return nutritionOptionsResponse(); }

async function forward(request: Request, method: 'GET' | 'POST') {
  const supabaseUrl = process.env.SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  const authorization = request.headers.get('authorization');
  if (process.env.CLINICAL_CLOUD_ENABLED !== 'true' || !supabaseUrl || !publishableKey) {
    return nutritionError('Clinical profiles are not configured.', 'NOT_CONFIGURED', 503);
  }
  if (!authorization) return nutritionError('Authentication is required.', 'PERMISSION_DENIED', 401);
  const profileId = new URL(request.url).searchParams.get('id');
  const url = `${supabaseUrl}/rest/v1/nutrition_profiles${profileId ? `?id=eq.${encodeURIComponent(profileId)}` : ''}`;
  const response = await fetch(url, {
    method,
    headers: { Authorization: authorization, apikey: publishableKey, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: method === 'POST' ? JSON.stringify(await request.json()) : undefined,
  });
  if (!response.ok) return nutritionError('The profile request was denied.', 'PERMISSION_DENIED', response.status);
  return new Response(await response.text(), { status: response.status, headers: { ...nutritionCorsHeaders, 'Content-Type': 'application/json' } });
}

export function GET(request: Request) { return forward(request, 'GET'); }
export function PUT(request: Request) { return forward(request, 'POST'); }
