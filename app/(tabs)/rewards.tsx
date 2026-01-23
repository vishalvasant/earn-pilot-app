import React, { useEffect, useState, useRef, useMemo } from 'react';
import { 
  SafeAreaView, 
  Text, 
  View, 
  ScrollView, 
  StyleSheet,
  StatusBar,
  Animated,
  RefreshControl,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import FixedBannerAd from '../../components/FixedBannerAd';
import { useAdMob } from '../../hooks/useAdMob';

export default function RewardsScreen() {
  const theme = useTheme();
  const { shouldShowBanner, getBannerAdId } = useAdMob();
  const [refreshing, setRefreshing] = useState(false);
  const styles = useMemo(() => createStyles(theme), [theme]);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    // Add your refresh logic here
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={theme.background === '#ffffff' ? 'dark-content' : 'light-content'} backgroundColor={theme.background} />
      
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollViewContent,
          { paddingBottom: shouldShowBanner ? 100 : 24 }
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {/* Header */}
          <View style={styles.topHeader}>
            <Text style={styles.logoText}>DAILY<Text style={{ color: theme.primary }}>REWARDS</Text></Text>
          </View>

          {/* Rewards Content */}
          <View style={styles.rewardsContainer}>
            {/* Placeholder for rewards - you can add actual reward cards here */}
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>🎁</Text>
              <Text style={[styles.emptyStateTitle, { color: theme.text }]}>No Rewards Available</Text>
              <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
                Complete tasks and activities to earn rewards!
              </Text>
            </View>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Banner Ad */}
      <FixedBannerAd
        shouldShowBanner={shouldShowBanner}
        getBannerAdId={getBannerAdId}
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
  rewardsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 20,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
});
