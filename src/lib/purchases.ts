/**
 * Subscriptions via RevenueCat. Steelset is free with ads; an active "pro" entitlement removes them.
 *
 * Everything degrades to a no-op without the native module or an API key (web preview, Expo Go),
 * so the app stays fully usable while developing - it simply behaves as a non-paying user.
 */

/** Entitlement configured in RevenueCat; grants the ad-free experience. */
export const PRO_ENTITLEMENT = 'pro';

/** Public SDK key from RevenueCat (Project settings -> API keys -> App Store). */
const API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '';

let Purchases: any = null;
try {
  Purchases = require('react-native-purchases').default;
} catch {
  Purchases = null; // module missing (e.g. Expo Go) - purchases are simply unavailable
}

export const purchasesAvailable = () => !!Purchases && !!API_KEY;

export type ProPackage = {
  id: string;
  /** 'monthly' | 'annual' | other RevenueCat package type */
  period: string;
  priceString: string;
  /** Price per month, for the "X Kč / měsíc" line under an annual plan. */
  pricePerMonthString?: string;
  /** Free trial length in days, if the product has an intro offer. */
  trialDays?: number;
  raw: any;
};

let configured = false;

/** Safe to call repeatedly; configures the SDK once. */
export async function initPurchases(): Promise<void> {
  if (!purchasesAvailable() || configured) return;
  try {
    await Purchases.configure({ apiKey: API_KEY });
    configured = true;
  } catch {
    configured = false;
  }
}

/**
 * Current pro entitlement, or null when it can't be determined (offline, SDK missing).
 * Callers must keep their cached value on null - a network blip must never put ads back in
 * front of someone who is paying.
 */
export async function checkPro(): Promise<boolean | null> {
  if (!purchasesAvailable()) return null;
  try {
    await initPurchases();
    const info = await Purchases.getCustomerInfo();
    return !!info?.entitlements?.active?.[PRO_ENTITLEMENT];
  } catch {
    return null;
  }
}

/** Subscribe to entitlement changes (renewal, expiry, purchase on another device). */
export function onProChange(cb: (isPro: boolean) => void): () => void {
  if (!purchasesAvailable()) return () => {};
  try {
    const listener = (info: any) => cb(!!info?.entitlements?.active?.[PRO_ENTITLEMENT]);
    Purchases.addCustomerInfoUpdateListener(listener);
    return () => {
      try {
        Purchases.removeCustomerInfoUpdateListener(listener);
      } catch {
        /* ignore */
      }
    };
  } catch {
    return () => {};
  }
}

const MONTHS: Record<string, number> = { MONTHLY: 1, TWO_MONTH: 2, THREE_MONTH: 3, SIX_MONTH: 6, ANNUAL: 12 };

/** Packages from RevenueCat's current offering, cheapest period first. */
export async function getProPackages(): Promise<ProPackage[]> {
  if (!purchasesAvailable()) return [];
  try {
    await initPurchases();
    const offerings = await Purchases.getOfferings();
    const packages = offerings?.current?.availablePackages ?? [];
    return packages.map((p: any): ProPackage => {
      const product = p.product ?? {};
      const months = MONTHS[p.packageType] ?? 1;
      const perMonth = months > 1 && typeof product.price === 'number' ? product.price / months : null;
      const intro = product.introPrice;
      return {
        id: p.identifier,
        period: String(p.packageType ?? '').toLowerCase(),
        priceString: product.priceString ?? '',
        pricePerMonthString:
          perMonth != null ? formatPrice(perMonth, product.currencyCode, product.priceString) : undefined,
        trialDays: intro && intro.price === 0 ? introDays(intro) : undefined,
        raw: p,
      };
    });
  } catch {
    return [];
  }
}

function introDays(intro: any): number | undefined {
  const n = Number(intro.periodNumberOfUnits);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  switch (String(intro.periodUnit).toUpperCase()) {
    case 'DAY':
      return n;
    case 'WEEK':
      return n * 7;
    case 'MONTH':
      return n * 30;
    case 'YEAR':
      return n * 365;
    default:
      return undefined;
  }
}

/** Mirror the store's own formatting (currency symbol placement differs per locale). */
function formatPrice(value: number, currencyCode?: string, sample?: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currencyCode || 'CZK',
      maximumFractionDigits: value >= 100 ? 0 : 2,
    }).format(value);
  } catch {
    return sample ?? String(Math.round(value));
  }
}

export type PurchaseResult = { ok: boolean; isPro: boolean; cancelled: boolean; error?: string };

export async function buyPro(pkg: ProPackage): Promise<PurchaseResult> {
  if (!purchasesAvailable()) return { ok: false, isPro: false, cancelled: false, error: 'unavailable' };
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg.raw);
    return { ok: true, isPro: !!customerInfo?.entitlements?.active?.[PRO_ENTITLEMENT], cancelled: false };
  } catch (e: any) {
    // the user backing out of the App Store sheet is not an error worth showing
    if (e?.userCancelled) return { ok: false, isPro: false, cancelled: true };
    return { ok: false, isPro: false, cancelled: false, error: e?.message ?? 'Nákup se nepodařil.' };
  }
}

/** Apple requires a visible restore action in any app that sells subscriptions. */
export async function restorePro(): Promise<PurchaseResult> {
  if (!purchasesAvailable()) return { ok: false, isPro: false, cancelled: false, error: 'unavailable' };
  try {
    const info = await Purchases.restorePurchases();
    return { ok: true, isPro: !!info?.entitlements?.active?.[PRO_ENTITLEMENT], cancelled: false };
  } catch (e: any) {
    return { ok: false, isPro: false, cancelled: false, error: e?.message ?? 'Obnovení se nepodařilo.' };
  }
}
