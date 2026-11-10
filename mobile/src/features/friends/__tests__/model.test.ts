import { describe, expect, it } from '@jest/globals';

import { audienceSize, diffMembers, splitFriends, usableCircleIds, type Friend } from '../model';

const circles = [
  { id: 'c1', createdAt: '2026-01-01T00:00:00Z', memberIds: ['u1', 'u2', 'u3'] },
  { id: 'c2', createdAt: '2026-01-02T00:00:00Z', memberIds: ['u3', 'u4'] },
  { id: 'c3', createdAt: '2026-01-03T00:00:00Z', memberIds: ['u5'] },
];
const friendIds = ['u1', 'u2', 'u3', 'u4'];

describe('audienceSize', () => {
  it('counts all friends', () => {
    expect(audienceSize({ allFriends: true, circleIds: [] }, friendIds, circles)).toBe(4);
  });
  it('de-duplicates across circles', () => {
    expect(audienceSize({ allFriends: false, circleIds: ['c1', 'c2'] }, friendIds, circles)).toBe(4);
  });
  it('ignores circle members who are no longer friends', () => {
    expect(audienceSize({ allFriends: false, circleIds: ['c3'] }, friendIds, circles)).toBe(0);
  });
});

describe('usableCircleIds', () => {
  it('free plan: only the 2 oldest', () => {
    expect([...usableCircleIds([circles[2], circles[0], circles[1]], false)].sort()).toEqual(['c1', 'c2']);
  });
  it('premium: all', () => {
    expect(usableCircleIds(circles, true).size).toBe(3);
  });
});

describe('diffMembers', () => {
  it('finds additions and removals', () => {
    expect(diffMembers(['a', 'b'], ['b', 'c'])).toEqual({ add: ['c'], remove: ['a'] });
  });
});

describe('splitFriends', () => {
  it('groups by status', () => {
    const f = (id: string, status: Friend['status']): Friend => ({
      id,
      username: id,
      displayName: id,
      avatarPath: null,
      status,
    });
    const s = splitFriends([f('a', 'friend'), f('b', 'incoming'), f('c', 'outgoing'), f('d', 'friend')]);
    expect([s.friends.length, s.incoming.length, s.outgoing.length]).toEqual([2, 1, 1]);
  });
});
