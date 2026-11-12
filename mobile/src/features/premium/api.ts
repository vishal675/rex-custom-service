import { useQuery } from '@tanstack/react-query';

import { useSession } from '@/features/auth/session';
import { queryClient, queryKeys } from '@/lib/query';
import { supabase } from '@/lib/supabase';

export type Entitlement = {
  productId: string | null;
  store: string | null;
  periodType: string | null;
  expiresAt: string | null;
  willRenew: boolean | null;
};

/** The server's record of the user's subscription (written only by our Edge Functions). */
export function useEntitlement() {
  const { userId } = useSession();
  return useQuery({
    queryKey: queryKeys.entitlement,
    enabled: !!userId,
    queryFn: async (): Promise<Entitlement | null> => {
      const { data, error } = await supabase
        .from('entitlements')
        .select('product_id, store, period_type, expires_at, will_renew')
        .maybeSingle();
      if (error) throw error;
      return data
        ? {
            productId: data.product_id,
            store: data.store,
            periodType: data.period_type,
            expiresAt: data.expires_at,
            willRenew: data.will_renew,
          }
        : null;
    },
  });
}

/**
 * Asks our server to re-check this user's subscription with RevenueCat, then refreshes `is_premium`.
 * Retries a few times: the store can take a moment to report a new purchase.
 */
export async function activatePremium({ attempts = 4, delayMs = 2500 } = {}): Promise<boolean> {
  for (let i = 0; i < attempts; i++) {
    const { data, error } = await supabase.functions.invoke<{ premium: boolean }>('sync-premium', { method: 'POST' });
    if (!error && data?.premium) {
      await refreshPremium();
      return true;
    }
    if (i < attempts - 1) await new Promise((r) => setTimeout(r, delayMs));
  }
  await refreshPremium();
  return false;
}

export function refreshPremium() {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.status }),
    queryClient.invalidateQueries({ queryKey: queryKeys.entitlement }),
  ]);
}
