import { useEffect } from 'react';

import { useSession } from '@/features/auth/session';
import { queryClient, queryKeys } from '@/lib/query';
import { supabase } from '@/lib/supabase';

/**
 * One realtime channel per signed-in user. Events only trigger refetches of the
 * server-filtered RPCs; RLS limits which rows' events this user receives.
 */
export function RealtimeSync() {
  const { userId } = useSession();

  useEffect(() => {
    if (!userId) return;
    const invalidate = (...keys: (readonly string[])[]) =>
      keys.forEach((queryKey) => queryClient.invalidateQueries({ queryKey }));

    const channel = supabase
      .channel(`user:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'availability_recipients', filter: `user_id=eq.${userId}` },
        () => invalidate(queryKeys.freeNow),
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'availabilities' }, () =>
        invalidate(queryKeys.freeNow, queryKeys.meetups),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'availability_joins' }, () =>
        invalidate(queryKeys.freeNow, queryKeys.status, queryKeys.meetups),
      )
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'meetup_messages' }, (payload) => {
        const availabilityId = (payload.new as { availability_id?: string }).availability_id;
        invalidate(queryKeys.meetups);
        if (availabilityId) invalidate(queryKeys.thread(availabilityId));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return null;
}
