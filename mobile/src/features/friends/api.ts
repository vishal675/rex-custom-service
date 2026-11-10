import { useMutation, useQuery } from '@tanstack/react-query';

import { useSession } from '@/features/auth/session';
import { queryClient, queryKeys } from '@/lib/query';
import { supabase } from '@/lib/supabase';

import { diffMembers, type Circle, type Friend, type FriendStatus } from './model';

const refresh = (...keys: (readonly string[])[]) =>
  Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));

export function useFriends() {
  const { userId } = useSession();
  return useQuery({
    queryKey: queryKeys.friends,
    enabled: !!userId,
    queryFn: async (): Promise<Friend[]> => {
      const { data, error } = await supabase.rpc('my_friends');
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: r.user_id,
        username: r.username ?? '',
        displayName: r.display_name || r.username || 'Friend',
        avatarPath: r.avatar_path,
        status: r.status as FriendStatus,
      }));
    },
  });
}

export type FoundUser = { id: string; username: string; displayName: string; avatarPath: string | null };

export async function findUser(username: string): Promise<FoundUser | null> {
  const { data, error } = await supabase.rpc('find_user', { p_username: username });
  if (error) throw error;
  const row = data?.[0];
  return row
    ? { id: row.id, username: row.username ?? '', displayName: row.display_name || row.username || '', avatarPath: row.avatar_path }
    : null;
}

export function useSendFriendRequest() {
  return useMutation({
    mutationFn: async (targetId: string) => {
      const { data, error } = await supabase.rpc('send_friend_request', { p_target: targetId });
      if (error) throw error;
      return data as 'pending' | 'accepted';
    },
    onSettled: () => refresh(queryKeys.friends),
  });
}

export function useRespondToRequest() {
  return useMutation({
    mutationFn: async ({ requesterId, accept }: { requesterId: string; accept: boolean }) => {
      const { error } = await supabase.rpc('respond_friend_request', { p_requester: requesterId, p_accept: accept });
      if (error) throw error;
    },
    onSettled: () => refresh(queryKeys.friends),
  });
}

/** Unfriend, or cancel an outgoing request. */
export function useRemoveFriend() {
  return useMutation({
    mutationFn: async (otherId: string) => {
      const { error } = await supabase.rpc('remove_friend', { p_other: otherId });
      if (error) throw error;
    },
    onSettled: () => refresh(queryKeys.friends, queryKeys.circles, queryKeys.freeNow),
  });
}

export function useBlockUser() {
  return useMutation({
    mutationFn: async (targetId: string) => {
      const { error } = await supabase.rpc('block_user', { p_target: targetId });
      if (error) throw error;
    },
    onSettled: () => refresh(queryKeys.friends, queryKeys.circles, queryKeys.freeNow, queryKeys.status),
  });
}

export const REPORT_REASONS = [
  { id: 'harassment', label: 'Harassment or bullying' },
  { id: 'spam', label: 'Spam' },
  { id: 'inappropriate', label: 'Inappropriate content' },
  { id: 'fake_account', label: 'Fake account' },
  { id: 'underage', label: 'Under 18' },
  { id: 'other', label: 'Something else' },
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]['id'];

export async function reportUser(reportedUserId: string, reason: ReportReason, details?: string) {
  const { error } = await supabase
    .from('reports')
    .insert({ reported_user_id: reportedUserId, reason, details: details?.trim() || null });
  if (error) throw error;
}

export function useCircles() {
  const { userId } = useSession();
  return useQuery({
    queryKey: queryKeys.circles,
    enabled: !!userId,
    queryFn: async (): Promise<Circle[]> => {
      const { data, error } = await supabase
        .from('circles')
        .select('id, name, emoji, created_at, circle_members(member_id)')
        .order('created_at')
        .order('id');
      if (error) throw error;
      return (data ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        emoji: c.emoji,
        createdAt: c.created_at,
        memberIds: c.circle_members.map((m) => m.member_id),
      }));
    },
  });
}

type CircleInput = { id?: string; name: string; emoji: string | null; memberIds: string[]; currentMemberIds?: string[] };

export function useSaveCircle() {
  return useMutation({
    mutationFn: async ({ id, name, emoji, memberIds, currentMemberIds = [] }: CircleInput) => {
      let circleId = id;
      if (circleId) {
        const { error } = await supabase.from('circles').update({ name: name.trim(), emoji }).eq('id', circleId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('circles').insert({ name: name.trim(), emoji }).select('id').single();
        if (error) throw error;
        circleId = data.id;
      }
      const { add, remove } = diffMembers(currentMemberIds, memberIds);
      if (remove.length) {
        const { error } = await supabase.from('circle_members').delete().eq('circle_id', circleId).in('member_id', remove);
        if (error) throw error;
      }
      if (add.length) {
        const { error } = await supabase
          .from('circle_members')
          .insert(add.map((member_id) => ({ circle_id: circleId!, member_id })));
        if (error) throw error;
      }
    },
    onSettled: () => refresh(queryKeys.circles),
  });
}

export function useDeleteCircle() {
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('circles').delete().eq('id', id);
      if (error) throw error;
    },
    onSettled: () => refresh(queryKeys.circles),
  });
}
