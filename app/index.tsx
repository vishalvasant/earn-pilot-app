import { useEffect } from 'react';
import { View, StatusBar, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../stores/authStore';
import SplashScreen from './SplashScreen';
import { useTheme } from '../hooks/useTheme';

export default function IndexPage() {
  const router = useRouter();
  const bootstrapped = useAuthStore((s) => s.bootstrapped);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const theme = useTheme();

  useEffect(() => {
    const timer = setTimeout(() => {
      bootstrap();
    }, 2500); // 2.5 seconds
    return () => clearTimeout(timer);
  }, [bootstrap]);

  useEffect(() => {
    if (bootstrapped) {
      if (isAuthenticated) {
        router.replace('/(tabs)/home');
      } else {
        router.replace('/(auth)/login');
      }
    }
  }, [bootstrapped, isAuthenticated, router]);

  if (!bootstrapped) {
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