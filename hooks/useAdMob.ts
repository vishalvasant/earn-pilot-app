import { useState, useEffect, useCallback } from 'react';
import { AppState } from 'react-native';
import { admobService, AdMobConfig } from '../services/admob';

export function useAdMob() {
  const [config, setConfig] = useState<AdMobConfig | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [shouldShowBanner, setShouldShowBanner] = useState(false);

  useEffect(() => {
    initializeAdMob();
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        const latest = admobService.getConfig();
        setConfig(latest);
        setShouldShowBanner(admobService.shouldShowBannerAd());
      }
    });
    return () => sub.remove();
  }, []);

  // Update banner visibility when config changes
  useEffect(() => {
    if (initialized && config) {
      const show = admobService.shouldShowBannerAd();
      // console.log(`📱 useAdMob: shouldShowBanner updated to ${show}`);
      setShouldShowBanner(show);
    }
  }, [initialized, config]);

  const initializeAdMob = async () => {
    try {
      // console.log('🚀 useAdMob: Initializing...');
      await admobService.initialize();
      const fetchedConfig = admobService.getConfig();
      // console.log('📋 useAdMob: Config fetched:', fetchedConfig);
      setConfig(fetchedConfig);
      
      // Set banner visibility after config is loaded
      const show = admobService.shouldShowBannerAd();
      // console.log(`📱 useAdMob: shouldShowBanner set to ${show}`);
      setShouldShowBanner(show);
      
      setInitialized(true);
    } catch (error) {
      // console.error('Failed to initialize AdMob:', error);
    }
  };

  const showInterstitial = useCallback(async (): Promise<boolean> => {
    return await admobService.showInterstitialAd();
  }, []);

  const showRewarded = useCallback(async (onRewarded: () => void): Promise<boolean> => {
    return await admobService.showRewardedAd(onRewarded);
  }, []);

  const getRemainingRewardedAds = useCallback((): number => {
    return admobService.getRemainingRewardedAds();
  }, []);

  const getRewardedAdBonus = useCallback((): number => {
    return admobService.getRewardedAdBonus();
  }, []);

  const getBannerAdId = useCallback(() => {
    return admobService.getBannerAdId();
  }, []);

  const getAdRequestOptions = useCallback(() => {
    return admobService.getAdRequestOptions();
  }, []);

  return {
    config,
    initialized,
    showInterstitial,
    showRewarded,
    getRemainingRewardedAds,
    getRewardedAdBonus,
    shouldShowBanner,
    getBannerAdId,
    getAdRequestOptions,
  };
}
