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
import { useNavigation } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '../hooks/useTheme';
import { api } from '../services/api';
import { spacing, typography, borderRadius } from '../hooks/useThemeColors';

export default function QuizzesScreen() {
  const navigation = useNavigation<any>();
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
        const category = quiz.category || quiz.quiz_category?.name || 'Uncategorized';
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
    navigation.navigate('QuizPlay', { id: quizId });
  };

  const styles = createStyles(theme);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.text }]}>Loading quizzes...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (allQuizzes.length === 0) {
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
          <Text style={[styles.errorText, { color: theme.text }]}>No Quizzes Available</Text>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Check back soon for new quizzes!</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar
        barStyle={theme.background === '#ffffff' ? 'dark-content' : 'light-content'}
        backgroundColor={theme.background}
      />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
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

        {/* Render quizzes grouped by category */}
        {Object.entries(quizzesByCategory).map(([category, quizzes]) => (
          <View key={category} style={{ paddingHorizontal: 20, marginBottom: 30 }}>
            {/* Category Header */}
            <Text style={[styles.sectionLabel, { color: theme.textSecondary, marginBottom: 15 }]}>
              {category.toUpperCase()}
            </Text>

            {/* Quiz Cards for this category */}
            <View style={{ gap: 12 }}>
              {quizzes.map((quiz, index) => (
                <TouchableOpacity
                  key={quiz.id}
                  style={[
                    styles.quizItem,
                    {
                      backgroundColor: theme.card,
                      borderColor: theme.border
                    }
                  ]}
                  onPress={() => handleQuizPress(quiz.id)}
                  activeOpacity={0.7}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 15, flex: 1 }}>
                    <View style={[styles.quizNumber, { backgroundColor: theme.primary, borderColor: theme.primary }]}>
                      <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: '800' }}>{index + 1}</Text>
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={[styles.quizTitle, { color: theme.text }]}>
                        {quiz.title || quiz.category || 'Untitled Quiz'}
                      </Text>
                      {quiz.description && (
                        <Text style={[styles.quizDesc, { color: theme.textSecondary }]} numberOfLines={2}>
                          {quiz.description}
                        </Text>
                      )}
                      
                      {/* Stats Row */}
                      <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                        {quiz.question_count && (
                          <Text style={[styles.quizMeta, { color: theme.textSecondary }]}>
                            📋 {quiz.question_count} Q's
                          </Text>
                        )}
                        {quiz.difficulty && (
                          <Text style={[styles.quizMeta, { color: theme.textSecondary }]}>
                            ⭐ {quiz.difficulty}
                          </Text>
                        )}
                        {quiz.passing_percentage && (
                          <Text style={[styles.quizMeta, { color: theme.textSecondary }]}>
                            {quiz.passing_percentage}% Pass
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>

                  <View style={{ alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }}>
                    <Text style={[styles.quizPoints, { color: theme.primary }]}>
                      +{quiz.reward_points || 50}
                    </Text>
                    <Text style={{ color: theme.primary, fontSize: 12, fontWeight: '600' }}>Play →</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <View style={{ height: 60 }} />
      </ScrollView>
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
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 2,
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
