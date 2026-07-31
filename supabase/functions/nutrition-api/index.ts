import { createClient } from 'npm:@supabase/supabase-js@2';

// Only reflect origins the operator explicitly allowlists. A wildcard origin
// would let any website drive this credentialed clinical endpoint from a
// victim's browser. Native app requests send no Origin and are unaffected.
const allowedOrigins = new Set(
  (Deno.env.get('ALLOWED_ORIGINS') ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
);

function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('Origin');
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, content-type, apikey',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Vary': 'Origin',
    'Cache-Control': 'no-store',
  };
  if (origin && allowedOrigins.has(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

Deno.serve(async (request) => {
  const cors = corsHeaders(request);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return Response.json({ error: 'Authentication required.', code: 'PERMISSION_DENIED' }, { status: 401, headers: cors });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Authentication required.', code: 'PERMISSION_DENIED' }, { status: 401, headers: cors });

  // The app uses this function origin only after HIPAA/clinical configuration is enabled.
  if (Deno.env.get('CLINICAL_AI_ENABLED') !== 'true') {
    return Response.json({
      error: 'Clinical cloud processing is disabled until release gates are complete.',
      code: 'NOT_CONFIGURED',
    }, { status: 503, headers: cors });
  }

  return Response.json({
    error: 'Deploy the reviewed meal-analysis handler for this regulated environment.',
    code: 'NOT_CONFIGURED',
  }, { status: 503, headers: cors });
});
