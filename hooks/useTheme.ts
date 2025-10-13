import { useColorScheme } from 'react-native';
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect } from 'react';

export interface Theme {
  background: string;
  card: string;
  text: string;
  textSecondary: string;
  primary: string;
  primaryLight: string;
  border: string;
  borderLight: string;
  placeholder: string;
  accent: string;
  success: string;
  error: string;
  warning: string;
  gradient: {
    primary: string[];
    secondary: string[];
  };
}

const lightTheme: Theme = {
  background: '#ffffff',
  card: '#f8f9fa',
  text: '#1a1a1a',
  textSecondary: '#666666',
  primary: '#6a5acd',
  primaryLight: '#8a7fe8',
  border: '#e1e5e9',
  borderLight: '#f0f0f0',
  placeholder: '#999999',
  accent: '#ff6b6b',
  success: '#51cf66',
  error: '#ff6b6b',
  warning: '#ffd43b',
  gradient: {
    primary: ['#6a5acd', '#8a7fe8'],
    secondary: ['#667eea', '#764ba2'],
  },
};

const darkTheme: Theme = {
  background: '#121212',
  card: '#1e1e1e',
  text: '#ffffff',
  textSecondary: '#b3b3b3',
  primary: '#8a7fe8',
  primaryLight: '#a294f0',
  border: '#333333',
  borderLight: '#2a2a2a',
  placeholder: '#666666',
  accent: '#ff7979',
  success: '#00b894',
  error: '#ff7675',
  warning: '#fdcb6e',
  gradient: {
    primary: ['#8a7fe8', '#a294f0'],
    secondary: ['#74b9ff', '#0984e3'],
  },
};

interface ThemeState {
  isDarkMode: boolean | null; // null means follow system
  setDarkMode: (isDark: boolean | null) => void;
  toggleDarkMode: () => void;
  initializeTheme: () => Promise<void>;
}

const useThemeStore = create<ThemeState>((set, get) => ({
  isDarkMode: null,
  setDarkMode: async (isDark: boolean | null) => {
    set({ isDarkMode: isDark });
    if (isDark === null) {
      await AsyncStorage.removeItem('theme_preference');
    } else {
      await AsyncStorage.setItem('theme_preference', isDark ? 'dark' : 'light');
    }
  },
  toggleDarkMode: () => {
    const { isDarkMode } = get();
    const newMode = isDarkMode === null ? true : !isDarkMode;
    get().setDarkMode(newMode);
  },
  initializeTheme: async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('theme_preference');
      if (savedTheme) {
        set({ isDarkMode: savedTheme === 'dark' });
      } else {
        set({ isDarkMode: null });
      }
    } catch (error) {
      set({ isDarkMode: null });
    }
  },
}));

export const useTheme = (): Theme & { 
  isDarkMode: boolean | null; 
  setDarkMode: (isDark: boolean | null) => void;
  toggleDarkMode: () => void;
} => {
  const systemColorScheme = useColorScheme();
  const { isDarkMode, setDarkMode, toggleDarkMode, initializeTheme } = useThemeStore();

  useEffect(() => {
    initializeTheme();
  }, []);

  // Determine effective dark mode
  const effectiveDarkMode = isDarkMode !== null ? isDarkMode : systemColorScheme === 'dark';
  
  const theme = effectiveDarkMode ? darkTheme : lightTheme;

  return {
    ...theme,
    isDarkMode,
    setDarkMode,
    toggleDarkMode,
  };
};