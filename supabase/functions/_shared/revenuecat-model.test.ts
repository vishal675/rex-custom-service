// Run: node --test supabase/functions/_shared/revenuecat-model.test.ts
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { affectedUserIds, entitlementFromSubscriber, isUserId, NEVER_EXPIRES, safeEqual } from './revenuecat-model.ts';

const U1 = 'a0000000-0000-4000-8000-000000000001';
const U2 = 'a0000000-0000-4000-8000-000000000002';

test('no entitlement → null (never granted)', () => {
  assert.equal(entitlementFromSubscriber({ entitlements: {} }, 'premium'), null);
  assert.equal(entitlementFromSubscriber(null, 'premium'), null);
  assert.equal(
    entitlementFromSubscriber({ entitlements: { other: { expires_date: '2030-01-01T00:00:00Z' } } }, 'premium'),
    null,
  );
});

test('active annual trial on Google Play', () => {
  const row = entitlementFromSubscriber(
    {
      entitlements: { premium: { expires_date: '2026-11-19T10:00:00Z', product_identifier: 'vybe_premium:annual' } },
      subscriptions: { 'vybe_premium:annual': { store: 'play_store', period_type: 'trial' } },
    },
    'premium',
  );
  assert.deepEqual(row, {
    product_id: 'vybe_premium:annual',
    store: 'play_store',
    period_type: 'trial',
    expires_at: '2026-11-19T10:00:00.000Z',
    will_renew: true,
  });
});

test('cancelled or billing issue → will not renew', () => {
  const base = { entitlements: { premium: { expires_date: '2026-12-01T00:00:00Z', product_identifier: 'm' } } };
  assert.equal(
    entitlementFromSubscriber(
      { ...base, subscriptions: { m: { unsubscribe_detected_at: '2026-11-12T00:00:00Z' } } },
      'premium',
    )?.will_renew,
    false,
  );
  assert.equal(
    entitlementFromSubscriber(
      { ...base, subscriptions: { m: { billing_issues_detected_at: '2026-11-12T00:00:00Z' } } },
      'premium',
    )?.will_renew,
    false,
  );
});

test('grace period extends access', () => {
  const row = entitlementFromSubscriber(
    {
      entitlements: {
        premium: {
          expires_date: '2026-11-10T00:00:00Z',
          grace_period_expires_date: '2026-11-26T00:00:00Z',
          product_identifier: 'm',
        },
      },
    },
    'premium',
  );
  assert.equal(row?.expires_at, '2026-11-26T00:00:00.000Z');
});

test('lifetime / promotional without expiry', () => {
  const row = entitlementFromSubscriber(
    {
      entitlements: { premium: { expires_date: null, product_identifier: 'rc_promo_premium_lifetime' } },
      subscriptions: {},
    },
    'premium',
  );
  assert.equal(row?.expires_at, NEVER_EXPIRES);
  assert.equal(row?.store, null);
  assert.equal(row?.period_type, 'normal');
});

test('unknown store / period map safely', () => {
  const row = entitlementFromSubscriber(
    {
      entitlements: { premium: { expires_date: '2027-01-01T00:00:00Z', product_identifier: 'p' } },
      subscriptions: { p: { store: 'amazon', period_type: 'prepaid' } },
    },
    'premium',
  );
  assert.equal(row?.store, null);
  assert.equal(row?.period_type, 'normal');
});

test('affected user ids: only UUIDs, deduped, both sides of a transfer', () => {
  assert.deepEqual(
    affectedUserIds({
      app_user_id: U1,
      original_app_user_id: '$RCAnonymousID:abc',
      aliases: [U1, '$RCAnonymousID:abc'],
      transferred_from: [U2.toUpperCase()],
      transferred_to: [U1],
    }),
    [U1, U2],
  );
  assert.deepEqual(affectedUserIds({}), []);
  assert.equal(isUserId('not-a-uuid'), false);
});

test('safeEqual', () => {
  assert.equal(safeEqual('Bearer abc', 'Bearer abc'), true);
  assert.equal(safeEqual('Bearer abc', 'Bearer abd'), false);
  assert.equal(safeEqual('Bearer abc', 'Bearer ab'), false);
  assert.equal(safeEqual('', 'x'), false);
});
