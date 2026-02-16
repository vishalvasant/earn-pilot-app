import React, { useState } from 'react';
import {
  SafeAreaView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import { themeColors, typography, spacing, borderRadius } from '../../hooks/useThemeColors';
import { submitReferralCode } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { useUserStore } from '../../stores/userStore';

export default function ReferralCodeScreen() {
  const navigation = useNavigation<any>();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const setAuth = useAuthStore((s) => s.setAuth);
  const token = useAuthStore((s) => s.token);
  const clearNewUserPendingReferral = useAuthStore((s) => s.clearNewUserPendingReferral);
  const setProfile = useUserStore((s) => s.setProfile);

  const goToHome = () => {
    clearNewUserPendingReferral();
    // If we're inside Auth stack (e.g. from deep link), navigate to MainApp; otherwise RootStack will re-render to MainApp
    try {
      navigation.reset({ index: 0, routes: [{ name: 'MainApp' }] });
    } catch {
      // When shown from RootStack, MainApp isn't in stack; clearing flag is enough
    }
  };

  const handleSkip = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await submitReferralCode();
      if (data?.user) {
        setProfile(data.user);
        if (token) {
          setAuth({ token, user: data.user });
        }
      }
      goToHome();
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await submitReferralCode(code.trim() || undefined);
      if (data?.user) {
        setProfile(data.user);
        if (token) {
          setAuth({ token, user: data.user });
        }
      }
      goToHome();
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Invalid referral code');
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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <SafeAreaView style={styles.flex}>
          <View style={styles.content}>
            <Text style={styles.title}>Have a referral code?</Text>
            <Text style={styles.subtitle}>
              Enter a friend's code to get bonus points. You can skip this step.
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Enter referral code (optional)"
              placeholderTextColor={themeColors.textDim}
              value={code}
              onChangeText={(t) => { setCode(t); setError(''); }}
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!loading}
            />

            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              onPress={handleApply}
              disabled={loading}
              activeOpacity={0.8}
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
            >
              <LinearGradient
                colors={[themeColors.primaryBlue, themeColors.deepBlue]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.primaryButtonGradient}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Apply</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSkip}
              disabled={loading}
              activeOpacity={0.8}
              style={[styles.skipButton, loading && styles.buttonDisabled]}
            >
              <Text style={styles.skipButtonText}>Skip</Text>
            </TouchableOpacity>
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
  title: {
    fontSize: typography['2xl'],
    fontWeight: '800',
    color: themeColors.textMain,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  subtitle: {
    fontSize: typography.base,
    color: themeColors.textDim,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing['2xl'],
  },
  input: {
    backgroundColor: themeColors.surface,
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    fontSize: typography.lg,
    color: themeColors.textMain,
    marginBottom: spacing.xl,
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  errorText: {
    fontSize: typography.sm,
    color: '#FECACA',
    fontWeight: '600',
  },
  primaryButton: {
    marginBottom: spacing.lg,
  },
  primaryButtonGradient: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing['2xl'],
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  primaryButtonText: {
    color: themeColors.bgDark,
    fontSize: typography.lg,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  skipButton: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: typography.base,
    color: themeColors.textDim,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
