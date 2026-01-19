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
import { useTheme } from '../../hooks/useTheme';
import { api } from '../../services/api';
import { useAdMob } from '../../hooks/useAdMob';
import Icon from '../../components/Icon';
import ThemedPopup from '../../components/ThemedPopup';
import FixedBannerAd from '../../components/FixedBannerAd';

// Safely import BannerAd - may not be available in Expo Go
let BannerAd: any = null;
let BannerAdSize: any = null;
try {
  const admobModule = require('react-native-google-mobile-ads');
  BannerAd = admobModule.BannerAd;
  BannerAdSize = admobModule.BannerAdSize;
} catch (e) {
  // AdMob not available in Expo Go
}

const { height: screenHeight } = Dimensions.get('window');
const HEADER_HEIGHT = screenHeight * 0.30; // 30% of screen height

export default function WalletScreen() {
  const theme = useTheme();
  const styles = createStyles(theme);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const balanceAnim = useRef(new Animated.Value(0)).current;
  
  // AdMob hooks
  const { showRewarded, getRemainingRewardedAds, getRewardedAdBonus, shouldShowBanner, getBannerAdId } = useAdMob();
  const [loadingRewardedAd, setLoadingRewardedAd] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [walletData, setWalletData] = useState({
    balance: 0,
    energy_points: 0,
    pending_amount: 0,
    total_withdrawn: 0,
  });
  const [transactions, setTransactions] = useState<any[]>([]);
  const [withdrawalMethods, setWithdrawalMethods] = useState<any[]>([]);
  
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<any>(null);
  const [paymentDetails, setPaymentDetails] = useState('');
  const [popup, setPopup] = useState<{ visible: boolean; title: string; message: string; onConfirm?: () => void } | null>(null);
  
  // Energy conversion state
  const [showConversionModal, setShowConversionModal] = useState(false);
  const [energyAmount, setEnergyAmount] = useState('');
  const [conversionRate, setConversionRate] = useState({ rate: 10, minRequired: 50, enabled: true });
  const [convertingEnergy, setConvertingEnergy] = useState(false);

  const showPopup = (title: string, message: string) => {
    setPopup({
      visible: true,
      title,
      message,
      onConfirm: () => setPopup(null)
    });
  };

  useEffect(() => {
    loadWalletData();
    
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
      const [balanceRes, activityRes, methodsRes] = await Promise.all([
        api.get('/wallet/balance'),
        api.get('/wallet/activity'),
        api.get('/wallet/withdrawal-methods'),
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
        // If 404 or any error, use default
        console.warn('Conversion rate API failed, using default value 10');
      }

      setWalletData(balanceRes.data?.data || { balance: 0, energy_points: 0, pending_amount: 0, total_withdrawn: 0 });
      setTransactions(activityRes.data?.data || []);
      setWithdrawalMethods(methodsRes.data?.data || []);
      setConversionRate(conversionRateData);
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

  const handleWithdraw = async () => {
    if (!selectedMethod) {
      showPopup('Error', 'Please select a withdrawal method');
      return;
    }
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      showPopup('Error', 'Please enter a valid amount');
      return;
    }
    if (parseFloat(withdrawAmount) < selectedMethod.min_amount) {
      showPopup('Error', `Minimum withdrawal amount for ${selectedMethod.name} is ₹${selectedMethod.min_amount}`);
      return;
    }
    if (parseFloat(withdrawAmount) > walletData.balance) {
      showPopup('Error', 'Insufficient balance');
      return;
    }
    if (!paymentDetails.trim()) {
      showPopup('Error', 'Please enter payment details');
      return;
    }

    try {
      const res = await api.post('/wallet/withdraw', {
        amount: parseFloat(withdrawAmount),
        method: selectedMethod.key,
        payment_details: paymentDetails,
      });

      showPopup('Success! 🎉', res.data.message || 'Withdrawal request submitted successfully!');
      setShowWithdrawModal(false);
      setWithdrawAmount('');
      setSelectedMethod(null);
      setPaymentDetails('');
      await loadWalletData(); // Reload wallet data
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'Failed to process withdrawal';
      showPopup('Error', errorMsg);
    }
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
            <Text style={[styles.logoText, { color: theme.text }]}>WALLET</Text>
          </View>

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
        </Animated.View>

        {/* Wallet Section */}
        <View style={{ paddingHorizontal: 20, marginTop: 30, gap: 15 }}>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Wallet</Text>

          <TouchableOpacity
            style={[styles.listItem, styles.listItemAccent, { borderColor: theme.primary, backgroundColor: theme.primary + '15' }]}
            onPress={() => setShowWithdrawModal(true)}
            activeOpacity={0.8}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.listItemText, { color: theme.text }]}>Withdrawal Hub</Text>
              <Text style={[styles.listItemDesc, { color: theme.textSecondary }]}>Withdraw your earnings</Text>
            </View>
            <Text style={{ color: theme.primary, fontWeight: '800', fontSize: 12, textTransform: 'uppercase' }}>REDEEM</Text>
          </TouchableOpacity>

          <View style={[styles.listItem, { borderColor: theme.border, backgroundColor: theme.card }]}>
            <Text style={[styles.listItemText, { color: theme.text }]}>Reward Statement</Text>
            <Text style={{ color: theme.textSecondary }}>View ❯</Text>
          </View>
        </View>

        {/* Stats Section */}
        <View style={{ paddingHorizontal: 20, marginTop: 30, gap: 15 }}>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Statistics</Text>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={{ fontSize: 24, marginBottom: 8 }}>💸</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Withdrawn</Text>
              <Text style={[styles.statValue, { color: theme.text }]}>₹{walletData.total_withdrawn.toFixed(2)}</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={{ fontSize: 24, marginBottom: 8 }}>⏳</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Pending</Text>
              <Text style={[styles.statValue, { color: theme.text }]}>₹{walletData.pending_amount.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* Withdrawal Methods */}
        {withdrawalMethods.length > 0 && (
          <View style={{ paddingHorizontal: 20, marginTop: 30, marginBottom: 20, gap: 15 }}>
            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Withdrawal Methods</Text>

            {withdrawalMethods.map((method: any, index: number) => (
              <View
                key={index}
                style={[styles.methodCard, { backgroundColor: theme.card, borderColor: theme.border }]}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={[styles.methodName, { color: theme.text }]}>{method.name}</Text>
                    <Text style={[styles.methodDesc, { color: theme.textSecondary }]}>
                      Min: ₹{method.min_amount} • {method.processing_time}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 20 }}>
                    {method.icon || (method.name.includes('Bank') ? '🏦' : method.name.includes('Wallet') ? '💳' : '💰')}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

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
                    {tx.type === 'credit' ? '+' : '-'}₹{tx.amount.toFixed(2)}
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
      </ScrollView>

      {/* Withdrawal Modal */}
      <Modal
        visible={showWithdrawModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowWithdrawModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Withdraw Money</Text>
            
            <View style={styles.modalSection}>
              <Text style={[styles.modalLabel, { color: theme.text }]}>Amount</Text>
              <TextInput
                style={[styles.modalInput, { borderColor: theme.border, color: theme.text, backgroundColor: theme.background }]}
                placeholder="Enter amount"
                placeholderTextColor={theme.placeholder}
                value={withdrawAmount}
                onChangeText={setWithdrawAmount}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.modalSection}>
              <Text style={[styles.modalLabel, { color: theme.text }]}>Withdrawal Method</Text>
              {withdrawalMethods.map((method: any, index: number) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.modalMethodItem,
                    { 
                      borderColor: selectedMethod?.key === method.key ? theme.primary : theme.border,
                      backgroundColor: selectedMethod?.key === method.key ? theme.primary + '10' : theme.background
                    }
                  ]}
                  onPress={() => setSelectedMethod(method)}
                >
                  <Text style={styles.modalMethodIcon}>{method.icon || '💰'}</Text>
                  <View>
                    <Text style={[styles.modalMethodName, { color: theme.text }]}>{method.name}</Text>
                    <Text style={{ color: theme.textSecondary, fontSize: 11 }}>
                      Min ₹{method.min_amount}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalSection}>
              <Text style={[styles.modalLabel, { color: theme.text }]}>
                {selectedMethod?.key === 'upi' ? 'UPI ID' : 
                 selectedMethod?.key === 'bank_transfer' ? 'Bank Details (Acc No/IFSC)' : 
                 'Voucher Details'}
              </Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
                placeholder={selectedMethod?.key === 'upi' ? 'example@upi' : 'Enter details'}
                placeholderTextColor={theme.placeholder}
                value={paymentDetails}
                onChangeText={setPaymentDetails}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton, { borderColor: theme.border }]}
                onPress={() => setShowWithdrawModal(false)}
              >
                <Text style={[styles.cancelButtonText, { color: theme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalButton}
                onPress={handleWithdraw}
              >
                <LinearGradient
                  colors={theme.gradient.primary as [string, string, ...string[]]}
                  style={styles.confirmButton}
                >
                  <Text style={styles.confirmButtonText}>Withdraw</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
  topHeader: {
    paddingHorizontal: 20,
    paddingTop: 35,
    paddingBottom: 20,
  },
  logoText: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
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
