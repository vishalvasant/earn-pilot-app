import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState, useRef, useEffect } from 'react';
import { 
  Alert, 
  SafeAreaView, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  View, 
  StyleSheet,
  Dimensions,
  StatusBar,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Animated,
  Easing
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../hooks/useTheme';
import { useAuthStore } from '../../stores/authStore';
import { useUserStore } from '../../stores/userStore';
import { sendOtp, verifyOtp } from '../../services/api';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import ErrorToast from '../../components/ErrorToast';

const { width, height } = Dimensions.get('window');

export default function VerifyOtpScreen() {
  const { phone: paramPhone } = useLocalSearchParams<{ phone?: string }>();
  const [phone, setPhone] = useState(paramPhone || '');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [name, setName] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);
  const [isNewUser, setIsNewUser] = useState<boolean | null>(null);
  const [verificationAttempted, setVerificationAttempted] = useState(false);
  const [errorToast, setErrorToast] = useState<{ visible: boolean; message: string }>({ visible: false, message: '' });
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const setProfile = useUserStore((s) => s.setProfile);
  const theme = useTheme();
  
  const otpRefs = useRef<(TextInput | null)[]>([]);
  const nameRef = useRef<TextInput>(null);
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  
  // Animation values for OTP boxes
  const scaleAnims = useRef(otp.map(() => new Animated.Value(1))).current;
  
  // Always clear clipboard on mount, and after auto-fill
  useEffect(() => {
    const clearAndCheckClipboard = async () => {
      try {
        // Always clear clipboard first
        await Clipboard.setStringAsync('');
        // Then check clipboard after a short delay (in case user pastes quickly)
        setTimeout(async () => {
          const text = await Clipboard.getStringAsync();
          const otpMatch = text.match(/\b\d{6}\b/);
          if (otpMatch) {
            const otpDigits = otpMatch[0].split('');
            setOtp(otpDigits);
            otpDigits.forEach((_, i) => {
              Animated.sequence([
                Animated.timing(scaleAnims[i], {
                  toValue: 1.1,
                  duration: 100,
                  useNativeDriver: true,
                }),
                Animated.timing(scaleAnims[i], {
                  toValue: 1,
                  duration: 100,
                  useNativeDriver: true,
                }),
              ]).start();
            });
            // Clear clipboard after auto-fill
            await Clipboard.setStringAsync('');
          }
        }, 1000);
      } catch (error) {
        // Clipboard access failed, ignore
      }
    };
    clearAndCheckClipboard();
  }, []);

  // Timer for resend OTP
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const handleOtpChange = (value: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    
    // Animate the box
    Animated.sequence([
      Animated.timing(scaleAnims[index], {
        toValue: 1.15,
        duration: 100,
        easing: Easing.ease,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnims[index], {
        toValue: 1,
        duration: 100,
        easing: Easing.ease,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-move to next input
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }

    // Auto-verify when all 6 digits are entered (only if not new user or name is provided)
    if (newOtp.every(digit => digit !== '') && newOtp.join('').length === 6) {
      if (isNewUser === false || (isNewUser === true && name.trim().length > 0)) {
        handleVerify(newOtp.join(''));
      }
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const showErrorToast = (message: string) => setErrorToast({ visible: true, message });
  const hideErrorToast = () => setErrorToast({ visible: false, message: '' });

  const handleVerify = async (otpCode?: string) => {
    const otpToVerify = otpCode || otp.join('');
    
    if (otpToVerify.length !== 6) {
      showErrorToast('Please enter the complete 6-digit OTP');
      return;
    }

    // First verification attempt - check if user is new or existing
    if (!verificationAttempted) {
      try {
        setLoading(true);
        setVerificationAttempted(true);
        
        // Try to verify without name first (existing user)
        const response = await verifyOtp({
          phone,
          otp: otpToVerify,
        });

        // Success - existing user
        await setAuth({ 
          token: response.token,
          user: response.user
        });
        setProfile(response.user);
        router.replace('/(tabs)/home');
        
      } catch (error: any) {
        console.error('First verification attempt:', error);
        
        // Check if error indicates new user
        const errorMessage = error.response?.data?.message || '';
        
        if (errorMessage.toLowerCase().includes('name') || 
            errorMessage.toLowerCase().includes('required') ||
            error.response?.data?.errors?.name) {
          // New user - show name input field
          setIsNewUser(true);
          Alert.alert(
            'Welcome! 🎉',
            'It looks like you\'re new here. Please enter your name to complete registration.',
            [{ text: 'OK', onPress: () => nameRef.current?.focus() }]
          );
        } else {
          showErrorToast(errorMessage || 'Invalid or expired OTP. Please try again.');
          setOtp(['', '', '', '', '', '']);
          otpRefs.current[0]?.focus();
          setVerificationAttempted(false);
        }
      } finally {
        setLoading(false);
      }
      return;
    }

    // Second verification attempt - with name for new user
    if (isNewUser && name.trim().length === 0) {
      showErrorToast('Please enter your name to continue.');
      nameRef.current?.focus();
      return;
    }

    try {
      setLoading(true);
      
      const response = await verifyOtp({
        phone,
        otp: otpToVerify,
        name: name.trim() || undefined,
        referral_code: referralCode.trim() || undefined,
      });

      // Success
      await setAuth({ 
        token: response.token,
        user: response.user
      });
      setProfile(response.user);
      
      Alert.alert(
        'Success! 🎉',
        `Welcome ${response.user.name}! You've earned ${response.user.points_balance} points.`,
        [
          {
            text: 'Start Earning',
            onPress: () => router.replace('/(tabs)/home')
          }
        ]
      );
      
    } catch (error: any) {
      console.error('Verification error:', error);
      const errorMessage = error.response?.data?.message 
        || error.response?.data?.errors?.otp?.[0]
        || error.response?.data?.errors?.name?.[0]
        || 'Verification failed. Please try again.';
      showErrorToast(errorMessage);
      
      // If OTP is invalid/expired, reset for retry
      if (errorMessage.toLowerCase().includes('otp') || 
          errorMessage.toLowerCase().includes('expired')) {
        setOtp(['', '', '', '', '', '']);
        setTimeout(() => {
          otpRefs.current[0]?.focus();
        }, 120);
        setVerificationAttempted(false);
        setIsNewUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!phone) {
      showErrorToast('Phone number is required');
      return;
    }

    try {
      setLoading(true);
      const response = await sendOtp(phone);
      
      if (response.success) {
        setResendTimer(30);
        setOtp(['', '', '', '', '', '']);
        setVerificationAttempted(false);
        setIsNewUser(null);
        otpRefs.current[0]?.focus();
        
        // Remove dev mode OTP display
        if (response.otp) {
          // Do not show dev OTP in production/client video
          // Alert.alert('OTP Resent (Dev Mode)', `New OTP: ${response.otp}\n\n${response.message}`);
        } else {
          Alert.alert('Success', 'OTP has been resent to your phone.');
        }
      }
    } catch (error: any) {
      showErrorToast('Failed to resend OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Add this useEffect after all useState/useRef declarations
  useEffect(() => {
    if (otp.every((d) => d === '')) {
      // Focus first input after clearing OTP
      setTimeout(() => {
        otpRefs.current[0]?.focus();
      }, 80);
    }
  }, [otp]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}> 
      <ErrorToast visible={errorToast.visible} message={errorToast.message} onHide={hideErrorToast} />
      <StatusBar 
        barStyle={theme.background === '#ffffff' ? 'dark-content' : 'light-content'} 
        backgroundColor={theme.background}
      />
      
      {/* Fixed Header - Won't be affected by keyboard */}
      <LinearGradient
        colors={theme.gradient.secondary as [string, string, ...string[]]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Verify Phone</Text>
          <Text style={styles.headerSubtitle}>Enter the code sent to</Text>
          <Text style={styles.phoneNumber}>{phone}</Text>
        </View>
      </LinearGradient>
      
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView 
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          {/* Main content */}
          <View style={styles.content}>
            <View style={styles.otpSection}>
              <Text style={[styles.otpLabel, { color: theme.text }]}>Enter Verification Code</Text>
              <Text style={[styles.otpHint, { color: theme.textSecondary }]}>
                We've sent a 6-digit code to your phone
              </Text>
              
              <View style={styles.otpContainer}>
                {otp.map((digit, index) => (
                  <Animated.View 
                    key={index}
                    style={{
                      transform: [{ scale: scaleAnims[index] }]
                    }}
                  >
                    <TextInput
                      ref={ref => (otpRefs.current[index] = ref)}
                      style={[
                        styles.otpInput, 
                        { 
                          borderColor: digit ? theme.primary : theme.border,
                          backgroundColor: theme.card,
                          color: theme.text,
                          borderWidth: digit ? 2 : 1,
                        }
                      ]}
                      value={digit}
                      onChangeText={(value) => handleOtpChange(value.slice(-1), index)}
                      onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
                      keyboardType="number-pad"
                      maxLength={1}
                      textAlign="center"
                      autoFocus={index === 0}
                      editable={!loading}
                      selectionColor={theme.primary}
                    />
                  </Animated.View>
                ))}
              </View>

              {/* Paste OTP Button */}
              <TouchableOpacity 
                onPress={async () => {
                  try {
                    // Always clear clipboard before paste
                    await Clipboard.setStringAsync('');
                    const text = await Clipboard.getStringAsync();
                    const otpMatch = text.match(/\b\d{6}\b/);
                    if (otpMatch) {
                      const otpDigits = otpMatch[0].split('');
                      setOtp(otpDigits);
                      // Animate all boxes
                      otpDigits.forEach((_, i) => {
                        Animated.sequence([
                          Animated.timing(scaleAnims[i], {
                            toValue: 1.1,
                            duration: 100,
                            useNativeDriver: true,
                          }),
                          Animated.timing(scaleAnims[i], {
                            toValue: 1,
                            duration: 100,
                            useNativeDriver: true,
                          }),
                        ]).start();
                      });
                      // Clear clipboard after manual paste
                      await Clipboard.setStringAsync('');
                    } else {
                      showErrorToast('No 6-digit code found in clipboard');
                    }
                  } catch (error) {
                    showErrorToast('Could not access clipboard');
                  }
                }}
                style={styles.pasteButton}
              >
                <View style={styles.pasteButtonContent}>
                  <Ionicons name="chatbox-outline" size={18} color={theme.primary} />
                  <Text style={[styles.pasteButtonText, { color: theme.primary }]}>
                    Get OTP from Messages
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Name input for new users */}
              {isNewUser && (
                <View style={styles.nameSection}>
                  <Text style={[styles.label, { color: theme.text }]}>Your Name</Text>
                  <TextInput
                    ref={nameRef}
                    style={[styles.nameInput, { 
                      borderColor: theme.border,
                      backgroundColor: theme.card,
                      color: theme.text
                    }]}
                    placeholder="Enter your full name"
                    placeholderTextColor={theme.placeholder}
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                    editable={!loading}
                  />
                  
                  <Text style={[styles.label, { color: theme.text, marginTop: 16 }]}>
                    Referral Code (Optional)
                  </Text>
                  <TextInput
                    style={[styles.nameInput, { 
                      borderColor: theme.border,
                      backgroundColor: theme.card,
                      color: theme.text
                    }]}
                    placeholder="Enter referral code"
                    placeholderTextColor={theme.placeholder}
                    value={referralCode}
                    onChangeText={setReferralCode}
                    autoCapitalize="characters"
                    editable={!loading}
                  />
                </View>
              )}

              <TouchableOpacity 
                onPress={() => handleVerify()} 
                disabled={loading || otp.join('').length !== 6 || (isNewUser === true && name.trim().length === 0)} 
                style={[
                  styles.verifyButton,
                  { opacity: (loading || otp.join('').length !== 6 || (isNewUser === true && name.trim().length === 0)) ? 0.5 : 1 }
                ]}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={loading ? ['#cccccc', '#999999'] : theme.gradient.primary as [string, string, ...string[]]}
                  style={styles.verifyGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.verifyButtonText}>
                    {loading ? 'Verifying...' : isNewUser ? 'Register & Continue' : 'Verify & Continue'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Resend section */}
            <View style={styles.resendSection}>
              <Text style={[styles.resendText, { color: theme.textSecondary }]}>
                Didn't receive the code?
              </Text>
              {resendTimer > 0 ? (
                <Text style={[styles.timerText, { color: theme.primary }]}>
                  Resend OTP in {resendTimer}s
                </Text>
              ) : (
                <TouchableOpacity onPress={handleResendOtp} disabled={loading}>
                  <Text style={[styles.resendButton, { color: theme.primary }]}>
                    Resend OTP
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.25,
    justifyContent: 'flex-end',
    paddingBottom: 32,
    zIndex: 1,
  },
  headerContent: {
    paddingHorizontal: 24,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
  },
  phoneNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    letterSpacing: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: height * 0.25 + 32,
  },
  otpSection: {
    marginBottom: 32,
  },
  otpLabel: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  otpHint: {
    fontSize: 14,
    marginBottom: 32,
    textAlign: 'center',
    lineHeight: 20,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    gap: 10,
  },
  otpInput: {
    width: 48,
    height: 56,
    borderRadius: 12,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pasteButton: {
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 24,
  },
  pasteButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pasteButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  nameSection: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  nameInput: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 14,
    fontSize: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  verifyButton: {
    marginBottom: 24,
  },
  verifyGradient: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  verifyButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  resendSection: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 40,
  },
  resendText: {
    fontSize: 14,
    marginBottom: 12,
  },
  timerText: {
    fontSize: 14,
    fontWeight: '600',
  },
  resendButton: {
    fontSize: 15,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
