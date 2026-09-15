import { Platform } from 'react-native';

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
  try {
    const { default: mobileAds, AdsConsent, MaxAdContentRating } = ads;
    try {
      await AdsConsent.gatherConsent(); // GDPR / EU consent form, no-op elsewhere
    } catch {
      /* consent failures must not block ads entirely - Google serves non-personalised ones */
    }
    if (Platform.OS === 'ios') {
      try {
        const { requestTrackingPermissionsAsync } = require('expo-tracking-transparency');
        await requestTrackingPermissionsAsync();
      } catch {
        /* ignore - ads still work without tracking permission */
      }
    }
    await mobileAds().setRequestConfiguration({ maxAdContentRating: MaxAdContentRating.PG });
    await mobileAds().initialize();
    preloadInterstitial();
    preloadAppOpen();
  } catch {
    /* ignore: no ads is better than a crash */
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
    interstitial.addAdEventListener(AdEventType.ERROR, () => {
      interstitial = null;
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
    appOpen.addAdEventListener(AdEventType.ERROR, () => {
      appOpen = null;
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

/** Stop serving ads the moment someone subscribes. */
export function disableAds(): void {
  interstitial = null;
  appOpen = null;
}
