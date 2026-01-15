import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  SafeAreaView,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  StatusBar,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { api } from '../../services/api';
import { useUserStore } from '../../stores/userStore';
import { useGameStore } from '../../hooks/useGameStore';
import { useGameCooldowns } from '../../hooks/useGameCooldowns';
import { useAdMob } from '../../hooks/useAdMob';

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
import { themeColors, typography, spacing, borderRadius } from '../../hooks/useThemeColors';
import ColorMatchGame from '../../components/games/ColorMatchGame';
import ImageSimilarityGame from '../../components/games/ImageSimilarityGame';
import MathQuizGame from '../../components/games/MathQuizGame';
import MemoryPatternGame from '../../components/games/MemoryPatternGame';
import ThemedPopup from '../../components/ThemedPopup';

const { width: screenWidth } = Dimensions.get('window');

export default function GamesScreen() {
  const router = useRouter();
  const { shouldShowBanner, getBannerAdId, showInterstitial } = useAdMob();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const isInitializingCooldowns = useRef(false);
  const [activeGame, setActiveGame] = useState<'color-match' | 'image-similarity' | 'math-quiz' | 'memory-pattern' | null>(null);

  const gameConfigs = useGameStore(state => state.gameConfigs);
  const loadGameConfigs = useGameStore(state => state.loadGameConfigs);
  const getGameConfig = useGameStore(state => state.getGameConfig);
  const addPoints = useGameStore(state => state.addPoints);
  const profile = useUserStore(state => state.profile);
  const setProfile = useUserStore(state => state.setProfile);

  const [showCooldownPopup, setShowCooldownPopup] = useState(false);
  const [cooldownMessage, setCooldownMessage] = useState('');
  const [popupTitle, setPopupTitle] = useState('Game Complete');
  const { checkGameCooldown, setCooldown, getCooldown, removeCooldown } = useGameCooldowns();

  // Single initialization effect
  useEffect(() => {
    const initialize = async () => {
      try {
        await loadGameConfigs();
        
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
        console.warn('Failed to load game configs', e);
      }
    };

    initialize();

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
    <LinearGradient
      colors={[themeColors.bgDark, '#0a0e17']}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" backgroundColor={themeColors.bgDark} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        style={styles.scrollView}
      >
        {/* Header */}
        <Animated.View
          style={[
            styles.header,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Mini Games</Text>
          </View>
        </Animated.View>

        {/* Games Grid */}
        <Text style={styles.sectionLabel}>AVAILABLE GAMES</Text>
        <View style={styles.gamesGrid}>
          {gameConfigs.filter(game => game.is_active !== false).map((gameConfig) => {
            const cooldown = getCooldown(gameConfig.slug);
            const isInCooldown = Boolean(cooldown && cooldown.remainingSeconds > 0);

            return (
              <TouchableOpacity
                key={gameConfig.id}
                style={[styles.gameCard, { opacity: isInCooldown ? 0.6 : 1 }]}
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
                <Text style={styles.gameName}>{gameConfig.name}</Text>
                {isInCooldown ? (
                  <Text style={styles.cooldownText}>
                    ⏳ {cooldown?.remainingSeconds ? Math.ceil(cooldown.remainingSeconds / 60) : 0}m
                  </Text>
                ) : (
                  <Text style={styles.gameReward}>+{gameConfig.points_per_completion} pts</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Banner Ad */}
        {shouldShowBanner && BannerAd && (
          <View style={{ alignItems: 'center', paddingVertical: 8, backgroundColor: themeColors.bgDark }}>
            <BannerAd unitId={getBannerAdId()} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} />
          </View>
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Cooldown Popup */}
      <ThemedPopup
        visible={showCooldownPopup}
        title={popupTitle}
        message={cooldownMessage}
        onClose={() => setShowCooldownPopup(false)}
      />
      
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.bgDark,
  },
  scrollView: {
    flex: 1,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    paddingTop: spacing['2xl'],
    gap: spacing.md,
  },
  backButton: {
    padding: spacing.md,
  },
  backIcon: {
    fontSize: typography['2xl'],
    color: themeColors.primaryBlue,
    fontWeight: '800',
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: typography['2xl'],
    fontWeight: '800',
    color: themeColors.textMain,
  },
  sectionLabel: {
    fontSize: typography.xs,
    fontWeight: '800',
    color: themeColors.textDim,
    marginHorizontal: spacing.xl,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 2,
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
    backgroundColor: themeColors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: themeColors.border,
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
    color: themeColors.textMain,
    textAlign: 'center',
  },
  gameReward: {
    fontSize: typography.xs,
    color: themeColors.primaryBlue,
    fontWeight: '700',
  },
  cooldownText: {
    fontSize: typography.xs,
    color: themeColors.textDim,
    fontWeight: '600',
  },
  bottomSpacing: {
    height: spacing['2xl'],
  },
});
