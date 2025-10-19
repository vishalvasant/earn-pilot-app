import { Link, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
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
  Animated,
  Easing,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Image
} from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../hooks/useTheme';
import { sendOtp } from '../../services/api';
import ThemedPopup from '../../components/ThemedPopup';

const { width, height } = Dimensions.get('window');

// Separate component for galaxy particle to prevent re-renders
const GalaxyParticle = React.memo(({ particle }: { particle: { id: number; color: string; size: number; left: number; top: number; duration: number } }) => {
  const anim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: particle.duration,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: particle.duration,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);
  
  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: particle.left,
        top: particle.top,
        width: particle.size,
        height: particle.size,
        borderRadius: particle.size / 2,
        backgroundColor: particle.color,
        opacity: 0.7,
        transform: [
          {
            translateY: anim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 12 + (particle.id % 8)],
            }),
          },
        ],
      }}
    />
  );
});

// Animated reward icon component
interface RewardIconProps {
  icon: string;
  mascotCenter: { left: number; top: number };
  headerLeftMin: number;
  headerLeftMax: number;
  headerTopMin: number;
  headerTopMax: number;
  pulse: Animated.Value;
}

// Animated reward icon component - Memoized to prevent re-renders
const RewardIcon = React.memo(({ 
  icon, 
  mascotCenter, 
  headerLeftMin, 
  headerLeftMax, 
  headerTopMin, 
  headerTopMax, 
  pulse 
}: RewardIconProps) => {
  const [target, setTarget] = useState({ left: mascotCenter.left, top: mascotCenter.top });
  const travelAnim = useRef(new Animated.Value(0)).current;
  
  const generateRandomTarget = React.useCallback(() => {
    // Generate random angle in radians (0 to 2π)
    const angle = Math.random() * 2 * Math.PI;
    // Increased random distance from mascot center (80 to 180 pixels)
    const distance = 80 + Math.random() * 100;
    
    // Calculate target position using polar coordinates
    const targetLeft = mascotCenter.left + Math.cos(angle) * distance;
    const targetTop = mascotCenter.top + Math.sin(angle) * distance;
    
    // Ensure the target stays within screen bounds
    const clampedLeft = Math.max(headerLeftMin, Math.min(headerLeftMax, targetLeft));
    const clampedTop = Math.max(headerTopMin, Math.min(headerTopMax, targetTop));
    
    return {
      left: clampedLeft,
      top: clampedTop,
    };
  }, [headerLeftMin, headerLeftMax, headerTopMin, headerTopMax, mascotCenter]);
  
  useEffect(() => {
    const animateLoop = () => {
      // Generate new random target for each cycle
      const newTarget = generateRandomTarget();
      setTarget(newTarget);
      
      Animated.sequence([
        Animated.timing(travelAnim, {
          toValue: 1,
          duration: 2500 + Math.random() * 1500,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(travelAnim, {
          toValue: 0,
          duration: 2500 + Math.random() * 1500,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Start next cycle with new random direction
        animateLoop();
      });
    };
    
    animateLoop();
  }, [travelAnim, generateRandomTarget]);
  
  const scaleRange = 1 + Math.random() * 0.2;
  
  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: mascotCenter.left,
        top: mascotCenter.top,
        zIndex: 5,
        transform: [
          { translateX: travelAnim.interpolate({ inputRange: [0, 1], outputRange: [0, target.left - mascotCenter.left] }) },
          { translateY: travelAnim.interpolate({ inputRange: [0, 1], outputRange: [0, target.top - mascotCenter.top] }) },
          { scale: pulse.interpolate({ inputRange: [1, 1.1], outputRange: [1, scaleRange] }) },
        ],
      }}
    >
      <Text style={{
        fontSize: 32,
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 3,
      }}>{icon}</Text>
    </Animated.View>
  );
});

// Memoized Header Component - Won't re-render on phone input changes
const AnimatedHeader = React.memo(({ 
  galaxyParticles, 
  mascotCenter, 
  headerLeftMin, 
  headerLeftMax, 
  headerTopMin, 
  headerTopMax,
  bounce,
  tilt,
  pulse,
  styles
}: {
  galaxyParticles: any[];
  mascotCenter: { left: number; top: number };
  headerLeftMin: number;
  headerLeftMax: number;
  headerTopMin: number;
  headerTopMax: number;
  bounce: Animated.Value;
  tilt: Animated.Value;
  pulse: Animated.Value;
  styles: any;
}) => {
  return (
    <View style={styles.header}>
      {/* Animated galaxy particle dots */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {galaxyParticles.map((particle) => (
          <GalaxyParticle key={particle.id} particle={particle} />
        ))}
      </View>

      <View style={styles.heroWrap}>
        {/* Animated reward icons in header */}
        {['🪙','🎁','🎮','💎','🎫','🏆','💰','🎉','🎲','🎯'].map((icon, idx) => (
          <RewardIcon
            key={idx}
            icon={icon}
            mascotCenter={mascotCenter}
            headerLeftMin={headerLeftMin}
            headerLeftMax={headerLeftMax}
            headerTopMin={headerTopMin}
            headerTopMax={headerTopMax}
            pulse={pulse}
          />
        ))}
        
        {/* Mascot and effects */}
        <Animated.View
          style={[
            styles.mascotMainContainer,
            {
              transform: [
                { translateY: bounce },
                { rotate: tilt.interpolate({ inputRange: [-1, 1], outputRange: ['-3deg', '3deg'] }) },
                { scale: pulse.interpolate({ inputRange: [1, 1.1], outputRange: [1, 1.02] }) },
              ],
            },
          ]}
        >
          <View style={styles.mascotContainer}>
            <Image 
              source={require('../../assets/images/NewPilot.png')}
              style={styles.mascotImage}
              resizeMode="contain"
            />
          </View>
        </Animated.View>
      </View>
    </View>
  );
});

const LoginScreen = () => {
  const theme = useTheme();
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [popup, setPopup] = useState<{ visible: boolean; title: string; message: string; onConfirm?: () => void } | null>(null);

  // Animations - Make them stable references
  const bounce = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const tilt = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;
  const floatY = useRef(new Animated.Value(0)).current;

  // Parameters for icon animation - Stable references
  const mascotCenter = useRef({ left: width / 2 - 20, top: 100 }).current;
  const headerTopMin = useRef(10).current;
  const headerTopMax = useRef(200).current;
  const headerLeftMin = useRef(10).current;
  const headerLeftMax = useRef(width - 30).current;

  // Memoize galaxy particles to prevent re-render on keyboard events
  const galaxyParticles = React.useMemo(() => {
    const colors = [
      '#6a82fb', '#fc5c7d', '#43cea2', '#185a9d', '#f7971e', '#00c6ff', '#f953c6', '#b6fbff', '#1c1c3c', '#2c5364'
    ];
    
    return Array.from({ length: 40 }).map((_, i) => {
      const color = colors[i % colors.length];
      const size = 3 + (i % 4);
      const left = Math.random() * (width - 20);
      const top = Math.random() * (height * 0.4 - 40); // Keep particles in header area only
      
      return {
        id: i,
        color,
        size,
        left,
        top,
        duration: 3500 + i * 50
      };
    });
  }, []); // Empty dependency array - only create once
  
  // Memoize styles
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  useEffect(() => {
    // Bounce animation for mascot
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, { toValue: -8, duration: 1500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(bounce, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    ).start();

    // Tilt animation for mascot
    Animated.loop(
      Animated.sequence([
        Animated.timing(tilt, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(tilt, { toValue: -1, duration: 2000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    ).start();

    // Spin animation for rewards (faster)
    Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 2000, easing: Easing.linear, useNativeDriver: true })
    ).start();

    // Pulse animation for mascot
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.1, duration: 2500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 2500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    ).start();

    // Float animation for rewards
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatY, { toValue: -6, duration: 2200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(floatY, { toValue: 6, duration: 2200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const onSubmit = async () => {
    if (!phone || phone.length < 10) {
      setPopup({
        visible: true,
        title: 'Invalid Phone',
        message: 'Please enter a valid 10-digit phone number.',
        onConfirm: () => setPopup(null)
      });
      return;
    }

    setLoading(true);
    try {
      const response = await sendOtp(phone);
      if (response.success) {
        // If OTP is returned (development mode), show it to user
        if (response.otp) {
          setPopup({
            visible: true,
            title: 'OTP Sent (Dev Mode)',
            message: `OTP: ${response.otp}\n\n${response.message}`,
            onConfirm: () => {
              setPopup(null);
              router.push({ pathname: '/(auth)/verify-otp', params: { phone } });
            }
          });
        } else {
          // Production mode - SMS sent
          setPopup({
            visible: true,
            title: 'OTP Sent',
            message: `${response.message}\nPlease check your phone for the OTP.`,
            onConfirm: () => {
              setPopup(null);
              router.push({ pathname: '/(auth)/verify-otp', params: { phone } });
            }
          });
        }
      } else {
        setPopup({
          visible: true,
          title: 'Error',
          message: response.message || 'Failed to send OTP',
          onConfirm: () => setPopup(null)
        });
      }
    } catch (error: any) {
      console.error('Send OTP error:', error);
      const errorMessage = error.response?.data?.message 
        || error.response?.data?.errors?.phone?.[0]
        || 'Failed to send OTP. Please check your connection and try again.';
      setPopup({
        visible: true,
        title: 'Error',
        message: errorMessage,
        onConfirm: () => setPopup(null)
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#0e1635', '#1a237e', '#283593']}
      style={{ flex: 1 }}
      start={{ x: 0.3, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: 'transparent' }]}> 
        {popup?.visible && (
          <ThemedPopup
            visible={popup.visible}
            title={popup.title}
            message={popup.message}
            onConfirm={popup.onConfirm}
          />
        )}
        <StatusBar 
          barStyle="light-content" 
          backgroundColor={'#0e1635'}
        />
        
        {/* Fixed Header - Won't be affected by keyboard */}
        <AnimatedHeader
          galaxyParticles={galaxyParticles}
          mascotCenter={mascotCenter}
          headerLeftMin={headerLeftMin}
          headerLeftMax={headerLeftMax}
          headerTopMin={headerTopMin}
          headerTopMax={headerTopMax}
          bounce={bounce}
          tilt={tilt}
          pulse={pulse}
          styles={styles}
        />
        
        <KeyboardAvoidingView 
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <ScrollView 
            style={{ flex: 1 }}
            contentContainerStyle={{ flexGrow: 1, paddingTop: height * 0.40 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            
            {/* Main content */}
            <View style={styles.content}>
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
              </View>
              
              <View style={styles.welcomeSection}>
                <View style={styles.welcomeHeader}>
                  <Text style={[styles.welcomeTitle, { color: theme.text }]}>Ready to Earn?</Text>
                  <View style={styles.welcomeBadge}>
                    <Text style={styles.welcomeBadgeText}>🚀 Let's Go!</Text>
                  </View>
                </View>
                <Text style={[styles.welcomeSubtitle, { color: theme.textSecondary }]}> 
                  Join thousands of users earning rewards daily. Your journey starts with just your phone number.
                </Text>
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Text style={[styles.statNumber, { color: theme.primary }]}>10k+</Text>
                    <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Users</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={[styles.statNumber, { color: theme.primary }]}>₹2.5L+</Text>
                    <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Earned</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={[styles.statNumber, { color: theme.primary }]}>4.8★</Text>
                    <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Rating</Text>
                  </View>
                </View>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.40,
    justifyContent: 'flex-end',
    paddingBottom: 24,
    zIndex: 1,
  },
  heroWrap: {
    marginTop: 20,
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
    position: 'relative',
  },
  mascotMainContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  mascotContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.25)',
    shadowColor: '#00E5FF',
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  mascotImage: {
    width: 140,
    height: 140,
  },
  coinText: {
    fontSize: 32,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  welcomeSection: {
    marginBottom: 32,
  },
  welcomeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  welcomeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#00E5FF' + '20',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#00E5FF' + '40',
  },
  welcomeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#00E5FF',
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 0,
  },
  welcomeSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(17, 20, 24, 0.7)',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(27, 32, 38, 0.7)',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(27, 32, 38, 0.7)',
    marginHorizontal: 8,
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
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  countryCode: {
    fontSize: 16,
    fontWeight: '500',
    marginRight: 12,
    paddingRight: 12,
    borderRightWidth: 1,
    borderRightColor: 'rgba(31, 37, 44, 0.7)',
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
    shadowColor: '#00E5FF',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
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
});

export default LoginScreen;
