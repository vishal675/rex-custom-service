import * as SecureStore from 'expo-secure-store';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { useEndAvailability, useGoFree, useMyStatus } from './api';
import { DEFAULT_DURATION, type Availability, type AvailabilitySettings } from './model';

/**
 * The user's own availability, backed by the server (`my_status`, `go_free`, `end_availability`).
 * `availability` may have just expired — check `isActive(availability, now)` where a live clock is shown.
 * Last-used settings are remembered on the device so "hold to reuse last" works across launches.
 */
type AvailabilityState = {
  availability: (Availability & { id: string; recipientCount: number; joinCount: number }) | null;
  lastSettings: AvailabilitySettings;
  isPremium: boolean;
  goFree: (settings: AvailabilitySettings) => Promise<{ recipientCount: number }>;
  goBusy: () => Promise<void>;
  isSaving: boolean;
};

const LAST_SETTINGS_KEY = 'vybe.lastSettings';

const DEFAULT_SETTINGS: AvailabilitySettings = {
  activity: null,
  duration: DEFAULT_DURATION,
  audience: { allFriends: true, circleIds: [] },
};

const AvailabilityContext = createContext<AvailabilityState | null>(null);

export function AvailabilityProvider({ children }: { children: ReactNode }) {
  const status = useMyStatus();
  const goFreeMutation = useGoFree();
  const endMutation = useEndAvailability();
  const [lastSettings, setLastSettings] = useState<AvailabilitySettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    SecureStore.getItemAsync(LAST_SETTINGS_KEY)
      .then((raw) => raw && setLastSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) }))
      .catch(() => {});
  }, []);

  const server = status.data?.availability ?? null;
  const availability = useMemo(
    () =>
      server && {
        id: server.id,
        activity: server.activity,
        duration: server.duration,
        audience: server.audienceAll
          ? { allFriends: true, circleIds: [] }
          : { allFriends: false, circleIds: lastSettings.audience.circleIds },
        startedAt: server.startedAt,
        expiresAt: server.expiresAt,
        recipientCount: server.recipientCount,
        joinCount: server.joinCount,
      },
    [server, lastSettings.audience.circleIds],
  );

  const { mutateAsync: goFreeAsync } = goFreeMutation;
  const { mutateAsync: endAsync } = endMutation;

  const goFree = useCallback(
    async (settings: AvailabilitySettings) => {
      const result = await goFreeAsync(settings);
      setLastSettings(settings);
      SecureStore.setItemAsync(LAST_SETTINGS_KEY, JSON.stringify(settings)).catch(() => {});
      return result;
    },
    [goFreeAsync],
  );

  const goBusy = useCallback(async () => {
    await endAsync();
  }, [endAsync]);

  const value = useMemo(
    () => ({
      availability,
      lastSettings,
      isPremium: status.data?.isPremium ?? false,
      goFree,
      goBusy,
      isSaving: goFreeMutation.isPending || endMutation.isPending,
    }),
    [availability, lastSettings, status.data?.isPremium, goFree, goBusy, goFreeMutation.isPending, endMutation.isPending],
  );

  return <AvailabilityContext.Provider value={value}>{children}</AvailabilityContext.Provider>;
}

export function useAvailability() {
  const ctx = useContext(AvailabilityContext);
  if (!ctx) throw new Error('useAvailability must be used inside <AvailabilityProvider>');
  return ctx;
}
