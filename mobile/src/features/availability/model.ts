/**
 * Pure availability logic — no React, no I/O — so it can be unit tested and
 * reused when the backend arrives (Stage 5).
 */

export const ACTIVITIES = [
  { id: 'coffee', label: 'Coffee', emoji: '☕' },
  { id: 'food', label: 'Food', emoji: '🍔' },
  { id: 'badminton', label: 'Badminton', emoji: '🏸' },
  { id: 'sports', label: 'Sports', emoji: '⚽' },
  { id: 'gaming', label: 'Gaming', emoji: '🎮' },
  { id: 'out', label: 'Going out', emoji: '🎉' },
  { id: 'talk', label: 'Just talking', emoji: '💬' },
  { id: 'other', label: 'Other', emoji: '✨' },
] as const;

export type ActivityId = (typeof ACTIVITIES)[number]['id'];

export function getActivity(id: ActivityId | null | undefined) {
  return ACTIVITIES.find((a) => a.id === id) ?? null;
}

export const DURATIONS = [
  { id: '30m', label: '30 min' },
  { id: '1h', label: '1 hr' },
  { id: '2h', label: '2 hrs' },
  { id: 'tonight', label: 'Till tonight' },
] as const;

export type DurationId = (typeof DURATIONS)[number]['id'];
export const DEFAULT_DURATION: DurationId = '1h';

const MIN = 60_000;

/** Resolve a duration choice to an absolute expiry time. "Tonight" = 11:59 pm local, but never less than 1 hour. */
export function computeExpiry(duration: DurationId, now: Date): Date {
  switch (duration) {
    case '30m':
      return new Date(now.getTime() + 30 * MIN);
    case '1h':
      return new Date(now.getTime() + 60 * MIN);
    case '2h':
      return new Date(now.getTime() + 120 * MIN);
    case 'tonight': {
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 0, 0);
      const minimum = now.getTime() + 60 * MIN;
      return new Date(Math.max(endOfDay.getTime(), minimum));
    }
  }
}

export type Audience = {
  allFriends: boolean;
  circleIds: string[];
};

export type AvailabilitySettings = {
  activity: ActivityId | null;
  duration: DurationId;
  audience: Audience;
};

export type Availability = AvailabilitySettings & {
  startedAt: number;
  expiresAt: number;
};

export function startAvailability(settings: AvailabilitySettings, now: Date): Availability {
  return {
    ...settings,
    startedAt: now.getTime(),
    expiresAt: computeExpiry(settings.duration, now).getTime(),
  };
}

export function isActive(a: Pick<Availability, 'expiresAt'> | null, now: number): boolean {
  return a !== null && a.expiresAt > now;
}

export function remainingMs(a: Pick<Availability, 'expiresAt'>, now: number): number {
  return Math.max(0, a.expiresAt - now);
}

/** Fraction of the window still remaining, 1 → 0. Drives the countdown ring. */
export function remainingFraction(a: Pick<Availability, 'startedAt' | 'expiresAt'>, now: number): number {
  const total = a.expiresAt - a.startedAt;
  if (total <= 0) return 0;
  return Math.min(1, Math.max(0, (a.expiresAt - now) / total));
}

/** "2h 05m", "42m", "<1m". */
export function formatRemaining(ms: number): string {
  if (ms < MIN) return '<1m';
  const totalMin = Math.floor(ms / MIN);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}
