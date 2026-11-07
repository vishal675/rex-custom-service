import { describe, expect, it } from '@jest/globals';

import {
  computeExpiry,
  formatRemaining,
  isActive,
  remainingFraction,
  remainingMs,
  startAvailability,
} from '../model';

const MIN = 60_000;
// 14:00 local time
const afternoon = new Date(2026, 10, 7, 14, 0, 0);

describe('computeExpiry', () => {
  it('adds fixed durations', () => {
    expect(computeExpiry('30m', afternoon).getTime() - afternoon.getTime()).toBe(30 * MIN);
    expect(computeExpiry('1h', afternoon).getTime() - afternoon.getTime()).toBe(60 * MIN);
    expect(computeExpiry('2h', afternoon).getTime() - afternoon.getTime()).toBe(120 * MIN);
  });

  it('"tonight" ends at 11:59 pm local', () => {
    const e = computeExpiry('tonight', afternoon);
    expect([e.getHours(), e.getMinutes()]).toEqual([23, 59]);
    expect(e.getDate()).toBe(afternoon.getDate());
  });

  it('"tonight" is never shorter than 1 hour, even late at night', () => {
    const late = new Date(2026, 10, 7, 23, 30, 0);
    expect(computeExpiry('tonight', late).getTime() - late.getTime()).toBe(60 * MIN);
  });
});

describe('availability lifecycle', () => {
  const a = startAvailability(
    { activity: 'coffee', duration: '1h', audience: { allFriends: true, circleIds: [] } },
    afternoon,
  );
  const t = afternoon.getTime();

  it('is active until expiry and inactive at/after it', () => {
    expect(isActive(a, t)).toBe(true);
    expect(isActive(a, t + 59 * MIN)).toBe(true);
    expect(isActive(a, t + 60 * MIN)).toBe(false);
    expect(isActive(null, t)).toBe(false);
  });

  it('reports remaining time and fraction', () => {
    expect(remainingMs(a, t + 15 * MIN)).toBe(45 * MIN);
    expect(remainingMs(a, t + 90 * MIN)).toBe(0);
    expect(remainingFraction(a, t)).toBe(1);
    expect(remainingFraction(a, t + 30 * MIN)).toBeCloseTo(0.5);
    expect(remainingFraction(a, t + 2 * 60 * MIN)).toBe(0);
  });
});

describe('formatRemaining', () => {
  it.each([
    [0, '<1m'],
    [59_999, '<1m'],
    [MIN, '1m'],
    [42 * MIN + 30_000, '42m'],
    [60 * MIN, '1h 00m'],
    [125 * MIN, '2h 05m'],
  ])('%i ms → %s', (ms, expected) => {
    expect(formatRemaining(ms)).toBe(expected);
  });
});
