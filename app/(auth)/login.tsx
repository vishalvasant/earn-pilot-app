import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
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
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { themeColors, typography, spacing, borderRadius } from '../../hooks/useThemeColors';
import { sendOtp, verifyOtp } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import ThemedPopup from '../../components/ThemedPopup';

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState('');

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

  const handleSendOtp = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      setError('Please enter a valid phone number');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await sendOtp(phoneNumber);
      setOtpSent(true);
      setStep('otp');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send OTP. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length < 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await verifyOtp({
        phone: phoneNumber,
        otp: otp,
      });
      
      if (response.success && response.token) {
        // Save token to auth store
        await useAuthStore.getState().setAuth({ token: response.token });
        router.replace('/(tabs)/home');
      } else {
        setError(response.message || 'Invalid OTP. Please try again.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Verification failed. Please try again.');
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

            {step === 'phone' ? (
              <>
                {/* Phone Input Section */}
                <View style={styles.inputSection}>
                  <Text style={styles.label}>Enter Your Phone Number</Text>
                  <View style={styles.phoneInputContainer}>
                    <Text style={styles.countryCode}>+91</Text>
                    <TextInput
                      style={styles.phoneInput}
                      placeholder="9876543210"
                      placeholderTextColor={themeColors.textDim}
                      keyboardType="phone-pad"
                      value={phoneNumber}
                      onChangeText={(text) => {
                        setPhoneNumber(text);
                        setError('');
                      }}
                      editable={!loading}
                      maxLength={10}
                    />
                  </View>
                  {error ? <Text style={styles.errorText}>{error}</Text> : null}
                </View>

                {/* Send OTP Button */}
                <TouchableOpacity
                  onPress={handleSendOtp}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={[themeColors.primaryBlue, themeColors.deepBlue]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.button}
                  >
                    {loading ? (
                      <ActivityIndicator color={themeColors.bgDark} size="small" />
                    ) : (
                      <Text style={styles.buttonText}>Send OTP</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                {/* Divider */}
                <View style={styles.dividerContainer}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>OR</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* Sign in with Google Button */}
                <TouchableOpacity
                  onPress={() => {
                    // TODO: Implement Google Sign-in with react-native-google-signin
                    console.log('Google Sign-in not yet implemented');
                  }}
                  activeOpacity={0.8}
                >
                  <View style={styles.googleButton}>
                    <Image
                      source={require('../../assets/images/google-icon.png')}
                      style={styles.googleLogo}
                    />
                    <Text style={styles.googleButtonText}>Continue with Google</Text>
                  </View>
                </TouchableOpacity>

                {/* Info Footer */}
                <View style={styles.infoFooter}>
                  <Text style={styles.infoText}>🔒 ENCRYPTED SMART WALLET</Text>
                </View>
              </>
            ) : (
              <>
                {/* OTP Input Section */}
                <View style={styles.inputSection}>
                  <Text style={styles.label}>Verify OTP</Text>
                  <Text style={styles.subLabel}>
                    Enter the OTP sent to +91{phoneNumber}
                  </Text>
                  <TextInput
                    style={styles.otpInput}
                    placeholder="000000"
                    placeholderTextColor={themeColors.textDim}
                    keyboardType="number-pad"
                    value={otp}
                    onChangeText={(text) => {
                      setOtp(text);
                      setError('');
                    }}
                    editable={!loading}
                    maxLength={6}
                  />
                  {error ? <Text style={styles.errorText}>{error}</Text> : null}
                </View>

                {/* Verify Button */}
                <TouchableOpacity
                  onPress={handleVerifyOtp}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={[themeColors.primaryBlue, themeColors.deepBlue]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.button}
                  >
                    {loading ? (
                      <ActivityIndicator color={themeColors.bgDark} size="small" />
                    ) : (
                      <Text style={styles.buttonText}>Verify & Login</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                {/* Back Button */}
                <TouchableOpacity
                  onPress={() => {
                    setStep('phone');
                    setOtp('');
                    setOtpSent(false);
                    setError('');
                  }}
                >
                  <Text style={styles.backText}>← Back to Phone</Text>
                </TouchableOpacity>
              </>
            )}
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
    backgroundImage: `linear-gradient(135deg, ${themeColors.primaryBlue} 0%, ${themeColors.deepBlue} 100%)`,
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
  inputSection: {
    marginVertical: spacing['3xl'],
  },
  label: {
    fontSize: typography.lg,
    fontWeight: '700',
    color: themeColors.textMain,
    marginBottom: spacing.md,
  },
  subLabel: {
    fontSize: typography.sm,
    color: themeColors.textDim,
    marginBottom: spacing.lg,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeColors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: themeColors.border,
    paddingHorizontal: spacing.lg,
    overflow: 'hidden',
  },
  countryCode: {
    fontSize: typography.lg,
    fontWeight: '700',
    color: themeColors.textMain,
    marginRight: spacing.md,
  },
  phoneInput: {
    flex: 1,
    paddingVertical: spacing.lg,
    fontSize: typography.lg,
    color: themeColors.textMain,
    fontWeight: '600',
  },
  otpInput: {
    backgroundColor: themeColors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: themeColors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    fontSize: typography['2xl'],
    fontWeight: '700',
    color: themeColors.textMain,
    letterSpacing: spacing.md,
    textAlign: 'center',
  },
  errorText: {
    fontSize: typography.sm,
    color: '#EF4444',
    marginTop: spacing.md,
    fontWeight: '600',
  },
  button: {
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.lg,
    shadowColor: themeColors.primaryBlue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonText: {
    fontSize: typography.lg,
    fontWeight: '800',
    color: themeColors.bgDark,
    letterSpacing: 0.5,
  },
  backText: {
    fontSize: typography.base,
    color: themeColors.primaryBlue,
    textAlign: 'center',
    fontWeight: '700',
    marginTop: spacing.lg,
  },
  infoFooter: {
    position: 'absolute',
    bottom: spacing['2xl'],
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  infoText: {
    fontSize: typography.xs,
    color: themeColors.textDim,
    letterSpacing: 1.5,
    fontWeight: '700',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing['2xl'],
    gap: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: themeColors.border,
  },
  dividerText: {
    fontSize: typography.xs,
    color: themeColors.textDim,
    fontWeight: '700',
    letterSpacing: 1,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: themeColors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1.5,
    borderColor: themeColors.primaryBlue,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing['2xl'],
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  googleIcon: {
    fontSize: typography.xl,
    fontWeight: '800',
    color: themeColors.primaryBlue,
    width: 24,
    height: 24,
    textAlign: 'center',
    lineHeight: 24,
  },
  googleLogo: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
  googleButtonText: {
    fontSize: typography.lg,
    fontWeight: '700',
    color: themeColors.primaryBlue,
    letterSpacing: 0.5,
  },
});
