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
  Linking,
  ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { getProfile } from '../../services/api';
import { useTheme } from '../../hooks/useTheme';
import { useAuthStore } from '../../stores/authStore';
import { useUserStore } from '../../stores/userStore';
import { useDataStore } from '../../stores/dataStore';
import ThemedPopup from '../../components/ThemedPopup';
import { useAdMob } from '../../hooks/useAdMob';
import FixedBannerAd from '../../components/FixedBannerAd';
import Clipboard from '@react-native-clipboard/clipboard';
import { Share } from 'react-native';
import { APP_CONFIG } from '../../config/app';

function ProfileScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const { shouldShowBanner, getBannerAdId, getAdRequestOptions } = useAdMob();
  const logout = useAuthStore((s) => s.logout);
  const setProfileInStore = useUserStore((s) => s.setProfile);

  const [user, setUser] = useState<any | null>(null);
  const [name, setName] = useState('');
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [popup, setPopup] = useState<{ visible: boolean; title: string; message: string; onConfirm?: () => void } | null>(null);
  const [supportExpanded, setSupportExpanded] = useState(false);
  const [privacyExpanded, setPrivacyExpanded] = useState(false);

  const styles = useMemo(() => createStyles(theme), [theme]);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const lastProfileFetchRef = useRef(0);
  const FOCUS_CACHE_MS = 15000;

  const loadProfile = useCallback(async () => {
    try {
      const data = await getProfile();
      const u = (data && (data.user || data.data?.user || data)) || {};
      setUser(u);
      setProfileInStore(u);
      setName((u.name as string) || 'User');
      lastProfileFetchRef.current = Date.now();
    } catch (error) {
      setUser(null);
      setName('User');
    }
  }, [setProfileInStore]);

  // Reload profile when screen gains focus; use dataStore cache if fresh (e.g. already loaded on Home), else skip if we loaded recently
  useFocusEffect(
    useCallback(() => {
      const state = useDataStore.getState();
      const cacheMs = 30 * 1000;
      if (state.profile?.id && state.profileLastFetched != null && Date.now() - state.profileLastFetched < cacheMs) {
        setUser(state.profile);
        useUserStore.getState().setProfile(state.profile);
        setName((state.profile.name as string) || 'User');
        lastProfileFetchRef.current = Date.now();
        return;
      }
      if (Date.now() - lastProfileFetchRef.current < FOCUS_CACHE_MS) return;
      loadProfile();
    }, [loadProfile])
  );

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  const referralMessage = (code: string) =>
    `Join Earn Pilot and use my referral code: ${code}\n${APP_CONFIG.PLAY_STORE_APP_URL}`;

  const handleCopyReferral = (code?: string) => {
    if (!code) {
      setPopup({ visible: true, title: 'No code', message: 'No referral code available', onConfirm: () => setPopup(null) });
      return;
    }
    Clipboard.setString(referralMessage(code));
    setPopup({ visible: true, title: 'Copied', message: 'Referral message with app link copied to clipboard', onConfirm: () => setPopup(null) });
  };

  const handleShareReferral = async (code?: string) => {
    if (!code) {
      setPopup({ visible: true, title: 'No code', message: 'No referral code available', onConfirm: () => setPopup(null) });
      return;
    }
    try {
      await Share.share({
        message: referralMessage(code),
      });
    } catch (e) {
      setPopup({ visible: true, title: 'Error', message: 'Failed to open share dialog', onConfirm: () => setPopup(null) });
    }
  };

  const handleLogout = async () => {
    setShowLogoutModal(false);
    setLogoutLoading(true);
    try {
      await logout();
      // Navigation will automatically switch to Auth stack when isAuthenticated becomes false
    } catch (error) {
      setPopup({ visible: true, title: 'Error', message: 'Failed to logout. Please try again.', onConfirm: () => setPopup(null) });
    } finally {
      setLogoutLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={theme.background === '#ffffff' ? 'dark-content' : 'light-content'} backgroundColor={theme.background} />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollViewContent,
          { paddingBottom: shouldShowBanner ? 100 : 20 }
        ]}
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

        {/* Referral Code */}
        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Referral</Text>
        <View style={[styles.listItem, { borderColor: theme.border, backgroundColor: theme.card }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.listItemText, { color: theme.text }]}>Your Referral Code</Text>
            <Text style={{ color: theme.textSecondary, marginTop: 6, fontWeight: '700' }}>{user?.referral_code ?? '—'}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={{ marginRight: 8 }} onPress={() => handleCopyReferral(user?.referral_code)}>
              <Text style={{ color: theme.primary, fontWeight: '700' }}>Copy</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleShareReferral(user?.referral_code)}>
              <Text style={{ color: theme.primary, fontWeight: '700' }}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>
        </Animated.View>

        {/* <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Wallet</Text>
        <View style={[styles.listItem, styles.listItemAccent, { borderColor: theme.primary, backgroundColor: 'rgba(0, 209, 255, 0.05)' }]}> 
          <Text style={[styles.listItemText, { color: theme.text }]}>Withdrawal Hub</Text>
          <Text style={{ color: theme.primary, fontWeight: '800' }}>REDEEM</Text>
        </View>
        <View style={[styles.listItem, { borderColor: theme.border, backgroundColor: theme.card }]}> 
          <Text style={[styles.listItemText, { color: theme.text }]}>Reward Statement</Text>
          <Text style={{ color: theme.textSecondary }}>View ❯</Text>
        </View> */}

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
        <TouchableOpacity style={[styles.expandableCard, { borderColor: theme.border, backgroundColor: theme.card }]} onPress={() => setPrivacyExpanded(!privacyExpanded)}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={[styles.listItemText, { color: theme.text }]}>Privacy Policy</Text>
            <Text style={{ color: theme.primary }}>{privacyExpanded ? '▲' : '▼'}</Text>
          </View>
        </TouchableOpacity>
        {privacyExpanded && (
          <View>
            <TouchableOpacity 
              style={[styles.listItem, { borderColor: '#1e293b', backgroundColor: '#0a0e17' }]}
              onPress={() => Linking.openURL('https://networks11.com/privacy-policy')}
            > 
              <Text style={[styles.listItemText, { color: theme.text }]}>Privacy Policy</Text>
              <Text style={{ color: theme.textSecondary }}>❯</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.listItem, { borderColor: '#1e293b', backgroundColor: '#0a0e17', marginTop: 5 }]}
              onPress={() => Linking.openURL('https://networks11.com/terms-conditions')}
            > 
              <Text style={[styles.listItemText, { color: theme.text }]}>Terms & Conditions</Text>
              <Text style={{ color: theme.textSecondary }}>❯</Text>
            </TouchableOpacity>
          </View>
        )}
        <TouchableOpacity style={[styles.listItem, { borderColor: '#442', marginTop: 20 }]} onPress={() => setShowLogoutModal(true)}>
          <Text style={{ color: '#ff4444', fontWeight: 'bold' }}>Logout</Text>
        </TouchableOpacity>

        <View style={{ height: 150 }} />
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
              <TouchableOpacity style={styles.modalButton} onPress={handleLogout} disabled={logoutLoading}>
                <LinearGradient colors={[theme.error, '#ff4757']} style={styles.confirmButton}>
                  <Text style={styles.confirmButtonText}>Logout</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Logout loading overlay */}
      <Modal visible={logoutLoading} transparent animationType="fade" statusBarTranslucent hardwareAccelerated>
        <View style={[styles.loadingOverlay, { backgroundColor: theme.background || '#05080F' }]}>
          <View style={[styles.loadingContainer, { backgroundColor: theme.card || '#111721', borderColor: theme.border }]}>
            <ActivityIndicator size="large" color={theme.primary || '#00D1FF'} style={styles.loadingSpinner} />
            <Text style={[styles.loadingText, { color: theme.text }]}>Logging out...</Text>
          </View>
        </View>
      </Modal>
      
      {/* Fixed Banner Ad above Tab Bar */}
      <FixedBannerAd
        shouldShowBanner={shouldShowBanner}
        getBannerAdId={getBannerAdId}
        requestOptions={getAdRequestOptions()}
        backgroundColor={theme.background}
      />
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
  scrollViewContent: {
    paddingTop: 0,
  },
  topHeader: {
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 24,
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
  loadingOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    elevation: 9999,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    borderRadius: 24,
    borderWidth: 1,
    minWidth: 200,
  },
  loadingSpinner: {
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ProfileScreen;
