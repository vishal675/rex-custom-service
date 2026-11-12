import { useMutation, useQuery } from '@tanstack/react-query';

import { useSession } from '@/features/auth/session';
import { queryClient, queryKeys } from '@/lib/query';
import { supabase } from '@/lib/supabase';

import { parseQuietHours, type QuietHours } from './model';

export type Settings = { notificationsEnabled: boolean; quietHours: QuietHours; timezone: string };

export function useSettings() {
  const { userId } = useSession();
  return useQuery({
    queryKey: queryKeys.settings,
    enabled: !!userId,
    queryFn: async (): Promise<Settings> => {
      const { data, error } = await supabase
        .from('user_settings')
        .select('notifications_enabled, quiet_hours_start, quiet_hours_end, timezone')
        .eq('user_id', userId!)
        .single();
      if (error) throw error;
      return {
        notificationsEnabled: data.notifications_enabled,
        quietHours: parseQuietHours(data.quiet_hours_start, data.quiet_hours_end),
        timezone: data.timezone,
      };
    },
  });
}

type SettingsUpdate = {
  notifications_enabled?: boolean;
  quiet_hours_start?: string | null;
  quiet_hours_end?: string | null;
};

export function useUpdateSettings() {
  const { userId } = useSession();
  return useMutation({
    mutationFn: async (patch: SettingsUpdate) => {
      const { error } = await supabase.from('user_settings').update(patch).eq('user_id', userId!);
      if (error) throw error;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.settings }),
  });
}

export type BlockedUser = { id: string; username: string; displayName: string; avatarPath: string | null };

export function useBlockedUsers() {
  const { userId } = useSession();
  return useQuery({
    queryKey: queryKeys.blocked,
    enabled: !!userId,
    queryFn: async (): Promise<BlockedUser[]> => {
      const { data, error } = await supabase.rpc('my_blocked');
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: r.user_id,
        username: r.username ?? '',
        displayName: r.display_name || r.username || 'Someone',
        avatarPath: r.avatar_path,
      }));
    },
  });
}

export function useUnblock() {
  return useMutation({
    mutationFn: async (targetId: string) => {
      const { error } = await supabase.rpc('unblock_user', { p_target: targetId });
      if (error) throw error;
    },
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.blocked }),
        queryClient.invalidateQueries({ queryKey: queryKeys.friends }),
      ]),
  });
}
