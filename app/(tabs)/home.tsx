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
  Image
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../hooks/useTheme';
import { api } from '../../services/api';
import { useUserStore } from '../../stores/userStore';
import { useGameStore } from '../../hooks/useGameStore';
import { useGameCooldowns } from '../../hooks/useGameCooldowns';
import { typography, spacing, borderRadius } from '../../hooks/useThemeColors';
import Icon from '../../components/Icon';
import { useAdMob } from '../../hooks/useAdMob';
import { getDashboardDetails } from '../../services/dashboard';
import ColorMatchGame from '../../components/games/ColorMatchGame';
import ImageSimilarityGame from '../../components/games/ImageSimilarityGame';
import MathQuizGame from '../../components/games/MathQuizGame';
import MemoryPatternGame from '../../components/games/MemoryPatternGame';
import ThemedPopup from '../../components/ThemedPopup';
import { useAuthStore } from '../../stores/authStore';
import { requestNotificationPermission, getFCMToken, registerDeviceToken, setupMessageHandlers } from '../../services/fcm';
import FixedBannerAd from '../../components/FixedBannerAd';

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
  const { shouldShowBanner, getBannerAdId, showInterstitial } = useAdMob();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const [refreshing, setRefreshing] = useState(false);
  const [activeGame, setActiveGame] = useState<'color-match' | 'image-similarity' | 'math-quiz' | 'memory-pattern' | null>(null);
  const [showCooldownPopup, setShowCooldownPopup] = useState(false);
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
  
  // Debug game configs
  useEffect(() => {
    console.log('🎮 Game Configs Loaded:', gameConfigs.length, gameConfigs);
  }, [gameConfigs]);
  
  const [dashboard, setDashboard] = useState<any>(null);
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [greeting, setGreeting] = useState(getGreeting());
  const [featuredTasks, setFeaturedTasks] = useState<any[]>([]);
  const [quizCategories, setQuizCategories] = useState<any[]>([]);

  // Single initialization effect
  useEffect(() => {
    const initialize = async () => {
      try {
        // Initialize FCM for notifications
        const hasPermission = await requestNotificationPermission();
        if (hasPermission) {
          const fcmToken = await getFCMToken();
          if (fcmToken) {
            const authToken = useAuthStore.getState().token;
            if (authToken) {
              await registerDeviceToken(authToken, fcmToken);
            }
          }
        }
        
        // Setup message handlers for incoming notifications
        setupMessageHandlers();
        
        const dashboardData = await getDashboardDetails();
        const tasksResponse = await api.get('/tasks');
        
        await loadStats();
        await loadGameConfigs();
        
        setDashboard(dashboardData?.data ?? dashboardData ?? null);
        
        // Fetch featured tasks from API
        try {
          const featuredResponse = await api.get('/tasks/featured');
          const featured = featuredResponse?.data?.data || [];
          setFeaturedTasks(featured.slice(0, 3)); // Show max 3 featured tasks
        } catch (error) {
          console.log('Featured tasks not available:', error);
          // Fallback to filtering from all tasks if endpoint fails
          const tasks = tasksResponse?.data?.data || [];
          const featured = tasks.filter((task: any) => task.is_featured || task.featured);
          setFeaturedTasks(featured.slice(0, 3));
        }
        
        // Fetch quiz categories
        try {
          const quizzesResponse = await api.get('/quizzes');
          const quizzes = quizzesResponse?.data?.data || [];
          setQuizCategories(quizzes.slice(0, 4)); // Show max 4 quiz categories
        } catch (error) {
          console.log('Quiz categories not available:', error);
          setQuizCategories([]);
        }
        
        // If profile is not set, try to fetch it from the API
        if (!profile?.id) {
          try {
            const response = await api.get('/profile');
            const userData = response.data.user || response.data;
            if (userData?.id) {
              setProfile(userData);
            }
          } catch (profileError) {
            console.warn('Failed to load user profile:', profileError);
          }
        }
      } catch (e) {
        console.warn('Failed to load initial data', e);
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
      // Ensure we have a user profile
      if (!profile?.id) {
        try {
          const resp = await api.get('/profile');
          const userData = resp.data.user || resp.data;
          if (userData?.id) setProfile(userData);
        } catch (e) {
          setPopupTitle('❌ Error');
          setCooldownMessage('User not authenticated. Please log in again.');
          setShowCooldownPopup(true);
          return;
        }
      }

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
        await api.post(`/games/${gameId}/can-play`, { user_id: profile?.id });
      } catch (err: any) {
        const msg = err?.response?.data?.message || 'You cannot play this game right now.';
        setPopupTitle('⏳ Please Wait');
        setCooldownMessage(msg);
        setShowCooldownPopup(true);
        return;
      }

      // Start session
      try {
        await api.post(`/games/${gameId}/start`, { user_id: profile?.id });
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
      const response = await api.get('/profile');
      setProfile(response.data.user);
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

        await api.post(`/games/${gameId}/complete`, {
          user_id: profile.id,
          points_earned: points,
        });

        // Show interstitial ad after game completion
        try {
          await showInterstitial();
        } catch (adError) {
          console.log('Ad not shown:', adError);
        }

        addPoints(points, activeGame);
        setPopupTitle('🎉 Game Complete');
        setCooldownMessage(`Great job! You earned ${points} points!`);
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

  const getGameGradient = (gameSlug: string): readonly [string, string, ...string[]] => {
    const gradients: { [key: string]: readonly [string, string, ...string[]] } = {
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

      {/* Fixed Header */}
      <Animated.View
        style={[
          styles.fixedHeader,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
            backgroundColor: theme.background,
            borderBottomColor: theme.border,
          },
        ]}
      >
        <View style={styles.headerContent}>
          <Text style={[styles.logo, { color: theme.text }]}>
            Earn<Text style={[styles.logoPilot, { color: theme.primary }]}>Pilot</Text>
          </Text>
          <Text style={[styles.greeting, { color: theme.textSecondary }]}>{greeting}</Text>
        </View>
        <View style={[styles.walletPill, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.walletText, { color: theme.primary }]}>💎 {dashboard?.total_earned ?? '0'}</Text>
          <Text style={[styles.energyText, { color: theme.textSecondary }]}>⚡ {dashboard?.energy_points ?? '0'} Energy</Text>
        </View>
      </Animated.View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        style={[styles.scrollView, { backgroundColor: theme.background }]}
        contentContainerStyle={[
          styles.scrollViewContent,
          shouldShowBanner ? { paddingBottom: 100 } : null,
        ]}
      >

        {/* Banner - Smart Yield */}
        <LinearGradient
          colors={[theme.primary, theme.primary + 'CC']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.banner}
        >
          <Text style={styles.bannerTitle}>Smart Yield</Text>
          <Text style={styles.bannerSubtitle}>Your 1.5x Multiplier is currently Active</Text>
        </LinearGradient>

        {/* Add-On Games */}
        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>ADD-ON GAMES</Text>
        <View style={styles.addOnGamesGrid}>
          {[
            { id: 1, name: 'Pilot Jump', image: require('../../assets/images/pilot-jump.png') },
            { id: 2, name: 'Water Sort', image: require('../../assets/images/water-sort.png') }
          ].map((game) => (
            <TouchableOpacity
              key={game.id}
              style={[styles.addOnGameCard, { backgroundColor: theme.card, borderColor: theme.border }]}
              activeOpacity={0.7}
            >
              <Image 
                source={game.image} 
                style={styles.addOnGameImage}
                resizeMode="contain"
              />
              <Text style={[styles.addOnGameName, { color: theme.text }]}>{game.name}</Text>
              <Text style={[styles.comingSoonLabel, { color: theme.textSecondary }]}>Coming Soon</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Brain Teaser Quiz Section - Always Visible */}
        <Text style={[styles.sectionLabel, { color: theme.textSecondary, marginTop: spacing.lg }]}>BRAIN TEASER QUIZ</Text>
        {quizCategories.length > 0 ? (
          <View style={{ paddingHorizontal: spacing.xl, marginBottom: spacing.lg, gap: spacing.md }}>
            {quizCategories.map((quiz) => (
              <TouchableOpacity
                key={quiz.id}
                style={[styles.quizCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                activeOpacity={0.7}
                onPress={() => console.log('Quiz selected:', quiz.id, quiz.title || quiz.category)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.quizTitle, { color: theme.text }]}>{quiz.category || quiz.title}</Text>
                  {quiz.description && <Text style={[styles.quizDesc, { color: theme.textSecondary }]}>{quiz.description}</Text>}
                  <View style={{ flexDirection: 'row', gap: spacing.lg, marginTop: spacing.sm }}>
                    {quiz.question_count && <Text style={[styles.quizMeta, { color: theme.textSecondary }]}>📋 {quiz.question_count} Q's</Text>}
                    {quiz.difficulty && <Text style={[styles.quizMeta, { color: theme.textSecondary }]}>⭐ {quiz.difficulty}</Text>}
                  </View>
                </View>
                <View style={{ alignItems: 'center', gap: spacing.xs }}>
                  <Text style={[styles.quizReward, { color: theme.primary }]}>+{quiz.reward_points || 50}</Text>
                  <Text style={[styles.quizPoints, { color: theme.textSecondary }]}>points</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={{ marginHorizontal:spacing['2xl'], paddingHorizontal: spacing.xl, marginBottom: spacing.lg, paddingVertical: spacing.lg, backgroundColor: theme.card, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: theme.border, alignItems: 'center' }}>
            <Text style={{ color: theme.textSecondary }}>No quizzes available</Text>
          </View>
        )}

        {/* Mini Games */}
        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>MINI GAMES</Text>
        <View style={styles.gamesGrid}>
          {gameConfigs.filter(game => game.is_active !== false).map((gameConfig) => {
            const cooldown = getCooldown(gameConfig.slug);
            const isInCooldown = Boolean(cooldown && cooldown.remainingSeconds > 0);
            
            // Debug logging
            console.log(`Game: ${gameConfig.name}, Points: ${gameConfig.points_per_completion}, InCooldown: ${isInCooldown}`);

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
        {/* Brain Teaser Quiz Section - Always Visible */}
        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>BRAIN TEASER QUIZ</Text>
        {quizCategories.length > 0 ? (
          <View style={{ paddingHorizontal: spacing.xl, marginBottom: spacing.lg, gap: spacing.md }}>
            {quizCategories.map((quiz) => (
              <TouchableOpacity
                key={quiz.id}
                style={[styles.quizCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                activeOpacity={0.7}
                onPress={() => console.log('Quiz selected:', quiz.id, quiz.title || quiz.category)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.quizTitle, { color: theme.text }]}>{quiz.category || quiz.title}</Text>
                  {quiz.description && <Text style={[styles.quizDesc, { color: theme.textSecondary }]}>{quiz.description}</Text>}
                  <View style={{ flexDirection: 'row', gap: spacing.lg, marginTop: spacing.sm }}>
                    {quiz.question_count && <Text style={[styles.quizMeta, { color: theme.textSecondary }]}>📋 {quiz.question_count} Q's</Text>}
                    {quiz.difficulty && <Text style={[styles.quizMeta, { color: theme.textSecondary }]}>⭐ {quiz.difficulty}</Text>}
                  </View>
                </View>
                <View style={{ alignItems: 'center', gap: spacing.xs }}>
                  <Text style={[styles.quizReward, { color: theme.primary }]}>+{quiz.reward_points || 50}</Text>
                  <Text style={[styles.quizPoints, { color: theme.textSecondary }]}>points</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={{ paddingHorizontal: spacing.xl, marginBottom: spacing.lg, paddingVertical: spacing.lg, backgroundColor: theme.card, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: theme.border, alignItems: 'center' }}>
            <Text style={{ color: theme.textSecondary }}>No quizzes available</Text>
          </View>
        )}
        {/* Featured Tasks */}
        {featuredTasks.length > 0 && (
          <>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.xl, marginTop: spacing.lg }}>
              <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>FEATURED TASKS</Text>
              {/* Navigation disabled - add screen later */}
            </View>
            <View style={{ paddingHorizontal: spacing.xl, marginBottom: spacing.lg, gap: spacing.md }}>
              {featuredTasks.map((task) => (
                <TouchableOpacity
                  key={task.id}
                  style={[styles.taskCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                  onPress={() => console.log('Task detail navigation - add screen later')}
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

        {/* Elite Offerwall */}
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

        {/* Quick Actions */}
        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>QUICK ACTIONS</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity style={[styles.actionCard, { backgroundColor: theme.card, borderColor: theme.border }]} activeOpacity={0.8}>
            <Text style={styles.actionIcon}>💰</Text>
            <Text style={[styles.actionLabel, { color: theme.text }]}>Withdraw</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionCard, { backgroundColor: theme.card, borderColor: theme.border }]} activeOpacity={0.8}>
            <Text style={styles.actionIcon}>🔥</Text>
            <Text style={[styles.actionLabel, { color: theme.text }]}>Boost</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionCard, { backgroundColor: theme.card, borderColor: theme.border }]} activeOpacity={0.8}>
            <Text style={styles.actionIcon}>🎁</Text>
            <Text style={[styles.actionLabel, { color: theme.text }]}>Rewards</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionCard, { backgroundColor: theme.card, borderColor: theme.border }]} activeOpacity={0.8}>
            <Text style={styles.actionIcon}>⚙️</Text>
            <Text style={[styles.actionLabel, { color: theme.text }]}>Settings</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom spacing for fixed banner ad + tab bar */}
        <View style={{ height: 150 }} />
      </ScrollView>

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
    paddingTop: 100,
  },
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    paddingTop: spacing['2xl'],
    borderBottomWidth: 1,
  },
  headerContent: {
    flex: 1,
  },
  logo: {
    fontSize: typography['2xl'],
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  logoPilot: {
    fontWeight: '800',
  },
  greeting: {
    fontSize: typography.sm,
    marginTop: spacing.xs,
    fontWeight: '600',
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
    marginHorizontal: spacing.xl,
    marginVertical: spacing.lg,
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
    marginHorizontal: spacing.xl,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 2,
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
  quickActions: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
    flexWrap: 'wrap',
  },
  actionCard: {
    width: (screenWidth - spacing.xl * 2 - spacing.md * 3) / 4,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  actionIcon: {
    fontSize: 20,
  },
  actionLabel: {
    fontSize: typography.xs,
    fontWeight: '700',
    textAlign: 'center',
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
  },
  addOnGameName: {
    fontSize: typography.base,
    fontWeight: '700',
    textAlign: 'center',
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
});
