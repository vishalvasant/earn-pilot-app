import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../hooks/useTheme';
import { api } from '../services/api';
import { spacing, typography, borderRadius } from '../hooks/useThemeColors';

export default function QuizzesScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [allQuizzes, setAllQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [quizzesByCategory, setQuizzesByCategory] = useState<{ [key: string]: any[] }>({});

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      const response = await api.get('/quizzes');
      const quizzes = response?.data?.data || [];
      setAllQuizzes(quizzes);

      // Group quizzes by category
      const grouped: { [key: string]: any[] } = {};
      quizzes.forEach((quiz: any) => {
        const category = quiz.category || 'Uncategorized';
        if (!grouped[category]) {
          grouped[category] = [];
        }
        grouped[category].push(quiz);
      });

      setQuizzesByCategory(grouped);
    } catch (error) {
      console.log('Error fetching quizzes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuizPress = (quizId: number) => {
    // Navigate to quiz-play screen (will be created)
    router.push(`/quiz-play?id=${quizId}`);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar
        barStyle={theme.background === '#ffffff' ? 'dark-content' : 'light-content'}
        backgroundColor={theme.background}
      />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={[styles.backIcon, { color: theme.text }]}>Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>All Quizzes</Text>
        <View style={{ width: 60 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading quizzes...</Text>
        </View>
      ) : allQuizzes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No Quizzes Available</Text>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Check back soon for new quizzes!</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={{ backgroundColor: theme.background }}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Render quizzes grouped by category */}
          {Object.entries(quizzesByCategory).map(([category, quizzes]) => (
            <View key={category} style={styles.categorySection}>
              {/* Category Header */}
              <View style={styles.categoryHeader}>
                <Text style={[styles.categoryTitle, { color: theme.text }]}>
                  {category}
                </Text>
                <View style={[styles.categoryBadge, { backgroundColor: theme.primary + '20' }]}>
                  <Text style={[styles.categoryCount, { color: theme.primary }]}>
                    {quizzes.length}
                  </Text>
                </View>
              </View>

              {/* Quiz Cards for this category */}
              <View style={styles.quizzesContainer}>
                {quizzes.map((quiz) => (
                  <TouchableOpacity
                    key={quiz.id}
                    style={[styles.quizCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                    onPress={() => handleQuizPress(quiz.id)}
                    activeOpacity={0.7}
                  >
                    {/* Difficulty Badge */}
                    <View style={styles.quizHeader}>
                      <Text style={[styles.quizTitle, { color: theme.text }]}>{quiz.title}</Text>
                      <View
                        style={[
                          styles.difficultyBadge,
                          {
                            backgroundColor:
                              quiz.difficulty === 'Easy'
                                ? '#4CAF50'
                                : quiz.difficulty === 'Medium'
                                ? '#FF9800'
                                : '#F44336',
                          },
                        ]}
                      >
                        <Text style={styles.difficultyText}>{quiz.difficulty}</Text>
                      </View>
                    </View>

                    {/* Description */}
                    {quiz.description && (
                      <Text
                        style={[styles.quizDescription, { color: theme.textSecondary }]}
                        numberOfLines={2}
                      >
                        {quiz.description}
                      </Text>
                    )}

                    {/* Stats Row */}
                    <View style={styles.statsRow}>
                      <View style={styles.statItem}>
                        <Text style={[styles.statText, { color: theme.textSecondary }]}>
                          {quiz.question_count} Questions
                        </Text>
                      </View>

                      <View style={styles.statItem}>
                        <Text style={[styles.statText, { color: theme.textSecondary }]}>
                          {quiz.passing_percentage}% Pass
                        </Text>
                      </View>
                    </View>

                    {/* Reward */}
                    <View
                      style={[
                        styles.rewardContainer,
                        { backgroundColor: theme.primary + '15', borderColor: theme.primary + '30' },
                      ]}
                    >
                      <Text style={[styles.rewardText, { color: theme.primary }]}>
                        +{quiz.reward_points} Points
                      </Text>
                    </View>

                    {/* Play Button */}
                    <TouchableOpacity
                      style={[styles.playButton, { backgroundColor: theme.primary }]}
                      onPress={() => handleQuizPress(quiz.id)}
                    >
                      <Text style={styles.playButtonText}>Play Now</Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}

          {/* Footer spacing */}
          <View style={{ height: 20 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: spacing.sm,
  },
  backIcon: {
    fontSize: typography.lg,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: typography.lg,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.sm,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: typography.md,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: typography.sm,
    textAlign: 'center',
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  categorySection: {
    marginBottom: spacing.xl,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  categoryTitle: {
    fontSize: typography.md,
    fontWeight: '700',
  },
  categoryBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  categoryCount: {
    fontSize: typography.xs,
    fontWeight: '600',
  },
  quizzesContainer: {
    gap: spacing.md,
  },
  quizCard: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.md,
  },
  quizHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  quizTitle: {
    fontSize: typography.md,
    fontWeight: '700',
    flex: 1,
  },
  difficultyBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  difficultyText: {
    color: '#FFFFFF',
    fontSize: typography.xs,
    fontWeight: '600',
  },
  quizDescription: {
    fontSize: typography.sm,
    lineHeight: 18,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statIcon: {
    fontSize: typography.md,
  },
  statText: {
    fontSize: typography.xs,
    fontWeight: '500',
  },
  rewardContainer: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  rewardText: {
    fontSize: typography.sm,
    fontWeight: '600',
  },
  playButton: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  playButtonText: {
    color: '#FFFFFF',
    fontSize: typography.sm,
    fontWeight: '700',
  },
});
