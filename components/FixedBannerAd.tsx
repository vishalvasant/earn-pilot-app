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
  /** Optional request options (e.g. location for geo-targeting). */
  requestOptions?: { location?: { latitude: number; longitude: number; accuracy?: number } };
  backgroundColor?: string;
}

function FixedBannerAd({ shouldShowBanner, getBannerAdId, requestOptions, backgroundColor = '#111721' }: FixedBannerAdProps) {
  const [loadFailed, setLoadFailed] = useState(false);
  // Tab bar is 65px high + 15px margin from bottom = 80px
  const BANNER_HEIGHT = 50;
  const TAB_BAR_TOTAL_HEIGHT = 80;

  const unitId = getBannerAdId();

  // When no-fill or other load failure: hide the banner bar so we don't show an empty frame
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
            unitId={unitId}
            size={BannerAdSize.BANNER}
            requestOptions={requestOptions}
            onAdLoaded={() => setLoadFailed(false)}
            onAdFailedToLoad={() => {
              console.log('📺 Banner: no-fill or load failed');
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
