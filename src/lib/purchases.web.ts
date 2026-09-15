/** Web stub: in-app purchases have no browser implementation, so the preview behaves as free tier. */
export const PRO_ENTITLEMENT = 'pro';
export type ProPackage = {
  id: string;
  period: string;
  priceString: string;
  pricePerMonthString?: string;
  trialDays?: number;
  raw: any;
};
export type PurchaseResult = { ok: boolean; isPro: boolean; cancelled: boolean; error?: string };

export const purchasesAvailable = () => false;
export async function initPurchases(): Promise<void> {}
export async function checkPro(): Promise<boolean | null> {
  return null; // unknown on web - never overwrite the cached entitlement
}
export function onProChange(_cb: (isPro: boolean) => void): () => void {
  return () => {};
}
export async function getProPackages(): Promise<ProPackage[]> {
  return [];
}
export async function buyPro(_pkg: ProPackage): Promise<PurchaseResult> {
  return { ok: false, isPro: false, cancelled: false, error: 'unavailable' };
}
export async function restorePro(): Promise<PurchaseResult> {
  return { ok: false, isPro: false, cancelled: false, error: 'unavailable' };
}
