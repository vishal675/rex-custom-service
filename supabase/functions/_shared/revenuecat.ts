// Syncs one user's Premium entitlement from RevenueCat's REST API into public.entitlements.
// Used by `revenuecat-webhook` (RevenueCat → us) and `sync-premium` (app asks right after a purchase/restore).
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.119.0';

import { entitlementFromSubscriber, type RcSubscriber } from './revenuecat-model.ts';

const ENTITLEMENT_ID = Deno.env.get('REVENUECAT_ENTITLEMENT_ID') ?? 'premium';

export class ConfigError extends Error {}

async function fetchSubscriber(appUserId: string): Promise<RcSubscriber> {
  const key = Deno.env.get('REVENUECAT_SECRET_KEY');
  if (!key) throw new ConfigError('REVENUECAT_SECRET_KEY is not set');
  const res = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`, {
    headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`revenuecat_http_${res.status}`);
  const body = await res.json();
  return body?.subscriber ?? {};
}

export type SyncResult = { premium: boolean; expiresAt: string | null };

export async function syncUser(admin: SupabaseClient, userId: string): Promise<SyncResult> {
  const row = entitlementFromSubscriber(await fetchSubscriber(userId), ENTITLEMENT_ID);

  if (!row) {
    const { error } = await admin.from('entitlements').delete().eq('user_id', userId);
    if (error) throw error;
    return { premium: false, expiresAt: null };
  }

  const { error } = await admin
    .from('entitlements')
    .upsert({ user_id: userId, entitlement: 'premium', ...row }, { onConflict: 'user_id' });
  if (error) {
    if (error.code === '23503') return { premium: false, expiresAt: null }; // account deleted
    throw error;
  }
  return { premium: Date.parse(row.expires_at) > Date.now(), expiresAt: row.expires_at };
}
