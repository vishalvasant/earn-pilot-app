import React, { useEffect, useRef, useState } from 'react';
import { 
  SafeAreaView, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  StyleSheet,
  StatusBar,
  Animated,
  Modal,
  TextInput,
  RefreshControl,
  Dimensions
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../hooks/useTheme';
import { api } from '../../services/api';
import { useAdMob } from '../../hooks/useAdMob';
import Icon from '../../components/Icon';
import ThemedPopup from '../../components/ThemedPopup';
import FixedBannerAd from '../../components/FixedBannerAd';
import Skeleton from '../../components/Skeleton';

// Safely import BannerAd - may not be available when native module is not loaded
let BannerAd: any = null;
let BannerAdSize: any = null;
try {
  const admobModule = require('react-native-google-mobile-ads');
  BannerAd = admobModule.BannerAd;
  BannerAdSize = admobModule.BannerAdSize;
} catch (e) {
  // AdMob native module not available
}

const { height: screenHeight } = Dimensions.get('window');
const HEADER_HEIGHT = screenHeight * 0.30; // 30% of screen height

export default function WalletScreen() {
  const navigation = useNavigation();
  const theme = useTheme();
  const styles = createStyles(theme);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const balanceAnim = useRef(new Animated.Value(0)).current;
  
  const { shouldShowBanner, getBannerAdId, getBannerAdIds, getAdRequestOptions, showRewarded, getRemainingRewardedAds, getRewardedAdBonus, config } = useAdMob();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [walletData, setWalletData] = useState({
    balance: 0,
    energy_points: 0,
    pending_amount: 0,
    total_withdrawn: 0,
  });
  const [transactions, setTransactions] = useState<any[]>([]);
  const [earnedVouchers, setEarnedVouchers] = useState<any[]>([]);
  const [popup, setPopup] = useState<{ visible: boolean; title: string; message: string; onConfirm?: () => void } | null>(null);
  
  // Energy conversion state
  const [showConversionModal, setShowConversionModal] = useState(false);
  const [watchingRewardedAd, setWatchingRewardedAd] = useState(false);
  const [energyAmount, setEnergyAmount] = useState('');
  const [conversionRate, setConversionRate] = useState({ rate: 10, minRequired: 50, enabled: true });
  const [convertingEnergy, setConvertingEnergy] = useState(false);
  const lastWalletFetchRef = useRef(0);
  const FOCUS_CACHE_MS = 15000; // Skip refetch if we loaded within last 15s (e.g. rapid tab switch)

  const showPopup = (title: string, message: string) => {
    setPopup({
      visible: true,
      title,
      message,
      onConfirm: () => setPopup(null)
    });
  };

  // Reload wallet data when screen gains focus; skip if we loaded recently (avoid duplicate calls on rapid tab switch)
  useFocusEffect(
    React.useCallback(() => {
      if (Date.now() - lastWalletFetchRef.current < FOCUS_CACHE_MS) return;
      loadWalletData();
    }, [])
  );

  useEffect(() => {
    // Entrance animation only (data loaded by useFocusEffect)
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

  // Animate balance when walletData changes
  useEffect(() => {
    Animated.timing(balanceAnim, {
      toValue: walletData.balance,
      duration: 2000,
      useNativeDriver: false,
    }).start();
  }, [walletData.balance]);

  const loadWalletData = async () => {
    try {
      setLoading(true);
      const [balanceRes, activityRes, vouchersRes] = await Promise.all([
        api.get('/wallet/balance'),
        api.get('/wallet/activity'),
        api.get('/wallet/earned-vouchers').catch(() => ({ data: { data: [] } })),
      ]);

      let conversionRateData = { rate: 10, minRequired: 50, enabled: true };
      try {
        const conversionRes = await api.get('/wallet/conversion-rate');
        conversionRateData = {
          rate: conversionRes.data?.data?.conversion_rate || 10,
          minRequired: conversionRes.data?.data?.min_energy_required || 50,
          enabled: conversionRes.data?.data?.conversion_enabled !== false
        };
      } catch (err: any) {
        console.warn('Conversion rate API failed, using default value 10');
      }

      setWalletData(balanceRes.data?.data || { balance: 0, energy_points: 0, pending_amount: 0, total_withdrawn: 0 });
      setTransactions(activityRes.data?.data || []);
      setEarnedVouchers(vouchersRes.data?.data || []);
      setConversionRate(conversionRateData);
      lastWalletFetchRef.current = Date.now();
    } catch (error) {
      console.error('Failed to load wallet data:', error);
      showPopup('Error', 'Failed to load wallet data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadWalletData();
    setRefreshing(false);
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

  const handleEnergyConversion = async () => {
    if (!conversionRate.enabled) {
      showPopup('Error', 'Energy conversion is currently disabled');
      return;
    }
    
    if (!energyAmount || parseInt(energyAmount) <= 0) {
      showPopup('Error', 'Please enter a valid energy amount');
      return;
    }
    
    const energyAmountInt = parseInt(energyAmount);
    
    if (energyAmountInt < conversionRate.minRequired) {
      showPopup('Error', `Minimum ${conversionRate.minRequired} energy points required for conversion`);
      return;
    }
    
    if (energyAmountInt > walletData.energy_points) {
      showPopup('Error', 'Insufficient energy points');
      return;
    }

    try {
      setConvertingEnergy(true);
      const res = await api.post('/wallet/convert-energy', {
        energy_amount: energyAmountInt,
      });

      const data = res.data.data;
      showPopup('Success! 🎉', 
        `Converted ${data.energy_used} energy points to ${data.points_received} regular points! Your new balance is ${data.new_points_balance} points.`
      );
      
      setShowConversionModal(false);
      setEnergyAmount('');
      await loadWalletData(); // Reload wallet data
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'Failed to convert energy points';
      showPopup('Error', errorMsg);
    } finally {
      setConvertingEnergy(false);
    }
  };

  const calculateConvertedPoints = (energy: string) => {
    if (!energy || parseInt(energy) <= 0) return 0;
    return Math.floor(parseInt(energy) / conversionRate.rate);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar 
        barStyle={theme.background === '#ffffff' ? 'dark-content' : 'light-content'} 
        backgroundColor={theme.background}
      />
      
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollViewContent,
          shouldShowBanner ? { paddingBottom: 100 } : null,
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        >
          {/* Header */}
          <Animated.View 
            style={[
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
          <View style={styles.topHeader}>
            <Text style={styles.logoText}>MY<Text style={{ color: theme.primary }}>WALLET</Text></Text>
          </View>

          {loading ? (
            /* Skeleton Loader */
            <>
              {/* Balance Card Skeleton - matches LinearGradient card layout */}
              <View style={[styles.balanceCard, { backgroundColor: theme.primary + '25', borderWidth: 0 }]}>
                <Skeleton width={140} height={12} borderRadius={4} />
                <Skeleton width={140} height={36} style={{ marginTop: 12 }} borderRadius={6} />
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15, marginTop: 24, paddingTop: 20, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.15)' }}>
                  <View style={{ flex: 1, gap: 6 }}>
                    <Skeleton width={50} height={10} borderRadius={4} />
                    <Skeleton width={70} height={18} borderRadius={4} />
                  </View>
                  <View style={{ width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.2)' }} />
                  <View style={{ flex: 1, gap: 6 }}>
                    <Skeleton width={45} height={10} borderRadius={4} />
                    <Skeleton width={65} height={18} borderRadius={4} />
                  </View>
                </View>
              </View>

              {/* Wallet Section Skeleton */}
              <View style={{ paddingHorizontal: 20, marginTop: 30, gap: 15 }}>
                <Skeleton width={60} height={11} borderRadius={4} />
                <View style={[styles.listItem, { borderColor: theme.border, backgroundColor: theme.card }]}>
                  <View style={{ flex: 1, gap: 6 }}>
                    <Skeleton width={140} height={16} borderRadius={4} />
                    <Skeleton width={200} height={12} borderRadius={4} />
                  </View>
                  <Skeleton width={70} height={28} borderRadius={8} />
                </View>
                <View style={[styles.listItem, { borderColor: theme.border, backgroundColor: theme.card }]}>
                  <View style={{ flex: 1, gap: 6 }}>
                    <Skeleton width={130} height={16} borderRadius={4} />
                    <Skeleton width={180} height={12} borderRadius={4} />
                  </View>
                  <Skeleton width={60} height={28} borderRadius={8} />
                </View>
              </View>

              {/* Statistics Section Skeleton */}
              <View style={{ paddingHorizontal: 20, marginTop: 30, gap: 15 }}>
                <Skeleton width={90} height={11} borderRadius={4} />
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <Skeleton width={32} height={32} borderRadius={8} style={{ alignSelf: 'center' }} />
                    <Skeleton width={70} height={12} borderRadius={4} />
                    <Skeleton width={55} height={20} borderRadius={4} />
                  </View>
                  <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <Skeleton width={32} height={32} borderRadius={8} style={{ alignSelf: 'center' }} />
                    <Skeleton width={55} height={12} borderRadius={4} />
                    <Skeleton width={55} height={20} borderRadius={4} />
                  </View>
                </View>
              </View>

              <View style={{ height: 150 }} />
            </>
          ) : (
          <>
          {/* Balance Card */}
          <LinearGradient
            colors={[theme.primary, theme.primary + 'CC']}
            style={styles.balanceCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={{ gap: 20 }}>
              <View style={{ gap: 8 }}>
                <Text style={styles.balanceLabel}>Available Balance</Text>
                <Text style={styles.balanceValue}>💎 {walletData.balance.toFixed(2)}</Text>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 15 }}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={styles.subBalanceLabel}>Pending</Text>
                  <Text style={styles.subBalanceValue}>{walletData.pending_amount.toFixed(2)}</Text>
                </View>
                <View style={{ width: 1, backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={styles.subBalanceLabel}>Energy</Text>
                  <Text style={styles.subBalanceValue}>⚡ {Math.floor(walletData.energy_points)}</Text>
                </View>
              </View>
            </View>
          </LinearGradient>

        {/* Wallet Section */}
        <View style={{ paddingHorizontal: 20, marginTop: 30, gap: 15 }}>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Wallet</Text>

          <TouchableOpacity
            style={[styles.listItem, styles.listItemAccent, { borderColor: theme.primary, backgroundColor: theme.primary + '15' }]}
            onPress={() => (navigation as any).navigate('Withdraw')}
            activeOpacity={0.8}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.listItemText, { color: theme.text }]}>Withdrawal Hub</Text>
              <Text style={[styles.listItemDesc, { color: theme.textSecondary }]}>Cash or vouchers – request withdraw</Text>
            </View>
            <Text style={{ color: theme.primary, fontWeight: '800', fontSize: 12, textTransform: 'uppercase' }}>REDEEM</Text>
          </TouchableOpacity>

          {/* Rewarded Ad - Watch ad for bonus points */}
          {config?.show_rewarded_ads && (
            <TouchableOpacity
              style={[styles.listItem, { borderColor: theme.primary, backgroundColor: theme.card }]}
              onPress={async () => {
                const remaining = getRemainingRewardedAds();
                if (remaining <= 0) {
                  showPopup('Limit Reached', 'You\'ve reached the daily limit for rewarded ads. Come back tomorrow!');
                  return;
                }
                setWatchingRewardedAd(true);
                try {
                  const shown = await showRewarded(() => {
                    showPopup('Success! 🎉', `You earned ${getRewardedAdBonus()} points!`);
                    loadWalletData();
                  });
                  if (!shown) {
                    showPopup('Ad Unavailable', 'No ad available at the moment. Please try again later.');
                  }
                } catch (e) {
                  showPopup('Error', 'Failed to show ad. Please try again.');
                } finally {
                  setWatchingRewardedAd(false);
                }
              }}
              disabled={watchingRewardedAd || getRemainingRewardedAds() <= 0}
              activeOpacity={0.8}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.listItemText, { color: theme.text }]}>Watch Ad for Points</Text>
                <Text style={[styles.listItemDesc, { color: theme.textSecondary }]}>
                  +{getRewardedAdBonus()} pts per ad • {getRemainingRewardedAds()} left today
                </Text>
              </View>
              <Text style={{ color: theme.primary, fontWeight: '700', fontSize: 12 }}>
                {watchingRewardedAd ? 'Loading...' : getRemainingRewardedAds() > 0 ? 'WATCH' : 'DONE'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Earned Vouchers */}
        {earnedVouchers.length > 0 && (
          <View style={{ paddingHorizontal: 20, marginTop: 24, gap: 15 }}>
            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Earned Vouchers</Text>
            {earnedVouchers.slice(0, 5).map((v: any) => (
              <View key={v.id} style={[styles.listItem, { borderColor: theme.border, backgroundColor: theme.card }]}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={[styles.listItemText, { color: theme.text }]}>{v.title || 'Voucher'}</Text>
                  <Text style={[styles.listItemDesc, { color: theme.textSecondary }]}>
                    {v.voucher_code ? `Code: ${v.voucher_code}` : ''} {v.expiry_date ? `• Expires ${v.expiry_date}` : ''}
                  </Text>
                </View>
                <Text style={{ color: v.status === 'active' ? theme.success : theme.textSecondary, fontSize: 12, fontWeight: '600' }}>
                  {v.status === 'active' ? 'Active' : 'Redeemed'}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Stats Section */}
        <View style={{ paddingHorizontal: 20, marginTop: 30, gap: 15 }}>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Statistics</Text>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={{ fontSize: 24, marginBottom: 8 }}>💸</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Withdrawn</Text>
              <Text style={[styles.statValue, { color: theme.text }]}> {walletData.total_withdrawn.toFixed(2)}</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={{ fontSize: 24, marginBottom: 8 }}>⏳</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Pending</Text>
              <Text style={[styles.statValue, { color: theme.text }]}> {walletData.pending_amount.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* Recent Transactions */}
        {transactions.length > 0 && (
          <View style={{ paddingHorizontal: 20, marginTop: 30, marginBottom: 40, gap: 15 }}>
            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Recent Activity</Text>

            {transactions.slice(0, 5).map((tx: any, index: number) => (
              <View
                key={index}
                style={[styles.transactionItem, { backgroundColor: theme.card, borderColor: theme.border }]}
              >
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={[styles.txDesc, { color: theme.text }]}>{tx.description}</Text>
                  <Text style={[styles.txDate, { color: theme.textSecondary }]}>
                    {tx.date} {tx.time}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={[styles.txAmount, { color: tx.type === 'credit' ? theme.success : theme.error }]}>
                    {tx.type === 'credit' ? '+' : '-'} {tx.amount.toFixed(2)}
                  </Text>
                  <Text style={[styles.txStatus, { color: tx.status === 'completed' ? theme.success : theme.primary }]}>
                    {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 150 }} />
          </>
          )}
        </Animated.View>
      </ScrollView>

      {/* Energy Conversion Modal */}
      <Modal
        visible={showConversionModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowConversionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.conversionModalContent, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Convert Energy Points</Text>
            
            <View style={styles.modalSection}>
              <Text style={[styles.modalLabel, { color: theme.text }]}>Energy Points to Convert</Text>
              <Text style={[styles.rateText, { color: theme.textSecondary, marginBottom: 8 }]}>
                Rate: {conversionRate.rate} energy points = 1 point
              </Text>
              <TextInput
                style={[styles.conversionInput, { borderColor: theme.border, color: theme.text, backgroundColor: theme.background }]}
                placeholder={`Enter energy points (min: ${conversionRate.minRequired})`}
                placeholderTextColor={theme.placeholder}
                value={energyAmount}
                onChangeText={setEnergyAmount}
                keyboardType="numeric"
              />
            </View>

            {energyAmount && parseInt(energyAmount) > 0 && (
              <View style={[styles.conversionPreview, { backgroundColor: theme.primaryLight + '20' }]}>
                <Text style={[styles.previewText, { color: theme.text }]}>
                  {energyAmount} energy points → {calculateConvertedPoints(energyAmount)} points
                </Text>
                <Text style={[styles.minText, { color: theme.textSecondary, textAlign: 'center', marginTop: 4 }]}>
                  Available: {walletData.energy_points} energy points
                </Text>
              </View>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton, { borderColor: theme.border }]}
                onPress={() => {
                  setShowConversionModal(false);
                  setEnergyAmount('');
                }}
              >
                <Text style={[styles.cancelButtonText, { color: theme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalButton}
                onPress={handleEnergyConversion}
                disabled={convertingEnergy}
              >
                <LinearGradient
                  colors={['#FFD700', '#FFA500']}
                  style={styles.confirmButton}
                >
                  <Text style={styles.confirmButtonText}>
                    {convertingEnergy ? 'Converting...' : 'Convert'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Themed Popup */}
      {popup?.visible && (
        <ThemedPopup
          visible={popup.visible}
          title={popup.title}
          message={popup.message}
          onConfirm={popup.onConfirm}
        />
      )}
      
      {/* Fixed Banner Ad above Tab Bar */}
      <FixedBannerAd
        shouldShowBanner={shouldShowBanner}
        getBannerAdId={getBannerAdId}
        getBannerAdIds={getBannerAdIds}
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
  balanceCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 24,
    borderRadius: 24,
  },
  balanceLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.85)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  balanceValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#ffffff',
  },
  subBalanceLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subBalanceValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  listItem: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
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
  listItemDesc: {
    fontSize: 12,
    marginTop: 4,
  },
  conversionCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  conversionTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  conversionDesc: {
    fontSize: 13,
  },
  energyAmount: {
    fontSize: 14,
    fontWeight: '500',
  },
  convertBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  convertBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  statCard: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  methodCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  methodName: {
    fontSize: 15,
    fontWeight: '600',
  },
  methodDesc: {
    fontSize: 12,
  },
  transactionItem: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  txDesc: {
    fontSize: 14,
    fontWeight: '600',
  },
  txDate: {
    fontSize: 12,
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  txStatus: {
    fontSize: 11,
    fontWeight: '600',
  },
  pendingWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 32,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 24,
  },
  modalSection: {
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
  },
  modalButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  cancelButton: {
    borderWidth: 1,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
  },
  confirmButton: {
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  modalMethodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  modalMethodIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  modalMethodName: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 12,
  },
  // Conversion Modal Styles
  conversionModalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 32,
    maxHeight: '90%',
  },
  conversionInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
  },
  conversionPreview: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  previewText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  minText: {
    fontSize: 12,
    fontWeight: '500',
  },
  rateText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
