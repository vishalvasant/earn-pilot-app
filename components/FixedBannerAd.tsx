import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';

// Safely import BannerAd
let BannerAd: any = null;
let BannerAdSize: any = null;
try {
  const admobModule = require('react-native-google-mobile-ads');
  BannerAd = admobModule.BannerAd;
  BannerAdSize = admobModule.BannerAdSize;
} catch (e) {
  console.log('AdMob not available');
}

const { width: screenWidth } = Dimensions.get('window');

interface FixedBannerAdProps {
  shouldShowBanner: boolean;
  getBannerAdId: () => string;
  backgroundColor?: string;
}

export default function FixedBannerAd({ shouldShowBanner, getBannerAdId, backgroundColor = '#111721' }: FixedBannerAdProps) {
  // Tab bar is 65px high + 15px margin from bottom = 80px
  // Banner will be positioned just above the tab bar
  const BANNER_HEIGHT = 50;
  const TAB_BAR_TOTAL_HEIGHT = 80;

  return (
    <View 
      style={[
        styles.bannerContainer,
        { 
          bottom: TAB_BAR_TOTAL_HEIGHT,
          backgroundColor,
          height: BANNER_HEIGHT,
        }
      ]}
    >
      {shouldShowBanner && BannerAd ? (
        <BannerAd
          unitId={getBannerAdId()}
          size={BannerAdSize.BANNER}
        />
      ) : !BannerAd ? (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>
            Ad Space
          </Text>
        </View>
      ) : null}
    </View>
  );
}

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
