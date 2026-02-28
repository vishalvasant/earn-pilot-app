import React, { useEffect, useState } from 'react';
import { Platform, View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAdMob } from '../hooks/useAdMob';
import { APP_CONFIG } from '../config/app';

const FALLBACK_URL = 'https://networks11.com/public/games/stickmanhook/';
const GAME_INSET = 0; // Full bleed; game HTML handles safe-area and fit

let BannerAd: any = null;
let BannerAdSize: any = null;
try {
  const admob = require('react-native-google-mobile-ads');
  BannerAd = admob.BannerAd;
  BannerAdSize = admob.BannerAdSize;
} catch {}

const CHROME_UA =
  'Mozilla/5.0 (Linux; Android 10; WebView) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

export default function HTML5GameScreen() {
  const navigation = useNavigation();
  const route = useRoute<{ params?: { url?: string; title?: string; forceLandscape?: boolean } }>();
  const insets = useSafeAreaInsets();
  const { shouldShowBanner, getBannerAdId, getAdRequestOptions } = useAdMob();
  const BANNER_HEIGHT = 50;
  // Use actual layout size (after orientation) so dimensions are correct for the visible area
  const [layoutSize, setLayoutSize] = useState({ width: 0, height: 0 });
  // Delay loading the game so the tap that opened this screen isn’t forwarded into the WebView (avoids auto-starting the game)
  const [startLoad, setStartLoad] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setStartLoad(true), 400);
    return () => clearTimeout(t);
  }, []);

  const availW = layoutSize.width - 2 * GAME_INSET;
  const availH = layoutSize.height - 2 * GAME_INSET;
  const gameWidth = layoutSize.width > 0 && layoutSize.height > 0 && availW > 0 && availH > 0 ? Math.round(availW) : 0;
  const gameHeight = layoutSize.width > 0 && layoutSize.height > 0 && availW > 0 && availH > 0 ? Math.round(availH) : 0;
  const fillGame = gameWidth > 0 && gameHeight > 0;

  const url = route.params?.url || APP_CONFIG.HTML5_GAME_URL || FALLBACK_URL;
  const forceLandscape = route.params?.forceLandscape === true;

  // Lock to landscape when opening a game that requires it (e.g. Red Ball 4)
  useEffect(() => {
    if (!forceLandscape) return;
    let Orientation: { lockToLandscape?: () => void; lockToPortrait?: () => void } | null = null;
    try {
      const mod = require('react-native-orientation-locker');
      Orientation = mod?.default ?? mod;
    } catch {}
    if (Orientation?.lockToLandscape) {
      Orientation.lockToLandscape();
      return () => {
        if (Orientation?.lockToPortrait) Orientation.lockToPortrait();
      };
    }
  }, [forceLandscape]);

  // Red Ball 4: no bottom banner; vertical side banners will be added later
  const showBottomBanner = shouldShowBanner && BannerAd && !forceLandscape;

  return (
    <View style={styles.container}>
      <View
        style={[styles.safeArea, { paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right }]}
      >
        <View
          style={styles.gameColumn}
          onLayout={(e) => {
            const { width, height } = e.nativeEvent.layout;
            if (width > 0 && height > 0) setLayoutSize({ width: Math.round(width), height: Math.round(height) });
          }}
        >
          <View style={[styles.gameCenter, fillGame && { width: gameWidth, flex: 1 }]}>
            <View style={[styles.gameBox, fillGame && { width: gameWidth, height: gameHeight }]}>
              {startLoad ? (
                <WebView
                  source={{ uri: url }}
                  style={styles.webView}
                  javaScriptEnabled
                  domStorageEnabled
                  originWhitelist={['*']}
                  mixedContentMode="compatibility"
                  userAgent={CHROME_UA}
                  mediaPlaybackRequiresUserAction={false}
                  allowsInlineMediaPlayback
                  cacheEnabled
                  thirdPartyCookiesEnabled
                  sharedCookiesEnabled
                  allowFileAccess
                  setSupportMultipleWindows={false}
                  {...(Platform.OS === 'android' && {
                    androidLayerType: 'hardware',
                    overScrollMode: 'never',
                  })}
                />
              ) : null}
            </View>
          </View>
        </View>
        {showBottomBanner ? (
          <View style={[styles.bottomBannerBar, { paddingBottom: insets.bottom, minHeight: BANNER_HEIGHT + insets.bottom }]}>
            <View style={styles.bannerAdWrapper}>
              <BannerAd
                unitId={getBannerAdId()}
                size={BannerAdSize.BANNER}
                requestOptions={getAdRequestOptions()}
              />
            </View>
          </View>
        ) : null}
      </View>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={[styles.closeBtn, { top: insets.top + 8, left: 12 }]}
        activeOpacity={0.8}
      >
        <Text style={styles.closeBtnText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  safeArea: {
    flex: 1,
  },
  gameColumn: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameCenter: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameBox: {
    overflow: 'hidden',
    backgroundColor: '#000',
    flex: 1,
    alignSelf: 'stretch',
  },
  webView: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  bottomBannerBar: {
    width: '100%',
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0a0a0a',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  bannerAdWrapper: {
    width: '100%',
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    position: 'absolute',
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 24,
  },
});
