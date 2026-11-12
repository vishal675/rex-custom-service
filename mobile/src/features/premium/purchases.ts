import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL, PURCHASES_ERROR_CODE, type PurchasesPackage } from 'react-native-purchases';

/**
 * Thin wrapper around RevenueCat. The store handles payment; whether the user is Premium is decided by
 * our server (`my_status.is_premium`, written from RevenueCat's API) — never by this module.
 */
const API_KEY = Platform.select({
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
});

export type StoreAvailability = 'ready' | 'expo_go' | 'not_configured';

/** Expo Go only has RevenueCat's mock "preview" mode — we never show fake purchases, so it's unavailable there. */
export function storeAvailability(): StoreAvailability {
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return 'expo_go';
  if (!API_KEY) return 'not_configured';
  return 'ready';
}

let configured = false;
let currentUser: string | null = null;

/** Ties purchases to the Supabase user id, so the server (and restores on a new phone) can find them. */
export async function identify(userId: string): Promise<void> {
  if (storeAvailability() !== 'ready') return;
  if (!configured) {
    Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.WARN).catch(() => {});
    Purchases.configure({ apiKey: API_KEY!, appUserID: userId });
    configured = true;
    currentUser = userId;
    return;
  }
  if (currentUser !== userId) {
    await Purchases.logIn(userId);
    currentUser = userId;
  }
}

export async function forget(): Promise<void> {
  if (!configured || !currentUser) return;
  currentUser = null;
  await Purchases.logOut().catch(() => {});
}

export function onStoreChange(listener: () => void): () => void {
  if (!configured) return () => {};
  Purchases.addCustomerInfoUpdateListener(listener);
  return () => Purchases.removeCustomerInfoUpdateListener(listener);
}

export async function getPackages(): Promise<PurchasesPackage[]> {
  const offerings = await Purchases.getOfferings();
  return offerings.current?.availablePackages ?? [];
}

export type PurchaseOutcome = 'completed' | 'cancelled' | 'pending';

/**
 * 'completed' means the store took payment (or started a trial). Premium is switched on by the server
 * after it confirms with RevenueCat. 'pending' = e.g. UPI / cash payment not finished yet (common in India).
 */
export async function buy(pkg: PurchasesPackage): Promise<PurchaseOutcome> {
  try {
    await Purchases.purchasePackage(pkg);
    return 'completed';
  } catch (e) {
    const code = (e as { code?: string })?.code;
    if (code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) return 'cancelled';
    if (code === PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR) return 'pending';
    throw e;
  }
}

export async function restore(): Promise<void> {
  await Purchases.restorePurchases();
}

/** Store's own subscription page (cancel / change plan). */
export async function managementUrl(): Promise<string> {
  const fallback =
    Platform.OS === 'ios'
      ? 'https://apps.apple.com/account/subscriptions'
      : 'https://play.google.com/store/account/subscriptions?package=app.vybe.mobile';
  if (!configured) return fallback;
  const info = await Purchases.getCustomerInfo().catch(() => null);
  return info?.managementURL ?? fallback;
}

/** Store error → short message. RevenueCat's own messages are already human-readable. */
export function storeErrorMessage(e: unknown): string {
  const code = (e as { code?: string })?.code;
  if (code === PURCHASES_ERROR_CODE.NETWORK_ERROR) return "You're offline. Check your connection and try again.";
  if (code === PURCHASES_ERROR_CODE.PURCHASE_NOT_ALLOWED_ERROR) return 'Purchases are turned off on this device.';
  if (code === PURCHASES_ERROR_CODE.PRODUCT_ALREADY_PURCHASED_ERROR)
    return 'You already have this subscription — tap Restore purchases.';
  const msg = (e as { message?: string })?.message;
  return msg || 'The store had a problem. Please try again.';
}
