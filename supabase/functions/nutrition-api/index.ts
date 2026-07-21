import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  'Cache-Control': 'no-store',
};

Deno.serve(async (request) => {
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
