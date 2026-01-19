import React, { useEffect, useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  SafeAreaView,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
  Dimensions,
  StatusBar,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { themeColors, typography, spacing, borderRadius } from '../../hooks/useThemeColors';
import { useAuthStore } from '../../stores/authStore';

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { googleSignIn } = useAuthStore();

  const logoPulse = useRef(new Animated.Value(1)).current;

  // Animated pulse for logo
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoPulse, {
          toValue: 1.05,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(logoPulse, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      await googleSignIn();
      // Navigate to home after successful sign-in
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainApp' }],
      } as any);
    } catch (err: any) {
      console.error('Sign-in error:', err);
      setError(err.message || 'Failed to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#0a1931', themeColors.bgDark]}
      start={{ x: 1, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" backgroundColor={themeColors.bgDark} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <SafeAreaView style={styles.flex}>
          {/* Glow Background */}
          <View
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: 400,
              height: 400,
              borderRadius: 200,
              backgroundColor: themeColors.blueGlowMedium,
              opacity: 0.08,
            }}
          />

          {/* Content */}
          <View style={styles.content}>
            {/* Logo */}
            <Animated.View
              style={{
                transform: [{ scale: logoPulse }],
                marginBottom: spacing['3xl'],
              }}
            >
              <Text style={styles.logo}>
                Earn<Text style={styles.logoPilot}>Pilot</Text>
              </Text>
              <Text style={styles.tagline}>Earn Like Pro</Text>
            </Animated.View>

            {/* Description */}
            <View style={styles.descriptionContainer}>
              <Text style={styles.descriptionText}>
                Sign in with your Google account to get started
              </Text>
            </View>

            {/* Google Sign-In Button */}
            <TouchableOpacity
              onPress={handleGoogleSignIn}
              disabled={loading}
              activeOpacity={0.8}
              style={styles.googleButtonContainer}
            >
              <LinearGradient
                colors={[themeColors.primaryBlue, themeColors.deepBlue]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.googleButtonGradient}
              >
                {loading ? (
                  <ActivityIndicator color={themeColors.bgDark} size="small" />
                ) : (
                  <Text style={styles.googleButtonText}>Sign in with Google</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Error Message */}
            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Info Text */}
            <View style={styles.infoContainer}>
              <Text style={styles.infoText}>
                We use your Google account to keep your progress safe and secure.
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.bgDark,
  },
  flex: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing['3xl'],
  },
  logo: {
    fontSize: typography['5xl'],
    fontWeight: '800',
    letterSpacing: -1,
    color: themeColors.textMain,
    textAlign: 'center',
  },
  logoPilot: {
    color: themeColors.primaryBlue,
  },
  tagline: {
    fontSize: typography.base,
    fontWeight: '600',
    color: themeColors.textDim,
    textAlign: 'center',
    letterSpacing: 1,
    marginTop: spacing.md,
  },
  descriptionContainer: {
    marginVertical: spacing['2xl'],
  },
  descriptionText: {
    fontSize: typography.base,
    color: themeColors.textDim,
    textAlign: 'center',
    lineHeight: 24,
  },
  googleButtonContainer: {
    marginVertical: spacing['2xl'],
  },
  googleButtonGradient: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing['2xl'],
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleButtonText: {
    color: themeColors.bgDark,
    fontSize: typography.lg,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginVertical: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  errorText: {
    fontSize: typography.sm,
    color: '#FECACA',
    fontWeight: '600',
  },
  infoContainer: {
    marginVertical: spacing['2xl'],
  },
  infoText: {
    fontSize: typography.sm,
    color: themeColors.textDim,
    textAlign: 'center',
    lineHeight: 20,
  },
});
