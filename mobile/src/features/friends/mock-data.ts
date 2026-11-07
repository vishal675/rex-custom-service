import type { ActivityId } from '@/features/availability/model';

/** Prototype-only data. Replaced by Supabase queries in Stages 4–6. */

export type Friend = {
  id: string;
  name: string;
  username: string;
  /** Present when the friend is currently free. */
  freeUntil?: number;
  freeSince?: number;
  activity?: ActivityId | null;
};

export type Circle = { id: string; name: string; emoji: string; memberIds: string[] };

const MIN = 60_000;
const t0 = Date.now();

export const MOCK_FRIENDS: Friend[] = [
  { id: 'u1', name: 'Rahul Sharma', username: 'rahul', activity: 'coffee', freeSince: t0 - 18 * MIN, freeUntil: t0 + 42 * MIN },
  { id: 'u2', name: 'Priya Nair', username: 'priya.n', activity: 'badminton', freeSince: t0 - 5 * MIN, freeUntil: t0 + 115 * MIN },
  { id: 'u3', name: 'Arjun Mehta', username: 'arjun', activity: null, freeSince: t0 - 50 * MIN, freeUntil: t0 + 10 * MIN },
  { id: 'u4', name: 'Sneha Kulkarni', username: 'sneha.k' },
  { id: 'u5', name: 'Kabir Singh', username: 'kabir' },
  { id: 'u6', name: 'Ananya Rao', username: 'ananya' },
  { id: 'u7', name: 'Rohan Das', username: 'rohan.d' },
];

export const MOCK_CIRCLES: Circle[] = [
  { id: 'c1', name: 'College Gang', emoji: '🎓', memberIds: ['u1', 'u3', 'u5', 'u6'] },
  { id: 'c2', name: 'Badminton', emoji: '🏸', memberIds: ['u2', 'u4', 'u7'] },
  { id: 'c3', name: 'Office', emoji: '💼', memberIds: ['u4', 'u6'] },
];

export const MOCK_REQUESTS: Pick<Friend, 'id' | 'name' | 'username'>[] = [
  { id: 'r1', name: 'Meera Iyer', username: 'meera' },
  { id: 'r2', name: 'Dev Patel', username: 'devp' },
];

export const MOCK_MEETUPS = [
  { id: 'm1', title: 'Coffee with Rahul', emoji: '☕', lastMessage: 'Rahul: Blue Tokai in 15?', members: 3, expiresInMin: 38 },
  { id: 'm2', title: 'Badminton tonight', emoji: '🏸', lastMessage: 'Priya: Court 2 is booked 🔥', members: 4, expiresInMin: 112 },
];

/** Number of distinct friends an audience reaches (de-duplicated across circles). */
export function audienceSize(
  audience: { allFriends: boolean; circleIds: string[] },
  friends: Friend[] = MOCK_FRIENDS,
  circles: Circle[] = MOCK_CIRCLES,
): number {
  if (audience.allFriends) return friends.length;
  const ids = new Set<string>();
  for (const c of circles) if (audience.circleIds.includes(c.id)) c.memberIds.forEach((m) => ids.add(m));
  return ids.size;
}
