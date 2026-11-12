import { QueryClient, focusManager } from '@tanstack/react-query';
import { AppState } from 'react-native';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 15_000, retry: 2 },
    mutations: { retry: 0 },
  },
});

// Refetch stale data when the app returns to the foreground.
AppState.addEventListener('change', (state) => focusManager.setFocused(state === 'active'));

export const queryKeys = {
  status: ['my_status'] as const,
  profile: ['profile'] as const,
  freeNow: ['free_now'] as const,
  friends: ['friends'] as const,
  circles: ['circles'] as const,
  meetups: ['meetups'] as const,
  entitlement: ['entitlement'] as const,
  settings: ['settings'] as const,
  blocked: ['blocked'] as const,
  thread: (availabilityId: string) => ['thread', availabilityId] as const,
  participants: (availabilityId: string) => ['participants', availabilityId] as const,
};
