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
  StatusBar
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../hooks/useTheme';
import { useAuthStore } from '../../stores/authStore';

const { width, height } = Dimensions.get('window');
const DEFAULT_OTP = '123456';

export default function VerifyOtpScreen() {
  const { phone: paramPhone } = useLocalSearchParams<{ phone?: string }>();
  const [phone, setPhone] = useState(paramPhone || '');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const theme = useTheme();
  
  const otpRefs = useRef<(TextInput | null)[]>([]);
  const styles = createStyles(theme);

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

    // Auto-move to next input
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }

    // Auto-verify when all 6 digits are entered
    if (newOtp.every(digit => digit !== '') && newOtp.join('').length === 6) {
      handleVerify(newOtp.join(''));
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (otpCode?: string) => {
    const otpToVerify = otpCode || otp.join('');
    
    if (otpToVerify.length !== 6) {
      Alert.alert('Error', 'Please enter the complete 6-digit OTP');
      return;
    }

    try {
      setLoading(true);
      // Simulate API call delay
      await new Promise<void>(resolve => setTimeout(resolve, 1000));
      
      // Static OTP validation
      if (otpToVerify === DEFAULT_OTP) {
        // Generate a dummy token for static auth
        const token = `static_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await setAuth({ token });
        router.replace('/(tabs)/home');
      } else {
        Alert.alert('Error', `Invalid OTP. Use ${DEFAULT_OTP} for testing.`);
        // Clear OTP inputs
        setOtp(['', '', '', '', '', '']);
        otpRefs.current[0]?.focus();
      }
    } catch (e: any) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    try {
      setLoading(true);
      // Simulate API call delay
      await new Promise<void>(resolve => setTimeout(resolve, 1000));
      
      setResendTimer(30);
      Alert.alert('Success', `OTP sent successfully to ${phone}\nUse ${DEFAULT_OTP} to verify.`);
    } catch (e: any) {
      Alert.alert('Error', 'Failed to resend OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar 
        barStyle={theme.background === '#ffffff' ? 'dark-content' : 'light-content'} 
        backgroundColor={theme.background}
      />
      
      {/* Header with gradient background */}
      <LinearGradient
        colors={theme.gradient.secondary as [string, string, ...string[]]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Verify Phone</Text>
          <Text style={styles.headerSubtitle}>Enter the 6-digit code sent to</Text>
          <Text style={styles.phoneNumber}>{phone}</Text>
        </View>
      </LinearGradient>

      {/* Main content */}
      <View style={styles.content}>
        <View style={styles.otpSection}>
          <Text style={[styles.otpLabel, { color: theme.text }]}>Enter OTP</Text>
          
          <View style={styles.otpContainer}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={ref => (otpRefs.current[index] = ref)}
                style={[
                  styles.otpInput, 
                  { 
                    borderColor: digit ? theme.primary : theme.border,
                    backgroundColor: theme.card,
                    color: theme.text
                  }
                ]}
                value={digit}
                onChangeText={(value) => handleOtpChange(value.slice(-1), index)}
                onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
                keyboardType="number-pad"
                maxLength={1}
                textAlign="center"
                autoFocus={index === 0}
              />
            ))}
          </View>

          <TouchableOpacity 
            onPress={() => handleVerify()} 
            disabled={loading || otp.join('').length !== 6} 
            style={[
              styles.verifyButton,
              { opacity: (loading || otp.join('').length !== 6) ? 0.5 : 1 }
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
                {loading ? 'Verifying...' : 'Verify & Continue'}
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

        {/* Development info */}
        <View style={[styles.devInfo, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.devInfoTitle, { color: theme.primary }]}>Development Mode</Text>
          <Text style={[styles.devInfoText, { color: theme.textSecondary }]}>
            Default OTP: {DEFAULT_OTP}{'\n'}
            Auto-verification when all digits entered
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: height * 0.3,
    justifyContent: 'flex-end',
    paddingBottom: 40,
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
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
  },
  phoneNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  otpSection: {
    marginBottom: 40,
  },
  otpLabel: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 24,
    textAlign: 'center',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  otpInput: {
    width: 45,
    height: 55,
    borderWidth: 2,
    borderRadius: 12,
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
  },
  verifyButton: {
    marginBottom: 24,
  },
  verifyGradient: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  verifyButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  resendSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  resendText: {
    fontSize: 14,
    marginBottom: 8,
  },
  timerText: {
    fontSize: 14,
    fontWeight: '500',
  },
  resendButton: {
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  devInfo: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 'auto',
    marginBottom: 20,
  },
  devInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  devInfoText: {
    fontSize: 12,
    lineHeight: 18,
  },
});
