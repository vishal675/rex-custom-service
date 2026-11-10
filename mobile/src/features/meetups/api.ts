import { useInfiniteQuery, useMutation, useQuery, type InfiniteData } from '@tanstack/react-query';

import { useSession } from '@/features/auth/session';
import { toActivity } from '@/features/availability/server';
import { queryClient, queryKeys } from '@/lib/query';
import { supabase } from '@/lib/supabase';

export type Meetup = {
  availabilityId: string;
  ownerId: string;
  ownerName: string;
  ownerAvatarPath: string | null;
  activity: ReturnType<typeof toActivity>;
  endsAt: number;
  isLive: boolean;
  participantCount: number;
  lastMessage: string | null;
  lastMessageAt: number | null;
  unreadCount: number;
};

export type ChatMessage = {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatarPath: string | null;
  body: string;
  createdAt: string;
  /** True while an optimistic message is being sent. */
  pending?: boolean;
};

export function useMeetups() {
  const { userId } = useSession();
  return useQuery({
    queryKey: queryKeys.meetups,
    enabled: !!userId,
    refetchInterval: 60_000,
    queryFn: async (): Promise<Meetup[]> => {
      const { data, error } = await supabase.rpc('my_meetups');
      if (error) throw error;
      return (data ?? []).map((m) => ({
        availabilityId: m.availability_id,
        ownerId: m.owner_id,
        ownerName: m.owner_name ?? 'Friend',
        ownerAvatarPath: m.owner_avatar_path,
        activity: toActivity(m.activity),
        endsAt: Date.parse(m.ends_at),
        isLive: m.is_live,
        participantCount: m.participant_count,
        lastMessage: m.last_message,
        lastMessageAt: m.last_message_at ? Date.parse(m.last_message_at) : null,
        unreadCount: m.unread_count,
      }));
    },
  });
}

const PAGE = 50;

export function useThread(availabilityId: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.thread(availabilityId),
    initialPageParam: null as { createdAt: string; id: string } | null,
    queryFn: async ({ pageParam }): Promise<ChatMessage[]> => {
      const { data, error } = await supabase.rpc('meetup_thread', {
        p_availability_id: availabilityId,
        p_before_created_at: pageParam?.createdAt,
        p_before_id: pageParam?.id,
        p_limit: PAGE,
      });
      if (error) throw error;
      return (data ?? []).map((m) => ({
        id: m.id,
        senderId: m.sender_id,
        senderName: m.sender_name ?? 'Friend',
        senderAvatarPath: m.sender_avatar_path,
        body: m.body,
        createdAt: m.created_at,
      }));
    },
    // Newest first; the next page is everything older than the last message we have.
    getNextPageParam: (last) =>
      last.length < PAGE
        ? undefined
        : {
            createdAt: last[last.length - 1].createdAt,
            id: last[last.length - 1].id,
          },
  });
}

export function useParticipants(availabilityId: string) {
  return useQuery({
    queryKey: queryKeys.participants(availabilityId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('meetup_participants', {
        p_availability_id: availabilityId,
      });
      if (error) throw error;
      return (data ?? []).map((p) => ({
        userId: p.user_id,
        displayName: p.display_name ?? 'Friend',
        avatarPath: p.avatar_path,
        isOwner: p.is_owner,
      }));
    },
  });
}

type ThreadData = InfiniteData<ChatMessage[], { createdAt: string; id: string } | null>;

export function useSendMessage(availabilityId: string) {
  const key = queryKeys.thread(availabilityId);
  return useMutation({
    mutationFn: async ({ body }: { body: string; senderId: string }) => {
      const { error } = await supabase
        .from('meetup_messages')
        .insert({ availability_id: availabilityId, body: body.trim() });
      if (error) throw error;
    },
    // Show the message immediately; the refetch below replaces it with the stored one.
    onMutate: async ({ body, senderId }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<ThreadData>(key);
      const optimistic: ChatMessage = {
        id: `pending-${Date.now()}`,
        senderId,
        senderName: '',
        senderAvatarPath: null,
        body: body.trim(),
        createdAt: new Date().toISOString(),
        pending: true,
      };
      queryClient.setQueryData<ThreadData>(key, (data) =>
        data
          ? {
              ...data,
              pages: [[optimistic, ...(data.pages[0] ?? [])], ...data.pages.slice(1)],
            }
          : { pages: [[optimistic]], pageParams: [null] },
      );
      return { previous };
    },
    onError: (_e, _v, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.thread(availabilityId),
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.meetups }),
      ]),
  });
}

/** Marks the chat read on the server and clears its unread count locally right away. */
export async function markMeetupRead(availabilityId: string) {
  queryClient.setQueryData<Meetup[]>(queryKeys.meetups, (list) =>
    list?.map((m) => (m.availabilityId === availabilityId ? { ...m, unreadCount: 0 } : m)),
  );
  const { error } = await supabase.rpc('mark_meetup_read', { p_availability_id: availabilityId });
  if (error) throw error;
}

export async function reportMessage(message: ChatMessage, availabilityId: string) {
  const { error } = await supabase.from('reports').insert({
    reported_user_id: message.senderId,
    message_id: message.id,
    availability_id: availabilityId,
    reason: 'inappropriate',
  });
  if (error) throw error;
}
