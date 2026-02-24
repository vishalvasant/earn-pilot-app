import React, { memo, useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';

// Safely import BannerAd
let BannerAd: any = null;
let BannerAdSize: any = null;
try {
  const admobModule = require('react-native-google-mobile-ads');
  BannerAd = admobModule.BannerAd;
  BannerAdSize = admobModule.BannerAdSize;
} catch (e) {
  // console.log('AdMob not available');
}

const { width: screenWidth } = Dimensions.get('window');

interface FixedBannerAdProps {
  shouldShowBanner: boolean;
  getBannerAdId: () => string;
  /** Optional: [singleId, null]. Kept for API compat; only first ID is used. */
  getBannerAdIds?: () => [string, string | null];
  requestOptions?: { location?: { latitude: number; longitude: number; accuracy?: number } };
  backgroundColor?: string;
}

function FixedBannerAd({ shouldShowBanner, getBannerAdId, getBannerAdIds, requestOptions, backgroundColor = '#111721' }: FixedBannerAdProps) {
  const [loadFailed, setLoadFailed] = useState(false);
  const unitId = getBannerAdIds ? getBannerAdIds()[0] : getBannerAdId();
  const BANNER_HEIGHT = 50;
  const TAB_BAR_TOTAL_HEIGHT = 80;

  if (shouldShowBanner && loadFailed) {
    return null;
  }

  return (
    <View
      style={[
        styles.bannerContainer,
        {
          bottom: TAB_BAR_TOTAL_HEIGHT,
          backgroundColor,
          height: BANNER_HEIGHT,
        },
      ]}
    >
      {shouldShowBanner && BannerAd ? (
        <View style={styles.bannerAdWrapper}>
          <BannerAd
            key={unitId}
            unitId={unitId}
            size={BannerAdSize.BANNER}
            requestOptions={requestOptions}
            onAdLoaded={() => setLoadFailed(false)}
            onAdFailedToLoad={(error: any) => {
              const code = error?.code ?? error?.nativeEvent?.code;
              const msg = error?.message ?? error?.nativeEvent?.message ?? '';
              console.log('📺 Banner: load failed', code ? `(code: ${code}${msg ? `, ${msg}` : ''})` : '');
              setLoadFailed(true);
            }}
          />
        </View>
      ) : !BannerAd ? (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>Ad Space</Text>
        </View>
      ) : null}
    </View>
  );
}

export default memo(FixedBannerAd);

const styles = StyleSheet.create({
  bannerContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  /** Give the native banner view a slot so it can lay out (320x50 dp). Without this, 0x0 can prevent load. */
  bannerAdWrapper: {
    width: '100%',
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    width: screenWidth - 32,
    height: 50,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 12,
    fontWeight: '600',
  },
});
