import { api, getProfile } from './api';
import { useUserStore } from '../stores/userStore';
import { Platform } from 'react-native';

// Import with safe fallback for Expo Go (will show warning but not crash)
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
const FORCE_TEST_MODE = false; // Use backend test_mode instead; fallback to test IDs only when flagged or missing

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
  console.log('✅ AdMob module loaded successfully');
} catch (error: any) {
  console.warn('⚠️ AdMob module not available (expected in Expo Go - use expo-dev-client for testing)');
  console.warn('Error details:', error.message);
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
  // Platform specific ad unit IDs
  banner_ad_id?: string;
  banner_ad_tag?: string; // Google Ad Manager tag (e.g., /23329430372/banne)
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
  private rewardedAd: any | null = null;
  private interstitialAdShownCount = 0;
  private rewardedAdsWatchedToday = 0;
  private lastRewardedAdDate: string | null = null;
  
  // Check if AdMob module is available (not Expo Go)
  private get isExpoGo(): boolean {
    return !admobModuleAvailable;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // If AdMob module is not available, skip initialization
      if (!admobModuleAvailable) {
        console.warn('⚠️ AdMob not available (running in Expo Go or dev client without native module)');
        this.initialized = true;
        return;
      }

      console.log('🚀 Initializing Google Mobile Ads SDK');
      // Initialize Google Mobile Ads SDK (guard errors to avoid crashing init)
      try {
        await mobileAds().initialize();
        console.log('✅ Google Mobile Ads SDK initialized');
      } catch (e: any) {
        console.error('❌ mobileAds().initialize() failed:', e?.message || e);
        if (e?.stack) console.error('Stack:', e.stack);
        return;
      }

      // Fetch config from backend (uses internal fallback on error)
      await this.fetchConfig();
      console.log(`📋 AdMob Config: enabled=${this.config?.is_enabled}, banners=${this.config?.show_banner_ads}, interstitials=${this.config?.show_interstitial_ads}, rewarded=${this.config?.show_rewarded_ads}`);

      // Pre-load ads if enabled (guard each to prevent init failure)
      if (this.config?.show_interstitial_ads) {
        try {
          this.loadInterstitialAd();
        } catch (e: any) {
          console.warn('⚠️ Failed to load interstitial ad:', e?.message || e);
        }
      }
      if (this.config?.show_rewarded_ads) {
        try {
          this.loadRewardedAd();
        } catch (e: any) {
          console.warn('⚠️ Failed to load rewarded ad:', e?.message || e);
        }
      }

      this.initialized = true;
      console.log('✅ AdMob fully initialized and ready');
    } catch (error: any) {
      console.error('❌ Failed to initialize AdMob (outer):', error?.message || error);
      if (error?.stack) console.error('Stack:', error.stack);
    }
  }

  async fetchConfig(): Promise<void> {
    try {
      const platform = Platform.OS;
      const response = await api.get(`/admob/config?platform=${platform}`);
      // Backend returns { success: true, config: {...} }
      this.config = response.data?.config || null;
      console.log('✅ AdMob config fetched from backend:', this.config);
      console.log('📍 Banner Ad Tag:', this.config?.banner_ad_tag || 'Not set');
    } catch (error) {
      console.error('❌ Failed to fetch AdMob config, using fallback defaults:', error);
      // Use default config with test IDs as fallback
      this.config = {
        is_enabled: true,
        test_mode: true,
        show_banner_ads: true,
        show_interstitial_ads: true,
        show_rewarded_ads: true,
        show_native_ads: false,
        show_app_open_ads: false,
        interstitial_ad_frequency: 3,
        rewarded_ad_points_bonus: 50,
        max_rewarded_ads_per_day: 5,
        // Fallback to test IDs
        banner_ad_id: GOOGLE_TEST_IDS.BANNER,
        banner_ad_tag: '/23329430372/banne', // Your Ad Manager tag as fallback
        interstitial_ad_id: GOOGLE_TEST_IDS.INTERSTITIAL,
        rewarded_ad_id: GOOGLE_TEST_IDS.REWARDED,
        native_ad_id: GOOGLE_TEST_IDS.NATIVE,
        app_open_ad_id: GOOGLE_TEST_IDS.APP_OPEN,
      };
    }
  }

  getConfig(): AdMobConfig | null {
    return this.config;
  }

  isEnabled(): boolean {
    return !this.isExpoGo && (this.config?.is_enabled || false);
  }

  // Banner Ad Methods
  getBannerAdId(): string {
    // Force test banner for testing
    console.log('🧪 Using Google test banner ID for testing');
    return GOOGLE_TEST_IDS.BANNER;
    
    /* Original logic - commented for testing
    // Priority: Ad Manager tag > Config ID > Test ID
    const adTag = this.config?.banner_ad_tag;
    const fromConfig = this.config?.banner_ad_id;
    const test = this.config?.test_mode || FORCE_TEST_MODE;

    if (this.isExpoGo) {
      console.log('📱 Expo Go detected - returning test banner ID');
      return GOOGLE_TEST_IDS.BANNER;
    }

    // Use Ad Manager tag if available
    if (adTag) {
      console.log('🎯 Using Ad Manager banner tag:', adTag);
      return adTag;
    }

    if (test || !fromConfig) {
      console.log('🧪 Test mode or missing ID - using Google test banner ID');
      return GOOGLE_TEST_IDS.BANNER;
    }

    console.log('📺 Using AdMob banner ID:', fromConfig);
    return fromConfig;
    */
  }

  shouldShowBannerAd(): boolean {
    const show = !this.isExpoGo && this.isEnabled() && (this.config?.show_banner_ads || false);
    console.log(`🎯 shouldShowBannerAd: ${show} (isExpoGo: ${this.isExpoGo}, isEnabled: ${this.isEnabled()}, showBanners: ${this.config?.show_banner_ads})`);
    return show;
  }

  // Interstitial Ad Methods
  loadInterstitialAd(): void {
    if (this.isExpoGo || !this.config?.show_interstitial_ads) {
      console.log('⏭️ Interstitial loading skipped - ExpoGo or disabled');
      return;
    }

    const fromConfig = this.config?.interstitial_ad_id;
    const test = this.config?.test_mode || FORCE_TEST_MODE;

    const adId = test || !fromConfig
      ? GOOGLE_TEST_IDS.INTERSTITIAL 
      : fromConfig;

    console.log(`⏭️ Loading interstitial ad with ID: ${adId}`);

    this.interstitialAd = InterstitialAd.createForAdRequest(adId);
    this.interstitialLoaded = false;
    
    this.interstitialAd.addAdEventListener(AdEventType.LOADED, () => {
      this.interstitialLoaded = true;
      console.log('✅ Interstitial ad loaded');
    });

    this.interstitialAd.addAdEventListener(AdEventType.CLOSED, () => {
      console.log('❌ Interstitial ad closed');
      this.interstitialLoaded = false;
      // Reload next ad
      this.loadInterstitialAd();
    });

    this.interstitialAd.addAdEventListener(AdEventType.ERROR, (error: any) => {
      console.warn('⚠️ Interstitial error, reloading:', error?.message || error);
      this.interstitialLoaded = false;
      this.loadInterstitialAd();
    });

    this.interstitialAd.load();
  }

  async showInterstitialAd(): Promise<boolean> {
    if (this.isExpoGo) {
      console.log('📱 Expo Go - skipping interstitial');
      return false;
    }
    
    if (!this.config?.show_interstitial_ads || !this.interstitialAd) {
      console.log(`⏭️ Interstitial show skipped - enabled: ${this.config?.show_interstitial_ads}, instance: ${!!this.interstitialAd}`);
      return false;
    }

    if (!this.interstitialLoaded) {
      console.log('⏭️ Interstitial not loaded yet, reloading...');
      this.loadInterstitialAd();
      return false;
    }

    // Check frequency
    const frequency = this.config?.interstitial_ad_frequency || 3;
    this.interstitialAdShownCount++;
    
    if (this.interstitialAdShownCount % frequency !== 0) {
      console.log(`⏭️ Interstitial show skipped - frequency check (${this.interstitialAdShownCount} % ${frequency})`);
      return false;
    }

    try {
      console.log('🎬 Showing interstitial ad...');
      await this.interstitialAd.show();
      this.interstitialLoaded = false; // will reload on CLOSED
      return true;
    } catch (error) {
      console.error('❌ Failed to show interstitial ad:', error);
      this.interstitialLoaded = false;
      this.loadInterstitialAd();
      return false;
    }
  }

  // Rewarded Ad Methods
  loadRewardedAd(): void {
    if (this.isExpoGo || !this.config?.show_rewarded_ads) {
      console.log('🎁 Rewarded loading skipped - ExpoGo or disabled');
      return;
    }

    const fromConfig = this.config?.rewarded_ad_id;
    const test = this.config?.test_mode || FORCE_TEST_MODE;

    const adId = test || !fromConfig
      ? GOOGLE_TEST_IDS.REWARDED 
      : fromConfig;

    console.log(`🎁 Loading rewarded ad with ID: ${adId}`);

    this.rewardedAd = RewardedAd.createForAdRequest(adId);
    
    // Rewarded ad-specific events
    this.rewardedAd.addAdEventListener(RewardedAdEventType.LOADED, () => {
      console.log('✅ Rewarded ad loaded');
    });

    this.rewardedAd.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
      console.log('🏅 User earned reward from rewarded ad');
    });

    // Common ad events
    this.rewardedAd.addAdEventListener(AdEventType.CLOSED, () => {
      console.log('❌ Rewarded ad closed');
      // Reload next ad
      this.loadRewardedAd();
    });

    this.rewardedAd.load();
  }

  async showRewardedAd(onRewarded: () => void): Promise<boolean> {
    // Expo Go fallback: simulate rewarded ad with test flow
    if (this.isExpoGo) {
      console.log('📱 Expo Go - simulating rewarded ad');
      if (!this.config?.show_rewarded_ads) {
        console.log('🎁 Rewarded ads disabled');
        return false;
      }

      const today = new Date().toDateString();
      if (this.lastRewardedAdDate !== today) {
        this.rewardedAdsWatchedToday = 0;
        this.lastRewardedAdDate = today;
      }

      const maxAdsPerDay = this.config?.max_rewarded_ads_per_day || 5;
      if (this.rewardedAdsWatchedToday >= maxAdsPerDay) {
        console.log('🎁 Daily rewarded ad limit reached (Expo Go)');
        return false;
      }

      try {
        console.warn('⏳ Simulating rewarded ad in Expo Go (3s delay)');
        // Simulate an ad playback delay
        await new Promise<void>((resolve) => setTimeout(resolve, 3000));

        this.rewardedAdsWatchedToday++;

        try {
          // Try to get user ID from profile store first
          let userId = useUserStore.getState().profile?.id;
          if (!userId) {
            console.warn('⚠️ Profile ID not in store (Expo Go), fetching profile...');
            try {
              const profileRes = await getProfile();
              userId = profileRes?.user?.id;
            } catch (e) {
              console.warn('⚠️ Failed to fetch profile for user ID (Expo Go):', (e as any)?.message || e);
            }
          }
          if (userId) {
            await api.post('/admob/rewarded-ad-completed', { user_id: userId });
          } else {
            console.warn('⚠️ No user ID available; skipping rewarded completion notify (Expo Go)');
          }
        } catch (error) {
          console.error('Failed to notify backend about rewarded ad (Expo Go):', error);
        }

        onRewarded();
        return true;
      } catch (error) {
        console.error('Failed to simulate rewarded ad (Expo Go):', error);
        return false;
      }
    }

    if (!this.config?.show_rewarded_ads) {
      console.log('🎁 Rewarded ads disabled');
      return false;
    }

    if (!this.rewardedAd) {
      console.log('🎁 Rewarded ad not loaded yet');
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
      console.log('🎁 Daily rewarded ad limit reached');
      return false;
    }

    try {
      console.log('🎬 Showing rewarded ad...');
      // Show the rewarded ad
      await this.rewardedAd.show();
      
      // If show() completes without error, user watched the ad
      this.rewardedAdsWatchedToday++;
      
      // Notify backend and trigger callback + refresh profile
      try {
        // Try to get user ID from profile store first, then fetch if missing
        let userId = useUserStore.getState().profile?.id;
        if (!userId) {
          console.warn('⚠️ Profile ID not in store, fetching profile...');
          try {
            const profileRes = await getProfile();
            userId = profileRes?.user?.id;
          } catch (e) {
            console.warn('⚠️ Failed to fetch profile for user ID:', (e as any)?.message || e);
          }
        }
        if (userId) {
          await api.post('/admob/rewarded-ad-completed', { user_id: userId });
          // Refresh user profile so points reflect immediately across app
          try {
            const profileRes = await getProfile();
            const setProfile = useUserStore.getState().setProfile;
            setProfile(profileRes?.user ? profileRes?.user : profileRes);
          } catch (e) {
            console.warn('⚠️ Failed to refresh profile after reward:', (e as any)?.message || e);
          }
          onRewarded();
        } else {
          console.warn('⚠️ No user ID available; skipping rewarded completion notify');
        }
      } catch (error) {
        console.error('Failed to notify backend about rewarded ad:', error);
      }
      
      return true;
    } catch (error) {
      console.error('Failed to show rewarded ad:', error);
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
