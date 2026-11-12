// Pure RevenueCat → entitlements mapping (no Deno / network), so it can be unit-tested with Node:
//   node --test supabase/functions/_shared/revenuecat-model.test.ts
//
// Source of truth is RevenueCat's REST API (GET /v1/subscribers/{app_user_id}), never the app and
// never the webhook body alone — webhooks can arrive late or out of order, the subscriber record can't.

export type RcSubscriber = {
  entitlements?: Record<
    string,
    {
      expires_date?: string | null;
      grace_period_expires_date?: string | null;
      product_identifier?: string | null;
    }
  >;
  subscriptions?: Record<
    string,
    {
      store?: string | null;
      period_type?: string | null;
      unsubscribe_detected_at?: string | null;
      billing_issues_detected_at?: string | null;
    }
  >;
};

export type EntitlementRow = {
  product_id: string | null;
  store: 'app_store' | 'play_store' | 'stripe' | 'promotional' | null;
  period_type: 'trial' | 'intro' | 'normal';
  expires_at: string;
  will_renew: boolean;
};

/** Lifetime / non-expiring grants (e.g. promotional) are stored with a far-future expiry. */
export const NEVER_EXPIRES = '9999-12-31T00:00:00.000Z';

const STORES = new Set(['app_store', 'play_store', 'stripe', 'promotional']);
const PERIODS = new Set(['trial', 'intro', 'normal']);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** App user IDs are Supabase user UUIDs; RevenueCat anonymous IDs ($RCAnonymousID:…) are ignored. */
export const isUserId = (v: unknown): v is string => typeof v === 'string' && UUID.test(v);

const later = (a: string | null | undefined, b: string | null | undefined): string | null => {
  const ta = a ? Date.parse(a) : NaN;
  const tb = b ? Date.parse(b) : NaN;
  if (Number.isNaN(ta)) return Number.isNaN(tb) ? null : new Date(tb).toISOString();
  if (Number.isNaN(tb)) return new Date(ta).toISOString();
  return new Date(Math.max(ta, tb)).toISOString();
};

/**
 * The user's entitlement row, or null if RevenueCat has never granted the entitlement.
 * An expired entitlement still returns a row (with a past `expires_at`) — `private.is_premium` checks expiry.
 */
export function entitlementFromSubscriber(
  sub: RcSubscriber | null | undefined,
  entitlementId: string,
): EntitlementRow | null {
  const ent = sub?.entitlements?.[entitlementId];
  if (!ent) return null;

  const productId = ent.product_identifier ?? null;
  const subscription = productId ? sub?.subscriptions?.[productId] : undefined;

  // Billing grace period keeps access while the store retries payment.
  const expiresAt =
    ent.expires_date == null
      ? NEVER_EXPIRES
      : (later(ent.expires_date, ent.grace_period_expires_date) ?? NEVER_EXPIRES);
  const store =
    subscription?.store && STORES.has(subscription.store) ? (subscription.store as EntitlementRow['store']) : null;
  const period =
    subscription?.period_type && PERIODS.has(subscription.period_type) ? subscription.period_type : 'normal';

  return {
    product_id: productId,
    store,
    period_type: period as EntitlementRow['period_type'],
    expires_at: expiresAt,
    will_renew:
      ent.expires_date == null
        ? false
        : !subscription?.unsubscribe_detected_at && !subscription?.billing_issues_detected_at,
  };
}

/** Every Supabase user a webhook event may affect (purchaser, aliases, both sides of a transfer). */
export function affectedUserIds(event: Record<string, unknown>): string[] {
  const list = (v: unknown) => (Array.isArray(v) ? v : []);
  const ids = [
    event.app_user_id,
    event.original_app_user_id,
    ...list(event.aliases),
    ...list(event.transferred_from),
    ...list(event.transferred_to),
  ].filter(isUserId);
  return [...new Set(ids.map((id) => id.toLowerCase()))];
}

/** Constant-time string comparison for the webhook Authorization header. */
export function safeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}
