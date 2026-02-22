import React, { useEffect, useRef, useState } from 'react';
import {
  SafeAreaView,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  TextInput,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '../hooks/useTheme';
import { api } from '../services/api';
import Icon from '../components/Icon';
import ThemedPopup from '../components/ThemedPopup';
import FixedBannerAd from '../components/FixedBannerAd';
import Skeleton from '../components/Skeleton';
import { useAdMob } from '../hooks/useAdMob';

interface Coupon {
  id: number;
  name: string;
  description: string | null;
  points_required: number;
  expiry_date: string | null;
}

export default function WithdrawScreen() {
  const navigation = useNavigation();
  const theme = useTheme();
  const styles = createStyles(theme);
  const { shouldShowBanner, getBannerAdId, getBannerAdIds, getAdRequestOptions } = useAdMob();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [minPoints, setMinPoints] = useState(100);
  const [balance, setBalance] = useState(0);
  const [popup, setPopup] = useState<{ visible: boolean; title: string; message: string; onConfirm?: () => void } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [selectedType, setSelectedType] = useState<'cash' | 'coupon' | null>(null);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [cashPoints, setCashPoints] = useState('');
  const [paymentDetails, setPaymentDetails] = useState('');
  const lastWithdrawFetchRef = useRef(0);
  const FOCUS_CACHE_MS = 15000;

  const loadData = async () => {
    try {
      const [settingsRes, couponsRes, balanceRes] = await Promise.all([
        api.get('/wallet/withdrawal-settings'),
        api.get('/wallet/coupons'),
        api.get('/wallet/balance'),
      ]);
      setMinPoints(settingsRes.data?.data?.min_withdrawal_points ?? 100);
      setCoupons(couponsRes.data?.data ?? []);
      setBalance(balanceRes.data?.data?.balance ?? 0);
      lastWithdrawFetchRef.current = Date.now();
    } catch (e) {
      setPopup({ visible: true, title: 'Error', message: 'Failed to load data', onConfirm: () => setPopup(null) });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      if (Date.now() - lastWithdrawFetchRef.current < FOCUS_CACHE_MS) return;
      loadData();
    }, [])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const showPopup = (title: string, message: string) => {
    setPopup({ visible: true, title, message, onConfirm: () => setPopup(null) });
  };

  const handleRequestCash = async () => {
    if (!paymentDetails.trim()) {
      showPopup('Error', 'Please enter UPI ID or bank details');
      return;
    }
    const points = parseInt(cashPoints, 10) || minPoints;
    if (points < minPoints) {
      showPopup('Error', `Minimum ${minPoints} points required for withdrawal.`);
      return;
    }
    if (balance < points) {
      showPopup('Error', `Insufficient balance. You have ${balance} points.`);
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/wallet/withdrawal-requests', {
        type: 'cash',
        points_amount: points,
        payment_details: paymentDetails.trim(),
      });
      showPopup('Success', 'Withdrawal request submitted. Admin will review and process manually.');
      setSelectedType(null);
      setCashPoints('');
      setPaymentDetails('');
      loadData();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to submit request';
      showPopup('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestCoupon = async (coupon: Coupon) => {
    if (balance < coupon.points_required) {
      showPopup('Error', `You need ${coupon.points_required} points. Your balance: ${balance}`);
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/wallet/withdrawal-requests', {
        type: 'coupon',
        points_amount: coupon.points_required,
        coupon_id: coupon.id,
      });
      showPopup('Success', 'Voucher request submitted. Admin will credit the voucher once processed.');
      setSelectedCoupon(null);
      loadData();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to submit request';
      showPopup('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.topHeader}>
          <Skeleton width={40} height={40} borderRadius={20} />
          <Skeleton width={120} height={20} borderRadius={4} />
          <View style={{ width: 40 }} />
        </View>
        <View style={{ paddingHorizontal: 20 }}>
          <View style={[styles.balanceCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Skeleton width={140} height={14} borderRadius={4} />
            <Skeleton width={120} height={28} style={{ marginTop: 12 }} borderRadius={4} />
            <Skeleton width={180} height={14} style={{ marginTop: 8 }} borderRadius={4} />
          </View>
          <Skeleton width={100} height={12} style={{ marginTop: 24, marginBottom: 12 }} borderRadius={4} />
          <View style={{ gap: 12 }}>
            {[1, 2, 3].map((i) => (
              <View key={i} style={[styles.couponCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={{ flex: 1, gap: 6 }}>
                  <Skeleton width={150} height={18} borderRadius={4} />
                  <Skeleton width={100} height={14} borderRadius={4} />
                </View>
                <Skeleton width={80} height={36} borderRadius={10} />
              </View>
            ))}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={theme.background === '#ffffff' ? 'dark-content' : 'light-content'} backgroundColor={theme.background} />

      <View style={styles.topHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={{ fontSize: 24, color: theme.text }}>‹</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Withdraw</Text>
          <View style={{ width: 40 }} />
        </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        <View style={[styles.balanceCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.balanceLabel, { color: theme.textSecondary }]}>Available Balance</Text>
          <Text style={[styles.balanceValue, { color: theme.text }]}>💎 {Number(balance).toFixed(0)} points</Text>
          <Text style={[styles.minText, { color: theme.textSecondary }]}>Min withdrawal: {minPoints} points</Text>
        </View>

        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Cash (UPI / Bank)</Text>
        <TouchableOpacity
          style={[styles.optionCard, { backgroundColor: theme.card, borderColor: selectedType === 'cash' ? theme.primary : theme.border }]}
          onPress={() => setSelectedType(selectedType === 'cash' ? null : 'cash')}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.optionTitle, { color: theme.text }]}>Cash via UPI or Bank</Text>
            <Text style={[styles.optionDesc, { color: theme.textSecondary }]}>Min {minPoints} points. Enter UPI ID or bank details.</Text>
          </View>
          <Text style={{ color: theme.primary, fontWeight: '700' }}>{selectedType === 'cash' ? '✓' : 'Select'}</Text>
        </TouchableOpacity>
        {selectedType === 'cash' && (
          <View style={[styles.formCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.formLabel, { color: theme.text }]}>Points to withdraw (min {minPoints})</Text>
            <TextInput
              style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.background }]}
              placeholder={`Enter points (min ${minPoints})`}
              placeholderTextColor={theme.placeholder}
              value={cashPoints}
              onChangeText={setCashPoints}
              keyboardType="numeric"
            />
            <Text style={[styles.formLabel, { color: theme.text, marginTop: 12 }]}>UPI ID or Bank details (Account No / IFSC)</Text>
            <TextInput
              style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.background }]}
              placeholder="e.g. name@upi or Account number, IFSC"
              placeholderTextColor={theme.placeholder}
              value={paymentDetails}
              onChangeText={setPaymentDetails}
            />
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleRequestCash}
              disabled={submitting}
            >
              <LinearGradient colors={theme.gradient.primary as [string, string, ...string[]]} style={styles.submitGradient}>
                <Text style={styles.submitText}>{submitting ? 'Submitting...' : 'Request Cash'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Vouchers (Coupons)</Text>
        {coupons.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No vouchers available at the moment.</Text>
          </View>
        ) : (
          coupons.map((c) => (
            <View key={c.id} style={[styles.couponCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.couponName, { color: theme.text }]}>{c.name}</Text>
                {c.description ? <Text style={[styles.couponDesc, { color: theme.textSecondary }]}>{c.description}</Text> : null}
                <Text style={[styles.couponPoints, { color: theme.primary }]}>{c.points_required} points</Text>
              </View>
              <TouchableOpacity
                style={[styles.redeemBtn, { borderColor: theme.primary }]}
                onPress={() => handleRequestCoupon(c)}
                disabled={submitting || balance < c.points_required}
              >
                <Text style={[styles.redeemBtnText, { color: theme.primary }]}>
                  {submitting ? '...' : balance >= c.points_required ? 'Redeem' : 'Insufficient'}
                </Text>
              </TouchableOpacity>
            </View>
          ))
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {popup?.visible && (
        <ThemedPopup visible={popup.visible} title={popup.title} message={popup.message} onConfirm={popup.onConfirm} />
      )}
      <FixedBannerAd shouldShowBanner={shouldShowBanner} getBannerAdId={getBannerAdId} getBannerAdIds={getBannerAdIds} requestOptions={getAdRequestOptions()} backgroundColor={theme.background} />
    </SafeAreaView>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: { flex: 1 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
    loadingText: { fontSize: 14 },
    topHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 35,
      paddingBottom: 20,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '700',
      letterSpacing: 0.5,
    },
    scrollView: { flex: 1 },
    scrollContent: { padding: 20, paddingTop: 16 },
    balanceCard: {
      padding: 20,
      borderRadius: 16,
      borderWidth: 1,
      marginBottom: 24,
    },
    balanceLabel: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
    balanceValue: { fontSize: 28, fontWeight: '800' },
    minText: { fontSize: 12, marginTop: 8 },
    sectionLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12 },
    optionCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderRadius: 16,
      borderWidth: 1.5,
      marginBottom: 12,
    },
    optionTitle: { fontSize: 16, fontWeight: '600' },
    optionDesc: { fontSize: 12, marginTop: 4 },
    formCard: { padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 20 },
    formLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
    input: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 14 },
    submitBtn: { marginTop: 16, borderRadius: 12, overflow: 'hidden' },
    submitGradient: { paddingVertical: 14, alignItems: 'center' },
    submitText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    couponCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderRadius: 16,
      borderWidth: 1,
      marginBottom: 12,
    },
    couponName: { fontSize: 16, fontWeight: '600' },
    couponDesc: { fontSize: 12, marginTop: 4 },
    couponPoints: { fontSize: 14, fontWeight: '700', marginTop: 6 },
    redeemBtn: { borderWidth: 1.5, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
    redeemBtnText: { fontWeight: '700', fontSize: 13 },
    emptyCard: { padding: 20, borderRadius: 16, borderWidth: 1 },
    emptyText: { textAlign: 'center' },
  });
