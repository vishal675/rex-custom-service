// RevenueCat webhook → public.entitlements.
// Auth: RevenueCat sends the Authorization header value configured in its dashboard; it must equal
// REVENUECAT_WEBHOOK_AUTH (we accept the raw value or "Bearer <value>"). No user JWT (verify_jwt = false).
//
// The event body is logged to subscription_events (idempotent on event id) for audit, but the entitlement
// itself is always re-read from RevenueCat's API — so late, duplicate or out-of-order events are harmless.
// Any failure returns 5xx so RevenueCat retries.
import { createClient } from 'npm:@supabase/supabase-js@2.119.0';

import { ConfigError, syncUser } from '../_shared/revenuecat.ts';
import { affectedUserIds, safeEqual } from '../_shared/revenuecat-model.ts';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });

  const expected = Deno.env.get('REVENUECAT_WEBHOOK_AUTH');
  if (!expected) {
    console.error('REVENUECAT_WEBHOOK_AUTH is not set');
    return json(500, { error: 'not_configured' });
  }
  const got = req.headers.get('Authorization') ?? '';
  if (!safeEqual(got, expected) && !safeEqual(got, `Bearer ${expected}`)) return json(401, { error: 'unauthorized' });

  const body = await req.json().catch(() => null);
  const event = body?.event as Record<string, unknown> | undefined;
  if (!event || typeof event.id !== 'string' || typeof event.type !== 'string')
    return json(400, { error: 'bad_event' });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const userIds = affectedUserIds(event);

  // Audit log. user_id is a FK to profiles; fall back to null if that account no longer exists.
  const log = { provider: 'revenuecat', event_id: event.id, event_type: event.type, payload: body };
  let { error: logError } = await admin
    .from('subscription_events')
    .upsert({ ...log, user_id: userIds[0] ?? null }, { onConflict: 'provider,event_id', ignoreDuplicates: true });
  if (logError?.code === '23503') {
    ({ error: logError } = await admin
      .from('subscription_events')
      .upsert({ ...log, user_id: null }, { onConflict: 'provider,event_id', ignoreDuplicates: true }));
  }
  if (logError) {
    console.error('log event failed', logError.message);
    return json(500, { error: 'log_failed' });
  }

  if (event.type === 'TEST') return json(200, { ok: true, test: true });

  try {
    const results = [];
    for (const userId of userIds) results.push({ userId, ...(await syncUser(admin, userId)) });
    console.log('revenuecat event', event.type, JSON.stringify(results));
    return json(200, { ok: true, synced: results.length });
  } catch (e) {
    console.error('sync failed', e instanceof ConfigError ? e.message : String(e));
    return json(500, { error: 'sync_failed' });
  }
});
