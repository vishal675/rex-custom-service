/** Pure friend/circle logic, shared by the screens and unit tests. */

export type FriendStatus = 'friend' | 'incoming' | 'outgoing';

export type Friend = {
  id: string;
  username: string;
  displayName: string;
  avatarPath: string | null;
  status: FriendStatus;
};

export type Circle = { id: string; name: string; emoji: string | null; createdAt: string; memberIds: string[] };

/** Free plan: this many circles are usable (the oldest ones). Mirrors the server rule. */
export const FREE_CIRCLE_LIMIT = 2;

export const CIRCLE_EMOJIS = ['🎓', '💼', '🏸', '⚽', '🎮', '🍻', '🏠', '✨'] as const;

/** Number of distinct friends an audience reaches (de-duplicated across circles, friends only). */
export function audienceSize(
  audience: { allFriends: boolean; circleIds: string[] },
  friendIds: string[],
  circles: Pick<Circle, 'id' | 'memberIds'>[],
): number {
  if (audience.allFriends) return friendIds.length;
  const friends = new Set(friendIds);
  const reached = new Set<string>();
  for (const c of circles) {
    if (!audience.circleIds.includes(c.id)) continue;
    for (const m of c.memberIds) if (friends.has(m)) reached.add(m);
  }
  return reached.size;
}

/** Circle ids usable on the free plan: the oldest FREE_CIRCLE_LIMIT, matching the server's ordering. */
export function usableCircleIds(circles: Pick<Circle, 'id' | 'createdAt'>[], isPremium: boolean): Set<string> {
  if (isPremium) return new Set(circles.map((c) => c.id));
  const sorted = [...circles].sort((a, b) =>
    a.createdAt === b.createdAt ? (a.id < b.id ? -1 : 1) : a.createdAt < b.createdAt ? -1 : 1,
  );
  return new Set(sorted.slice(0, FREE_CIRCLE_LIMIT).map((c) => c.id));
}

/** Membership changes needed to go from `current` to `next`. */
export function diffMembers(current: string[], next: string[]) {
  const cur = new Set(current);
  const nxt = new Set(next);
  return {
    add: next.filter((id) => !cur.has(id)),
    remove: current.filter((id) => !nxt.has(id)),
  };
}

export function splitFriends(rows: Friend[]) {
  return {
    friends: rows.filter((r) => r.status === 'friend'),
    incoming: rows.filter((r) => r.status === 'incoming'),
    outgoing: rows.filter((r) => r.status === 'outgoing'),
  };
}
