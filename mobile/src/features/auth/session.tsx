import type { Session } from '@supabase/supabase-js';
import { useQuery } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { unregisterPush } from '@/lib/push';
import { queryClient, queryKeys } from '@/lib/query';
import { supabase } from '@/lib/supabase';

type SessionState = { session: Session | null; userId: string | null; initialised: boolean };

const SessionContext = createContext<SessionState>({ session: null, userId: null, initialised: false });

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [initialised, setInitialised] = useState(false);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session))
      .catch(() => setSession(null)) // unreadable stored session → treat as signed out
      .finally(() => setInitialised(true));

    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      // Never show one account's cached data to another.
      if (!next) queryClient.clear();
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return (
    <SessionContext.Provider value={{ session, userId: session?.user.id ?? null, initialised }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}

export type Profile = { id: string; username: string | null; displayName: string | null; avatarPath: string | null };

export function useProfile() {
  const { userId } = useSession();
  return useQuery({
    queryKey: queryKeys.profile,
    enabled: !!userId,
    queryFn: async (): Promise<Profile> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_path')
        .eq('id', userId!)
        .single();
      if (error) throw error;
      return { id: data.id, username: data.username, displayName: data.display_name, avatarPath: data.avatar_path };
    },
  });
}

export async function signOut() {
  // Best effort: stop this device receiving the account's notifications.
  await unregisterPush().catch(() => {});
  await supabase.auth.signOut();
  queryClient.clear();
}
