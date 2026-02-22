import { api, getProfile } from './api';
import { useUserStore } from '../stores/userStore';
import { Platform, AppState, type AppStateStatus } from 'react-native';
import { APP_CONFIG } from '../config/app';

/**
 * AdMob & Ad Manager: All ad unit IDs and the optional Ad Manager banner tag are populated from
 * the config returned by the admin API (GET /api/admob/config?platform=android|ios). No ad IDs
 * are hardcoded for production; test IDs are used only when test_mode is true or when the
 * native module is unavailable.
 */

// Import with safe fallback when native AdMob module is not available
let mobileAds: any = null;
let BannerAd: any = null;
let BannerAdSize: any = null;
let InterstitialAd: any = null;
let RewardedAd: any = null;
let AdEventType: any = null;
let RewardedAdEventType: any = null;

// Official Google Test IDs from AdMob Documentation
// https://developers.google.com/admob/android/test-ads
const GOOGLE_TEST_IDS = {
  BANNER: 'ca-app-pub-3940256099942544/6300978111',
  INTERSTITIAL: 'ca-app-pub-3940256099942544/1033173712', 
  REWARDED: 'ca-app-pub-3940256099942544/5224354917',
  NATIVE: 'ca-app-pub-3940256099942544/2247696110',
  APP_OPEN: 'ca-app-pub-3940256099942544/5662855259',
};

let admobModuleAvailable = false;

try {
  const admobModule = require('react-native-google-mobile-ads');
  mobileAds = admobModule.default;
  BannerAd = admobModule.BannerAd;
  BannerAdSize = admobModule.BannerAdSize;
  InterstitialAd = admobModule.InterstitialAd;
  RewardedAd = admobModule.RewardedAd;
  AdEventType = admobModule.AdEventType;
  RewardedAdEventType = admobModule.RewardedAdEventType;
  admobModuleAvailable = true;
  // console.log('✅ AdMob module loaded successfully');
} catch (error: any) {
  // AdMob native module not available (e.g. dev without native build)
  // console.warn('Error details:', error.message);
}

export interface AdMobConfig {
  is_enabled: boolean;
  test_mode: boolean;
  show_banner_ads: boolean;
  show_interstitial_ads: boolean;
  show_rewarded_ads: boolean;
  show_native_ads: boolean;
  show_app_open_ads: boolean;
  interstitial_ad_frequency: number;
  rewarded_ad_points_bonus: number;
  max_rewarded_ads_per_day: number;
  // AdMob IDs
  admob_banner_ad_id?: string;
  admob_interstitial_ad_id?: string;
  admob_rewarded_ad_id?: string;
  // Ad Manager ad unit paths (fallback when AdMob fails)
  ad_manager_banner_ad_tag?: string;
  ad_manager_interstitial_ad_tag?: string;
  ad_manager_rewarded_ad_tag?: string;
  // Priority: 'admob' | 'ad_manager' - which to try first per ad type
  banner_priority?: string;
  interstitial_priority?: string;
  rewarded_priority?: string;
  // Legacy (backward compat)
  banner_ad_id?: string;
  banner_ad_tag?: string;
  interstitial_ad_id?: string;
  rewarded_ad_id?: string;
  native_ad_id?: string;
  app_open_ad_id?: string;
}

class AdMobService {
  private config: AdMobConfig | null = null;
  private initialized = false;
  private interstitialAd: any | null = null;
  private interstitialLoaded = false;
  private interstitialTriedFallback = false;
  private rewardedAd: any | null = null;
  private rewardedTriedFallback = false;
  private interstitialAdShownCount = 0;
  private rewardedAdsWatchedToday = 0;
  private lastRewardedAdDate: string | null = null;
  
