import { describe, expect, it } from '@jest/globals';

import { audienceSize, type Circle, type Friend } from '../mock-data';

const friends: Friend[] = [
  { id: 'a', name: 'A', username: 'a' },
  { id: 'b', name: 'B', username: 'b' },
  { id: 'c', name: 'C', username: 'c' },
];
const circles: Circle[] = [
  { id: 'x', name: 'X', emoji: '', memberIds: ['a', 'b'] },
  { id: 'y', name: 'Y', emoji: '', memberIds: ['b', 'c'] },
];

describe('audienceSize', () => {
  it('counts every friend for "all friends"', () => {
    expect(audienceSize({ allFriends: true, circleIds: [] }, friends, circles)).toBe(3);
  });

  it('de-duplicates members shared between circles', () => {
    expect(audienceSize({ allFriends: false, circleIds: ['x', 'y'] }, friends, circles)).toBe(3);
  });

  it('is zero when nothing is selected', () => {
    expect(audienceSize({ allFriends: false, circleIds: [] }, friends, circles)).toBe(0);
  });
});
