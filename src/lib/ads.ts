import { Platform } from 'react-native';

import { adError, logAds } from '@/lib/adsLog';

/**
 * AdMob for the free tier. Pro subscribers never see an ad, so nothing here is even initialised
 * for them. Degrades to a no-op on web / without the native module, so the web preview still works.
 *
 * Formats:
 *  - banner        (components/AdBanner) on every main screen
 *  - app open      on cold start and on returning from background
 *  - interstitial  after finishing a workout
 *
 * Note: Google's policy forbids interstitials that appear while the app is loading; the app-open
 * format is the sanctioned way to show a full-screen ad at launch.
 */

let ads: any = null;
try {
  ads = require('react-native-google-mobile-ads');
} catch {
  ads = null; // module missing (e.g. Expo Go) - the app simply shows no ads
}

const isTest = __DEV__ || !process.env.EXPO_PUBLIC_ADMOB_BANNER_IOS;

export const adsAvailable = () => !!ads;

/** Unit ids: Google's test units while developing, the real ones from env in release builds. */
export const AD_UNITS = {
  banner: isTest ? ads?.TestIds?.BANNER : process.env.EXPO_PUBLIC_ADMOB_BANNER_IOS,
  interstitial: isTest ? ads?.TestIds?.INTERSTITIAL : process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_IOS,
  appOpen: isTest ? ads?.TestIds?.APP_OPEN : process.env.EXPO_PUBLIC_ADMOB_APP_OPEN_IOS,
};

let initialised = false;
let interstitial: any = null;
let appOpen: any = null;
let lastFullScreenAt = 0;

/** Don't stack full-screen ads: at most one every 2 minutes across app-open and interstitial. */
const FULLSCREEN_COOLDOWN_MS = 120_000;

/**
 * Consent + SDK init. Call once the user is known not to be Pro.
 * Order matters: the EU consent form (UMP) runs first, Apple's tracking prompt after it.
 */
export async function initAds(): Promise<void> {
  if (!ads || initialised) return;
  initialised = true;
  void logAds(`start: ${isTest ? 'test units' : 'real units'}`);
  try {
    const { default: mobileAds, AdsConsent, MaxAdContentRating } = ads;
    try {
      const info = await AdsConsent.gatherConsent(); // GDPR / EU consent form, no-op elsewhere
      void logAds(
        `consent: ${info?.status}, canRequestAds=${info?.canRequestAds}, form=${info?.isConsentFormAvailable}, privacyOptions=${info?.privacyOptionsRequirementStatus}`,
      );
    } catch (e) {
      /* consent failures must not block ads entirely - Google serves non-personalised ones */
      void logAds(`consent failed: ${adError(e)}`);
    }
    if (Platform.OS === 'ios') {
      try {
        const { requestTrackingPermissionsAsync } = require('expo-tracking-transparency');
        const tracking = await requestTrackingPermissionsAsync();
        void logAds(`tracking: ${tracking?.status}`);
      } catch (e) {
        /* ignore - ads still work without tracking permission */
        void logAds(`tracking failed: ${adError(e)}`);
      }
    }
    await mobileAds().setRequestConfiguration({ maxAdContentRating: MaxAdContentRating.PG });
    await mobileAds().initialize();
    void logAds('sdk initialized');
    preloadInterstitial();
    preloadAppOpen();
  } catch (e) {
    /* ignore: no ads is better than a crash */
    void logAds(`init failed: ${adError(e)}`);
  }
}

function preloadInterstitial() {
  if (!ads || !AD_UNITS.interstitial) return;
  try {
    const { InterstitialAd, AdEventType } = ads;
    interstitial = InterstitialAd.createForAdRequest(AD_UNITS.interstitial);
    interstitial.addAdEventListener(AdEventType.CLOSED, () => {
      interstitial = null;
      preloadInterstitial(); // keep one warm for the next workout
    });
    interstitial.addAdEventListener(AdEventType.LOADED, () => void logAds('interstitial loaded'));
    interstitial.addAdEventListener(AdEventType.ERROR, (e: unknown) => {
      interstitial = null;
      void logAds(`interstitial failed: ${adError(e)}`);
    });
    interstitial.load();
  } catch {
    interstitial = null;
  }
}

function preloadAppOpen() {
  if (!ads || !AD_UNITS.appOpen) return;
  try {
    const { AppOpenAd, AdEventType } = ads;
    appOpen = AppOpenAd.createForAdRequest(AD_UNITS.appOpen);
    appOpen.addAdEventListener(AdEventType.CLOSED, () => {
      appOpen = null;
      preloadAppOpen();
    });
    appOpen.addAdEventListener(AdEventType.LOADED, () => void logAds('app open loaded'));
    appOpen.addAdEventListener(AdEventType.ERROR, (e: unknown) => {
      appOpen = null;
      void logAds(`app open failed: ${adError(e)}`);
    });
    appOpen.load();
  } catch {
    appOpen = null;
  }
}

function canShowFullScreen(): boolean {
  return Date.now() - lastFullScreenAt >= FULLSCREEN_COOLDOWN_MS;
}

/** Full-screen ad after finishing a workout. Returns true if one was actually shown. */
export function showInterstitial(): boolean {
  if (!interstitial?.loaded || !canShowFullScreen()) return false;
  try {
    interstitial.show();
    lastFullScreenAt = Date.now();
    return true;
  } catch {
    return false;
  }
}

/** Full-screen ad on cold start / returning from background. Returns true if one was shown. */
export function showAppOpen(): boolean {
  if (!appOpen?.loaded || !canShowFullScreen()) return false;
  try {
    appOpen.show();
    lastFullScreenAt = Date.now();
    return true;
  } catch {
    return false;
  }
}

/**
 * Does Google require a way to change the consent later? True in the EU once the GDPR message
 * is published; the Profile then shows a row that reopens the form (Google policy, #18).
 */
export async function privacyOptionsRequired(): Promise<boolean> {
  if (!ads) return false;
  try {
    const info = await ads.AdsConsent.getConsentInfo();
    return info?.privacyOptionsRequirementStatus === 'REQUIRED';
  } catch {
    return false;
  }
}

/** Reopen Google's consent form so the user can change or withdraw consent. */
export async function showPrivacyOptions(): Promise<void> {
  if (!ads) return;
  try {
    const info = await ads.AdsConsent.showPrivacyOptionsForm();
    await logAds(`privacy options: ${info?.status}, canRequestAds=${info?.canRequestAds}`);
  } catch (e) {
    await logAds(`privacy options failed: ${adError(e)}`);
  }
}

/** Stop serving ads the moment someone subscribes. */
export function disableAds(): void {
  interstitial = null;
  appOpen = null;
}
