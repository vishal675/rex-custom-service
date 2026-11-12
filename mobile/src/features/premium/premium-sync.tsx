import { useEffect } from 'react';

import { useSession } from '@/features/auth/session';
import { setCrashReportUser } from '@/lib/sentry';

import { refreshPremium } from './api';
import { identify, onStoreChange } from './purchases';

/** Links the signed-in user to RevenueCat + crash reports, and refreshes Premium when the store reports a change. */
export function PremiumSync() {
  const { userId } = useSession();

  useEffect(() => {
    setCrashReportUser(userId ?? null);
    if (!userId) return;
    let unsubscribe = () => {};
    identify(userId)
      .then(() => {
        // Renewals, expiries and refunds also reach the server by webhook; this just refreshes the UI sooner.
        unsubscribe = onStoreChange(() => void refreshPremium());
      })
      .catch((e) => console.warn('purchases setup failed', e));
    return () => unsubscribe();
  }, [userId]);

  return null;
}
