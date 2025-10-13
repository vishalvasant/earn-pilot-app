import { Link, useRouter } from 'expo-router';
import React, { useState } from 'react';
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

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const theme = useTheme();

  const styles = createStyles(theme);

  const onSubmit = async () => {
    if (!phone.trim()) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return;
    }

    try {
      setLoading(true);
      // Simulate API call delay
      await new Promise<void>(resolve => setTimeout(resolve, 1000));
      
      // Static validation - any phone number with 10+ digits works
      const cleanPhone = phone.replace(/\D/g, '');
      if (cleanPhone.length >= 10) {
        router.push({ pathname: '/(auth)/verify-otp', params: { phone } });
      } else {
        Alert.alert('Error', 'Please enter a valid phone number with at least 10 digits');
      }
    } catch (e: any) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
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
        colors={theme.gradient.primary as [string, string, ...string[]]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Earn Pilot</Text>
          <Text style={styles.headerSubtitle}>Complete tasks, earn rewards</Text>
        </View>
      </LinearGradient>

      {/* Main content */}
      <View style={styles.content}>
        <View style={styles.welcomeSection}>
          <Text style={[styles.welcomeTitle, { color: theme.text }]}>Welcome back</Text>
          <Text style={[styles.welcomeSubtitle, { color: theme.textSecondary }]}>
            Enter your phone number to continue your earning journey
          </Text>
        </View>

        <View style={styles.formSection}>
          <Text style={[styles.label, { color: theme.text }]}>Phone Number</Text>
          <View style={[styles.inputContainer, { borderColor: theme.border, backgroundColor: theme.card }]}>
            <Text style={[styles.countryCode, { color: theme.textSecondary }]}>+91</Text>
            <TextInput
              keyboardType="phone-pad"
              placeholder="Enter your phone number"
              placeholderTextColor={theme.placeholder}
              value={phone}
              onChangeText={setPhone}
              style={[styles.input, { color: theme.text }]}
              maxLength={15}
            />
          </View>

          <TouchableOpacity 
            onPress={onSubmit} 
            disabled={loading} 
            style={styles.submitButton}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={loading ? ['#cccccc', '#999999'] : theme.gradient.primary as [string, string, ...string[]]}
              style={styles.submitGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.submitButtonText}>
                {loading ? 'Sending...' : 'Send OTP'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.helpSection}>
            <Link href="/(auth)/verify-otp" asChild>
              <TouchableOpacity style={styles.helpButton}>
                <Text style={[styles.helpText, { color: theme.primary }]}>
                  Already have an OTP? Verify here
                </Text>
              </TouchableOpacity>
            </Link>
          </View>

          {/* Development info */}
          <View style={[styles.devInfo, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.devInfoTitle, { color: theme.primary }]}>Development Mode</Text>
            <Text style={[styles.devInfoText, { color: theme.textSecondary }]}>
              Any valid phone number works{'\n'}Default OTP: 123456
            </Text>
          </View>
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
    height: height * 0.35,
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
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  welcomeSection: {
    marginBottom: 40,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    lineHeight: 24,
  },
  formSection: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 32,
  },
  countryCode: {
    fontSize: 16,
    fontWeight: '500',
    marginRight: 12,
    paddingRight: 12,
    borderRightWidth: 1,
    borderRightColor: theme.borderLight,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 12,
  },
  submitButton: {
    marginBottom: 24,
  },
  submitGradient: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  helpSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  helpButton: {
    paddingVertical: 8,
  },
  helpText: {
    fontSize: 14,
    fontWeight: '500',
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
