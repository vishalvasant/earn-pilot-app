import React, { useEffect, useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  SafeAreaView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StyleSheet,
  Dimensions,
  StatusBar,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { themeColors, typography, spacing, borderRadius } from '../../hooks/useThemeColors';
import { useAuthStore } from '../../stores/authStore';

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { googleSignIn, emailSignIn } = useAuthStore();

  const logoPulse = useRef(new Animated.Value(1)).current;
  const progressBarWidth = useRef(new Animated.Value(0)).current;

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

  // Animated progress bar
  useEffect(() => {
    if (loading) {
      // Reset and start animation
      progressBarWidth.setValue(0);
      Animated.loop(
        Animated.sequence([
          Animated.timing(progressBarWidth, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: false,
          }),
          Animated.timing(progressBarWidth, {
            toValue: 0,
            duration: 0,
            useNativeDriver: false,
          }),
        ])
      ).start();
    } else {
      // Stop animation
      progressBarWidth.setValue(0);
    }
  }, [loading]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    await new Promise(resolve => setTimeout(resolve, 100));
    try {
      await googleSignIn();
    } catch (err: any) {
      console.error('Sign-in error:', err);
      setError(err.message || 'Failed to sign in. Please try again.');
      setLoading(false);
    }
  };

  const handleEmailSignIn = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError('Please enter email and password.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await emailSignIn(trimmedEmail, password);
    } catch (err: any) {
      setError(err.message || 'Sign in failed. Please try again.');
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
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
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

            {!showEmailForm ? (
              <>
                <View style={styles.descriptionContainer}>
                  <Text style={styles.descriptionText}>
                    Sign in with Google or use credentials created by your admin
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={handleGoogleSignIn}
                  disabled={loading}
                  activeOpacity={0.8}
                  style={[styles.googleButtonContainer, loading && styles.googleButtonDisabled]}
                >
                  <LinearGradient
                    colors={[themeColors.primaryBlue, themeColors.deepBlue]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.googleButtonGradient}
                  >
                    <Text style={styles.googleButtonText}>Sign in with Google</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => { setShowEmailForm(true); setError(''); setEmail(''); setPassword(''); }}
                  disabled={loading}
                  style={styles.emailToggleButton}
                >
                  <Text style={styles.emailToggleText}>Sign in with Email</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.descriptionContainer}>
                  <Text style={styles.descriptionText}>
                    Enter the email and password provided by your admin
                  </Text>
                </View>

                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor={themeColors.textDim}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
                <TextInput
                  style={[styles.input, { marginTop: spacing.md }]}
                  placeholder="Password"
                  placeholderTextColor={themeColors.textDim}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  editable={!loading}
                />

                <TouchableOpacity
                  onPress={handleEmailSignIn}
                  disabled={loading}
                  activeOpacity={0.8}
                  style={[styles.googleButtonContainer, loading && styles.googleButtonDisabled]}
                >
                  <LinearGradient
                    colors={[themeColors.primaryBlue, themeColors.deepBlue]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.googleButtonGradient}
                  >
                    <Text style={styles.googleButtonText}>Sign in</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => { setShowEmailForm(false); setError(''); }}
                  disabled={loading}
                  style={styles.emailToggleButton}
                >
                  <Text style={styles.emailToggleText}>Back to Google sign in</Text>
                </TouchableOpacity>
              </>
            )}

            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.infoContainer}>
              <Text style={styles.infoText}>
                {showEmailForm
                  ? 'Use the email and password your admin gave you.'
                  : 'We use your Google account or admin-created credentials to keep your progress safe.'}
              </Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>

      {/* Loading Overlay - Full screen to cover native Google Sign-In UI */}
      <Modal
        visible={loading}
        transparent
        animationType="fade"
        statusBarTranslucent
        hardwareAccelerated
      >
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator 
              size="large" 
              color={themeColors.primaryBlue}
              style={styles.loadingSpinner}
            />
            <Text style={styles.loadingText}>Loading</Text>
            {/* Progress Bar */}
            <View style={styles.progressBarContainer}>
              <Animated.View
                style={[
                  styles.progressBar,
                  {
                    width: progressBarWidth.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
          </View>
        </View>
      </Modal>
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
  googleButtonDisabled: {
    opacity: 0.6,
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
  emailToggleButton: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  emailToggleText: {
    color: themeColors.primaryBlue,
    fontSize: typography.base,
    fontWeight: '600',
  },
  input: {
    backgroundColor: themeColors.surface,
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    fontSize: typography.base,
    color: themeColors.textMain,
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
  loadingOverlay: {
    flex: 1,
    backgroundColor: themeColors.bgDark,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    elevation: 9999,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing['3xl'],
    backgroundColor: themeColors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: themeColors.border,
    minWidth: 200,
  },
  loadingSpinner: {
    marginBottom: spacing.xl,
  },
  loadingText: {
    fontSize: typography.lg,
    fontWeight: '600',
    color: themeColors.textMain,
    letterSpacing: 0.5,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  progressBarContainer: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(0, 209, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: spacing.md,
  },
  progressBar: {
    height: '100%',
    backgroundColor: themeColors.primaryBlue,
    borderRadius: 2,
  },
});
