import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../hooks/useTheme';
import { useAdMob } from '../hooks/useAdMob';
import { api } from '../services/api';
import { useDataStore } from '../stores/dataStore';
import ThemedPopup from '../components/ThemedPopup';
import FixedBannerAd from '../components/FixedBannerAd';

type QuizOption = { id: number; option_text: string; order?: number };
type QuizQuestion = { id: number; question_text: string; points?: number; options: QuizOption[] };
type QuizPayload = {
  id: number;
  title: string;
  description?: string | null;
  reward_points: number;
  passing_percentage: number;
  /** Show interstitial every N questions (from admin quiz settings) */
  show_quiz_ads?: boolean;
  quiz_ad_interval?: number;
  questions: QuizQuestion[];
};

export default function QuizPlayScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const fetchProfile = useDataStore((s) => s.fetchProfile);
  const { showInterstitial, shouldShowBanner, getBannerAdId } = useAdMob();
  const prevIndexRef = useRef<number>(0);

  const quizId: number = route?.params?.id;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [quiz, setQuiz] = useState<QuizPayload | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [resultPopup, setResultPopup] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);
  const showPopup = (title: string, message: string, onConfirm: () => void) => {
    setResultPopup({ title, message, onConfirm });
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/quizzes/${quizId}`);
        const payload = res?.data?.data;
        setQuiz(payload);
        setCurrentIndex(0);
        setAnswers({});
        prevIndexRef.current = 0;
      } catch (e: any) {
        console.log('Failed to load quiz:', e?.message || e);
        const isNetworkError = e?.message === 'Network Error' || !e?.response;
        const message = isNetworkError
          ? 'Cannot reach server. Check your internet connection and try again.'
          : (e?.response?.data?.message || 'Failed to load quiz. Please try again.');
        showPopup('Error', message, () => {
          setResultPopup(null);
          navigation.goBack();
        });
      } finally {
        setLoading(false);
      }
    };

    if (quizId) load();
  }, [quizId, navigation]);

  const currentQuestion = quiz?.questions?.[currentIndex];
  const selectedOptionId = currentQuestion ? answers[currentQuestion.id] : undefined;

  const canGoNext = currentIndex < (quiz?.questions?.length || 0) - 1;
  const canGoBack = currentIndex > 0;

  // Show interstitial at this quiz's configured interval (set in admin when creating/editing quiz)
  const showQuizAds = quiz?.show_quiz_ads !== false;
  const quizAdInterval = Math.max(1, quiz?.quiz_ad_interval ?? 3);
  useEffect(() => {
    if (!quiz || !showQuizAds || currentIndex <= prevIndexRef.current) return;
    const questionNumber = currentIndex + 1;
    if (questionNumber > 0 && questionNumber % quizAdInterval === 0) {
      showInterstitial?.();
    }
    prevIndexRef.current = currentIndex;
  }, [quiz, currentIndex, showQuizAds, quizAdInterval, showInterstitial]);

  const onSubmit = async () => {
    if (!quiz) return;

    try {
      setSubmitting(true);
      const res = await api.post(`/quizzes/${quiz.id}/submit`, { answers });
      const data = res?.data?.data;

      await fetchProfile(true);

      const title = data?.passed ? 'Quiz Completed' : 'Quiz Failed';
      const message = `${data?.message || 'Quiz submitted.'}\n\nScore: ${data?.score}%\nPoints: +${data?.points_earned ?? 0}`;
      setResultPopup({
        title,
        message,
        onConfirm: () => {
          setResultPopup(null);
          navigation.goBack();
        },
      });
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        'Failed to submit quiz. Please try again.';
      setResultPopup({
        title: 'Error',
        message: msg,
        onConfirm: () => setResultPopup(null),
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.text }]}>Loading quiz...</Text>
        </View>
        {resultPopup && (
          <ThemedPopup
            visible={!!resultPopup}
            title={resultPopup.title}
            message={resultPopup.message}
            confirmText="OK"
            onConfirm={resultPopup.onConfirm}
            onClose={resultPopup.onConfirm}
          />
        )}
      </SafeAreaView>
    );
  }

  if (!quiz || !currentQuestion) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loading}>
          <Text style={[styles.loadingText, { color: theme.text }]}>Quiz not available.</Text>
        </View>
        {resultPopup && (
          <ThemedPopup
            visible={!!resultPopup}
            title={resultPopup.title}
            message={resultPopup.message}
            confirmText="OK"
            onConfirm={resultPopup.onConfirm}
            onClose={resultPopup.onConfirm}
          />
        )}
      </SafeAreaView>
    );
  }

  const total = quiz.questions.length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar
        barStyle={theme.background === '#ffffff' ? 'dark-content' : 'light-content'}
        backgroundColor={theme.background}
      />

      <View style={styles.topHeader}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={{ fontSize: 24, color: theme.text }}>‹</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
          {quiz.title}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: shouldShowBanner ? 100 : 30 }}>
        <View style={[styles.progressRow, { borderColor: theme.border }]}>
          <Text style={[styles.progressText, { color: theme.textSecondary }]}>
            Question {currentIndex + 1} / {total}
          </Text>
          <Text style={[styles.progressText, { color: theme.primary }]}>
            +{quiz.reward_points} pts
          </Text>
        </View>

        <View style={[styles.questionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.questionText, { color: theme.text }]}>{currentQuestion.question_text}</Text>

          <View style={{ marginTop: 16, gap: 10 }}>
            {currentQuestion.options?.map((opt) => {
              const selected = selectedOptionId === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[
                    styles.option,
                    {
                      backgroundColor: selected ? theme.primary + '22' : theme.background,
                      borderColor: selected ? theme.primary : theme.border,
                    },
                  ]}
                  activeOpacity={0.8}
                  onPress={() => setAnswers((prev) => ({ ...prev, [currentQuestion.id]: opt.id }))}
                >
                  <Text style={[styles.optionText, { color: theme.text }]}>{opt.option_text}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[
              styles.navButton,
              { backgroundColor: theme.card, borderColor: theme.border, opacity: canGoBack ? 1 : 0.5 },
            ]}
            disabled={!canGoBack}
            onPress={() => setCurrentIndex((i) => Math.max(0, i - 1))}
          >
            <Text style={[styles.navButtonText, { color: theme.text }]}>Back</Text>
          </TouchableOpacity>

          {canGoNext ? (
            <TouchableOpacity
              style={[
                styles.navButton,
                { backgroundColor: theme.primary, borderColor: theme.primary, opacity: selectedOptionId ? 1 : 0.6 },
              ]}
              disabled={!selectedOptionId}
              onPress={() => {
                setCurrentIndex((i) => i + 1);
              }}
            >
              <Text style={[styles.navButtonText, { color: theme.background }]}>Next</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.navButton,
                { backgroundColor: theme.primary, borderColor: theme.primary, opacity: submitting ? 0.7 : 1 },
              ]}
              disabled={submitting}
              onPress={onSubmit}
            >
              <Text style={[styles.navButtonText, { color: theme.background }]}>
                {submitting ? 'Submitting…' : 'Submit'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {resultPopup && (
        <ThemedPopup
          visible={!!resultPopup}
          title={resultPopup.title}
          message={resultPopup.message}
          confirmText="OK"
          onConfirm={resultPopup.onConfirm}
          onClose={resultPopup.onConfirm}
        />
      )}

      <FixedBannerAd
        shouldShowBanner={shouldShowBanner}
        getBannerAdId={getBannerAdId}
        backgroundColor={theme.background}
      />
    </SafeAreaView>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: { flex: 1 },
    loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 16, fontSize: 16, fontWeight: '600' },
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
    headerTitle: { fontSize: 18, fontWeight: '800', letterSpacing: 0.5, flex: 1, textAlign: 'center' },
    progressRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      marginBottom: 16,
    },
    progressText: { fontSize: 12, fontWeight: '700' },
    questionCard: {
      borderRadius: 18,
      borderWidth: 1,
      padding: 16,
    },
    questionText: { fontSize: 16, fontWeight: '700', lineHeight: 22 },
    option: {
      borderRadius: 14,
      borderWidth: 1,
      paddingVertical: 12,
      paddingHorizontal: 12,
    },
    optionText: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
    actionsRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
    navButton: {
      flex: 1,
      borderRadius: 14,
      borderWidth: 1,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    navButtonText: { fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },
  });

