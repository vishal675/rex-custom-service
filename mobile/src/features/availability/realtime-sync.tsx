import { useEffect } from 'react';

import { useSession } from '@/features/auth/session';
import { queryClient, queryKeys } from '@/lib/query';
import { supabase } from '@/lib/supabase';

/**
 * One realtime channel per signed-in user. Changes only trigger refetches of the
 * server-filtered RPCs; RLS limits which rows' events this user can receive.
 */
export function RealtimeSync() {
  const { userId } = useSession();

  useEffect(() => {
    if (!userId) return;
    const refreshFreeNow = () => queryClient.invalidateQueries({ queryKey: queryKeys.freeNow });
    const channel = supabase
      .channel(`user:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'availability_recipients', filter: `user_id=eq.${userId}` },
        refreshFreeNow,
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'availabilities' }, refreshFreeNow)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'availability_joins' }, () => {
        refreshFreeNow();
        queryClient.invalidateQueries({ queryKey: queryKeys.status });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return null;
}
