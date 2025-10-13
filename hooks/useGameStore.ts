import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface GameStats {
  totalPoints: number;
  gamesPlayed: number;
  colorMatchHighScore: number;
  imageSimilarityHighScore: number;
  mathQuizHighScore: number;
  memoryPatternHighScore: number;
  dailyPoints: number;
  lastPlayDate: string;
}

interface GameStore {
  stats: GameStats;
  loadStats: () => Promise<void>;
  addPoints: (points: number, gameType: 'color-match' | 'image-similarity' | 'math-quiz' | 'memory-pattern') => Promise<void>;
  resetDailyPoints: () => void;
  canPlayGame: (gameType: string) => boolean;
  getGameCooldown: (gameType: string) => number;
  lastGameTimes: Record<string, number>;
}

const GAME_COOLDOWN = 5 * 60 * 1000; // 5 minutes in milliseconds
const DAILY_LIMIT = 100; // Maximum points per day

export const useGameStore = create<GameStore>((set, get) => ({
  stats: {
    totalPoints: 0,
    gamesPlayed: 0,
    colorMatchHighScore: 0,
    imageSimilarityHighScore: 0,
    mathQuizHighScore: 0,
    memoryPatternHighScore: 0,
    dailyPoints: 0,
    lastPlayDate: new Date().toDateString(),
  },
  lastGameTimes: {},

  loadStats: async () => {
    try {
      const statsData = await AsyncStorage.getItem('gameStats');
      const lastGameTimes = await AsyncStorage.getItem('lastGameTimes');
      
      if (statsData) {
        const stats = JSON.parse(statsData);
        const today = new Date().toDateString();
        
        // Reset daily points if it's a new day
        if (stats.lastPlayDate !== today) {
          stats.dailyPoints = 0;
          stats.lastPlayDate = today;
        }
        
        set({ 
          stats,
          lastGameTimes: lastGameTimes ? JSON.parse(lastGameTimes) : {}
        });
      }
    } catch (error) {
      console.error('Error loading game stats:', error);
    }
  },

  addPoints: async (points: number, gameType: 'color-match' | 'image-similarity' | 'math-quiz' | 'memory-pattern') => {
    const { stats, lastGameTimes } = get();
    const now = Date.now();
    
    // Check daily limit
    const newDailyPoints = Math.min(stats.dailyPoints + points, DAILY_LIMIT);
    const actualPointsEarned = newDailyPoints - stats.dailyPoints;
    
    const newStats = {
      ...stats,
      totalPoints: stats.totalPoints + actualPointsEarned,
      gamesPlayed: stats.gamesPlayed + 1,
      dailyPoints: newDailyPoints,
      lastPlayDate: new Date().toDateString(),
    };

    // Update high scores
    if (gameType === 'color-match' && points > stats.colorMatchHighScore) {
      newStats.colorMatchHighScore = points;
    } else if (gameType === 'image-similarity' && points > stats.imageSimilarityHighScore) {
      newStats.imageSimilarityHighScore = points;
    } else if (gameType === 'math-quiz' && points > stats.mathQuizHighScore) {
      newStats.mathQuizHighScore = points;
    } else if (gameType === 'memory-pattern' && points > stats.memoryPatternHighScore) {
      newStats.memoryPatternHighScore = points;
    }

    // Update last game time for cooldown
    const newLastGameTimes = {
      ...lastGameTimes,
      [gameType]: now,
    };

    set({ 
      stats: newStats,
      lastGameTimes: newLastGameTimes 
    });

    // Save to AsyncStorage
    try {
      await AsyncStorage.setItem('gameStats', JSON.stringify(newStats));
      await AsyncStorage.setItem('lastGameTimes', JSON.stringify(newLastGameTimes));
    } catch (error) {
      console.error('Error saving game stats:', error);
    }
  },

  resetDailyPoints: () => {
    const { stats } = get();
    const newStats = {
      ...stats,
      dailyPoints: 0,
      lastPlayDate: new Date().toDateString(),
    };
    set({ stats: newStats });
  },

  canPlayGame: (gameType: string) => {
    const { lastGameTimes, stats } = get();
    const lastPlayTime = lastGameTimes[gameType] || 0;
    const now = Date.now();
    
    // Check cooldown
    if (now - lastPlayTime < GAME_COOLDOWN) {
      return false;
    }
    
    // Check daily limit
    if (stats.dailyPoints >= DAILY_LIMIT) {
      return false;
    }
    
    return true;
  },

  getGameCooldown: (gameType: string) => {
    const { lastGameTimes } = get();
    const lastPlayTime = lastGameTimes[gameType] || 0;
    const now = Date.now();
    const remaining = GAME_COOLDOWN - (now - lastPlayTime);
    
    return Math.max(0, remaining);
  },
}));