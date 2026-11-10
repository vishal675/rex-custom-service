import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';

import { registerForPush } from '@/lib/push';

/** Registers this device for push once signed in, and opens the right screen when a notification is tapped. */
export function PushSync() {
  const response = Notifications.useLastNotificationResponse();

  useEffect(() => {
    registerForPush().catch((e) => console.warn('push registration failed', e));
  }, []);

  useEffect(() => {
    const data = response?.notification.request.content.data as { type?: string; availabilityId?: string } | undefined;
    if (!data?.availabilityId) return;
    if (data.type === 'message' || data.type === 'join') {
      router.push({ pathname: '/meetup/[id]', params: { id: data.availabilityId } });
    } else {
      router.navigate('/');
    }
  }, [response]);

  return null;
}
