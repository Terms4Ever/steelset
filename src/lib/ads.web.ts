/** Web stub: the app runs in the browser preview without the AdMob native module. */
export const adsAvailable = () => false;
export const AD_UNITS = { banner: undefined, interstitial: undefined, appOpen: undefined } as const;
export async function initAds(): Promise<void> {}
export function showInterstitial(): boolean {
  return false;
}
export function showAppOpen(): boolean {
  return false;
}
export function disableAds(): void {}
