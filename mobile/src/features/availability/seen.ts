import { useQuery } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';

import { queryClient } from '@/lib/query';

/** When the user last looked at Home. Friends who went free after this count towards the Home badge. */
const KEY = 'vybe.homeSeenAt';
const QUERY_KEY = ['home_seen_at'] as const;

export function useHomeSeenAt() {
  return useQuery({
    queryKey: QUERY_KEY,
    staleTime: Infinity,
    queryFn: async () => Number(await SecureStore.getItemAsync(KEY)) || 0,
  });
}

export function markHomeSeen(at: number) {
  queryClient.setQueryData(QUERY_KEY, at);
  SecureStore.setItemAsync(KEY, String(at)).catch(() => {});
}
