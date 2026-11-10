/** Pure: the numbers shown on the tab bar and app icon. */
export function computeBadges(input: {
  free: { startedAt: number; expiresAt: number }[];
  homeSeenAt: number;
  now: number;
  unreadPerChat: number[];
  incomingRequests: number;
}) {
  const home = input.free.filter((f) => f.expiresAt > input.now && f.startedAt > input.homeSeenAt).length;
  const chats = input.unreadPerChat.reduce((a, b) => a + b, 0);
  const friends = input.incomingRequests;
  // The app icon shows things that need a reply (like Messages), not who is free.
  return { home, chats, friends, appIcon: chats + friends };
}

export function badgeLabel(n: number): string | undefined {
  if (n <= 0) return undefined;
  return n > 99 ? '99+' : String(n);
}
