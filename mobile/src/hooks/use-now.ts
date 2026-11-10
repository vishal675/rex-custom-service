import { useEffect, useState } from 'react';

import { serverNow } from '@/lib/clock';

/** Server-corrected "now" that re-renders the calling component every `intervalMs`. Use it only where a countdown is shown. */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    const id = setInterval(() => setNow(serverNow()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
