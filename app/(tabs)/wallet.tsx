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
  Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../hooks/useTheme';

// Dummy wallet data
const mockWalletData = {
  balance: 15420,
  pendingAmount: 340,
  totalWithdrawn: 45600,
  recentTransactions: [
    { id: 1, type: 'credit', amount: 340, description: 'Task Completion Bonus', date: '2024-01-15', status: 'completed' },
    { id: 2, type: 'withdrawal', amount: -1500, description: 'Bank Transfer', date: '2024-01-14', status: 'processing' },
    { id: 3, type: 'credit', amount: 200, description: 'Referral Bonus', date: '2024-01-13', status: 'completed' },
    { id: 4, type: 'credit', amount: 150, description: 'Daily Streak Bonus', date: '2024-01-12', status: 'completed' },
    { id: 5, type: 'withdrawal', amount: -2000, description: 'UPI Transfer', date: '2024-01-11', status: 'completed' },
  ],
  withdrawalMethods: [
    { id: 1, name: 'Bank Transfer', icon: '🏦', minAmount: 100, fee: 0 },
    { id: 2, name: 'UPI', icon: '📱', minAmount: 50, fee: 0 },
    { id: 3, name: 'PayPal', icon: '💳', minAmount: 200, fee: 10 },
    { id: 4, name: 'Paytm', icon: '💰', minAmount: 50, fee: 5 },
  ]
};

export default function WalletScreen() {
  const theme = useTheme();
  const styles = createStyles(theme);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const balanceAnim = useRef(new Animated.Value(0)).current;
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<any>(null);

  useEffect(() => {
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

    // Animate balance counter
    Animated.timing(balanceAnim, {
      toValue: mockWalletData.balance,
      duration: 2000,
      useNativeDriver: false,
    }).start();
  }, []);

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

  const handleWithdraw = () => {
    if (!selectedMethod) {
      Alert.alert('Error', 'Please select a withdrawal method');
      return;
    }
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    if (parseFloat(withdrawAmount) > mockWalletData.balance) {
      Alert.alert('Error', 'Insufficient balance');
      return;
    }

    Alert.alert('Success', `Withdrawal request of ₹${withdrawAmount} has been submitted successfully!`);
    setShowWithdrawModal(false);
    setWithdrawAmount('');
    setSelectedMethod(null);
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
            colors={['#667eea', '#764ba2']}
            style={styles.headerGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>My Wallet 💰</Text>
              <Text style={styles.headerSubtitle}>Manage your earnings</Text>
              
              <View style={styles.balanceCard}>
                <Text style={styles.balanceLabel}>Available Balance</Text>
                <Text style={styles.balanceValue}>
                  ₹{mockWalletData.balance}
                </Text>
                <View style={styles.pendingInfo}>
                  <Text style={styles.pendingText}>₹{mockWalletData.pendingAmount} pending</Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

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
              <Text style={[styles.statValue, { color: theme.text }]}>₹{mockWalletData.totalWithdrawn}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Total Withdrawn</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <LinearGradient
                colors={['#fa709a', '#fee140']}
                style={styles.statIcon}
              >
                <Text style={styles.statIconText}>⚡</Text>
              </LinearGradient>
              <Text style={[styles.statValue, { color: theme.text }]}>₹{mockWalletData.pendingAmount}</Text>
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
            {mockWalletData.withdrawalMethods.map((method, index) => (
              <TouchableOpacity 
                key={method.id} 
                style={[styles.methodItem, { borderBottomColor: theme.borderLight }]}
                activeOpacity={0.7}
              >
                <View style={styles.methodInfo}>
                  <Text style={styles.methodIcon}>{method.icon}</Text>
                  <View style={styles.methodDetails}>
                    <Text style={[styles.methodName, { color: theme.text }]}>{method.name}</Text>
                    <Text style={[styles.methodMeta, { color: theme.textSecondary }]}>
                      Min: ₹{method.minAmount} • Fee: ₹{method.fee}
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
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Transactions</Text>
            {mockWalletData.recentTransactions.map((transaction, index) => (
              <View key={transaction.id} style={[styles.transactionItem, { borderBottomColor: theme.borderLight }]}>
                <View style={styles.transactionInfo}>
                  <View style={[
                    styles.transactionIcon,
                    { backgroundColor: transaction.type === 'credit' ? '#e8f5e8' : '#fff0f0' }
                  ]}>
                    <Text style={styles.transactionIconText}>
                      {transaction.type === 'credit' ? '↗️' : '↙️'}
                    </Text>
                  </View>
                  <View style={styles.transactionDetails}>
                    <Text style={[styles.transactionTitle, { color: theme.text }]}>
                      {transaction.description}
                    </Text>
                    <Text style={[styles.transactionDate, { color: theme.textSecondary }]}>
                      {transaction.date}
                    </Text>
                  </View>
                </View>
                <View style={styles.transactionAmount}>
                  <Text style={[
                    styles.amountText,
                    { color: transaction.type === 'credit' ? theme.success : theme.error }
                  ]}>
                    {transaction.type === 'credit' ? '+' : ''}₹{Math.abs(transaction.amount)}
                  </Text>
                  <Text style={[
                    styles.statusText,
                    { 
                      color: transaction.status === 'completed' ? theme.success : 
                             transaction.status === 'processing' ? theme.warning : theme.error
                    }
                  ]}>
                    {transaction.status}
                  </Text>
                </View>
              </View>
            ))}
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
              {mockWalletData.withdrawalMethods.map((method) => (
                <TouchableOpacity
                  key={method.id}
                  style={[
                    styles.modalMethodItem,
                    { 
                      borderColor: selectedMethod?.id === method.id ? theme.primary : theme.border,
                      backgroundColor: selectedMethod?.id === method.id ? theme.primary + '10' : theme.background
                    }
                  ]}
                  onPress={() => setSelectedMethod(method)}
                >
                  <Text style={styles.modalMethodIcon}>{method.icon}</Text>
                  <Text style={[styles.modalMethodName, { color: theme.text }]}>{method.name}</Text>
                </TouchableOpacity>
              ))}
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
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 24,
  },
  balanceCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderRadius: 20,
    alignItems: 'center',
    minWidth: 250,
  },
  balanceLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },
  balanceValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  pendingInfo: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  pendingText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
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
    fontSize: 16,
    fontWeight: 'bold',
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
    paddingVertical: 18,
    alignItems: 'center',
  },
  withdrawText: {
    color: '#ffffff',
    fontSize: 18,
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
});
