/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { 
  SafeAreaView, 
  Text, 
  TouchableOpacity, 
  View, 
  ScrollView,
  StyleSheet,
  StatusBar,
  Animated,
  Modal,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { getProfile } from '../../services/api';
import { useTheme } from '../../hooks/useTheme';
import { useAuthStore } from '../../stores/authStore';
import { useUserStore } from '../../stores/userStore';
import ThemedPopup from '../../components/ThemedPopup';
import { useAdMob } from '../../hooks/useAdMob';

// Safely import BannerAd
let BannerAd: any = null;
let BannerAdSize: any = null;
try {
  const admobModule = require('react-native-google-mobile-ads');
  BannerAd = admobModule.BannerAd;
  BannerAdSize = admobModule.BannerAdSize;
} catch (e) {
  console.log('AdMob not available');
}

function ProfileScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { shouldShowBanner, getBannerAdId } = useAdMob();
  const logout = useAuthStore((s) => s.logout);
  const userStore = useUserStore();

  const [user, setUser] = useState<any | null>(null);
  const [name, setName] = useState('');
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [popup, setPopup] = useState<{ visible: boolean; title: string; message: string; onConfirm?: () => void } | null>(null);
  const [supportExpanded, setSupportExpanded] = useState(false);

  const styles = useMemo(() => createStyles(theme), [theme]);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  const loadProfile = useCallback(async () => {
    try {
      const data = await getProfile();
      const u = (data && (data.user || data.data?.user || data)) || {};
      setUser(u);
      userStore.setProfile(u);
      setName((u.name as string) || 'User');
    } catch (error) {
      setUser(null);
      setName('User');
    }
  }, [userStore]);

  useEffect(() => {
    loadProfile();
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      router.replace('/(auth)/login');
    } catch (error) {
      setPopup({ visible: true, title: 'Error', message: 'Failed to logout. Please try again.', onConfirm: () => setPopup(null) });
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={theme.background === '#ffffff' ? 'dark-content' : 'light-content'} backgroundColor={theme.background} />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: shouldShowBanner ? 100 : 20 }}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <View style={styles.topHeader}>
            <Text style={styles.logoText}>MY<Text style={{ color: theme.primary }}>PROFILE</Text></Text>
          </View>
          <View style={styles.centerProfile}>
            <LinearGradient colors={theme.gradient.primary as [string, string, ...string[]]} style={styles.avatarSquare} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Text style={{ fontSize: 35 }}>👤</Text>
            </LinearGradient>
            <Text style={[styles.centerName, { color: theme.text }]}>{name || 'User'}</Text>
            <Text style={[styles.centerPoints, { color: theme.primary }]}>💎 {user?.points_balance ?? 0} Points</Text>
          </View>
        </Animated.View>

        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Wallet</Text>
        <View style={[styles.listItem, styles.listItemAccent, { borderColor: theme.primary, backgroundColor: 'rgba(0, 209, 255, 0.05)' }]}> 
          <Text style={[styles.listItemText, { color: theme.text }]}>Withdrawal Hub</Text>
          <Text style={{ color: theme.primary, fontWeight: '800' }}>REDEEM</Text>
        </View>
        <View style={[styles.listItem, { borderColor: theme.border, backgroundColor: theme.card }]}> 
          <Text style={[styles.listItemText, { color: theme.text }]}>Reward Statement</Text>
          <Text style={{ color: theme.textSecondary }}>View ❯</Text>
        </View>

        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Security & Preferences</Text>
        <TouchableOpacity style={[styles.listItem, { borderColor: theme.border, backgroundColor: theme.card }]} onPress={() => setPopup({ visible: true, title: 'Change Username', message: 'Editing coming soon.', onConfirm: () => setPopup(null) })}>
          <Text style={[styles.listItemText, { color: theme.text }]}>Change Username</Text>
          <Text style={{ color: theme.textSecondary }}>❯</Text>
        </TouchableOpacity>

        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Support Center</Text>
        <TouchableOpacity style={[styles.expandableCard, { borderColor: theme.border, backgroundColor: theme.card }]} onPress={() => setSupportExpanded(!supportExpanded)}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={[styles.listItemText, { color: theme.text }]}>Contact Support</Text>
            <Text style={{ color: theme.primary }}>{supportExpanded ? '▲' : '▼'}</Text>
          </View>
        </TouchableOpacity>
        {supportExpanded && (
          <View>
            <View style={[styles.listItem, { borderColor: '#1e293b', backgroundColor: '#0a0e17' }]}> 
              <Text style={[styles.listItemText, { color: theme.text }]}>WhatsApp</Text>
            </View>
            <View style={[styles.listItem, { borderColor: '#1e293b', backgroundColor: '#0a0e17', marginTop: 5 }]}> 
              <Text style={[styles.listItemText, { color: theme.text }]}>Telegram</Text>
            </View>
          </View>
        )}

        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Legal</Text>
        <View style={[styles.listItem, { borderColor: theme.border, backgroundColor: theme.card }]}> 
          <Text style={[styles.listItemText, { color: theme.text }]}>Privacy Policy</Text>
        </View>
        <TouchableOpacity style={[styles.listItem, { borderColor: '#442', marginTop: 20 }]} onPress={() => setShowLogoutModal(true)}>
          <Text style={{ color: '#ff4444', fontWeight: 'bold' }}>Terminte Session</Text>
        </TouchableOpacity>
        {/* Banner Ad */}
        {shouldShowBanner && BannerAd && (
          <View style={{ alignItems: 'center', paddingVertical: 8, backgroundColor: theme.background }}>
            <BannerAd unitId={getBannerAdId()} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} />
          </View>
        )}

        <View style={{ height: 50 }} />
      </ScrollView>

      {popup?.visible && (
        <ThemedPopup visible={popup.visible} title={popup.title} message={popup.message} onConfirm={popup.onConfirm} />
      )}


      <Modal visible={showLogoutModal} transparent animationType="fade" onRequestClose={() => setShowLogoutModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Confirm Logout</Text>
            <Text style={[styles.modalMessage, { color: theme.textSecondary }]}>Are you sure you want to logout?</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelButton, { borderColor: theme.border }]} onPress={() => setShowLogoutModal(false)}>
                <Text style={[styles.cancelButtonText, { color: theme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalButton} onPress={handleLogout}>
                <LinearGradient colors={[theme.error, '#ff4757']} style={styles.confirmButton}>
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
  topHeader: {
    paddingHorizontal: 20,
    paddingTop: 35,
    paddingBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: theme.text,
  },
  centerProfile: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  avatarSquare: {
    width: 85,
    height: 85,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderWidth: 4,
    borderColor: '#1a1f26',
  },
  centerName: {
    fontSize: 22,
    fontWeight: '700',
  },
  centerPoints: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 5,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    marginHorizontal: 25,
    marginTop: 25,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  listItem: {
    marginHorizontal: 20,
    marginBottom: 10,
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listItemAccent: {
    borderWidth: 1.5,
  },
  listItemText: {
    fontSize: 16,
    fontWeight: '600',
  },
  expandableCard: {
    marginHorizontal: 20,
    marginBottom: 15,
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
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

export default ProfileScreen;
