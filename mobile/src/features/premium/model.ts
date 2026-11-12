/**
 * Paywall display logic. Pure (type-only imports) so it can be unit-tested.
 * Prices always come from the store (localised, e.g. ₹ in India) — never hard-coded here.
 */
import type { PurchasesPackage } from 'react-native-purchases';

export const FREE_GROUP_LIMIT = 2;

export const BENEFITS = [
  { emoji: '👥', title: 'Unlimited groups', body: `Free includes ${FREE_GROUP_LIMIT}. Make one for every crew.` },
  { emoji: '🎯', title: 'Pick exactly who sees it', body: 'Combine any of your groups when you go free.' },
  { emoji: '💚', title: 'Support VYBE', body: 'Help keep the core app free for everyone.' },
] as const;

/** What stays free — shown so nobody thinks the social basics are paywalled. */
export const ALWAYS_FREE = 'Going free, friends, joining plans and chat are always free.';

type Product = PurchasesPackage['product'];

export type Plan = {
  id: string;
  kind: 'annual' | 'monthly' | 'other';
  title: string;
  /** e.g. "₹1,499.00 / year" */
  priceLine: string;
  /** e.g. "₹124.92 / month" for annual plans, when the store provides it. */
  perMonth: string | null;
  trialDays: number | null;
  pkg: PurchasesPackage;
};

const DAYS: Record<string, number> = { DAY: 1, WEEK: 7, MONTH: 30, YEAR: 365 };

/** Free-trial length in days, from the store's offer (Google: free phase; Apple: free intro price). */
export function trialDays(product: Product): number | null {
  const free = product.defaultOption?.freePhase;
  if (free?.billingPeriod) {
    const unit = DAYS[free.billingPeriod.unit];
    return unit ? unit * free.billingPeriod.value * (free.billingCycleCount ?? 1) : null;
  }
  const intro = product.introPrice;
  if (intro && intro.price === 0) {
    const unit = DAYS[intro.periodUnit];
    return unit ? unit * intro.periodNumberOfUnits * Math.max(intro.cycles, 1) : null;
  }
  return null;
}

export function toPlan(pkg: PurchasesPackage): Plan {
  const { product } = pkg;
  const kind = pkg.packageType === 'ANNUAL' ? 'annual' : pkg.packageType === 'MONTHLY' ? 'monthly' : 'other';
  const per = kind === 'annual' ? ' / year' : kind === 'monthly' ? ' / month' : '';
  return {
    id: pkg.identifier,
    kind,
    title: kind === 'annual' ? 'Yearly' : kind === 'monthly' ? 'Monthly' : product.title,
    priceLine: `${product.priceString}${per}`,
    perMonth: kind === 'annual' ? product.pricePerMonthString : null,
    trialDays: trialDays(product),
    pkg,
  };
}

/** Annual first (best value), then monthly, then anything else. */
export function toPlans(pkgs: PurchasesPackage[]): Plan[] {
  const order = { annual: 0, monthly: 1, other: 2 };
  return pkgs.map(toPlan).sort((a, b) => order[a.kind] - order[b.kind]);
}

/** "Save 37%" of annual vs 12 × monthly, only when both are in the same currency. */
export function annualSavingsPercent(plans: Plan[]): number | null {
  const annual = plans.find((p) => p.kind === 'annual')?.pkg.product;
  const monthly = plans.find((p) => p.kind === 'monthly')?.pkg.product;
  if (!annual || !monthly || annual.currencyCode !== monthly.currencyCode || monthly.price <= 0) return null;
  const pct = Math.round((1 - annual.price / (monthly.price * 12)) * 100);
  return pct >= 5 ? pct : null;
}

export function ctaLabel(plan: Plan | undefined): string {
  if (!plan) return 'Continue';
  return plan.trialDays ? `Start ${plan.trialDays}-day free trial` : 'Subscribe';
}

/** Required auto-renew disclosure shown under the button. */
export function renewalDisclosure(plan: Plan | undefined, platform: 'ios' | 'android'): string {
  const store = platform === 'ios' ? 'App Store' : 'Google Play';
  if (!plan) return '';
  const trial = plan.trialDays
    ? `Free for ${plan.trialDays} days, then ${plan.priceLine}. You won't be charged if you cancel before the trial ends. `
    : `${plan.priceLine}. `;
  return (
    trial +
    `Renews automatically until cancelled. Cancel anytime in ${store} subscriptions at least 24 hours before the renewal date.`
  );
}
