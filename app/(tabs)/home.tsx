import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { 
  SafeAreaView, 
  Text, 
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Dimensions,
  Animated,
  Modal,
  Image,
  Alert
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../hooks/useTheme';
import { api, getAssetBaseUrl } from '../../services/api';
import { useUserStore } from '../../stores/userStore';
import { useGameStore } from '../../hooks/useGameStore';
import { useGameCooldowns } from '../../hooks/useGameCooldowns';
import { useDataStore } from '../../stores/dataStore';
import { typography, spacing, borderRadius, themeColors } from '../../hooks/useThemeColors';
import Icon from '../../components/Icon';
import { useAdMob } from '../../hooks/useAdMob';
import { getDashboardDetails } from '../../services/dashboard';
import { getHeroSlides, HeroSlide } from '../../services/heroSlides';
import ColorMatchGame from '../../components/games/ColorMatchGame';
import ImageSimilarityGame from '../../components/games/ImageSimilarityGame';
import MathQuizGame from '../../components/games/MathQuizGame';
import MemoryPatternGame from '../../components/games/MemoryPatternGame';
import ThemedPopup from '../../components/ThemedPopup';
import { useAuthStore } from '../../stores/authStore';
import { getFCMToken, registerDeviceToken, setupMessageHandlers } from '../../services/fcm';
import FixedBannerAd from '../../components/FixedBannerAd';
import Skeleton from '../../components/Skeleton';
import { UnityLauncherService } from '../../services/unityLauncher';
import { APP_CONFIG } from '../../config/app';
import { Linking } from 'react-native';

/** Cut the Rope: use config URL (local or production) so one place controls it */
const CUT_THE_ROPE_URL = APP_CONFIG.HTML5_GAME_CUT_THE_ROPE_URL;

const { height: screenHeight, width: screenWidth } = Dimensions.get('window');

// Get dynamic greeting based on time of day
const getGreeting = () => {
  const hour = new Date().getHours();
  
  if (hour >= 5 && hour < 12) {
    return 'Good Morning';
  } else if (hour >= 12 && hour < 17) {
    return 'Good Afternoon';
  } else {
    return 'Good Evening';
  }
};

export default function HomeScreen() {
  const navigation = useNavigation();
  const theme = useTheme();
  const { shouldShowBanner, getBannerAdId, getBannerAdIds, getAdRequestOptions, showInterstitial, shouldShowHomeBanner, getHomeBannerAdIds, getHomeBannerSize } = useAdMob();
  const token = useAuthStore(state => state.token);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const [refreshing, setRefreshing] = useState(false);
  const [activeGame, setActiveGame] = useState<'color-match' | 'image-similarity' | 'math-quiz' | 'memory-pattern' | null>(null);
  const [showCooldownPopup, setShowCooldownPopup] = useState(false);
  const [inlineBannerFailed, setInlineBannerFailed] = useState(false);
  const [homeBannerFailed, setHomeBannerFailed] = useState(false);
  const [cooldownMessage, setCooldownMessage] = useState('');
  const [popupTitle, setPopupTitle] = useState('Game Complete');
  const isInitializingCooldowns = useRef(false);
  
  const stats = useGameStore(state => state.stats);
  const loadStats = useGameStore(state => state.loadStats);
  const profile = useUserStore(state => state.profile);
  const setProfile = useUserStore(state => state.setProfile);
  const gameConfigs = useGameStore(state => state.gameConfigs);
  const loadGameConfigs = useGameStore(state => state.loadGameConfigs);
  const getGameConfig = useGameStore(state => state.getGameConfig);
  const addPoints = useGameStore(state => state.addPoints);
  const { checkGameCooldown, setCooldown, getCooldown, removeCooldown } = useGameCooldowns();
  
  // Debug game configs (only log when configs actually change, not on every render)
  useEffect(() => {
    if (gameConfigs.length > 0) {
      // console.log('🎮 Game Configs Loaded:', gameConfigs.length);
    }
  }, [gameConfigs.length]);
  
  const [dashboard, setDashboard] = useState<any>(null);
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [greeting, setGreeting] = useState(getGreeting());
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>([]);
  const [heroSlidesLoading, setHeroSlidesLoading] = useState(true);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [heroImageLoaded, setHeroImageLoaded] = useState<Record<number, boolean>>({});
  const slideScrollRef = useRef<ScrollView>(null);
  const isFirstFocusRef = useRef(true);

  // Add-On games (Unity) from backend – package_name and store_url come from admin API
  type AddOnGame = {
    id: number;
    name: string;
    package_name?: string | null;
    slug: string;
    store_url?: string | null;
    description?: string | null;
    category?: string | null;
    icon_url?: string | null;
    image_url?: string | null;
    points_per_completion?: number;
    points_interval_levels?: number;
    daily_play_limit?: number;
    play_cooldown_seconds?: number;
    energy_reward?: number;
  };

  const [addOnGames, setAddOnGames] = useState<AddOnGame[]>([]);
  const [selectedAddOnGame, setSelectedAddOnGame] = useState<AddOnGame | null>(null);
  const [showAddOnModal, setShowAddOnModal] = useState(false);
  const [addOnGameInstalled, setAddOnGameInstalled] = useState<boolean | null>(null);
  /** Per add-on game: is the app installed? (game.id -> true/false/null). Used for card label Play vs Download. */
  const [addOnGameInstalledMap, setAddOnGameInstalledMap] = useState<Record<number, boolean | null>>({});
  /** Incremented when home tab gains focus so we re-check installed state (e.g. after user installs from store). */
  const [addOnGamesRefreshKey, setAddOnGamesRefreshKey] = useState(0);
  
  // Use centralized data store
  const { 
    featuredTasks, 
    quizzes: quizCategories, 
    fetchAllInitialData 
  } = useDataStore();

  // Refresh dashboard (points, energy) and profile when screen gains focus (tab switch/return).
  // Skip on first focus to avoid duplicate API calls with the initialization useEffect below.
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocusRef.current) {
        isFirstFocusRef.current = false;
        return;
      }
      let cancelled = false;
      const refresh = async () => {
        try {
          const data = await getDashboardDetails();
          if (!cancelled) setDashboard(data?.data ?? data ?? null);
          const dataStore = useDataStore.getState();
          await dataStore.fetchProfile(true);
          if (!cancelled && dataStore.profile) setProfile(dataStore.profile);
          if (!cancelled) setAddOnGamesRefreshKey((k) => k + 1);
        } catch (e) {
          if (!cancelled) console.warn('Focus refresh failed:', e);
        }
      };
      refresh();
      return () => { cancelled = true; };
    }, [setProfile])
  );

  // Single initialization effect – progressive load: show UI as soon as critical data is ready
  useEffect(() => {
    const CRITICAL_MS = 4000; // Max wait for critical path; then show UI anyway

    const initialize = async () => {
      try {
        // Defer FCM so it does not block first paint
        setTimeout(() => {
          getFCMToken()
            .then(async (fcmToken) => {
              if (fcmToken) {
                const authToken = useAuthStore.getState().token;
                if (authToken) await registerDeviceToken(authToken, fcmToken);
              }
            })
            .catch((err) => console.warn('FCM token error (enable notifications in app Settings):', err));
          setupMessageHandlers();
        }, 500);

        // Start all fetches in parallel (no await yet)
        const dashboardPromise = getDashboardDetails()
          .then((data) => setDashboard(data?.data ?? data ?? null))
          .catch((err) => {
            console.warn('Dashboard fetch error:', err);
            setDashboard(null);
          });

        const gameConfigsPromise = loadGameConfigs().catch((err) =>
          console.warn('Games configs fetch error:', err)
        );

        loadStats().catch((err) => console.warn('Stats load error:', err));

        fetchAllInitialData()
          .then(() => {
            const dataStoreProfile = useDataStore.getState().profile;
            if (dataStoreProfile?.id) setProfile(dataStoreProfile);
          })
          .catch((err) => console.warn('Initial data fetch error:', err));

        getHeroSlides()
          .then((slides) => {
            setHeroSlides(slides);
            setHeroSlidesLoading(false);
            setHeroImageLoaded({});
          })
          .catch((err) => {
            console.warn('Hero slides fetch error:', err);
            setHeroSlides([]);
            setHeroSlidesLoading(false);
            setHeroImageLoaded({});
          });

        // Show home UI as soon as critical data (dashboard + game configs) is ready, or after timeout
        const criticalPromise = Promise.all([dashboardPromise, gameConfigsPromise]);
        const timeoutPromise = new Promise<void>((resolve) => setTimeout(resolve, CRITICAL_MS));
        await Promise.race([criticalPromise, timeoutPromise]);
      } catch (e) {
        // ignore
      } finally {
        setLoadingDashboard(false);
      }
    };

    initialize();
    
    const greetingInterval = setInterval(() => {
      setGreeting(getGreeting());
    }, 60000);
    
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
    
    return () => clearInterval(greetingInterval);
  }, []);

  const refreshDashboard = useCallback(async () => {
    try {
      const data = await getDashboardDetails();
      setDashboard(data?.data ?? data ?? null);
    } catch (error) {
      console.error('Failed to refresh dashboard:', error);
    }
  }, []);

  // When add-on games list is set, check installed state for each (for card label: Play vs Download)
  useEffect(() => {
    if (addOnGames.length === 0) {
      setAddOnGameInstalledMap({});
      return;
    }
    // Set initial map in one update: no package_name => show Play (can't check), else null (checking)
    const initialMap: Record<number, boolean | null> = {};
    addOnGames.forEach((game) => {
      const pkg = game.package_name?.trim();
      initialMap[game.id] = !pkg ? true : null;
    });
    setAddOnGameInstalledMap(initialMap);

    // Then check each game that has a package_name
    addOnGames.forEach((game) => {
      const pkg = game.package_name?.trim();
      if (!pkg) return;
      UnityLauncherService.isAppInstalledByPackage(pkg)
        .then((installed) => {
          setAddOnGameInstalledMap((prev) => ({ ...prev, [game.id]: installed }));
        })
        .catch(() => {
          setAddOnGameInstalledMap((prev) => ({ ...prev, [game.id]: false }));
        });
    });
  }, [addOnGamesRefreshKey, addOnGames.length, addOnGames.map((g) => `${g.id}:${g.package_name || ''}`).join(',')]);

  // When add-on game modal opens, use card map if known else check if that game's app is installed
  useEffect(() => {
    if (!selectedAddOnGame) {
      setAddOnGameInstalled(null);
      return;
    }
    const pkg = selectedAddOnGame.package_name?.trim();
    if (!pkg) {
      setAddOnGameInstalled(true);
      return;
    }
    const fromMap = addOnGameInstalledMap[selectedAddOnGame.id];
    if (fromMap !== undefined && fromMap !== null) {
      setAddOnGameInstalled(fromMap);
    } else {
      setAddOnGameInstalled(null);
    }
    UnityLauncherService.isAppInstalledByPackage(pkg)
      .then((installed) => {
        setAddOnGameInstalled(installed);
        setAddOnGameInstalledMap((prev) => ({ ...prev, [selectedAddOnGame.id]: installed }));
      })
      .catch(() => {
        setAddOnGameInstalled(false);
        setAddOnGameInstalledMap((prev) => ({ ...prev, [selectedAddOnGame.id]: false }));
      });
  }, [selectedAddOnGame?.id, selectedAddOnGame?.package_name]);

  // Initialize cooldowns
  useEffect(() => {
    const initializeCooldowns = async () => {
      if (gameConfigs.length > 0 && profile?.id && !isInitializingCooldowns.current) {
        isInitializingCooldowns.current = true;
        try {
          for (const game of gameConfigs) {
            try {
              const remainingSeconds = await checkGameCooldown(game.id, game.slug);
              if (remainingSeconds > 0) {
                setCooldown(game.id, game.slug, remainingSeconds);
              } else {
                removeCooldown(game.slug);
              }
            } catch (error) {
              console.warn('Failed to check cooldown for game:', game.slug, error);
            }
          }
        } finally {
          isInitializingCooldowns.current = false;
        }
      } else if (!profile?.id && gameConfigs.length > 0) {
        gameConfigs.forEach(game => {
          removeCooldown(game.slug);
        });
      }
    };

    initializeCooldowns();
  }, [gameConfigs.length, profile?.id, checkGameCooldown, setCooldown, removeCooldown]);

  const getGameIdBySlug = useCallback(async (gameType: string): Promise<number | null> => {
    try {
      const gameConfig = getGameConfig(gameType);
      return gameConfig ? gameConfig.id : null;
    } catch (error) {
      console.error('Error getting game ID:', error);
      return null;
    }
  }, [getGameConfig]);

  const handleGameStart = useCallback(async (gameType: 'color-match' | 'image-similarity' | 'math-quiz' | 'memory-pattern') => {
    try {
      // Ensure we have a user profile - ALWAYS check dataStore first (it has the cache)
      const dataStore = useDataStore.getState();
      let currentProfile = dataStore.profile;
      
      // If dataStore doesn't have profile, fetch it (fetchProfile handles caching internally)
      if (!currentProfile?.id) {
        // fetchProfile() will check cache and return early if cache is valid
        // So we call it and then check the store again
        await dataStore.fetchProfile();
        currentProfile = useDataStore.getState().profile;
        
        if (!currentProfile?.id) {
          setPopupTitle('❌ Error');
          setCooldownMessage('User not authenticated. Please log in again.');
          setShowCooldownPopup(true);
          return;
        }
      }
      
      // Sync to userStore if needed (for backward compatibility)
      if (!profile?.id || profile.id !== currentProfile.id) {
        setProfile(currentProfile);
      }
      
      // Use currentProfile for the rest of the function
      const userId = currentProfile.id;

      // Check local cooldown first
      const cooldown = getCooldown(gameType);
      if (cooldown && cooldown.remainingSeconds > 0) {
        const remainingMinutes = Math.ceil(cooldown.remainingSeconds / 60);
        setPopupTitle('⏰ Game in Cooldown');
        setCooldownMessage(`Please wait ${remainingMinutes} more minute${remainingMinutes !== 1 ? 's' : ''} before playing this game again.`);
        setShowCooldownPopup(true);
        return;
      }

      // Get gameId
      const gameId = await getGameIdBySlug(gameType);
      if (!gameId) {
        setPopupTitle('❌ Error');
        setCooldownMessage('Game configuration not found.');
        setShowCooldownPopup(true);
        return;
      }

      // Backend validation: can-play
      try {
        await api.post(`/games/${gameId}/can-play`, { user_id: userId });
      } catch (err: any) {
        const msg = err?.response?.data?.message || 'You cannot play this game right now.';
        setPopupTitle('⏳ Please Wait');
        setCooldownMessage(msg);
        setShowCooldownPopup(true);
        return;
      }

      // Start session
      try {
        await api.post(`/games/${gameId}/start`, { user_id: userId });
      } catch (err: any) {
        const msg = err?.response?.data?.message || 'Failed to start game session.';
        setPopupTitle('❌ Error');
        setCooldownMessage(msg);
        setShowCooldownPopup(true);
        return;
      }

      // Ready to play
      setActiveGame(gameType);
    } catch (error) {
      console.error('Failed to start game:', error);
      setPopupTitle('❌ Error');
      setCooldownMessage('Could not start the game. Please try again.');
      setShowCooldownPopup(true);
    }
  }, [getCooldown, profile?.id, setProfile, getGameIdBySlug]);

  const refreshUserProfile = useCallback(async () => {
    try {
      // Use dataStore to fetch profile (with caching)
      await useDataStore.getState().fetchProfile(true); // Force refresh
      const refreshedProfile = useDataStore.getState().profile;
      if (refreshedProfile) {
        setProfile(refreshedProfile);
      }
    } catch (error) {
      console.error('Failed to refresh user profile:', error);
    }
  }, [setProfile]);

  const handleGameEnd = async (points: number) => {
    if (activeGame) {
      try {
        const gameId = await getGameIdBySlug(activeGame);
        if (!gameId) {
          console.error('Game not found:', activeGame);
          setActiveGame(null);
          return;
        }

        if (!profile?.id) {
          console.error('User not authenticated');
          setPopupTitle('❌ Error');
          setCooldownMessage('User not authenticated. Please log in again.');
          setShowCooldownPopup(true);
          setActiveGame(null);
          return;
        }

        const response = await api.post(`/games/${gameId}/complete`, {
          score: points, // Game score for tracking
        });

        // Get actual reward points from backend response (not game score)
        const actualPointsEarned = response.data.points_earned || 0;
        const energyEarned = response.data.energy_earned || 0;

        // Show interstitial ad after game completion
        try {
          await showInterstitial();
        } catch (adError) {
          // console.log('Ad not shown:', adError);
        }

        // Only track game stats locally, points are handled by backend
        addPoints(points, activeGame);
        setPopupTitle('🎉 Game Complete');
        setCooldownMessage(`Great job! You earned ${actualPointsEarned} reward points and ${energyEarned} energy!`);
        setShowCooldownPopup(true);

        await refreshUserProfile();
        await refreshDashboard();
      } catch (error) {
        console.error('Failed to save game result:', error);
        setPopupTitle('❌ Error');
        setCooldownMessage('Failed to save your game result. Please try again.');
        setShowCooldownPopup(true);
      } finally {
        setActiveGame(null);
      }
    }
  };

  const getGameGradient = (gameSlug: string): (string | number)[] => {
    const gradients: { [key: string]: (string | number)[] } = {
      'color-match': ['#FF6B6B', '#FF8E72'],
      'image-similarity': ['#4ECDC4', '#44A08D'],
      'math-quiz': ['#9D84B7', '#A78BFA'],
      'memory-pattern': ['#FFD93D', '#FBA919'],
    };
    return gradients[gameSlug] || ['#667eea', '#764ba2'];
  };

  const getGameIcon = (gameSlug: string): string => {
    const icons: { [key: string]: string } = {
      'color-match': '🎨',
      'image-similarity': '🖼️',
      'math-quiz': '🧮',
      'memory-pattern': '🧠',
    };
    return icons[gameSlug] || '🎮';
  };

  // If a game is active, show the game component
  if (activeGame === 'color-match') {
    return <ColorMatchGame onGameEnd={handleGameEnd} onClose={() => setActiveGame(null)} />;
  } else if (activeGame === 'image-similarity') {
    return <ImageSimilarityGame onGameEnd={handleGameEnd} onClose={() => setActiveGame(null)} />;
  } else if (activeGame === 'math-quiz') {
    return <MathQuizGame onGameEnd={handleGameEnd} onClose={() => setActiveGame(null)} />;
  } else if (activeGame === 'memory-pattern') {
    return <MemoryPatternGame onGameEnd={handleGameEnd} onClose={() => setActiveGame(null)} />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar 
        barStyle={theme.background === '#ffffff' ? 'dark-content' : 'light-content'} 
        backgroundColor={theme.background} 
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        style={[styles.scrollView, { backgroundColor: theme.background }]}
        contentContainerStyle={[
          styles.scrollViewContent,
          shouldShowBanner ? { paddingBottom: 100 } : null,
        ]}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {loadingDashboard ? (
            /* Skeleton Loader */
            <>
              <View style={styles.topHeader}>
                <Skeleton width={120} height={28} borderRadius={4} />
                <Skeleton width={110} height={52} borderRadius={20} />
              </View>
              <View style={[styles.heroSliderContainer, { height: 200, marginHorizontal: 20, marginTop: 20, marginBottom: 20 }]}>
                <Skeleton width="100%" height={200} borderRadius={20} />
              </View>
              {/* Home banner slot skeleton – same layout as inlineBannerAd */}
              <View style={[styles.inlineBannerAd, { marginTop: 0 }]}>
                <Skeleton width="100%" height={50} borderRadius={8} />
              </View>
              <Skeleton width={140} height={12} style={{ marginHorizontal: 20, marginTop: 24, marginBottom: 12 }} borderRadius={4} />
              <View style={[styles.offerwallCard, { padding: 20, marginHorizontal: 20 }]}>
                <Skeleton width={60} height={60} style={{ alignSelf: 'center', marginBottom: 12 }} borderRadius={12} />
                <Skeleton width={180} height={20} style={{ alignSelf: 'center', marginBottom: 8 }} borderRadius={4} />
                <Skeleton width={120} height={16} style={{ alignSelf: 'center', marginBottom: 16 }} borderRadius={4} />
                <Skeleton width={100} height={40} style={{ alignSelf: 'center' }} borderRadius={12} />
              </View>
              <Skeleton width={120} height={12} style={{ marginHorizontal: 20, marginTop: 24, marginBottom: 12 }} borderRadius={4} />
              <View style={styles.gamesGrid}>
                {[1, 2, 3, 4].map((i) => (
                  <View key={i} style={[styles.gameCard, { backgroundColor: 'transparent', borderWidth: 0 }]}>
                    <Skeleton width={50} height={50} borderRadius={12} />
                    <Skeleton width={80} height={16} borderRadius={4} />
                    <Skeleton width={60} height={14} borderRadius={4} />
                  </View>
                ))}
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginTop: 24 }}>
                <Skeleton width={130} height={12} borderRadius={4} />
                <Skeleton width={60} height={12} borderRadius={4} />
              </View>
              <View style={{ paddingHorizontal: 20, marginTop: 12, gap: 12 }}>
                {[1, 2, 3].map((i) => (
                  <View key={i} style={[styles.taskCard, { backgroundColor: 'transparent', borderWidth: 0 }]}>
                    <Skeleton width="70%" height={18} borderRadius={4} />
                    <Skeleton width="40%" height={14} style={{ marginTop: 8 }} borderRadius={4} />
                    <Skeleton width={50} height={24} borderRadius={8} style={{ position: 'absolute', right: 16, top: 16 }} />
                  </View>
                ))}
              </View>
              <View style={{ height: 150 }} />
            </>
          ) : (
          <>
          {/* Header */}
          <View style={styles.topHeader}>
            <Text style={[styles.logoText, { color: theme.text }]}>EARN<Text style={{ color: theme.primary }}>PILOT</Text></Text>
            <View style={[styles.walletPill, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.walletText, { color: theme.primary }]}>💎 {dashboard?.total_earned ?? '0'}</Text>
              <Text style={[styles.energyText, { color: theme.textSecondary }]}>⚡ {dashboard?.energy_points ?? '0'} Energy</Text>
            </View>
          </View>

          {/* Hero Slider – skeleton while loading or when no slides */}
          {heroSlidesLoading || heroSlides.length === 0 ? (
            <View style={[styles.heroSliderContainer, { marginHorizontal: 20, marginTop: 20, marginBottom: 20 }]}>
              <Skeleton width="100%" height={200} borderRadius={20} />
            </View>
          ) : (
            <View style={styles.heroSliderContainer}>
              <ScrollView
                ref={slideScrollRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(event) => {
                  const slideIndex = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
                  setCurrentSlideIndex(slideIndex);
                }}
                style={styles.heroSlider}
              >
                {heroSlides.map((slide, index) => (
                  <TouchableOpacity
                    key={slide.id}
                    activeOpacity={0.9}
                    onPress={() => {
                      if (slide.link_url) {
                        Linking.openURL(slide.link_url).catch(err => console.error('Failed to open URL:', err));
                      }
                    }}
                    style={styles.slideContainer}
                  >
                    {!heroImageLoaded[index] && (
                      <View style={[StyleSheet.absoluteFill, { borderRadius: 20, overflow: 'hidden' }]}>
                        <Skeleton width="100%" height="100%" borderRadius={20} />
                      </View>
                    )}
                    <Image
                      source={{ uri: slide.image_url }}
                      style={[styles.slideImage, { opacity: heroImageLoaded[index] ? 1 : 0 }]}
                      resizeMode="cover"
                      onLoad={() => setHeroImageLoaded((prev) => ({ ...prev, [index]: true }))}
                      onError={(error) => {
                        console.error('Hero slide image load error:', error.nativeEvent.error, 'URL:', slide.image_url);
                        setHeroImageLoaded((prev) => ({ ...prev, [index]: true }));
                      }}
                    />
                    {(slide.title || slide.subtitle) && (
                      <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.7)']}
                        style={styles.slideOverlay}
                      >
                        {slide.title && (
                          <Text style={styles.slideTitle}>{slide.title}</Text>
                        )}
                        {slide.subtitle && (
                          <Text style={styles.slideSubtitle}>{slide.subtitle}</Text>
                        )}
                      </LinearGradient>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {heroSlides.length > 1 && (
                <View style={styles.paginationContainer}>
                  {heroSlides.map((_, index) => (
                    <View
                      key={index}
                      style={[
                        styles.paginationDot,
                        index === currentSlideIndex && styles.paginationDotActive,
                      ]}
                    />
                  ))}
                </View>
              )}
            </View>
          )}

        {/* Home banner (below hero): separately maintained in admin; size can be banner / large_banner / medium_rectangle */}
        {shouldShowHomeBanner() && !homeBannerFailed && (() => {
          try {
            const { BannerAd, BannerAdSize } = require('react-native-google-mobile-ads');
            const homeIds = getHomeBannerAdIds();
            const homeUnitId = homeIds[0];
            const sizeKey = getHomeBannerSize();
            const sizeProp = BannerAdSize[sizeKey] ?? BannerAdSize.BANNER;
            const minHeight = sizeKey === 'MEDIUM_RECTANGLE' ? 250 : sizeKey === 'LARGE_BANNER' ? 100 : 50;
            return (
              <View style={[styles.inlineBannerAd, { backgroundColor: theme.background, minHeight }]}>
                <BannerAd
                  key={homeUnitId}
                  unitId={homeUnitId}
                  size={sizeProp}
                  requestOptions={getAdRequestOptions()}
                  onAdLoaded={() => setHomeBannerFailed(false)}
                  onAdFailedToLoad={(error: any) => {
                    const code = error?.code ?? error?.nativeEvent?.code;
                    const msg = error?.message ?? error?.nativeEvent?.message ?? '';
                    console.log('📺 Home banner: load failed', code != null ? `(code: ${code}${msg ? `, ${msg}` : ''})` : '');
                    setHomeBannerFailed(true);
                  }}
                />
              </View>
            );
          } catch (e) {
            return null;
          }
        })()}

        {/* Add-On Games – COMMENTED: not using add-on games as of now
        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>ADD-ON GAMES</Text>
        {addOnGames.length > 0 ? (
          <View style={styles.addOnGamesGrid}>
            {addOnGames.map((game) => (
              <TouchableOpacity
                key={game.id}
                style={[styles.addOnGameCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                activeOpacity={0.85}
                onPress={() => {
                  setSelectedAddOnGame(game);
                  setShowAddOnModal(true);
                }}
              >
                <Image 
                  source={
                    (() => {
                      const u = game.icon_url || game.image_url;
                      if (!u || typeof u !== 'string') return require('../../assets/images/pilot-jump.png');
                      const uri = (u.startsWith('http://') || u.startsWith('https://')) ? u : `${getAssetBaseUrl().replace(/\/$/, '')}${u.startsWith('/') ? u : `/${u}`}`;
                      return { uri };
                    })()
                  }
                  style={styles.addOnGameImage}
                  resizeMode="cover"
                />
                <Text style={[styles.addOnGameName, { color: theme.text }]} numberOfLines={1}>
                  {game.name}
                </Text>
                <Text style={[styles.playLabel, { color: theme.primary }]}>
                  {addOnGameInstalledMap[game.id] === false ? 'Download' : addOnGameInstalledMap[game.id] === true ? 'Play' : '...'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.addOnGamesEmpty}>
            <Text style={[styles.addOnGamesEmptyText, { color: theme.textSecondary }]}>
              Add-on games will appear here once they are configured in the admin panel.
            </Text>
          </View>
        )}
        */}

        {/* Brain Teaser Quiz - Styled like Elite Offerwall */}
        <Text style={[styles.sectionLabel, { color: theme.textSecondary, marginTop: spacing.lg }]}>BRAIN TEASER QUIZ</Text>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            // Navigate to quizzes selection page
            (navigation as any).navigate('quizzes');
          }}
        >
          <LinearGradient
            colors={[theme.card, theme.background]}
            start={{ x: 1, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={[styles.offerwallCard, { borderColor: theme.primary }]}
          >
            <View style={styles.offerwallContent}>
              <Text style={styles.offerwallIcon}>🧠</Text>
              <Text style={[styles.offerwallTitle, { color: theme.primary }]}>Brain Teaser Quiz</Text>
              <Text style={[styles.offerwallSubtitle, { color: theme.textSecondary }]}>
                {quizCategories && quizCategories.length > 0 
                  ? `${quizCategories.length} Quiz${quizCategories.length > 1 ? 'zes' : ''} Available`
                  : 'Test Your Knowledge'}
              </Text>
              <View style={[styles.offerwallButton, { backgroundColor: theme.primary }]}>
                <Text style={[styles.offerwallButtonText, { color: theme.background }]}>EXPLORE</Text>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Cut the Rope – commented out for now
        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>ARCADE</Text>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => (navigation as any).navigate('HTML5Game', { title: 'Cut the Rope', url: CUT_THE_ROPE_URL })}
        >
          <LinearGradient
            colors={[theme.card, theme.background]}
            start={{ x: 1, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={[styles.offerwallCard, { borderColor: theme.primary }]}
          >
            <View style={styles.offerwallContent}>
              <Text style={styles.offerwallIcon}>🪅</Text>
              <Text style={[styles.offerwallTitle, { color: theme.primary }]}>Cut the Rope</Text>
              <Text style={[styles.offerwallSubtitle, { color: theme.textSecondary }]}>
                Feed the candy to Om Nom – cut the ropes!
              </Text>
              <View style={[styles.offerwallButton, { backgroundColor: theme.primary }]}>
                <Text style={[styles.offerwallButtonText, { color: theme.background }]}>PLAY</Text>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>
        */}

        {/* Mini Games */}
        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>MINI GAMES</Text>
        <View style={styles.gamesGrid}>
          {gameConfigs.filter(game => {
            // Only show mini games (system games), exclude add-on games
            // Filter by is_system_game flag or check if it's NOT an add-on game
            const isMiniGame = game.is_system_game === true || (game.is_addon_game !== true && !game.package_name);

            // Hide quiz entries that should be shown in the Quiz module (avoid duplicates)
            const name = String((game as any)?.name ?? '');
            const slug = String((game as any)?.slug ?? '');
            const isBrainTesterQuiz =
              /brain\s*tester/i.test(name) ||
              /brain[-_\s]*tester/i.test(slug);

            return game.is_active !== false && isMiniGame && !isBrainTesterQuiz;
          }).map((gameConfig) => {
            const cooldown = getCooldown(gameConfig.slug);
            const isInCooldown = Boolean(cooldown && cooldown.remainingSeconds > 0);

            return (
              <TouchableOpacity
                key={gameConfig.id}
                style={[styles.gameCard, { opacity: isInCooldown ? 0.6 : 1, backgroundColor: theme.card, borderColor: theme.border }]}
                onPress={() => handleGameStart(gameConfig.slug as any)}
                disabled={isInCooldown}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={getGameGradient(gameConfig.slug)}
                  style={styles.gameIconBg}
                >
                  <Text style={styles.gameIcon}>{getGameIcon(gameConfig.slug)}</Text>
                </LinearGradient>
                <Text style={[styles.gameName, { color: theme.text }]}>{gameConfig.name}</Text>
                {isInCooldown ? (
                  <Text style={[styles.cooldownText, { color: theme.textSecondary }]}>
                    ⏳ {cooldown?.remainingSeconds ? Math.ceil(cooldown.remainingSeconds / 60) : 0}m
                  </Text>
                ) : (
                  <></>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
        {/* Featured Tasks */}
        {featuredTasks.length > 0 && (
          <>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.xl, marginTop: spacing.lg }}>
              <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>FEATURED TASKS</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Tasks')} activeOpacity={0.7}>
                <Text style={[styles.seeAllLink, { color: theme.primary }]}>See all</Text>
              </TouchableOpacity>
            </View>
            <View style={{ paddingHorizontal: spacing.xl, marginBottom: spacing.lg, gap: spacing.md }}>
              {featuredTasks.map((task) => (
                <TouchableOpacity
                  key={task.id}
                  style={[styles.taskCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                  onPress={() => navigation.navigate('TaskDetail', { taskId: task.id })}
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.taskTitle, { color: theme.text }]}>{task.title}</Text>
                    {task.description && <Text style={[styles.taskDesc, { color: theme.textSecondary }]}>{task.description}</Text>}
                  </View>
                  <Text style={[styles.taskReward, { color: theme.primary }]}>+{task.reward_points}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Elite Offerwall - commented out
        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>FINTECH OFFERS</Text>
        <LinearGradient
          colors={[theme.card, theme.background]}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[styles.offerwallCard, { borderColor: theme.primary }]}
        >
          <View style={styles.offerwallContent}>
            <Text style={styles.offerwallIcon}>📈</Text>
            <Text style={[styles.offerwallTitle, { color: theme.primary }]}>Elite Offerwall</Text>
            <Text style={[styles.offerwallSubtitle, { color: theme.textSecondary }]}>High-Yield Surveys</Text>
            <TouchableOpacity style={[styles.offerwallButton, { backgroundColor: theme.primary }]}>
              <Text style={[styles.offerwallButtonText, { color: theme.background }]}>EXPLORE</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
        */}

        {/* Bottom spacing for fixed banner ad + tab bar */}
        <View style={{ height: 150 }} />
          </>
          )}
        </Animated.View>
      </ScrollView>

      {/* Add-On Game Modal – not using add-on games as of now */}

      {/* Cooldown Popup */}
      <ThemedPopup
        visible={showCooldownPopup}
        title={popupTitle}
        message={cooldownMessage}
        onClose={() => setShowCooldownPopup(false)}
      />
      
      {/* Fixed Banner Ad above Tab Bar */}
      <FixedBannerAd
        shouldShowBanner={shouldShowBanner}
        getBannerAdId={getBannerAdId}
        getBannerAdIds={getBannerAdIds}
        requestOptions={getAdRequestOptions()}
        backgroundColor={theme.background}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    paddingBottom: 20,
  },
  scrollViewContent: {
    paddingTop: 0,
  },
  topHeader: {
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  walletPill: {
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
  },
  walletText: {
    fontSize: typography.lg,
    fontWeight: '800',
  },
  energyText: {
    fontSize: typography.xs,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  banner: {
    marginHorizontal: 20,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  bannerTitle: {
    fontSize: typography['2xl'],
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: spacing.md,
  },
  bannerSubtitle: {
    fontSize: typography.sm,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  earningHubGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },
  earningHubCard: {
    flex: 1,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    paddingVertical: spacing['2xl'],
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  earningHubIcon: {
    fontSize: 32,
  },
  earningHubLabel: {
    fontSize: typography.base,
    fontWeight: '700',
    textAlign: 'center',
  },
  sectionLabel: {
    fontSize: typography.xs,
    fontWeight: '800',
    marginHorizontal: 20,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  seeAllLink: {
    fontSize: typography.sm,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
  },
  statIcon: {
    fontSize: 24,
  },
  statLabel: {
    fontSize: typography.xs,
    fontWeight: '600',
  },
  statValue: {
    fontSize: typography.lg,
    fontWeight: '800',
  },
  offerwallCard: {
    marginHorizontal: spacing.xl,
    marginVertical: spacing.lg,
    borderRadius: borderRadius.xl,
    borderWidth: 1.5,
    padding: spacing.xl,
    alignItems: 'center',
  },
  offerwallContent: {
    alignItems: 'center',
  },
  offerwallIcon: {
    fontSize: 40,
    marginBottom: spacing.md,
  },
  offerwallTitle: {
    fontSize: typography.xl,
    fontWeight: '800',
    marginBottom: spacing.sm,
  },
  offerwallSubtitle: {
    fontSize: typography.sm,
    marginBottom: spacing.lg,
  },
  offerwallButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  offerwallButtonText: {
    fontWeight: '800',
    fontSize: typography.sm,
    letterSpacing: 1,
  },
  gamesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },
  gameCard: {
    width: (screenWidth - spacing.xl * 2 - spacing.md) / 2,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
  },
  gameIconBg: {
    width: 50,
    height: 50,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameIcon: {
    fontSize: 24,
  },
  gameName: {
    fontSize: typography.base,
    fontWeight: '700',
    textAlign: 'center',
  },
  gameReward: {
    fontSize: typography.sm,
    fontWeight: '700',
  },
  cooldownText: {
    fontSize: typography.sm,
    fontWeight: '600',
  },
  addOnGamesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },
  addOnGamesEmpty: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  addOnGamesEmptyText: {
    fontSize: typography.sm,
    textAlign: 'left',
  },
  addOnGameCard: {
    width: (screenWidth - spacing.xl * 2 - spacing.md) / 2,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
    opacity: 0.7,
  },
  addOnGameImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  addOnGameName: {
    fontSize: typography.base,
    fontWeight: '700',
    textAlign: 'center',
  },
  playLabel: {
    fontSize: typography.sm,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  addOnModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  addOnModalSheet: {
    height: screenHeight * 0.5,
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing['2xl'],
  },
  addOnModalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  addOnModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  addOnModalIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    marginRight: spacing.md,
    borderWidth: 2,
    borderColor: themeColors.primaryBlue,
  },
  addOnModalIcon: {
    width: '100%',
    height: '100%',
  },
  addOnModalTitleBlock: {
    flex: 1,
  },
  addOnModalTitle: {
    fontSize: typography.xl,
    fontWeight: '800',
  },
  addOnModalSubtitle: {
    fontSize: typography.xs,
    marginTop: spacing.xs,
  },
  addOnModalBody: {
    flex: 1,
  },
  addOnModalSectionLabel: {
    fontSize: typography.xs,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  addOnModalInfoCard: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: themeColors.border,
    padding: spacing.lg,
  },
  addOnModalDescription: {
    fontSize: typography.sm,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  addOnModalBulletList: {
    gap: spacing.xs,
  },
  addOnModalBullet: {
    fontSize: typography.xs,
  },
  addOnModalBulletHighlight: {
    fontWeight: '700',
    color: themeColors.primaryBlue,
  },
  addOnModalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  addOnModalButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addOnModalCancelButton: {
    borderWidth: 1,
  },
  addOnModalPlayButton: {},
  addOnModalButtonText: {
    fontSize: typography.sm,
    fontWeight: '700',
  },
  comingSoonLabel: {
    fontSize: typography.xs,
    fontWeight: '600',
  },
  quizCard: {
    flexDirection: 'row',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  quizTitle: {
    fontSize: typography.base,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  quizDesc: {
    fontSize: typography.xs,
    marginBottom: spacing.sm,
  },
  quizMeta: {
    fontSize: typography.xs,
    fontWeight: '600',
  },
  quizReward: {
    fontSize: typography.lg,
    fontWeight: '800',
  },
  quizPoints: {
    fontSize: typography.xs,
    fontWeight: '600',
  },
  taskCard: {
    flexDirection: 'row',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  taskTitle: {
    fontSize: typography.base,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  taskDesc: {
    fontSize: typography.xs,
  },
  taskReward: {
    fontSize: typography.lg,
    fontWeight: '800',
  },
  bottomSpacing: {
    height: 120,
  },
  inlineBannerAd: {
    marginHorizontal: spacing.xl,
    marginVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  heroSliderContainer: {
    marginHorizontal: 20,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  heroSlider: {
    height: 200,
  },
  slideContainer: {
    width: screenWidth - 40,
    height: 200,
    position: 'relative',
  },
  slideImage: {
    width: '100%',
    height: '100%',
  },
  slideOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.xl,
    paddingTop: spacing['2xl'],
  },
  slideTitle: {
    fontSize: typography['2xl'],
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: spacing.xs,
  },
  slideSubtitle: {
    fontSize: typography.base,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  paginationDotActive: {
    backgroundColor: themeColors.primaryBlue,
    width: 24,
  },
});
