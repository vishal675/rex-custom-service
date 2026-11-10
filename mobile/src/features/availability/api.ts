import { useMutation, useQuery } from '@tanstack/react-query';

import { useSession } from '@/features/auth/session';
import { syncServerClock } from '@/lib/clock';
import { queryClient, queryKeys } from '@/lib/query';
import { supabase } from '@/lib/supabase';

import type { AvailabilitySettings } from './model';
import { parseFreeNowRow, parseStatus, type MyStatus } from './server';

export function useMyStatus() {
  const { userId } = useSession();
  return useQuery({
    queryKey: queryKeys.status,
    enabled: !!userId,
    refetchInterval: 60_000,
    queryFn: async (): Promise<MyStatus> => {
      const started = Date.now();
      const { data, error } = await supabase.rpc('my_status');
      if (error) throw error;
      const status = parseStatus(data);
      syncServerClock(status.serverNow, started);
      return status;
    },
  });
}

export function useFreeNow() {
  const { userId } = useSession();
  return useQuery({
    queryKey: queryKeys.freeNow,
    enabled: !!userId,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('free_now');
      if (error) throw error;
      return (data ?? []).map(parseFreeNowRow);
    },
  });
}

export function useGoFree() {
  return useMutation({
    mutationFn: async (s: AvailabilitySettings) => {
      const started = Date.now();
      const { data, error } = await supabase.rpc('go_free', {
        // The RPC accepts null for "no activity"; the generated type is stricter than the SQL.
        p_activity: s.activity as string,
        p_duration: s.duration,
        p_audience_all: s.audience.allFriends,
        p_circle_ids: s.audience.allFriends ? [] : s.audience.circleIds,
      });
      if (error) throw error;
      const res = data as { recipient_count?: number; server_now?: string } | null;
      if (res?.server_now) syncServerClock(res.server_now, started);
      return { recipientCount: res?.recipient_count ?? 0 };
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.status }),
  });
}

export function useEndAvailability() {
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('end_availability');
      if (error) throw error;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.status }),
  });
}

export function useJoin() {
  return useMutation({
    mutationFn: async ({ availabilityId, join }: { availabilityId: string; join: boolean }) => {
      const { error } = join
        ? await supabase.rpc('join_availability', { p_availability_id: availabilityId })
        : await supabase.rpc('leave_availability', { p_availability_id: availabilityId });
      if (error) throw error;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.freeNow }),
  });
}
