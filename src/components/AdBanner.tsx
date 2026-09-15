import { useState } from 'react';
import { View } from 'react-native';

import { palette } from '@/constants/theme';
import { AD_UNITS, adsAvailable } from '@/lib/ads';
import { useStore } from '@/store/useStore';

let BannerAd: any = null;
let BannerAdSize: any = null;
try {
  const m = require('react-native-google-mobile-ads');
  BannerAd = m.BannerAd;
  BannerAdSize = m.BannerAdSize;
} catch {
  BannerAd = null;
}

/**
 * Anchored adaptive banner. Renders nothing for Pro subscribers, on web, or before the ad loads,
 * so an unfilled request never leaves a blank strip in the layout.
 */
export function AdBanner({ style }: { style?: any }) {
  const isPro = useStore((s) => s.isPro);
  const [loaded, setLoaded] = useState(false);

  if (isPro || !BannerAd || !adsAvailable() || !AD_UNITS.banner) return null;

  return (
    <View style={[{ alignItems: 'center', backgroundColor: loaded ? palette.bg : 'transparent' }, style]}>
      <BannerAd
        unitId={AD_UNITS.banner}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        onAdLoaded={() => setLoaded(true)}
        onAdFailedToLoad={() => setLoaded(false)}
      />
    </View>
  );
}
