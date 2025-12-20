import { useEffect, useState } from 'react';
import { View, StatusBar, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import SplashScreen from './SplashScreen';
import { useTheme } from '../hooks/useTheme';
import { useAuthStore } from '../stores/authStore';

export default function IndexPage() {
  const router = useRouter();
  const [showSplash, setShowSplash] = useState(true);
  const theme = useTheme();
  const { bootstrapped, isAuthenticated, bootstrap } = useAuthStore();

  useEffect(() => {
    // Bootstrap auth state from AsyncStorage
    bootstrap().then(() => {
      const timer = setTimeout(() => {
        setShowSplash(false);
        // Route based on authentication
        if (isAuthenticated) {
          router.replace('/(tabs)/home');
        } else {
          router.replace('/(auth)/login');
        }
      }, 2500); // 2.5 seconds
      return () => clearTimeout(timer);
    });
  }, [router, isAuthenticated, bootstrap]);

  if (showSplash) {
    return <SplashScreen />;
  }
  return <View style={{ flex: 1, backgroundColor: theme.background }} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 40,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    marginHorizontal: 4,
  },
  dot1: {},
  dot2: {},
  dot3: {},
});