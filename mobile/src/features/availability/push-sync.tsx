import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';

import { useBadges } from '@/features/badges';
import { useNow } from '@/hooks/use-now';
import { registerForPush, setAppBadge } from '@/lib/push';

/** Registers this device for push once signed in, and opens the right screen when a notification is tapped. */
export function PushSync() {
  const response = Notifications.useLastNotificationResponse();
  const now = useNow(60_000);
  const { appIcon } = useBadges(now);

  // Keep the app icon number in sync with unread chats + friend requests.
  useEffect(() => {
    setAppBadge(appIcon);
  }, [appIcon]);

  useEffect(() => {
    registerForPush().catch((e) => console.warn('push registration failed', e));
  }, []);

  useEffect(() => {
    const data = response?.notification.request.content.data as { type?: string; availabilityId?: string } | undefined;
    if (data?.type === 'friend_request') {
      router.navigate('/friends');
      return;
    }
    if (!data?.availabilityId) return;
    if (data.type === 'message' || data.type === 'join') {
      router.push({ pathname: '/meetup/[id]', params: { id: data.availabilityId } });
    } else {
      router.navigate('/');
    }
  }, [response]);

  return null;
}