  /** True when the native AdMob module is not available (e.g. dev without native build). */
  private get isAdMobUnavailable(): boolean {
    return !admobModuleAvailable;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // If AdMob module is not available, skip initialization
      if (!admobModuleAvailable) {
        // AdMob not available (native module not loaded)
        this.initialized = true;
        return;
      }

      // console.log('🚀 Initializing Google Mobile Ads SDK');
      try {
        await mobileAds().initialize();
        // console.log('✅ Google Mobile Ads SDK initialized');
      } catch (e: any) {
        // console.error('❌ mobileAds().initialize() failed:', e?.message || e);
        if (e?.stack) console.error('Stack:', e.stack);
        return;
      }

      await this.fetchConfig();
      this.setupAppStateRefetch();

      if (this.config?.show_interstitial_ads) {
        try {
          this.loadInterstitialAd();
        } catch (e: any) {
          // console.warn('⚠️ Failed to load interstitial ad:', e?.message || e);
        }
      }
      if (this.config?.show_rewarded_ads) {
        try {
          this.loadRewardedAd();
        } catch (e: any) {
          // console.warn('⚠️ Failed to load rewarded ad:', e?.message || e);
        }
      }

      this.initialized = true;
      // console.log('✅ AdMob fully initialized and ready');
    } catch (error: any) {
      // console.error('❌ Failed to initialize AdMob (outer):', error?.message || error);
      if (error?.stack) console.error('Stack:', error.stack);
    }
  }

  private appStateSubscription: { remove: () => void } | null = null;

  setupAppStateRefetch(): void {
    this.appStateSubscription?.remove();
    this.appStateSubscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        this.fetchConfig().then(() => {
          if (this.config?.show_interstitial_ads) this.loadInterstitialAd();
          if (this.config?.show_rewarded_ads) this.loadRewardedAd();
        });
      }
    });
  }

  async fetchConfig(): Promise<void> {
    try {
      const platform = Platform.OS;
      const response = await api.get(`/admob/config?platform=${platform}`);
      // Backend returns { success: true, config: {...} }
      this.config = response.data?.config || null;
      const testMode = this.config?.test_mode ?? true;
      const bannerId = this.config?.banner_ad_id ?? '';
      const usingRealAds = !testMode && !!bannerId && !bannerId.startsWith('ca-app-pub-3940256099942544');
      // console.log('✅ AdMob config fetched from backend');
      console.log(`📺 Ad mode: ${usingRealAds ? 'PRODUCTION (real ads)' : 'TEST (test ads)'} | test_mode=${testMode} | banner_ad_id=${bannerId ? `${bannerId.slice(0, 30)}...` : '(empty)'}`);
      if (__DEV__ && usingRealAds) {
        console.log('📱 Tip: On an emulator/simulator, AdMob often shows test-style ads even with real IDs. Use a real device to see production ads.');
      }
    } catch (error) {
      console.warn('❌ AdMob config fetch failed; ads disabled until config is available.', error);
      // Do NOT fall back to test IDs – disable ads so we never show test ads in production by mistake
      this.config = {
        is_enabled: false,
        test_mode: true,
        show_banner_ads: false,
        show_interstitial_ads: false,
        show_rewarded_ads: false,
        show_native_ads: false,
        show_app_open_ads: false,
        interstitial_ad_frequency: 3,
        rewarded_ad_points_bonus: 50,
        max_rewarded_ads_per_day: 5,
      };
    }
  }

  getConfig(): AdMobConfig | null {
    return this.config;
  }

  isEnabled(): boolean {
    return !this.isAdMobUnavailable && (this.config?.is_enabled || false);
  }

  /** True if the ID is a known Google test ad unit ID. */
  private isTestAdId(id: string | undefined): boolean {
    return !id || id.startsWith('ca-app-pub-3940256099942544');
  }

  // Banner Ad: returns [primaryId, fallbackId | null] based on priority. App tries primary first, falls back on failure.
  getBannerAdIds(): [string, string | null] {
    if (this.isAdMobUnavailable) {
      return [GOOGLE_TEST_IDS.BANNER, null];
    }
    const testMode = this.config?.test_mode === true;
    const admobId = this.config?.admob_banner_ad_id ?? this.config?.banner_ad_id;
    const adManagerTag = this.config?.ad_manager_banner_ad_tag ?? this.config?.banner_ad_tag;
    const priority = this.config?.banner_priority ?? 'admob';

    const admob = (testMode || !admobId || this.isTestAdId(admobId)) ? GOOGLE_TEST_IDS.BANNER : admobId;
    const adManager = adManagerTag?.trim() || null;

    if (priority === 'ad_manager' && adManager) {
      return [adManager, admob];
    }
    return [admob, adManager];
  }

  /** Single ID for backward compat; returns primary. */
  getBannerAdId(): string {
    const [primary] = this.getBannerAdIds();
    return primary;
  }

  shouldShowBannerAd(): boolean {
    const show = !this.isAdMobUnavailable && this.isEnabled() && (this.config?.show_banner_ads || false);
    // console.log(`🎯 shouldShowBannerAd: ${show} ...`);
    return show;
  }

  /** Request options for ad requests (e.g. location from APP_CONFIG.AD_REQUEST_LOCATION). */
  getAdRequestOptions(): { location?: { latitude: number; longitude: number; accuracy?: number } } {
    return APP_CONFIG.AD_REQUEST_LOCATION
      ? { location: APP_CONFIG.AD_REQUEST_LOCATION }
      : {};
  }

  private getInterstitialAdIds(): [string, string | null] {
    if (this.isAdMobUnavailable) return [GOOGLE_TEST_IDS.INTERSTITIAL, null];
    const testMode = this.config?.test_mode === true;
    const admobId = this.config?.admob_interstitial_ad_id ?? this.config?.interstitial_ad_id;
    const adManagerTag = this.config?.ad_manager_interstitial_ad_tag;
    const priority = this.config?.interstitial_priority ?? 'admob';

    const admob = (testMode || !admobId || this.isTestAdId(admobId)) ? GOOGLE_TEST_IDS.INTERSTITIAL : admobId;
    const adManager = adManagerTag?.trim() || null;
    return priority === 'ad_manager' && adManager ? [adManager, admob] : [admob, adManager];
  }

  private getRewardedAdIds(): [string, string | null] {
    if (this.isAdMobUnavailable) return [GOOGLE_TEST_IDS.REWARDED, null];
    const testMode = this.config?.test_mode === true;
    const admobId = this.config?.admob_rewarded_ad_id ?? this.config?.rewarded_ad_id;
    const adManagerTag = this.config?.ad_manager_rewarded_ad_tag;
    const priority = this.config?.rewarded_priority ?? 'admob';

    const admob = (testMode || !admobId || this.isTestAdId(admobId)) ? GOOGLE_TEST_IDS.REWARDED : admobId;
    const adManager = adManagerTag?.trim() || null;
    return priority === 'ad_manager' && adManager ? [adManager, admob] : [admob, adManager];
  }

  loadInterstitialAd(): void {
    if (this.isAdMobUnavailable || !this.config?.show_interstitial_ads) return;
    const [primary, fallback] = this.getInterstitialAdIds();
    const adId = this.interstitialTriedFallback ? (fallback ?? primary) : primary;
    this.interstitialTriedFallback = false;

    this.interstitialAd = InterstitialAd.createForAdRequest(adId, this.getAdRequestOptions());
    this.interstitialLoaded = false;

    this.interstitialAd.addAdEventListener(AdEventType.LOADED, () => {
      this.interstitialLoaded = true;
      console.log('📺 Interstitial ad loaded');
    });

    this.interstitialAd.addAdEventListener(AdEventType.CLOSED, () => {
      this.interstitialLoaded = false;
      this.interstitialTriedFallback = false;
      this.loadInterstitialAd();
    });

    this.interstitialAd.addAdEventListener(AdEventType.ERROR, (error: any) => {
      console.warn('📺 Interstitial error:', error?.message || error);
      this.interstitialLoaded = false;
      if (fallback && !this.interstitialTriedFallback) {
        this.interstitialTriedFallback = true;
        this.loadInterstitialAd();
      } else {
        this.interstitialTriedFallback = false;
        this.loadInterstitialAd();
      }
    });

    this.interstitialAd.load();
  }

  async showInterstitialAd(): Promise<boolean> {
    if (this.isAdMobUnavailable) {
      return false;
    }

    if (!this.config?.show_interstitial_ads || !this.interstitialAd) {
      return false;
    }

    if (!this.interstitialLoaded) {
      this.loadInterstitialAd();
      return false;
    }

    const frequency = this.config?.interstitial_ad_frequency || 3;
    this.interstitialAdShownCount++;
    
    if (this.interstitialAdShownCount % frequency !== 0) {
      return false;
    }

    try {
      // console.log('🎬 Showing interstitial ad...');
      await this.interstitialAd.show();
      this.interstitialLoaded = false; // will reload on CLOSED
      return true;
    } catch (error) {
      // console.error('❌ Failed to show interstitial ad:', error);
      this.interstitialLoaded = false;
      this.loadInterstitialAd();
      return false;
    }
  }

  loadRewardedAd(): void {
    if (this.isAdMobUnavailable || !this.config?.show_rewarded_ads) return;
    const [primary, fallback] = this.getRewardedAdIds();
    const adId = this.rewardedTriedFallback ? (fallback ?? primary) : primary;
    this.rewardedTriedFallback = false;

    this.rewardedAd = RewardedAd.createForAdRequest(adId, this.getAdRequestOptions());

    this.rewardedAd.addAdEventListener(RewardedAdEventType.LOADED, () => {
      console.log('📺 Rewarded ad loaded');
    });

    this.rewardedAd.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {});

    this.rewardedAd.addAdEventListener(AdEventType.CLOSED, () => {
      this.rewardedTriedFallback = false;
      this.loadRewardedAd();
    });

    this.rewardedAd.addAdEventListener(AdEventType.ERROR, (error: any) => {
      console.warn('📺 Rewarded error:', error?.message || error);
      if (fallback && !this.rewardedTriedFallback) {
        this.rewardedTriedFallback = true;
        this.loadRewardedAd();
      } else {
        this.rewardedTriedFallback = false;
        this.loadRewardedAd();
      }
    });

    this.rewardedAd.load();
  }

  async showRewardedAd(onRewarded: () => void): Promise<boolean> {
    // Fallback when native AdMob is unavailable: simulate rewarded flow for dev
    if (this.isAdMobUnavailable) {
      if (!this.config?.show_rewarded_ads) {
        return false;
      }

      const today = new Date().toDateString();
      if (this.lastRewardedAdDate !== today) {
        this.rewardedAdsWatchedToday = 0;
        this.lastRewardedAdDate = today;
      }

      const maxAdsPerDay = this.config?.max_rewarded_ads_per_day || 5;
      if (this.rewardedAdsWatchedToday >= maxAdsPerDay) {
        return false;
      }

      try {
        // Simulating rewarded ad (3s delay) when native module unavailable
        // Simulate an ad playback delay
        await new Promise<void>((resolve) => setTimeout(resolve, 3000));

        this.rewardedAdsWatchedToday++;

        try {
          // Try to get user ID from profile store first
          let userId = useUserStore.getState().profile?.id;
          if (!userId) {
            try {
              const profileRes = await getProfile();
              userId = profileRes?.user?.id;
            } catch (e) {
              // ignore
            }
          }
          if (userId) {
            await api.post('/admob/rewarded-ad-completed', { user_id: userId });
          }
        } catch (error) {
          // ignore
        }

        onRewarded();
        return true;
      } catch (error) {
        return false;
      }
    }

    if (!this.config?.show_rewarded_ads) {
      return false;
    }

    if (!this.rewardedAd) {
      return false;
    }

    // Check daily limit
    const today = new Date().toDateString();
    if (this.lastRewardedAdDate !== today) {
      this.rewardedAdsWatchedToday = 0;
      this.lastRewardedAdDate = today;
    }

    const maxAdsPerDay = this.config?.max_rewarded_ads_per_day || 5;
    if (this.rewardedAdsWatchedToday >= maxAdsPerDay) {
      return false;
    }

    try {
      // Show the rewarded ad
      await this.rewardedAd.show();
      
      // If show() completes without error, user watched the ad
      this.rewardedAdsWatchedToday++;
      
      // Notify backend and trigger callback + refresh profile
      try {
        // Try to get user ID from profile store first, then fetch if missing
        let userId = useUserStore.getState().profile?.id;
        if (!userId) {
          try {
            const profileRes = await getProfile();
            userId = profileRes?.user?.id;
          } catch (e) {
            // ignore
          }
        }
        if (userId) {
          await api.post('/admob/rewarded-ad-completed', { user_id: userId });
          try {
            const profileRes = await getProfile();
            const setProfile = useUserStore.getState().setProfile;
            setProfile(profileRes?.user ? profileRes?.user : profileRes);
          } catch (e) {
            // ignore
          }
          onRewarded();
        }
      } catch (error) {
        // ignore backend notify
      }
      
      return true;
    } catch (error) {
      // console.error('Failed to show rewarded ad:', error);
      return false;
    }
  }

  getRemainingRewardedAds(): number {
    const today = new Date().toDateString();
    if (this.lastRewardedAdDate !== today) {
      return this.config?.max_rewarded_ads_per_day || 5;
    }
    const maxAdsPerDay = this.config?.max_rewarded_ads_per_day || 5;
    return Math.max(0, maxAdsPerDay - this.rewardedAdsWatchedToday);
  }

  getRewardedAdBonus(): number {
    return this.config?.rewarded_ad_points_bonus || 50;
  }
}

export const admobService = new AdMobService();
