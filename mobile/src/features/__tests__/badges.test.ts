import { describe, expect, it } from '@jest/globals';

import { badgeLabel, computeBadges } from '../badges-model';

describe('computeBadges', () => {
  const base = { homeSeenAt: 1_000, now: 5_000, unreadPerChat: [], incomingRequests: 0, free: [] };

  it('counts only friends who went free after Home was last seen and are still free', () => {
    const b = computeBadges({
      ...base,
      free: [
        { startedAt: 500, expiresAt: 9_000 }, // seen already
        { startedAt: 2_000, expiresAt: 9_000 }, // new
        { startedAt: 3_000, expiresAt: 4_000 }, // new but expired
      ],
    });
    expect(b.home).toBe(1);
  });

  it('sums unread chat messages and adds friend requests to the app icon', () => {
    const b = computeBadges({ ...base, unreadPerChat: [2, 0, 3], incomingRequests: 1 });
    expect(b).toMatchObject({ chats: 5, friends: 1, appIcon: 6 });
  });
});

describe('badgeLabel', () => {
  it('hides zero and caps at 99+', () => {
    expect(badgeLabel(0)).toBeUndefined();
    expect(badgeLabel(7)).toBe('7');
    expect(badgeLabel(150)).toBe('99+');
  });
});
