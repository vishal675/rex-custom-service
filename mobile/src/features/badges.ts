import { useFreeNow } from '@/features/availability/api';
import { useHomeSeenAt } from '@/features/availability/seen';
import { useFriends } from '@/features/friends/api';
import { useMeetups } from '@/features/meetups/api';

import { computeBadges } from './badges-model';

export { badgeLabel } from './badges-model';

export function useBadges(now: number) {
  const freeNow = useFreeNow();
  const seen = useHomeSeenAt();
  const meetups = useMeetups();
  const friends = useFriends();
  return computeBadges({
    free: freeNow.data ?? [],
    homeSeenAt: seen.data ?? Number.MAX_SAFE_INTEGER, // until loaded, don't flash a badge
    now,
    unreadPerChat: (meetups.data ?? []).map((m) => m.unreadCount),
    incomingRequests: (friends.data ?? []).filter((f) => f.status === 'incoming').length,
  });
}
