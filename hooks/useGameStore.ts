import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';

interface GameStats {
  gamesPlayed: number;
  colorMatchHighScore: number;
  imageSimilarityHighScore: number;
  mathQuizHighScore: number;
  memoryPatternHighScore: number;
  lastPlayDate: string;
}

interface GameConfig {
  id: number;
  name: string;
  slug: string;
  description: string;
  logo_url?: string;
  play_duration_minutes: number;
  energy_reward: number;
  daily_play_limit: number;
  play_cooldown_seconds: number;
  is_active?: boolean;
}

interface GameStore {
  stats: GameStats;
  gameConfigs: GameConfig[];
  loadStats: () => Promise<void>;
  loadGameConfigs: () => Promise<void>;
  addPoints: (points: number, gameType: 'color-match' | 'image-similarity' | 'math-quiz' | 'memory-pattern') => Promise<void>;
  resetDailyPoints: () => void;
  canPlayGame: (gameType: string) => boolean;
  getGameCooldown: (gameType: string) => number;
  getGameConfig: (gameType: string) => GameConfig | null;
  getUserGameStats: (gameType: string) => { played: number; lastPlayTime: number };
  lastGameTimes: Record<string, number>;
  userGameStats: Record<string, { played: number; lastPlayTime: number }>;
}

export const useGameStore = create<GameStore>((set, get) => ({
  stats: {
    gamesPlayed: 0,
    colorMatchHighScore: 0,
    imageSimilarityHighScore: 0,
    mathQuizHighScore: 0,
    memoryPatternHighScore: 0,
    lastPlayDate: new Date().toDateString(),
  },
  gameConfigs: [],
  lastGameTimes: {},
  userGameStats: {},

  loadGameConfigs: async () => {
    try {
      const response = await api.get('/games');
      const configs = response.data.games || [];
      set({ gameConfigs: configs });
    } catch (error) {
      console.error('Error loading game configs:', error);
    }
  },

  loadStats: async () => {
    try {
      const statsData = await AsyncStorage.getItem('gameStats');
      const lastGameTimes = await AsyncStorage.getItem('lastGameTimes');
      const userGameStats = await AsyncStorage.getItem('userGameStats');
      
      if (statsData) {
        const stats = JSON.parse(statsData);
        const today = new Date().toDateString();
        
        // Reset daily points if it's a new day
        if (stats.lastPlayDate !== today) {
          stats.lastPlayDate = today;
        }
        
        set({ 
          stats,
          lastGameTimes: lastGameTimes ? JSON.parse(lastGameTimes) : {},
          userGameStats: userGameStats ? JSON.parse(userGameStats) : {}
        });
      }
    } catch (error) {
      console.error('Error loading game stats:', error);
    }
  },

  getGameConfig: (gameType: string) => {
    const { gameConfigs } = get();
    return gameConfigs.find(config => config.slug === gameType) || null;
  },

  getUserGameStats: (gameType: string) => {
    const { userGameStats } = get();
    return userGameStats[gameType] || { played: 0, lastPlayTime: 0 };
  },

  addPoints: async (points: number, gameType: 'color-match' | 'image-similarity' | 'math-quiz' | 'memory-pattern') => {
    const { stats, lastGameTimes, userGameStats } = get();
    const gameConfig = get().getGameConfig(gameType);
    const now = Date.now();
    
    if (!gameConfig) {
      console.error('Game config not found for:', gameType);
      return;
    }
    
    // For system games, we only track play counts and times, not points
    // Points are handled by the backend energy system
    const newStats = {
      ...stats,
      gamesPlayed: stats.gamesPlayed + 1,
      lastPlayDate: new Date().toDateString(),
    };

    // Update high scores with the game score (not energy points)
    if (gameType === 'color-match' && points > stats.colorMatchHighScore) {
      newStats.colorMatchHighScore = points;
    } else if (gameType === 'image-similarity' && points > stats.imageSimilarityHighScore) {
      newStats.imageSimilarityHighScore = points;
    } else if (gameType === 'math-quiz' && points > stats.mathQuizHighScore) {
      newStats.mathQuizHighScore = points;
    } else if (gameType === 'memory-pattern' && points > stats.memoryPatternHighScore) {
      newStats.memoryPatternHighScore = points;
    }

    // Update last game time and user stats for cooldown tracking
    const newLastGameTimes = {
      ...lastGameTimes,
      [gameType]: now,
    };

    const currentUserStats = userGameStats[gameType] || { played: 0, lastPlayTime: 0 };
    const newUserGameStats = {
      ...userGameStats,
      [gameType]: {
        played: currentUserStats.played + 1,
        lastPlayTime: now
      }
    };

    set({ 
      stats: newStats,
      lastGameTimes: newLastGameTimes,
      userGameStats: newUserGameStats
    });

    // Save to AsyncStorage
    try {
      await AsyncStorage.setItem('gameStats', JSON.stringify(newStats));
      await AsyncStorage.setItem('lastGameTimes', JSON.stringify(newLastGameTimes));
      await AsyncStorage.setItem('userGameStats', JSON.stringify(newUserGameStats));
    } catch (error) {
      console.error('Error saving game stats:', error);
    }
  },

  resetDailyPoints: () => {
    const { stats } = get();
    const newStats = {
      ...stats,
      lastPlayDate: new Date().toDateString(),
    };
    set({ stats: newStats });
  },

  canPlayGame: (gameType: string) => {
    const { lastGameTimes, userGameStats } = get();
    const gameConfig = get().getGameConfig(gameType);
    
    if (!gameConfig || gameConfig.is_active === false) {
      return false;
    }
    
    const lastPlayTime = lastGameTimes[gameType] || 0;
    const now = Date.now();
    const cooldownMs = (gameConfig.play_cooldown_seconds || 0) * 1000;
    
    // Check cooldown
    if (now - lastPlayTime < cooldownMs) {
      return false;
    }
    
    // Check daily limit based on user game stats
    const userStats = userGameStats[gameType] || { played: 0, lastPlayTime: 0 };
    const dailyLimit = gameConfig.daily_play_limit || 10;
    
    // Check if user has exceeded daily limit (simplified - could be enhanced to check actual day)
    const today = new Date().toDateString();
    const lastPlayDate = userStats.lastPlayTime ? new Date(userStats.lastPlayTime).toDateString() : '';
    
    // Reset count if it's a new day
    if (lastPlayDate !== today) {
      return true; // New day, can play
    }
    
    if (userStats.played >= dailyLimit) {
      return false;
    }
    
    return true;
  },

  getGameCooldown: (gameType: string) => {
    const { lastGameTimes } = get();
    const gameConfig = get().getGameConfig(gameType);
    
    if (!gameConfig) return 0;
    
    const lastPlayTime = lastGameTimes[gameType] || 0;
    const now = Date.now();
    const cooldownMs = (gameConfig.play_cooldown_seconds || 0) * 1000;
    const remaining = cooldownMs - (now - lastPlayTime);
    
    return Math.max(0, remaining);
  },
}));