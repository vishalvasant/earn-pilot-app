import React, { useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Image,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../hooks/useTheme';
import { useAdMob } from '../hooks/useAdMob';
import { api } from '../services/api';
import Skeleton from '../components/Skeleton';
import FixedBannerAd from '../components/FixedBannerAd';

const { width: screenWidth } = Dimensions.get('window');

export default function QuizzesScreen() {
  const navigation = useNavigation<any>();
  const theme = useTheme();
  const { shouldShowBanner, getBannerAdId, getBannerAdIds, getAdRequestOptions } = useAdMob();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'categories' | 'quizzes'>('categories');

  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<any | null>(null);

  const [categoryQuizzes, setCategoryQuizzes] = useState<any[]>([]);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await api.get('/quiz-categories');
      const rows = response?.data?.data || [];
      setCategories(rows);
      setMode('categories');
      setSelectedCategory(null);
      setCategoryQuizzes([]);
    } catch (error) {
      console.log('Error fetching quizzes:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchQuizzesForCategory = async (category: any) => {
    try {
      setLoading(true);
      const response = await api.get(`/quiz-categories/${category.id}/quizzes`);
      const payload = response?.data?.data || {};
      const quizzes = payload?.quizzes || [];
      setSelectedCategory(payload?.category || category);
      setCategoryQuizzes(quizzes);
      setMode('quizzes');
    } catch (error) {
      console.log('Error fetching category quizzes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuizPress = (quizId: number) => {
    navigation.navigate('QuizPlay', { id: quizId });
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={shouldShowBanner ? { paddingBottom: 100 } : undefined}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topHeader}>
            <Skeleton width={40} height={40} borderRadius={20} />
            <Skeleton width={150} height={20} borderRadius={4} />
            <View style={{ width: 40 }} />
          </View>
          {mode === 'categories' ? (
            <View style={styles.categoriesGrid}>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <View key={i} style={[styles.categoryCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <Skeleton width={60} height={60} borderRadius={12} style={{ alignSelf: 'center', marginBottom: 12 }} />
                  <Skeleton width="80%" height={18} borderRadius={4} style={{ alignSelf: 'center', marginBottom: 6 }} />
                  <Skeleton width="60%" height={14} borderRadius={4} style={{ alignSelf: 'center' }} />
                </View>
              ))}
            </View>
          ) : (
            <View style={{ paddingHorizontal: 20, paddingBottom: 30, gap: 12 }}>
              {[1, 2, 3, 4].map((i) => (
                <View key={i} style={[styles.quizItem, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 15, flex: 1 }}>
                    <Skeleton width={36} height={36} borderRadius={8} />
                    <View style={{ flex: 1, gap: 6 }}>
                      <Skeleton width="90%" height={18} borderRadius={4} />
                      <Skeleton width="60%" height={14} borderRadius={4} />
                      <Skeleton width={100} height={12} borderRadius={4} />
                    </View>
                  </View>
                  <Skeleton width={50} height={24} borderRadius={6} />
                </View>
              ))}
            </View>
          )}
        </ScrollView>
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

  if (mode === 'categories' && categories.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.topHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={{ fontSize: 24, color: theme.text }}>‹</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Brain Teaser Quiz</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: theme.text }]}>No Categories Available</Text>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            Ask admin to create a quiz category and add quizzes.
          </Text>
        </View>
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar
        barStyle={theme.background === '#ffffff' ? 'dark-content' : 'light-content'}
        backgroundColor={theme.background}
      />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={shouldShowBanner ? { paddingBottom: 100 } : undefined}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.topHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (mode === 'quizzes') {
                setMode('categories');
                setSelectedCategory(null);
                setCategoryQuizzes([]);
                return;
              }
              navigation.goBack();
            }}
          >
            <Text style={{ fontSize: 24, color: theme.text }}>‹</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            {mode === 'categories' ? 'Quiz Categories' : (selectedCategory?.name || 'Quizzes')}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {mode === 'categories' ? (
          <View style={styles.categoriesGrid}>
            {categories.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[
                  styles.categoryCard,
                  { backgroundColor: theme.card, borderColor: theme.border }
                ]}
                onPress={() => fetchQuizzesForCategory(c)}
                activeOpacity={0.85}
              >
                {/* Top-right badge: quiz count only */}
                <View style={[styles.categoryBadge, { backgroundColor: theme.primary }]}>
                  <Text style={styles.categoryBadgeText}>{c.quiz_count || 0}</Text>
                </View>

                <View style={styles.categoryInner}>
                  <View style={styles.categoryIconWrapper}>
                    {c.icon_url ? (
                      <Image
                        source={{ uri: c.icon_url }}
                        style={styles.categoryIcon}
                        resizeMode="cover"
                      />
                    ) : (
                      <View
                        style={[
                          styles.categoryFallbackIcon,
                          { backgroundColor: c.color || theme.primary },
                        ]}
                      >
                        <Text style={{ color: '#fff', fontSize: 18 }}>🧠</Text>
                      </View>
                    )}
                  </View>
                  <Text
                    style={[styles.categoryTitle, { color: theme.text }]}
                    numberOfLines={1}
                  >
                    {c.name || 'Category'}
                  </Text>
                  {c.description ? (
                    <Text
                      style={[styles.categoryDesc, { color: theme.textSecondary }]}
                      numberOfLines={2}
                    >
                      {c.description}
                    </Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={{ paddingHorizontal: 20, paddingBottom: 30, gap: 12 }}>
            {categoryQuizzes.length === 0 ? (
              <View style={styles.errorContainer}>
                <Text style={[styles.errorText, { color: theme.text }]}>No Quizzes Available</Text>
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                  Admin needs to create a quiz in this category.
                </Text>
              </View>
            ) : (
              categoryQuizzes.map((quiz, index) => (
                <TouchableOpacity
                  key={quiz.id}
                  style={[styles.quizItem, { backgroundColor: theme.card, borderColor: theme.border }]}
                  onPress={() => handleQuizPress(quiz.id)}
                  activeOpacity={0.7}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 15, flex: 1 }}>
                    <View style={[styles.quizNumber, { backgroundColor: theme.primary, borderColor: theme.primary }]}>
                      <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: '800' }}>{index + 1}</Text>
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={[styles.quizTitle, { color: theme.text }]}>{quiz.title || 'Untitled Quiz'}</Text>
                      {quiz.description ? (
                        <Text style={[styles.quizDesc, { color: theme.textSecondary }]} numberOfLines={2}>
                          {quiz.description}
                        </Text>
                      ) : null}

                      <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                        <Text style={[styles.quizMeta, { color: theme.textSecondary }]}>
                          📋 {quiz.question_count || 0} Q's
                        </Text>
                        {quiz.difficulty ? (
                          <Text style={[styles.quizMeta, { color: theme.textSecondary }]}>⭐ {quiz.difficulty}</Text>
                        ) : null}
                        {quiz.passing_percentage ? (
                          <Text style={[styles.quizMeta, { color: theme.textSecondary }]}>{quiz.passing_percentage}% Pass</Text>
                        ) : null}
                      </View>
                    </View>
                  </View>

                  <View style={{ alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }}>
                    <Text style={[styles.quizPoints, { color: theme.primary }]}>+{quiz.reward_points || 0}</Text>
                    <Text style={{ color: theme.primary, fontSize: 12, fontWeight: '600' }}>Play →</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>

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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.text,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
    color: theme.text,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
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
  categoriesGrid: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 14,
  },
  categoryCard: {
    width: (screenWidth - 20 * 2 - 12) / 2,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    position: 'relative',
    // Soft glow shadow similar to other cards
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  categoryInner: {
    alignItems: 'center',
    gap: 8,
  },
  categoryIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryIcon: {
    width: '100%',
    height: '100%',
    borderRadius: 32,
  },
  categoryFallbackIcon: {
    width: '100%',
    height: '100%',
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  categoryDesc: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  categoryMeta: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  categoryBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  categoryBadgeText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
  },
  quizItem: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quizNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    borderWidth: 0,
  },
  quizTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  quizDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  quizMeta: {
    fontSize: 12,
    fontWeight: '500',
  },
  quizPoints: {
    fontSize: 16,
    fontWeight: '700',
  },
});
