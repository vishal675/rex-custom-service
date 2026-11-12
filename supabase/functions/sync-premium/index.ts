// Called by the app right after a purchase or restore, so Premium switches on without waiting for the webhook.
// Auth: the user's own access token (verify_jwt = true). The user id comes from the verified token, and the
// entitlement comes from RevenueCat's API — nothing the app sends can grant Premium.
import { createClient } from 'npm:@supabase/supabase-js@2.119.0';

import { ConfigError, syncUser } from '../_shared/revenuecat.ts';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });

  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return json(401, { error: 'not_authenticated' });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) return json(401, { error: 'not_authenticated' });

  try {
    return json(200, await syncUser(admin, data.user.id));
  } catch (e) {
    if (e instanceof ConfigError) {
      console.error(e.message);
      return json(503, { error: 'premium_not_configured' });
    }
    console.error('sync failed', String(e));
    return json(502, { error: 'sync_failed' });
  }
});
