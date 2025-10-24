import React, { useEffect, useState, useRef } from 'react';
import { 
  Alert, 
  SafeAreaView, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  View, 
  ScrollView,
  StyleSheet,
  StatusBar,
  Animated,
  Modal,
  Switch,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { getProfile, updateProfile } from '../../services/api';
import { useTheme } from '../../hooks/useTheme';
import { useAuthStore } from '../../stores/authStore';
import Icon from '../../components/Icon';

const { height: screenHeight } = Dimensions.get('window');
const HEADER_HEIGHT = screenHeight * 0.30;

export default function ProfileScreen() {
  const theme = useTheme();
  const styles = createStyles(theme);
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);
  
  const [user, setUser] = useState<any | null>(null);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [location, setLocation] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    loadProfile();
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await getProfile();
      // Accept flexible shapes: { user: {...} } | { data: { user } } | direct user
      const u = (data && (data.user || data.data?.user || data)) || {};
      setUser(u);
      setName((u.name as string) || '');
      setAge(u.age != null ? String(u.age) : '');
      setLocation((u.location as string) || '');
    } catch {
      // Leave fields empty on failure (UI shows placeholders)
      setUser(null);
      setName('');
      setAge('');
      setLocation('');
    }
  };

  const onSave = async () => {
    try {
      await updateProfile({ name, age: Number(age) || undefined, location });
      Alert.alert('Success', 'Profile updated successfully!');
      setIsEditing(false);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Update failed');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.replace('/(auth)/login');
    } catch (error) {
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };

  const AnimatedCard = ({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) => {
    const cardFade = useRef(new Animated.Value(0)).current;
    const cardSlide = useRef(new Animated.Value(30)).current;

    useEffect(() => {
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(cardFade, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(cardSlide, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
        ]).start();
      }, delay);
    }, []);

    return (
      <Animated.View
        style={{
          opacity: cardFade,
          transform: [{ translateY: cardSlide }],
        }}
      >
        {children}
      </Animated.View>
    );
  };

  const ProgressBar = ({ progress, color }: { progress: number; color: string }) => {
    const progressAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      Animated.timing(progressAnim, {
        toValue: progress,
        duration: 1500,
        useNativeDriver: false,
      }).start();
    }, [progress]);

    return (
      <View style={styles.progressContainer}>
        <Animated.View
          style={[
            styles.progressBar,
            {
              width: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
              backgroundColor: color,
            },
          ]}
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar 
        barStyle={theme.background === '#ffffff' ? 'dark-content' : 'light-content'} 
        backgroundColor={theme.background}
      />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Animated.View 
          style={[
            styles.header,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <LinearGradient
            colors={theme.gradient.primary as [string, string, ...string[]]}
            style={styles.headerGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.headerContent}>
              <View style={styles.avatarContainer}>
                <LinearGradient
                  colors={theme.gradient.primary as [string, string, ...string[]]}
                  style={styles.avatar}
                >
                  <Text style={styles.avatarText}>
                    {name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </Text>
                </LinearGradient>
              </View>
              
              <Text style={styles.userName}>{name || 'User'}</Text>
              <Text style={styles.userLevel}>{user?.status ? String(user.status).toUpperCase() : 'MEMBER'}</Text>

              <View style={styles.levelProgress}>
                <Text style={styles.levelProgressText}>Referral Code: {user?.referral_code || '-'}</Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <AnimatedCard delay={200}>
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <LinearGradient colors={theme.gradient.primary as [string, string, ...string[]]} style={styles.statIcon}>
                  <Icon name="money" size={24} color="#ffffff" />
                </LinearGradient>
                <Text style={[styles.statValue, { color: theme.text }]}>₹{user?.total_earned ?? 0}</Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Total Earned</Text>
              </View>

              <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <LinearGradient colors={theme.gradient.secondary as [string, string, ...string[]]} style={styles.statIcon}>
                  <Icon name="checkmark" size={24} color="#ffffff" />
                </LinearGradient>
                <Text style={[styles.statValue, { color: theme.text }]}>{user?.points_balance ?? 0}</Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Points Balance</Text>
              </View>
            </View>
          </AnimatedCard>

          <AnimatedCard delay={400}>
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <LinearGradient colors={theme.gradient.primary as [string, string, ...string[]]} style={styles.statIcon}>
                  <Icon name="phone" size={24} color="#ffffff" />
                </LinearGradient>
                <Text style={[styles.statValue, { color: theme.text }]}>{user?.phone || '-'}</Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Phone</Text>
              </View>

              <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <LinearGradient colors={theme.gradient.secondary as [string, string, ...string[]]} style={styles.statIcon}>
                  <Icon name="tag" size={24} color="#ffffff" />
                </LinearGradient>
                <Text style={[styles.statValue, { color: theme.text }]}>{user?.referral_code || '-'}</Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Referral Code</Text>
              </View>
            </View>
          </AnimatedCard>
        </View>
        {/* Theme (static) */}
        <AnimatedCard delay={800}>
          <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}> 
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Appearance</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
              <LinearGradient
                colors={theme.gradient.primary as [string, string, ...string[]]}
                style={{ width: 28, height: 28, borderRadius: 8, marginRight: 12 }}
              />
              <View>
                <Text style={{ color: theme.text, fontSize: 16, fontWeight: '600' }}>Fintech Bold</Text>
                <Text style={{ color: theme.textSecondary, fontSize: 12 }}>Professional navy & blue theme</Text>
              </View>
            </View>
          </View>
        </AnimatedCard>

        {/* Profile Details */}
        <AnimatedCard delay={600}>
          <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}> 
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Profile Details</Text>
              <TouchableOpacity
                onPress={() => setIsEditing(!isEditing)}
                style={[styles.editButton, { borderColor: theme.border }]}
              >
                <Text style={[styles.editButtonText, { color: theme.primary }]}>
                  {isEditing ? 'Cancel' : 'Edit'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.profileFields}>
              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Name</Text>
                {isEditing ? (
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    style={[styles.fieldInput, { borderColor: theme.border, color: theme.text, backgroundColor: theme.background }]}
                    placeholder="Enter your name"
                    placeholderTextColor={theme.placeholder}
                  />
                ) : (
                  <Text style={[styles.fieldValue, { color: theme.text }]}>{name}</Text>
                )}
              </View>

              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Age</Text>
                {isEditing ? (
                  <TextInput
                    value={age}
                    onChangeText={setAge}
                    style={[styles.fieldInput, { borderColor: theme.border, color: theme.text, backgroundColor: theme.background }]}
                    placeholder="Enter your age"
                    placeholderTextColor={theme.placeholder}
                    keyboardType="number-pad"
                  />
                ) : (
                  <Text style={[styles.fieldValue, { color: theme.text }]}>{age}</Text>
                )}
              </View>

              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Location</Text>
                {isEditing ? (
                  <TextInput
                    value={location}
                    onChangeText={setLocation}
                    style={[styles.fieldInput, { borderColor: theme.border, color: theme.text, backgroundColor: theme.background }]}
                    placeholder="Enter your location"
                    placeholderTextColor={theme.placeholder}
                  />
                ) : (
                  <Text style={[styles.fieldValue, { color: theme.text }]}>{location}</Text>
                )}
              </View>
            </View>

            {isEditing && (
              <TouchableOpacity onPress={onSave} style={styles.saveButton}>
                <LinearGradient
                  colors={theme.gradient.primary as [string, string, ...string[]]}
                  style={styles.saveGradient}
                >
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        </AnimatedCard>
        
        {/* Settings */}
        <AnimatedCard delay={800}>
          <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}> 
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Settings</Text>
            
            <View style={styles.settingsItem}>
              <View style={styles.settingsLabelContainer}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Icon name="notifications" size={20} color={theme.text} />
                  <Text style={[styles.settingsLabel, { color: theme.text }]}>Notifications</Text>
                </View>
                <Text style={[styles.settingsSubLabel, { color: theme.textSecondary }]}>
                  {notifications ? 'Enabled' : 'Disabled'}
                </Text>
              </View>
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor={notifications ? '#ffffff' : theme.textSecondary}
              />
            </View>
          </View>
        </AnimatedCard>

        {/* Account Info */}
        <AnimatedCard delay={1000}>
          <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}> 
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Account</Text>
            <View style={[styles.achievementItem, { borderBottomColor: theme.borderLight }]}>
              <View style={styles.achievementInfo}>
                <Icon name="email" size={24} color={theme.primary} />
                <View style={styles.achievementDetails}>
                  <Text style={[styles.achievementTitle, { color: theme.text }]}>Email</Text>
                  <Text style={[styles.achievementDescription, { color: theme.textSecondary }]}>
                    {user?.email || 'Not set'}
                  </Text>
                </View>
              </View>
            </View>
            <View style={[styles.achievementItem, { borderBottomColor: theme.borderLight }]}> 
              <View style={styles.achievementInfo}>
                <Icon name="location" size={24} color={theme.primary} />
                <View style={styles.achievementDetails}>
                  <Text style={[styles.achievementTitle, { color: theme.text }]}>Location</Text>
                  <Text style={[styles.achievementDescription, { color: theme.textSecondary }]}>
                    {location || '-'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </AnimatedCard>

        {/* Logout */}
        <AnimatedCard delay={1200}>
          <TouchableOpacity 
            style={[styles.logoutButton, { borderColor: theme.error }]}
            onPress={() => setShowLogoutModal(true)}
            activeOpacity={0.8}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Icon name="logout" size={20} color={theme.error} />
              <Text style={[styles.logoutButtonText, { color: theme.error }]}>Logout</Text>
            </View>
          </TouchableOpacity>
        </AnimatedCard>
      </ScrollView>

      {/* Logout Confirmation Modal */}
      <Modal
        visible={showLogoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Confirm Logout</Text>
            <Text style={[styles.modalMessage, { color: theme.textSecondary }]}>
              Are you sure you want to logout?
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton, { borderColor: theme.border }]}
                onPress={() => setShowLogoutModal(false)}
              >
                <Text style={[styles.cancelButtonText, { color: theme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalButton}
                onPress={handleLogout}
              >
                <LinearGradient
                  colors={[theme.error, '#ff4757']}
                  style={styles.confirmButton}
                >
                  <Text style={styles.confirmButtonText}>Logout</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    marginBottom: 20,
  },
  headerGradient: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 50,
    height: HEADER_HEIGHT,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarContainer: {
    marginBottom: 12,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  userLevel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 12,
  },
  levelProgress: {
    alignItems: 'center',
    width: '100%',
  },
  levelProgressText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  progressContainer: {
    width: '80%',
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 3,
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  levelProgressPercent: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
  },
  statsContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    padding: 20,
    borderRadius: 16,
    marginHorizontal: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  statIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statIconText: {
    fontSize: 20,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  profileFields: {
    gap: 16,
  },
  field: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  fieldValue: {
    fontSize: 16,
    fontWeight: '400',
  },
  fieldInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
  },
  saveButton: {
    marginTop: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  saveGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  settingsItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.borderLight,
  },
  settingsLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  settingsLabelContainer: {
    flex: 1,
  },
  settingsSubLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  resetThemeButton: {
    marginTop: 12,
    marginHorizontal: 20,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  resetThemeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  achievementInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  achievementIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  achievementDetails: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  achievementDescription: {
    fontSize: 14,
  },
  achievementDate: {
    fontSize: 12,
    fontWeight: '500',
  },
  logoutButton: {
    marginHorizontal: 20,
    marginBottom: 30,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 300,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  cancelButton: {
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    padding: 12,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
