import { describe, expect, it } from '@jest/globals';

import { parseFreeNowRow, parseStatus } from '../server';

describe('parseStatus', () => {
  it('parses a live availability', () => {
    const s = parseStatus({
      server_now: '2026-11-10T10:00:00Z',
      is_premium: false,
      onboarded: true,
      availability: {
        id: 'a1',
        activity: 'coffee',
        duration: 'tonight',
        audience_all: true,
        starts_at: '2026-11-10T10:00:00Z',
        expires_at: '2026-11-10T18:29:00Z',
        recipient_count: 4,
        join_count: 1,
      },
    });
    expect(s.onboarded).toBe(true);
    expect(s.availability).toMatchObject({ id: 'a1', activity: 'coffee', duration: 'tonight', recipientCount: 4 });
    expect(s.availability!.expiresAt).toBe(Date.parse('2026-11-10T18:29:00Z'));
  });

  it('is safe on null / garbage', () => {
    expect(parseStatus(null)).toEqual({ serverNow: '', isPremium: false, onboarded: false, availability: null });
    expect(parseStatus({ availability: null, is_premium: 'yes' }).isPremium).toBe(false);
  });

  it('drops unknown activities', () => {
    expect(parseStatus({ availability: { id: 'x', activity: 'skydiving' } }).availability!.activity).toBeNull();
  });
});

describe('parseFreeNowRow', () => {
  it('falls back to username when display name is missing', () => {
    const item = parseFreeNowRow({
      availability_id: 'a',
      user_id: 'u',
      username: 'rahul',
      display_name: null,
      avatar_path: null,
      activity: null,
      starts_at: '2026-11-10T10:00:00Z',
      expires_at: '2026-11-10T11:00:00Z',
      joined: false,
      join_count: 0,
    });
    expect(item.displayName).toBe('rahul');
  });
});
