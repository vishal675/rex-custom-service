import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import {
  DEFAULT_DURATION,
  isActive,
  startAvailability,
  type Availability,
  type AvailabilitySettings,
} from './model';

/**
 * Local (mock) availability state for the Stage 2 prototype.
 * In Stage 5 the same interface will be backed by the Supabase `go-free` function.
 */
type AvailabilityState = {
  current: Availability | null;
  lastSettings: AvailabilitySettings;
  now: number;
  goFree: (settings: AvailabilitySettings) => void;
  goBusy: () => void;
};

const DEFAULT_SETTINGS: AvailabilitySettings = {
  activity: null,
  duration: DEFAULT_DURATION,
  audience: { allFriends: true, circleIds: [] },
};

const AvailabilityContext = createContext<AvailabilityState | null>(null);

/** Re-renders every `intervalMs` so countdowns stay live. */
function useNow(intervalMs: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function AvailabilityProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = useState<Availability | null>(null);
  const [lastSettings, setLastSettings] = useState<AvailabilitySettings>(DEFAULT_SETTINGS);
  const now = useNow(1000);

  // Expiry is derived from time, never from a timer firing — so it can't get stuck "free".
  const current = isActive(stored, now) ? stored : null;

  const goFree = useCallback((settings: AvailabilitySettings) => {
    setLastSettings(settings);
    setStored(startAvailability(settings, new Date()));
  }, []);

  const goBusy = useCallback(() => setStored(null), []);

  const value = useMemo(
    () => ({ current, lastSettings, now, goFree, goBusy }),
    [current, lastSettings, now, goFree, goBusy],
  );

  return <AvailabilityContext.Provider value={value}>{children}</AvailabilityContext.Provider>;
}

export function useAvailability() {
  const ctx = useContext(AvailabilityContext);
  if (!ctx) throw new Error('useAvailability must be used inside <AvailabilityProvider>');
  return ctx;
}
