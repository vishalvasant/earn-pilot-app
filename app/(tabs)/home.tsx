import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  Modal
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../hooks/useTheme';
import { api } from '../../services/api';
import { useUserStore } from '../../stores/userStore';
import { useGameStore } from '../../hooks/useGameStore';
import ColorMatchGame from '../../components/games/ColorMatchGame';
import ImageSimilarityGame from '../../components/games/ImageSimilarityGame';
import MathQuizGame from '../../components/games/MathQuizGame';
import MemoryPatternGame from '../../components/games/MemoryPatternGame';
import Icon from '../../components/Icon';
import ThemedPopup from '../../components/ThemedPopup';

const { height: screenHeight } = Dimensions.get('window');
const HEADER_HEIGHT = screenHeight * 0.30;

import { getDashboardDetails } from '../../services/dashboard';

// Get dynamic greeting based on time of day
const getGreeting = () => {
  const hour = new Date().getHours();
  
  if (hour >= 5 && hour < 12) {
    return 'Good Morning! ☀️';
  } else if (hour >= 12 && hour < 17) {
    return 'Good Afternoon! 👋';
  } else {
    return 'Good Evening! 🌆';
  }
};

export default function HomeScreen() {
  const theme = useTheme();
  const styles = createStyles(theme);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const [refreshing, setRefreshing] = useState(false);
  const [activeGame, setActiveGame] = useState<'color-match' | 'image-similarity' | 'math-quiz' | 'memory-pattern' | null>(null);
  const { stats, gameConfigs, loadStats, loadGameConfigs, canPlayGame, getGameCooldown, getGameConfig, addPoints } = useGameStore();
  const { setProfile } = useUserStore();
  const [dashboard, setDashboard] = useState<any>(null);
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [greeting, setGreeting] = useState(getGreeting());
  const [showCooldownPopup, setShowCooldownPopup] = useState(false);
  const [cooldownMessage, setCooldownMessage] = useState('');
  const [popupTitle, setPopupTitle] = useState('Game Complete');
  const [gameCooldowns, setGameCooldowns] = useState<Record<string, number>>({});

  useEffect(() => {
    const run = async () => {
      try {
        const data = await getDashboardDetails();
        // Accept either { data: ... } or raw shape
        setDashboard(data?.data ?? data ?? null);
      } catch (e) {
        console.warn('Failed to load dashboard', e);
      } finally {
        setLoadingDashboard(false);
      }
    };
    run();
    loadStats();
    loadGameConfigs();
    
    // Update greeting every minute
    const greetingInterval = setInterval(() => {
      setGreeting(getGreeting());
    }, 60000); // Update every minute
    
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
    
    return () => clearInterval(greetingInterval);
  }, []);

  // Update cooldowns every 30 seconds and when game configs change
  useEffect(() => {
    if (gameConfigs.length > 0) {
      updateAllGameCooldowns();
      
      const cooldownInterval = setInterval(() => {
        // Decrease cooldowns by 30 seconds
        setGameCooldowns(prev => {
          const updated = { ...prev };
          Object.keys(updated).forEach(gameSlug => {
            updated[gameSlug] = Math.max(0, updated[gameSlug] - 30);
            if (updated[gameSlug] <= 0) {
              delete updated[gameSlug];
            }
          });
          return updated;
        });
      }, 30000); // Update every 30 seconds

      return () => clearInterval(cooldownInterval);
    }
  }, [gameConfigs]);

  // Dynamic data including game points (safe defaults)
  const dynamicData = useMemo(() => {
    if (!dashboard) return null;
    return {
      totalEarnings: Number(dashboard.total_earned ?? 0),
      todayEarnings: 0, // We'll get this from energy points activity if needed
      completedTasks: Number(stats.gamesPlayed ?? 0),
      pendingTasks: Number(dashboard.pending_tasks ?? 0),
      weeklyData: Array.isArray(dashboard.weekly_earnings) ? dashboard.weekly_earnings : [],
      recentActivities:
        (stats.gamesPlayed ?? 0) > 0
          ? [{ id: 0, type: 'game', title: 'Mini Games', points: dashboard.energy_points ?? 0, time: 'Today' }]
          : [],
    };
  }, [dashboard, stats]);

  useEffect(() => {
    // Load game stats
    loadStats();
    
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const AnimatedCard = ({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) => {
    const cardFade = useRef(new Animated.Value(0)).current;
    const cardSlide = useRef(new Animated.Value(30)).current;

    useEffect(() => {
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(cardFade, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(cardSlide, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
        ]).start();
      }, delay);
    }, []);

    return (
      <Animated.View
        style={{
          opacity: cardFade,
          transform: [{ translateY: cardSlide }],
        }}
      >
        {children}
      </Animated.View>
    );
  };

  const WeeklyChart = () => {
    const weekly = dynamicData?.weeklyData && dynamicData.weeklyData.length > 0
      ? dynamicData.weeklyData
      : [10, 20, 15, 30, 25, 40, 35];
    const maxValue = Math.max(...weekly, 1);
    return (
      <View style={styles.chartContainer}>
        <Text style={[styles.chartTitle, { color: theme.text }]}>Weekly Earnings</Text>
        <View style={styles.chart}>
          {weekly.map((value: number, index: number) => {
            const height = (value / maxValue) * 100;
            const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
            return (
              <View key={index} style={styles.chartBar}>
                <LinearGradient
                  colors={[theme.primary, theme.primaryLight]}
                  style={[styles.bar, { height: `${height}%` }]}
                />
                <Text style={[styles.chartLabel, { color: theme.textSecondary }]}>
                  {days[index]}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const formatCooldownTime = (milliseconds: number) => {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleGameStart = async (gameType: 'color-match' | 'image-similarity' | 'math-quiz' | 'memory-pattern') => {
    // Check if game is in cooldown
    const remainingSeconds = gameCooldowns[gameType] || 0;
    
    if (remainingSeconds > 0) {
      const remainingMinutes = Math.ceil(remainingSeconds / 60);
      setPopupTitle('⏰ Game in Cooldown');
      setCooldownMessage(`Please wait ${remainingMinutes} more minute${remainingMinutes !== 1 ? 's' : ''} before playing this game again for energy points.`);
      setShowCooldownPopup(true);
      return;
    }

    // Game can be played
    setActiveGame(gameType);
  };

  const refreshUserProfile = async () => {
    try {
      const response = await api.get('/profile');
      setProfile(response.data.user);
    } catch (error) {
      console.error('Failed to refresh user profile:', error);
    }
  };

  const refreshDashboard = async () => {
    try {
      const data = await getDashboardDetails();
      setDashboard(data?.data ?? data ?? null);
    } catch (error) {
      console.error('Failed to refresh dashboard:', error);
    }
  };

  const checkGameCooldown = async (gameSlug: string): Promise<{ canPlay: boolean; remainingSeconds: number }> => {
    try {
      const gameId = await getGameIdBySlug(gameSlug);
      if (!gameId) return { canPlay: true, remainingSeconds: 0 };

      const userResponse = await api.get('/profile');
      const userId = userResponse.data.user.id;

      // Check if game can be played without creating a session
      const response = await api.post(`/games/${gameId}/can-play`, { user_id: userId });
      
      if (response.data.success && response.data.can_play) {
        return { canPlay: true, remainingSeconds: 0 };
      } else {
        const remainingSeconds = response.data.cooldown_seconds_remaining || 0;
        return { canPlay: false, remainingSeconds };
      }
    } catch (error: any) {
      console.warn('Error checking game cooldown:', error);
      return { canPlay: true, remainingSeconds: 0 }; // Default to allowing play if check fails
    }
  };

  const updateAllGameCooldowns = async () => {
    const cooldowns: Record<string, number> = {};
    for (const game of gameConfigs) {
      const status = await checkGameCooldown(game.slug);
      if (!status.canPlay) {
        cooldowns[game.slug] = status.remainingSeconds;
      }
    }
    setGameCooldowns(cooldowns);
  };

  // Map game types to backend slugs and find game ID dynamically
  const getGameIdBySlug = async (gameType: string): Promise<number | null> => {
    try {
      const gameConfig = getGameConfig(gameType);
      return gameConfig ? gameConfig.id : null;
    } catch (error) {
      console.error('Error getting game ID:', error);
      return null;
    }
  };

  const handleGameEnd = async (points: number) => {
    if (activeGame) {
      console.log(`🎮 Game completed: ${activeGame} with score: ${points}`);
      
      try {
        // Get game configuration and ID
        const gameId = await getGameIdBySlug(activeGame);
        if (!gameId) {
          console.error('Game not found:', activeGame);
          setActiveGame(null);
          return;
        }
        
        console.log(`🔧 Found game ID: ${gameId} for ${activeGame}`);
        
        const userResponse = await api.get('/profile');
        const userId = userResponse.data.user.id;
        
        console.log(`👤 User ID: ${userId}`);
        
        // Start the game session first
        const startResponse = await api.post(`/games/${gameId}/start`, { user_id: userId });
        console.log('🚀 Game session started:', startResponse.data);
        
        // Then complete it to award energy points (backend handles the actual scoring)
        const completeResponse = await api.post(`/games/${gameId}/complete`, { 
          user_id: userId,
          score: points 
        });
        
        console.log('✅ Game completed successfully:', completeResponse.data);
        console.log(`⚡ Energy earned: ${completeResponse.data.energy_earned}`);
        
        // Show success message for energy points earned
        setPopupTitle('🎉 Success!');
        setCooldownMessage(`Great job! You earned ${completeResponse.data.energy_earned} energy points! Your total energy is now ${completeResponse.data.total_energy}.`);
        setShowCooldownPopup(true);
        
        // Update local stats for display purposes only (not for points)
        await addPoints(0, activeGame); // Just increment game count, no points
        
        // Refresh user profile and dashboard to show updated energy points
        await refreshUserProfile();
        await refreshDashboard();
        
        // Update cooldown for this game
        const gameConfig = getGameConfig(activeGame);
        if (gameConfig) {
          setGameCooldowns(prev => ({
            ...prev,
            [activeGame]: gameConfig.play_cooldown_seconds
          }));
        }
        
        console.log('🔄 Profile and dashboard refreshed');
        
      } catch (error: any) {
        if (error.response?.status === 429) {
          // Cooldown error - this is expected behavior
          const errorData = error.response.data;
          const remainingMinutes = Math.ceil(errorData.cooldown_seconds_remaining / 60);
          console.log(`⏰ Game in cooldown: ${Math.ceil(errorData.cooldown_seconds_remaining)} seconds remaining`);
          
          // Still update local stats to track the play
          await addPoints(0, activeGame);
          
          // Show user-friendly cooldown message
          setPopupTitle('⏰ Cooldown Active');
          setCooldownMessage(`Game completed! However, you need to wait ${remainingMinutes} more minute${remainingMinutes !== 1 ? 's' : ''} before earning energy points from this game again.`);
          setShowCooldownPopup(true);
          
          console.log('ℹ️ Game played locally but no energy points awarded due to cooldown');
        } else if (error.response?.status === 403 && error.response.data?.message?.includes('Daily play limit')) {
          // Daily limit reached
          console.log('📅 Daily play limit reached for this game');
          
          // Still update local stats
          await addPoints(0, activeGame);
          
          setPopupTitle('🎮 Daily Limit Reached');
          setCooldownMessage('Nice game! You have reached the daily energy point limit for this game. Come back tomorrow for more rewards!');
          setShowCooldownPopup(true);
          
          console.log('ℹ️ Game played locally but no energy points awarded due to daily limit');
        } else {
          console.error('❌ Error completing game:', error);
          console.log('Backend API call failed');
        }
      }
      
      setActiveGame(null);
    }
  };

  const getGameGradient = (gameSlug: string): [string, string] => {
    const gradients: Record<string, [string, string]> = {
      'color-match': ['#FF6B6B', '#FF8E53'],
      'image-similarity': ['#667eea', '#764ba2'],
      'math-quiz': ['#4facfe', '#00f2fe'],
      'memory-pattern': ['#fa709a', '#fee140'],
    };
    return gradients[gameSlug] || ['#667eea', '#764ba2'];
  };

  const getGameIcon = (gameSlug: string): string => {
    const icons: Record<string, string> = {
      'color-match': '🎨',
      'image-similarity': '🖼️',
      'math-quiz': '🧮',
      'memory-pattern': '🧠',
    };
    return icons[gameSlug] || '🎮';
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar 
        barStyle={theme.background === '#ffffff' ? 'dark-content' : 'light-content'} 
        backgroundColor={theme.background}
      />
      
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
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
          <LinearGradient
            colors={theme.gradient.primary as [string, string, ...string[]]}
            style={styles.headerGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.headerContent}>
              <Text style={styles.welcomeText}>{greeting}</Text>
              <Text style={styles.nameText}>Ready to earn today?</Text>
              
              <View style={styles.todayEarnings}>
                <Text style={styles.earningsLabel}>Today's Earnings</Text>
                <View style={styles.earningsWithIcon}>
                  <Icon name="coin" size={20} />
                  <Text style={styles.earningsValue}>{dynamicData?.totalEarnings ?? 0}</Text>
                </View>
                
                {/* Energy Points Display */}
                <View style={styles.energyPointsContainer}>
                  <Text style={styles.energyPointsLabel}>⚡ Energy Points</Text>
                  <Text style={styles.energyPointsValue}>{dashboard?.energy_points ?? 0}</Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <AnimatedCard delay={200}>
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <LinearGradient
                  colors={['#667eea', '#764ba2']}
                  style={styles.statIcon}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Icon name="coin" size={24} color="#ffffff" />
                </LinearGradient>
                <View style={styles.statValueWithIcon}>
                  <Text style={[styles.statValue, { color: theme.text, marginLeft: 4 }]}>{dynamicData?.totalEarnings ?? 0}</Text>
                </View>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Total Earnings</Text>
              </View>

              <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <LinearGradient
                  colors={['#f093fb', '#f5576c']}
                  style={styles.statIcon}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Icon name="checkmark" size={24} color="#ffffff" />
                </LinearGradient>
                <Text style={[styles.statValue, { color: theme.text }]}>{dynamicData?.completedTasks ?? 0}</Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Completed</Text>
              </View>
            </View>
          </AnimatedCard>

          <AnimatedCard delay={400}>
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <LinearGradient
                  colors={['#4facfe', '#00f2fe']}
                  style={styles.statIcon}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Icon name="pending" size={24} color="#ffffff" />
                </LinearGradient>
                <Text style={[styles.statValue, { color: theme.text }]}>{dynamicData?.pendingTasks ?? 0}</Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Pending</Text>
              </View>

              <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <LinearGradient
                  colors={['#FFD700', '#FFA500']}
                  style={styles.statIcon}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Icon name="fire" size={24} color="#ffffff" />
                </LinearGradient>
                <Text style={[styles.statValue, { color: theme.text }]}>{dashboard?.energy_points ?? 0}</Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Energy Points</Text>
              </View>
            </View>
          </AnimatedCard>
        </View>

        {/* Weekly Chart */}
        <AnimatedCard delay={600}>
          <View style={[styles.chartSection, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <WeeklyChart />
          </View>
        </AnimatedCard>

        {/* Recent Activities */}
        <AnimatedCard delay={800}>
          <View style={[styles.activitiesSection, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Activities</Text>
            {dynamicData?.recentActivities?.length ? (
              dynamicData.recentActivities.map((activity: any) => (
                <TouchableOpacity key={activity.id} style={styles.activityItem} activeOpacity={0.7}>
                  <View style={styles.activityIcon}>
                    <Text style={styles.activityIconText}>
                      {activity.type === 'task_completed' ? '✅' :
                       activity.type === 'bonus' ? '🎁' :
                       activity.type === 'game' ? '🎮' : '👥'}
                    </Text>
                  </View>
                  <View style={styles.activityContent}>
                    <Text style={[styles.activityTitle, { color: theme.text }]}>{activity.title}</Text>
                    <Text style={[styles.activityTime, { color: theme.textSecondary }]}>{activity.time}</Text>
                  </View>
                  <Text style={[styles.activityPoints, { color: theme.primary }]}>+{activity.points}</Text>
                </TouchableOpacity>
              ))
            ) : (
              <Text style={{ color: theme.textSecondary }}>No recent activities yet.</Text>
            )}
          </View>
        </AnimatedCard>

        {/* Mini Games Section */}
        <AnimatedCard delay={900}>
          <View style={[styles.gamesSection, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.gamesSectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Mini Games</Text>
              <View style={styles.pointsDisplay}>
                <Text style={[styles.pointsText, { color: theme.primary }]}>
                  ⚡ {dashboard?.energy_points ?? 0} energy
                </Text>
              </View>
            </View>
            
            <View style={styles.gamesGrid}>
              {gameConfigs.filter(game => game.is_active !== false).map((gameConfig) => {
                const remainingSeconds = gameCooldowns[gameConfig.slug] || 0;
                const isInCooldown = remainingSeconds > 0;
                const remainingMinutes = Math.ceil(remainingSeconds / 60);
                
                return (
                  <TouchableOpacity 
                    key={gameConfig.id}
                    style={[
                      styles.gameCard,
                      { 
                        backgroundColor: theme.background,
                        borderColor: theme.border,
                        opacity: isInCooldown ? 0.6 : 1
                      }
                    ]}
                    onPress={() => handleGameStart(gameConfig.slug as any)}
                    disabled={isInCooldown}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={getGameGradient(gameConfig.slug)}
                      style={styles.gameIcon}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Text style={styles.gameIconText}>{getGameIcon(gameConfig.slug)}</Text>
                    </LinearGradient>
                    <Text style={[styles.gameTitle, { color: theme.text }]}>{gameConfig.name}</Text>
                    <Text style={[styles.gameDescription, { color: theme.textSecondary }]}>
                      {gameConfig.description}
                    </Text>
                    {isInCooldown ? (
                      <Text style={[styles.cooldownText, { color: theme.textSecondary }]}>
                        ⏱️ {remainingMinutes}m remaining
                      </Text>
                    ) : (
                      <View style={[styles.playButton, { backgroundColor: theme.primary }]}>
                        <Text style={styles.playButtonText}>Play Now</Text>
                      </View>
                    )}
                    <Text style={[styles.gameReward, { color: theme.accent }]}>
                      Reward: ⚡{gameConfig.energy_reward}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.dailyLimitInfo}>
              <Text style={[styles.dailyLimitText, { color: theme.textSecondary }]}>
                Energy Points: ⚡{dashboard?.energy_points ?? 0} • Games Played: {stats.gamesPlayed}
              </Text>
            </View>
          </View>
        </AnimatedCard>

        {/* Quick Actions */}
        <AnimatedCard delay={1000}>
          <View style={styles.quickActions}>
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: theme.card, borderColor: theme.border }]}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={theme.gradient.primary as [string, string, ...string[]]}
                style={styles.actionGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.actionText}>Explore All Opportunities</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </AnimatedCard>
      </ScrollView>
      
      {/* Game Modals */}
      <Modal
        visible={activeGame === 'color-match'}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <ColorMatchGame
          onGameEnd={handleGameEnd}
          onClose={() => setActiveGame(null)}
        />
      </Modal>

      <Modal
        visible={activeGame === 'image-similarity'}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <ImageSimilarityGame
          onGameEnd={handleGameEnd}
          onClose={() => setActiveGame(null)}
        />
      </Modal>

      <Modal
        visible={activeGame === 'math-quiz'}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <MathQuizGame
          onGameEnd={handleGameEnd}
          onClose={() => setActiveGame(null)}
        />
      </Modal>

      <Modal
        visible={activeGame === 'memory-pattern'}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <MemoryPatternGame
          onGameEnd={handleGameEnd}
          onClose={() => setActiveGame(null)}
        />
      </Modal>

      {/* Game Completion Popup */}
      <ThemedPopup
        visible={showCooldownPopup}
        title={popupTitle}
        message={cooldownMessage}
        onConfirm={() => setShowCooldownPopup(false)}
        confirmText="OK"
      />
    </SafeAreaView>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    marginBottom: 20,
  },
  headerGradient: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 50,
    height: HEADER_HEIGHT,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  nameText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 16,
  },
  todayEarnings: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 16,
  },
  earningsLabel: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  earningsValue: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#ffffff',
    marginLeft: 8,
  },
  earningsWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  energyPointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
    width: '100%',
  },
  energyPointsLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  energyPointsValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  statsContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    padding: 20,
    borderRadius: 16,
    marginHorizontal: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  statIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statIconText: {
    fontSize: 20,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statValueWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  chartSection: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  chartContainer: {
    flex: 1,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 120,
    justifyContent: 'space-between',
  },
  chartBar: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 2,
  },
  bar: {
    width: '80%',
    borderRadius: 4,
    marginBottom: 8,
  },
  chartLabel: {
    fontSize: 12,
  },
  activitiesSection: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.borderLight,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.primaryLight + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activityIconText: {
    fontSize: 16,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 14,
  },
  activityPoints: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  quickActions: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  actionButton: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
  },
  actionGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  actionText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Games Section Styles
  gamesSection: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  gamesSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  pointsDisplay: {
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  pointsText: {
    fontSize: 14,
    fontWeight: '600',
  },
  gamesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  gameCard: {
    width: '48%',
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  gameIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  gameIconText: {
    fontSize: 24,
  },
  gameTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  gameDescription: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 12,
  },
  playButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginBottom: 8,
  },
  playButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  cooldownText: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 8,
  },
  gameReward: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
  dailyLimitInfo: {
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(102, 126, 234, 0.2)',
  },
  dailyLimitText: {
    fontSize: 12,
    textAlign: 'center',
  },
});
