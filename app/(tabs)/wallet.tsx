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
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../hooks/useTheme';
import { api } from '../../services/api';
import Icon from '../../components/Icon';
import ThemedPopup from '../../components/ThemedPopup';

const { height: screenHeight } = Dimensions.get('window');
const HEADER_HEIGHT = screenHeight * 0.30; // 30% of screen height

export default function WalletScreen() {
  const theme = useTheme();
  const styles = createStyles(theme);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const balanceAnim = useRef(new Animated.Value(0)).current;
  
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
      const [balanceRes, activityRes, methodsRes, conversionRes] = await Promise.all([
        api.get('/wallet/balance'),
        api.get('/wallet/activity'),
        api.get('/wallet/withdrawal-methods'),
        api.get('/wallet/conversion-rate'),
      ]);

      setWalletData(balanceRes.data?.data || { balance: 0, energy_points: 0, pending_amount: 0, total_withdrawn: 0 });
      setTransactions(activityRes.data?.data || []);
      setWithdrawalMethods(methodsRes.data?.data || []);
      setConversionRate({
        rate: conversionRes.data?.data?.conversion_rate || 10,
        minRequired: conversionRes.data?.data?.min_energy_required || 50,
        enabled: conversionRes.data?.data?.conversion_enabled !== false
      });
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
              <Text style={styles.headerTitle}>My Wallet 💰</Text>
              <Text style={styles.headerSubtitle}>Manage your earnings</Text>
              
              <View style={styles.balanceCard}>
                <Text style={styles.balanceLabel}>Available Balance</Text>
                <View style={styles.balanceWithIcon}>
                  <Icon name="coin" size={24} />
                  <Text style={styles.balanceValue}>
                    {walletData.balance.toFixed(2)}
                  </Text>
                </View>
                <View style={styles.pendingInfo}>
                  <View style={styles.pendingWithIcon}>
                    <Icon name="coin" size={14} />
                    <Text style={styles.pendingText}>{walletData.pending_amount.toFixed(2)} pending • ⚡{walletData.energy_points} energy</Text>
                  </View>
                </View>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Energy Conversion Section */}
        {walletData.energy_points > 0 && conversionRate.enabled && (
          <AnimatedCard delay={150}>
            <View style={[styles.conversionSection, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.conversionHeader}>
                <Text style={[styles.conversionTitle, { color: theme.text }]}>⚡ Convert Energy Points</Text>
                <Text style={[styles.conversionSubtitle, { color: theme.textSecondary }]}>
                  Turn your energy points into regular points
                </Text>
              </View>
              
              <View style={styles.conversionContent}>
                <View style={styles.conversionRate}>
                  <Text style={[styles.rateText, { color: theme.textSecondary }]}>
                    Conversion Rate: {conversionRate.rate} energy = 1 point
                  </Text>
                  <Text style={[styles.minText, { color: theme.textSecondary }]}>
                    Minimum: {conversionRate.minRequired} energy points
                  </Text>
                </View>
                
                <TouchableOpacity 
                  style={styles.convertButton}
                  onPress={() => setShowConversionModal(true)}
                  activeOpacity={0.8}
                  disabled={!conversionRate.enabled || walletData.energy_points < conversionRate.minRequired}
                >
                  <LinearGradient
                    colors={conversionRate.enabled && walletData.energy_points >= conversionRate.minRequired 
                      ? ['#FFD700', '#FFA500'] 
                      : ['#CCCCCC', '#999999']
                    }
                    style={styles.convertGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.convertText}>
                      ⚡ Convert {walletData.energy_points} Energy Points
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </AnimatedCard>
        )}

        {/* Quick Stats */}
        <AnimatedCard delay={200}>
          <View style={styles.statsContainer}>
            <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <LinearGradient
                colors={['#4facfe', '#00f2fe']}
                style={styles.statIcon}
              >
                <Text style={styles.statIconText}>📊</Text>
              </LinearGradient>
              <View style={styles.statValueWithIcon}>
                <Icon name="coin" size={16} />
                <Text style={[styles.statValue, { color: theme.text, marginLeft: 4 }]}>{walletData.total_withdrawn.toFixed(2)}</Text>
              </View>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Total Withdrawn</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <LinearGradient
                colors={['#fa709a', '#fee140']}
                style={styles.statIcon}
              >
                <Text style={styles.statIconText}>⚡</Text>
              </LinearGradient>
              <View style={styles.statValueWithIcon}>
                <Icon name="coin" size={16} />
                <Text style={[styles.statValue, { color: theme.text, marginLeft: 4 }]}>{walletData.pending_amount.toFixed(2)}</Text>
              </View>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Pending Amount</Text>
            </View>
          </View>
        </AnimatedCard>

        {/* Withdrawal Button */}
        <AnimatedCard delay={400}>
          <View style={styles.withdrawSection}>
            <TouchableOpacity 
              style={styles.withdrawButton}
              onPress={() => setShowWithdrawModal(true)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={theme.gradient.primary as [string, string, ...string[]]}
                style={styles.withdrawGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.withdrawText}>💸 Withdraw Money</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </AnimatedCard>

        {/* Withdrawal Methods */}
        <AnimatedCard delay={600}>
          <View style={[styles.methodsSection, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Withdrawal Methods</Text>
            {withdrawalMethods.map((method: any, index: number) => (
              <TouchableOpacity 
                key={index} 
                style={[styles.methodItem, { borderBottomColor: theme.borderLight }]}
                activeOpacity={0.7}
              >
                <View style={styles.methodInfo}>
                  <Text style={styles.methodIcon}>{method.icon || '💰'}</Text>
                  <View style={styles.methodDetails}>
                    <Text style={[styles.methodName, { color: theme.text }]}>{method.name}</Text>
                    <Text style={[styles.methodMeta, { color: theme.textSecondary }]}>
                      Min: ₹{method.min_amount} • {method.processing_time}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.methodArrow, { color: theme.textSecondary }]}>→</Text>
              </TouchableOpacity>
            ))}
          </View>
        </AnimatedCard>

        {/* Recent Transactions */}
        <AnimatedCard delay={800}>
          <View style={[styles.transactionsSection, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Activity</Text>
            {transactions.length === 0 ? (
              <Text style={[{ padding: 20, textAlign: 'center', color: theme.textSecondary }]}>No transactions yet</Text>
            ) : (
              transactions.map((transaction: any, index: number) => (
                <View key={index} style={[styles.transactionItem, { borderBottomColor: theme.borderLight }]}>
                  <View style={styles.transactionInfo}>
                    <View style={[
                      styles.transactionIcon,
                      { backgroundColor: transaction.type === 'earning' ? '#e8f5e8' : '#fff0f0' }
                    ]}>
                      <Text style={styles.transactionIconText}>
                        {transaction.type === 'earning' ? '↗️' : '↙️'}
                      </Text>
                    </View>
                    <View style={styles.transactionDetails}>
                      <Text style={[styles.transactionTitle, { color: theme.text }]}>
                        {transaction.description}
                      </Text>
                      <Text style={[styles.transactionDate, { color: theme.textSecondary }]}>
                        {new Date(transaction.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.transactionAmount}>
                    <View style={styles.transactionAmountContainer}>
                      {transaction.type === 'earning' && <Icon name="coin" size={14} />}
                      <Text style={[
                        styles.amountText,
                        { 
                          color: transaction.type === 'earning' ? theme.success : theme.error,
                          marginLeft: transaction.type === 'earning' ? 4 : 0
                        }
                      ]}>
                        {transaction.type === 'earning' ? '+' : '-'}
                        {transaction.type === 'earning' ? '' : '₹'}
                        {Math.abs(transaction.amount).toFixed(2)}
                      </Text>
                    </View>
                    <Text style={[
                      styles.statusText,
                    { 
                      color: transaction.status === 'completed' ? theme.success : 
                             transaction.status === 'pending' ? theme.warning : theme.error
                    }
                  ]}>
                    {transaction.status || 'completed'}
                  </Text>
                </View>
              </View>
              ))
            )}
          </View>
        </AnimatedCard>
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
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 16,
  },
  balanceCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
    width: '100%',
  },
  balanceLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  balanceValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
    marginLeft: 8,
  },
  balanceWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingInfo: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
  },
  pendingText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.9)',
    marginLeft: 4,
  },
  pendingWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
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
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statValueWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  withdrawSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  withdrawButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  withdrawGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  withdrawText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  methodsSection: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  methodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  methodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  methodIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  methodDetails: {
    flex: 1,
  },
  methodName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  methodMeta: {
    fontSize: 14,
  },
  methodArrow: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  transactionsSection: {
    marginHorizontal: 20,
    marginBottom: 30,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  transactionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  transactionIconText: {
    fontSize: 16,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 14,
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  transactionAmountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  statusText: {
    fontSize: 12,
    textTransform: 'capitalize',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 24,
  },
  modalSection: {
    marginBottom: 24,
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  modalMethodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  modalMethodIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  modalMethodName: {
    fontSize: 16,
    fontWeight: '500',
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
    padding: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    padding: 16,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Energy Conversion Styles
  conversionSection: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  conversionHeader: {
    marginBottom: 16,
  },
  conversionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  conversionSubtitle: {
    fontSize: 14,
  },
  conversionContent: {
    gap: 16,
  },
  conversionRate: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    padding: 12,
    borderRadius: 10,
    gap: 4,
  },
  rateText: {
    fontSize: 14,
    fontWeight: '500',
  },
  minText: {
    fontSize: 12,
  },
  convertButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  convertGradient: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  convertText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Conversion Modal Styles
  conversionModalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '70%',
  },
  conversionPreview: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  previewText: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  conversionInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
  },
});
