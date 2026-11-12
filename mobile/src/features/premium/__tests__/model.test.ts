import { describe, expect, it } from '@jest/globals';
import type { PurchasesPackage } from 'react-native-purchases';

import { annualSavingsPercent, ctaLabel, renewalDisclosure, toPlans, trialDays } from '../model';

type P = PurchasesPackage['product'];

function pkg(type: 'ANNUAL' | 'MONTHLY' | 'CUSTOM', product: Partial<P>): PurchasesPackage {
  return {
    identifier: `$rc_${type.toLowerCase()}`,
    packageType: type,
    product: {
      title: 'VYBE Premium',
      price: 0,
      priceString: '',
      currencyCode: 'INR',
      pricePerMonthString: null,
      introPrice: null,
      defaultOption: null,
      ...product,
    } as P,
  } as unknown as PurchasesPackage;
}

const annual = pkg('ANNUAL', {
  price: 1499,
  priceString: '₹1,499.00',
  pricePerMonthString: '₹124.92',
  defaultOption: {
    freePhase: { billingPeriod: { unit: 'DAY', value: 7 }, billingCycleCount: 1 },
  } as P['defaultOption'],
});
const monthly = pkg('MONTHLY', { price: 199, priceString: '₹199.00' });

describe('premium model', () => {
  it('reads Google Play free trial', () => {
    expect(trialDays(annual.product)).toBe(7);
    expect(trialDays(monthly.product)).toBeNull();
  });

  it('reads Apple free intro offer, ignores paid intro', () => {
    const free = { price: 0, priceString: '', cycles: 1, period: 'P1W', periodUnit: 'WEEK', periodNumberOfUnits: 1 };
    expect(trialDays({ ...monthly.product, introPrice: free } as P)).toBe(7);
    expect(trialDays({ ...monthly.product, introPrice: { ...free, price: 49 } } as P)).toBeNull();
  });

  it('orders annual first and labels prices from the store', () => {
    const plans = toPlans([monthly, annual]);
    expect(plans.map((p) => p.kind)).toEqual(['annual', 'monthly']);
    expect(plans[0].priceLine).toBe('₹1,499.00 / year');
    expect(plans[0].perMonth).toBe('₹124.92');
    expect(plans[1].priceLine).toBe('₹199.00 / month');
  });

  it('computes savings only within one currency', () => {
    expect(annualSavingsPercent(toPlans([annual, monthly]))).toBe(37);
    const usd = pkg('MONTHLY', { price: 2.99, currencyCode: 'USD' });
    expect(annualSavingsPercent(toPlans([annual, usd]))).toBeNull();
    expect(annualSavingsPercent(toPlans([annual]))).toBeNull();
  });

  it('CTA and disclosure mention the trial only when the store offers one', () => {
    const [a, m] = toPlans([annual, monthly]);
    expect(ctaLabel(a)).toBe('Start 7-day free trial');
    expect(ctaLabel(m)).toBe('Subscribe');
    expect(renewalDisclosure(a, 'android')).toMatch(/Free for 7 days, then ₹1,499.00 \/ year/);
    expect(renewalDisclosure(m, 'ios')).toMatch(/App Store/);
    expect(renewalDisclosure(m, 'ios')).not.toMatch(/Free for/);
  });
});
