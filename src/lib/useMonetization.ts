import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { disableAds, initAds, showAppOpen } from '@/lib/ads';
import { checkPro, initPurchases, onProChange } from '@/lib/purchases';
import { useStore } from '@/store/useStore';

/**
 * Wires subscriptions to ads for the whole app:
 *  - asks RevenueCat whether the user is Pro (cached value from the store is used until it answers)
 *  - starts the ad SDK only for non-paying users, and stops it the moment they subscribe
 *  - shows an app-open ad on cold start and when returning from background
 *
 * Mount once, in the root layout.
 */
export function useMonetization(ready: boolean) {
  const isPro = useStore((s) => s.isPro);
  const setPro = useStore((s) => s.setPro);
  const adsStarted = useRef(false);
  // Don't cover the first paint with a full-screen ad; the app-open ad waits for the next foreground.
  const coldStart = useRef(true);

  // entitlement: ask once, then follow renewals / expiry / purchases made on another device
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    (async () => {
      await initPurchases();
      const pro = await checkPro();
      // null = couldn't ask (offline / no SDK): keep whatever was cached
      if (!cancelled && pro !== null) setPro(pro);
    })();
    const unsub = onProChange((pro) => setPro(pro));
    return () => {
      cancelled = true;
      unsub();
    };
  }, [ready, setPro]);

  // ads: only ever initialised for non-paying users
  useEffect(() => {
    if (!ready) return;
    if (isPro) {
      disableAds();
      return;
    }
    if (adsStarted.current) return;
    adsStarted.current = true;
    initAds();
  }, [ready, isPro]);

  // full-screen ad when the app comes back to the foreground
  useEffect(() => {
    if (!ready || isPro) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') {
        coldStart.current = false;
        return;
      }
      if (coldStart.current) return;
      showAppOpen();
    });
    return () => sub.remove();
  }, [ready, isPro]);
}
