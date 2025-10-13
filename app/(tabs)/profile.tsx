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
  Switch,
  Modal
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { api } from '../../services/api';
import { useTheme } from '../../hooks/useTheme';
import { useAuthStore } from '../../stores/authStore';

// Mock user data for demonstration
const mockUserData = {
  name: 'John Doe',
  email: 'john.doe@example.com',
  phone: '+91 9876543210',
  age: 28,
  location: 'Mumbai, India',
  joinDate: '2024-01-15',
  totalEarnings: 15420,
  tasksCompleted: 145,
  successRate: 85,
  level: 'Gold',
  nextLevelProgress: 0.7,
  achievements: [
    { id: 1, title: 'First Task', description: 'Complete your first task', earned: true, date: '2024-01-15' },
    { id: 2, title: 'Week Warrior', description: 'Complete 7 tasks in a week', earned: true, date: '2024-01-22' },
    { id: 3, title: 'Hundred Club', description: 'Complete 100 tasks', earned: true, date: '2024-03-10' },
    { id: 4, title: 'Top Earner', description: 'Earn ₹10,000', earned: true, date: '2024-03-15' },
    { id: 5, title: 'Perfect Score', description: 'Maintain 90% success rate', earned: false, date: null },
  ]
};

export default function ProfileScreen() {
  const theme = useTheme();
  const styles = createStyles(theme);
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);
  
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [location, setLocation] = useState('');
  const [userData, setUserData] = useState(mockUserData);
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
      const res = await api.get('/api/profile');
      const u = res.data || {};
      setName(u.name || userData.name);
      setAge(u.age ? String(u.age) : String(userData.age));
      setLocation(u.location || userData.location);
    } catch {
      // Use mock data
      setName(userData.name);
      setAge(String(userData.age));
      setLocation(userData.location);
    }
  };

  const onSave = async () => {
    try {
      await api.put('/api/profile', { name, age: Number(age) || null, location });
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
                  colors={['#667eea', '#764ba2']}
                  style={styles.avatar}
                >
                  <Text style={styles.avatarText}>
                    {name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </Text>
                </LinearGradient>
              </View>
              
              <Text style={styles.userName}>{name}</Text>
              <Text style={styles.userLevel}>{userData.level} Member</Text>
              
              <View style={styles.levelProgress}>
                <Text style={styles.levelProgressText}>Next Level Progress</Text>
                <ProgressBar progress={userData.nextLevelProgress} color="#ffffff" />
                <Text style={styles.levelProgressPercent}>
                  {Math.round(userData.nextLevelProgress * 100)}%
                </Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <AnimatedCard delay={200}>
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <LinearGradient colors={['#667eea', '#764ba2']} style={styles.statIcon}>
                  <Text style={styles.statIconText}>₹</Text>
                </LinearGradient>
                <Text style={[styles.statValue, { color: theme.text }]}>₹{userData.totalEarnings}</Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Total Earned</Text>
              </View>

              <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <LinearGradient colors={['#f093fb', '#f5576c']} style={styles.statIcon}>
                  <Text style={styles.statIconText}>✓</Text>
                </LinearGradient>
                <Text style={[styles.statValue, { color: theme.text }]}>{userData.tasksCompleted}</Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Tasks Done</Text>
              </View>
            </View>
          </AnimatedCard>

          <AnimatedCard delay={400}>
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <LinearGradient colors={['#4facfe', '#00f2fe']} style={styles.statIcon}>
                  <Text style={styles.statIconText}>📊</Text>
                </LinearGradient>
                <Text style={[styles.statValue, { color: theme.text }]}>{userData.successRate}%</Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Success Rate</Text>
              </View>

              <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <LinearGradient colors={['#fa709a', '#fee140']} style={styles.statIcon}>
                  <Text style={styles.statIconText}>🏆</Text>
                </LinearGradient>
                <Text style={[styles.statValue, { color: theme.text }]}>{userData.achievements.filter(a => a.earned).length}</Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Achievements</Text>
              </View>
            </View>
          </AnimatedCard>
        </View>

        {/* Profile Info */}
        <AnimatedCard delay={600}>
          <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Profile Information</Text>
              <TouchableOpacity 
                onPress={() => setIsEditing(!isEditing)}
                style={[styles.editButton, { borderColor: theme.primary }]}
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
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Email</Text>
                <Text style={[styles.fieldValue, { color: theme.text }]}>{userData.email}</Text>
              </View>

              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Phone</Text>
                <Text style={[styles.fieldValue, { color: theme.text }]}>{userData.phone}</Text>
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
                <Text style={[styles.settingsLabel, { color: theme.text }]}>🔔 Notifications</Text>
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

            <View style={styles.settingsItem}>
              <View style={styles.settingsLabelContainer}>
                <Text style={[styles.settingsLabel, { color: theme.text }]}>🌙 Dark Mode</Text>
                <Text style={[styles.settingsSubLabel, { color: theme.textSecondary }]}>
                  {theme.isDarkMode === null ? 'Follow system' : theme.isDarkMode ? 'Enabled' : 'Disabled'}
                </Text>
              </View>
              <Switch
                value={theme.isDarkMode !== null ? theme.isDarkMode : false}
                onValueChange={() => theme.toggleDarkMode()}
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor={theme.isDarkMode ? '#ffffff' : theme.textSecondary}
              />
            </View>

            {theme.isDarkMode !== null && (
              <TouchableOpacity 
                style={[styles.resetThemeButton, { borderColor: theme.border }]}
                onPress={() => theme.setDarkMode(null)}
                activeOpacity={0.7}
              >
                <Text style={[styles.resetThemeText, { color: theme.primary }]}>
                  🔄 Follow System Theme
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </AnimatedCard>

        {/* Achievements */}
        <AnimatedCard delay={1000}>
          <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Achievements</Text>
            
            {userData.achievements.map((achievement, index) => (
              <View key={achievement.id} style={[styles.achievementItem, { borderBottomColor: theme.borderLight }]}>
                <View style={styles.achievementInfo}>
                  <Text style={styles.achievementIcon}>
                    {achievement.earned ? '🏆' : '🔒'}
                  </Text>
                  <View style={styles.achievementDetails}>
                    <Text style={[
                      styles.achievementTitle, 
                      { 
                        color: achievement.earned ? theme.text : theme.textSecondary,
                        opacity: achievement.earned ? 1 : 0.6 
                      }
                    ]}>
                      {achievement.title}
                    </Text>
                    <Text style={[styles.achievementDescription, { color: theme.textSecondary }]}>
                      {achievement.description}
                    </Text>
                  </View>
                </View>
                {achievement.earned && (
                  <Text style={[styles.achievementDate, { color: theme.primary }]}>
                    {achievement.date}
                  </Text>
                )}
              </View>
            ))}
          </View>
        </AnimatedCard>

        {/* Logout */}
        <AnimatedCard delay={1200}>
          <TouchableOpacity 
            style={[styles.logoutButton, { borderColor: theme.error }]}
            onPress={() => setShowLogoutModal(true)}
            activeOpacity={0.8}
          >
            <Text style={[styles.logoutButtonText, { color: theme.error }]}>🚪 Logout</Text>
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
    paddingVertical: 30,
    paddingTop: 60,
  },
  headerContent: {
    alignItems: 'center',
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 32,
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
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 20,
  },
  levelProgress: {
    alignItems: 'center',
    width: '100%',
  },
  levelProgressText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
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
    fontSize: 12,
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
    fontSize: 16,
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
