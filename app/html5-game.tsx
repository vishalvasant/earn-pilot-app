import React, { useEffect, useState, useCallback } from 'react';
import { Platform, View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAdMob } from '../hooks/useAdMob';
import { APP_CONFIG } from '../config/app';
import { api } from '../services/api';
import { useUserStore } from '../stores/userStore';

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
  const route = useRoute<{ params?: { url?: string; title?: string; forceLandscape?: boolean; forcePortrait?: boolean } }>();
  const insets = useSafeAreaInsets();
  const { shouldShowBanner, getBannerAdId, getAdRequestOptions, showRewarded } = useAdMob();
  const setProfile = useUserStore((s) => s.setProfile);
  const BANNER_HEIGHT = 50;
  // Use actual layout size (after orientation) so dimensions are correct for the visible area
  const [layoutSize, setLayoutSize] = useState({ width: 0, height: 0 });
  // Delay loading the game so the tap that opened this screen isn’t forwarded into the WebView (avoids auto-starting the game)
  const [startLoad, setStartLoad] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [arcadeConfig, setArcadeConfig] = useState<Record<string, { show_ad_every_n_levels: number; points_per_level: number }>>({});
  useEffect(() => {
    const t = setTimeout(() => setStartLoad(true), 400);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    setLoadError(null);
  }, [url]);

  useEffect(() => {
    api.get('/html5-arcade/config').then((res) => {
      if (res.data?.success && res.data?.config) setArcadeConfig(res.data.config);
    }).catch(() => {});
  }, []);

  const availW = layoutSize.width - 2 * GAME_INSET;
  const availH = layoutSize.height - 2 * GAME_INSET;
  const gameWidth = layoutSize.width > 0 && layoutSize.height > 0 && availW > 0 && availH > 0 ? Math.round(availW) : 0;
  const gameHeight = layoutSize.width > 0 && layoutSize.height > 0 && availW > 0 && availH > 0 ? Math.round(availH) : 0;
  const fillGame = gameWidth > 0 && gameHeight > 0;

  const url = route.params?.url || APP_CONFIG.HTML5_GAME_URL || FALLBACK_URL;
  const forceLandscape = route.params?.forceLandscape === true;
  const clearLoadError = useCallback(() => setLoadError(null), []);
  const forcePortrait = route.params?.forcePortrait === true;
  const gameKey = (() => {
    const u = url.toLowerCase();
    if (u.includes('stickmanhook')) return 'stickman_hook' as const;
    if (u.includes('bubble-tower-3d') || u.includes('famobi')) return 'bubble_tower_3d' as const;
    if (u.includes('omnombounce')) return 'omnombounce' as const;
    if (u.includes('stackball')) return 'stackball' as const;
    return null;
  })();

  const handleLevelComplete = useCallback(async (level: number) => {
    if (!gameKey) return;
    const cfg = arcadeConfig[gameKey];
    const interval = cfg?.show_ad_every_n_levels ?? 1;
    if (interval < 1 || level % interval !== 0) return;
    await showRewarded(
      async () => {
        try {
          const res = await api.post('/html5-arcade/level-complete', { game_key: gameKey, level });
          if (res.data?.points_earned > 0) {
            const profileRes = await api.get('/profile');
            const user = profileRes?.data?.user ?? profileRes?.data;
            if (user) setProfile(user);
          }
        } catch (_) {}
      },
      { skipGenericReward: true }
    );
  }, [gameKey, arcadeConfig, showRewarded, setProfile]);

  const onMessage = useCallback((event: { nativeEvent: { data: string } }) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data?.type === 'levelComplete' && typeof data?.level === 'number') {
        handleLevelComplete(data.level);
      }
    } catch (_) {}
  }, [handleLevelComplete]);

  // Bridge so game can notify app (used when server has patched bundle)
  const injectedBeforeLoad = "window.__onEarnPilotLevelComplete=function(l){if(window.ReactNativeWebView&&typeof l==='number')window.ReactNativeWebView.postMessage(JSON.stringify({type:'levelComplete',level:l}));};";
  // Stickman Hook + Om Nom Bounce + Stack Ball: poll to detect level complete. Bubble Tower 3D (Famobi) runs in iframe – no level detection.
  const injectedAfterLoad = [
    "(function(){var u=(document.URL||'').toLowerCase();",
    "if(u.indexOf('stickmanhook')!==-1){var last=0;function poll(){try{var v=localStorage.getItem('STICKMANHOOK_currentLevel');if(v){var n=parseInt(JSON.parse(v),10);if(!isNaN(n)){if(n>last&&last>0&&window.ReactNativeWebView){window.ReactNativeWebView.postMessage(JSON.stringify({type:'levelComplete',level:last}));}last=n;}}}catch(e){}}setInterval(poll,1200);setTimeout(poll,2500);}",
    "if(u.indexOf('omnombounce')!==-1){var last=0;function getOmNomLevel(){try{var keys=['level','currentLevel','om_nom_bounce_level','phaser_level','Azerion_om_nom_bounce','om_nom_bounce'];for(var ki=0;ki<keys.length;ki++){var v=localStorage.getItem(keys[ki]);if(v){var n=parseInt(v,10);if(!isNaN(n)&&n>0)return n;try{var o=JSON.parse(v);var L=o.level!==undefined?o.level:o.currentLevel;if(L!==undefined){n=parseInt(L,10);if(!isNaN(n))return n;}}catch(e){}}}for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(!k||(k.indexOf('level')===-1&&k.indexOf('bounce')===-1&&k.indexOf('om_nom')===-1&&k.indexOf('nom')===-1&&k.indexOf('phaser')===-1))continue;var j=localStorage.getItem(k);if(!j)continue;var n=parseInt(j,10);if(!isNaN(n)&&n>0)return n;try{var o=JSON.parse(j);var L=o.level!==undefined?o.level:o.currentLevel;if(L!==undefined){n=parseInt(L,10);if(!isNaN(n))return n;}}catch(e){}}return null;}catch(e){return null;}}function poll(){var n=getOmNomLevel();if(n!==null){if(n>last&&last>0&&window.ReactNativeWebView){window.ReactNativeWebView.postMessage(JSON.stringify({type:'levelComplete',level:last}));}last=n;}}setInterval(poll,1500);setTimeout(poll,3000);}",
    "if(u.indexOf('stackball')!==-1){var last=0;function getStackBallLevel(){try{for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(!k)continue;if(k.indexOf('Unity')===-1&&k.indexOf('StackBall')===-1&&k.indexOf('stackball')===-1&&k.indexOf('level')===-1&&k.indexOf('Level')===-1)continue;var j=localStorage.getItem(k);if(!j)continue;var n=parseInt(j,10);if(!isNaN(n)&&n>0)return n;var m=j.match(/[Ll]evel[\"\\']?\\s*[:=]\\s*[\"']?(\\d+)/);if(m)return parseInt(m[1],10);try{var o=JSON.parse(j);var L=o.level!==undefined?o.level:o.Level;if(L!==undefined){n=parseInt(L,10);if(!isNaN(n))return n;}}catch(e){}}}return null;}catch(e){return null;}}function poll(){var n=getStackBallLevel();if(n!==null){if(n>last&&last>0&&window.ReactNativeWebView){window.ReactNativeWebView.postMessage(JSON.stringify({type:'levelComplete',level:last}));}last=n;}}setInterval(poll,1500);setTimeout(poll,3000);}",
    "})();"
  ].join('\n');

  // Lock to landscape when opening a game that requires it
  useEffect(() => {
    if (!forceLandscape) return;
    let Orientation: { lockToLandscape?: () => void; lockToPortrait?: () => void; unlockAllOrientations?: () => void } | null = null;
    try {
      const mod = require('react-native-orientation-locker');
      Orientation = mod?.default ?? mod;
    } catch {}
    if (Orientation?.lockToLandscape) {
      Orientation.lockToLandscape();
      return () => {
        if (Orientation?.unlockAllOrientations) Orientation.unlockAllOrientations();
        else if (Orientation?.lockToPortrait) Orientation.lockToPortrait();
      };
    }
  }, [forceLandscape]);

  // Lock to portrait when opening a game that requires it (e.g. Stack Ball)
  useEffect(() => {
    if (!forcePortrait) return;
    let Orientation: { lockToPortrait?: () => void; unlockAllOrientations?: () => void } | null = null;
    try {
      const mod = require('react-native-orientation-locker');
      Orientation = mod?.default ?? mod;
    } catch {}
    if (Orientation?.lockToPortrait) {
      Orientation.lockToPortrait();
      return () => {
        if (Orientation?.unlockAllOrientations) Orientation.unlockAllOrientations();
      };
    }
  }, [forcePortrait]);

  // No bottom banner in landscape so game has full width
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
                <>
                  <WebView
                    source={{ uri: url }}
                    style={[styles.webView, loadError ? styles.webViewHidden : undefined]}
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
                    onMessage={onMessage}
                    onError={(e) => {
                      const msg = e.nativeEvent?.description || e.nativeEvent?.message || String(e);
                      console.warn('📺 WebView error:', msg);
                      setLoadError(`Load error: ${msg}`);
                    }}
                    onHttpError={(e) => {
                      const { statusCode, description, url: errUrl } = e.nativeEvent || {};
                      const msg = statusCode ? `HTTP ${statusCode}: ${description || 'Failed to load'}` : (description || 'HTTP error');
                      console.warn('📺 WebView HTTP error:', statusCode, description, errUrl);
                      setLoadError(msg);
                    }}
                    injectedJavaScriptBeforeContentLoaded={injectedBeforeLoad}
                    injectedJavaScript={injectedAfterLoad}
                    {...(Platform.OS === 'android' && {
                      androidLayerType: 'hardware',
                      overScrollMode: 'never',
                    })}
                  />
                  {loadError ? (
                    <View style={styles.errorOverlay} pointerEvents="box-none">
                      <Text style={styles.errorText}>{loadError}</Text>
                      <TouchableOpacity style={styles.retryBtn} onPress={() => { clearLoadError(); setStartLoad(false); setTimeout(() => setStartLoad(true), 100); }}>
                        <Text style={styles.retryBtnText}>Retry</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </>
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
  webViewHidden: {
    opacity: 0.3,
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#333',
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
