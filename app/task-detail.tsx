import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Dimensions,
  BackHandler,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { useAdMob } from '../hooks/useAdMob';
import Icon from '../components/Icon';
import FixedBannerAd from '../components/FixedBannerAd';
import { api } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { useDataStore } from '../stores/dataStore';
import { useUserStore } from '../stores/userStore';
import ThemedPopup from '../components/ThemedPopup';
import Skeleton from '../components/Skeleton';

const { width, height } = Dimensions.get('window');

interface Subtask {
  id: number;
  title: string;
  description: string;
  link_url: string;
  reward_points: number;
  is_required: boolean;
  status: string;
}

interface TaskDetail {
  id: number;
  title: string;
  description: string;
  reward_points: number;
  energy_cost: number;
  has_subtasks: boolean;
  is_repeatable: boolean;
  daily_limit: number;
  status: string;
  disabled: boolean;
  subtasks: Subtask[];
}

export default function TaskDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation();
  const { taskId } = route.params || {};
  const theme = useTheme();
  const { showInterstitial, showRewarded, config, shouldShowBanner, getBannerAdId, getBannerAdIds, getAdRequestOptions } = useAdMob();
  
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSubtask, setActiveSubtask] = useState<Subtask | null>(null);
  const [showingAd, setShowingAd] = useState(false);
  const [webViewKey, setWebViewKey] = useState(0);
  const [completingSubtask, setCompletingSubtask] = useState<number | null>(null);
  const [completeButtonEnabled, setCompleteButtonEnabled] = useState(false);
  const completeDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [popupVisible, setPopupVisible] = useState(false);
  const [popupConfig, setPopupConfig] = useState({
    title: '',
    message: ''
  });

  const showPopup = (title: string, message: string) => {
    setPopupConfig({ title, message });
    setPopupVisible(true);
  };

  useEffect(() => {
    fetchTaskDetail();
  }, [taskId]);

  // For tasks with energy cost, ensure task is "started" so completeTask can succeed when all required subtasks are done
  const startCalledRef = useRef<number>(0);
  useEffect(() => {
    if (!task || !taskId || task.status === 'completed' || task.disabled) return;
    if (!task.has_subtasks || !(task.energy_cost > 0)) return;
    if (startCalledRef.current === taskId) return;
    startCalledRef.current = taskId;
    api.post(`/tasks/${taskId}/start`).then(() => {
      // Idempotent; no need to update UI
    }).catch(() => {
      startCalledRef.current = 0;
    });
  }, [taskId, task?.id, task?.status, task?.disabled, task?.has_subtasks, task?.energy_cost]);

  useEffect(() => {
    const backAction = () => {
      // Block back navigation while ad is showing
      if (showingAd) {
        return true;
      }
      if (activeSubtask) {
        setActiveSubtask(null);
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [activeSubtask, showingAd]);

  // When user opens a subtask (task detail WebView), keep Complete disabled for a random 5–15s so they must engage before completing
  useEffect(() => {
    if (!activeSubtask) {
      setCompleteButtonEnabled(false);
      if (completeDelayRef.current) {
        clearTimeout(completeDelayRef.current);
        completeDelayRef.current = null;
      }
      return;
    }
    setCompleteButtonEnabled(false);
    if (completeDelayRef.current) clearTimeout(completeDelayRef.current);
    const delayMs = 5000 + Math.floor(Math.random() * 10000); // 5–15 seconds
    completeDelayRef.current = setTimeout(() => {
      completeDelayRef.current = null;
      setCompleteButtonEnabled(true);
    }, delayMs);
    return () => {
      if (completeDelayRef.current) {
        clearTimeout(completeDelayRef.current);
        completeDelayRef.current = null;
      }
    };
  }, [activeSubtask?.id]);

  const fetchTaskDetail = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const response = await api.get(`/tasks/${taskId}`);
      setTask(response.data.data);
      return response.data.data as TaskDetail;
    } catch (error: any) {
      if (!silent) {
        console.error('Error fetching task detail:', error);
        showPopup(
          'Error',
          error.response?.data?.message || 'Failed to load task details'
        );
      }
      return null;
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleSubtaskComplete = async (subtask: Subtask) => {
    // Allow completing again if parent task is repeatable and not disabled (per-day)
    if (subtask.status === 'completed' && !(task?.is_repeatable && !task?.disabled)) {
      showPopup('Already Completed', 'You have already completed this subtask.');
      return;
    }

    const doComplete = async () => {
      setCompletingSubtask(subtask.id);
      try {
        const response = await api.post(`/tasks/subtasks/${subtask.id}/complete`);
      
      if (response.data.success) {
        setActiveSubtask(null);

        // Refetch task from server to get latest subtask statuses
        const updatedTask = await fetchTaskDetail(true);
        const currentTask = updatedTask || task;
        if (!currentTask) return;

        // If task has subtasks and all required (or all if none required) are completed, complete the whole task (credits points and marks task done)
        if (currentTask.has_subtasks && currentTask.subtasks?.length) {
          const required = currentTask.subtasks.filter(st => st.is_required);
          const allRequiredDone = required.length > 0
            ? required.every(st => st.status === 'completed')
            : currentTask.subtasks.every(st => st.status === 'completed');
          if (allRequiredDone && currentTask.status !== 'completed') {
            try {
              let completeRes = await api.post(`/tasks/${taskId}/complete`);
              if (completeRes.data.success) {
                const points = completeRes.data.points ?? currentTask.reward_points;
                await fetchTaskDetail(true);
                showPopup(
                  'Task Completed!',
                  `You earned ${points} points. All required steps are done!`
                );
              }
            } catch (completeErr: any) {
              const msg = completeErr.response?.data?.message || '';
              if (completeErr.response?.status === 409 && msg.toLowerCase().includes('start')) {
                try {
                  await api.post(`/tasks/${taskId}/start`);
                  const completeRes = await api.post(`/tasks/${taskId}/complete`);
                  if (completeRes.data.success) {
                    const points = completeRes.data.points ?? currentTask.reward_points;
                    await fetchTaskDetail(true);
                    showPopup(
                      'Task Completed!',
                      `You earned ${points} points. All required steps are done!`
                    );
                  }
                } catch (e2: any) {
                  showPopup('Error', e2.response?.data?.message || 'Failed to complete task');
                }
              } else {
                showPopup('Error', msg || 'Failed to complete task');
              }
            }
          } else {
            showPopup(
              'Subtask Completed!',
              `You earned ${subtask.reward_points} points for completing "${subtask.title}"`
            );
          }
        } else {
          showPopup(
            'Subtask Completed!',
            `You earned ${subtask.reward_points} points for completing "${subtask.title}"`
          );
        }

        // Refresh profile so points and balances update across the app
        try {
          await useDataStore.getState().fetchProfile(true);
          const updatedProfile = useDataStore.getState().profile;
          useUserStore.getState().setProfile(updatedProfile);
        } catch (e) {
          // ignore profile refresh errors
        }
      }
      } catch (error: any) {
        console.error('Error completing subtask:', error);
        showPopup(
          'Error',
          error.response?.data?.message || 'Failed to complete subtask'
        );
      } finally {
        setCompletingSubtask(null);
      }
    };

    if (config?.show_rewarded_ads) {
      const shown = await showRewarded(() => { doComplete(); });
      if (!shown) await doComplete();
    } else {
      try { await showInterstitial(); } catch {}
      await doComplete();
    }
  };

  const openSubtask = async (subtask: Subtask) => {
    // Allow reopening completed subtasks if the parent task is repeatable and not disabled
    if (subtask.status === 'completed' && !(task?.is_repeatable && !task?.disabled)) {
      showPopup('Already Completed', 'You have already completed this subtask.');
      return;
    }
    
    // Show interstitial ad before opening subtask
    setShowingAd(true);
    try {
      await showInterstitial();
    } catch (error) {
      console.log('No ad to show or ad failed:', error);
    }
    setShowingAd(false);
    
    setActiveSubtask(subtask);
    setWebViewKey(prev => prev + 1);
  };

  const closeSubtask = () => {
    setActiveSubtask(null);
  };

  const styles = createStyles(theme);

  if (loading || showingAd) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.topHeader}>
          <Skeleton width={40} height={40} borderRadius={20} />
          <Skeleton width={140} height={20} borderRadius={4} />
          <View style={{ width: 40 }} />
        </View>
        <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
          <View style={[styles.taskHeaderCard, { borderColor: theme.border, backgroundColor: theme.card }]}>
            <Skeleton width="70%" height={24} borderRadius={4} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
              <View style={{ gap: 6 }}>
                <Skeleton width={60} height={12} borderRadius={4} />
                <Skeleton width={80} height={24} borderRadius={4} />
              </View>
            </View>
          </View>
          <Skeleton width={100} height={12} style={{ marginTop: 24, marginBottom: 12 }} borderRadius={4} />
          <View style={[styles.descriptionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Skeleton width="100%" height={16} borderRadius={4} />
            <Skeleton width="90%" height={16} style={{ marginTop: 8 }} borderRadius={4} />
            <Skeleton width="70%" height={16} style={{ marginTop: 8 }} borderRadius={4} />
          </View>
          <Skeleton width={80} height={12} style={{ marginTop: 24, marginBottom: 12 }} borderRadius={4} />
          {[1, 2, 3].map((i) => (
            <View key={i} style={[styles.subtaskItem, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15, flex: 1 }}>
                <Skeleton width={36} height={36} borderRadius={8} />
                <View style={{ flex: 1, gap: 6 }}>
                  <Skeleton width="80%" height={18} borderRadius={4} />
                  <Skeleton width="50%" height={14} borderRadius={4} />
                </View>
              </View>
              <Skeleton width={50} height={24} borderRadius={6} />
            </View>
          ))}
        </View>
      </SafeAreaView>
    );
  }

  if (!task) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.errorContainer}>
          <Icon name="info" size={64} color={theme.error} />
          <Text style={[styles.errorText, { color: theme.text }]}>Task not found</Text>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: theme.primary }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButton}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (activeSubtask) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.webViewHeader, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <TouchableOpacity
            style={styles.webViewBackButton}
            onPress={closeSubtask}
          >
            <Icon name="arrowLeft" size={24} color={theme.text} />
          </TouchableOpacity>
          <View style={styles.webViewTitleContainer}>
            <Text style={[styles.webViewTitle, { color: theme.text }]} numberOfLines={1}>
              {activeSubtask.title}
            </Text>
            <Text style={[styles.webViewPoints, { color: theme.primary }]}>
              🪙 {activeSubtask.reward_points} points
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.completeButton,
              { backgroundColor: theme.success },
              (!completeButtonEnabled || completingSubtask === activeSubtask.id) && styles.disabledButton
            ]}
            onPress={() => handleSubtaskComplete(activeSubtask)}
            disabled={!completeButtonEnabled || completingSubtask === activeSubtask.id}
          >
            {completingSubtask === activeSubtask.id ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : !completeButtonEnabled ? (
              <Text style={styles.completeButtonText}>Complete (wait...)</Text>
            ) : (
              <>
                <Icon name="checkmark" size={16} color="#ffffff" />
                <Text style={styles.completeButtonText}>Complete</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
        
        <WebView
          key={webViewKey}
          source={{ uri: activeSubtask.link_url }}
          style={styles.webView}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={[styles.webViewLoading, { backgroundColor: theme.background }]}>
              <ActivityIndicator size="large" color={theme.primary} />
            </View>
          )}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error('WebView error: ', nativeEvent);
            showPopup('Error', 'Failed to load the webpage');
          }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: shouldShowBanner ? 100 : 24 }}
      >
        {/* Header */}
        <View style={styles.topHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={{ fontSize: 24, color: theme.text }}>‹</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Task Details</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Task Header Card */}
        <LinearGradient
          colors={task.status === 'completed'
            ? [theme.success + '20', theme.success + '10']
            : [theme.primary, theme.primary + 'CC']
          }
          style={[styles.taskHeaderCard, { borderColor: task.status === 'completed' ? theme.success : theme.primary }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={{ gap: 12 }}>
            <Text style={[styles.taskTitle, { color: task.status === 'completed' ? theme.success : '#ffffff' }]}>
              {task.title}
            </Text>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ gap: 4 }}>
                <Text style={{ fontSize: 12, color: task.status === 'completed' ? theme.success + 'AA' : 'rgba(255, 255, 255, 0.7)', fontWeight: '500', textTransform: 'uppercase', letterSpacing: 1 }}>
                  Reward
                </Text>
                <Text style={{ fontSize: 20, fontWeight: '800', color: '#ffffff', marginTop: 4 }}>
                  💎 {Math.floor(task.reward_points)}
                </Text>
              </View>
              {task.status === 'completed' && (
                <View style={{ alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: theme.success + '40', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: theme.success }}>
                    <Text style={{ fontSize: 24 }}>✓</Text>
                  </View>
                  <Text style={{ color: theme.success, fontSize: 12, fontWeight: '600', textTransform: 'uppercase' }}>Completed</Text>
                </View>
              )}
              {task.status !== 'completed' && task.has_subtasks && (
                <View style={{ alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255, 255, 255, 0.2)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255, 255, 255, 0.5)' }}>
                    <Text style={{ fontSize: 20 }}>📋</Text>
                  </View>
                  <Text style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: 11, fontWeight: '600', textTransform: 'uppercase' }}>Multi-step</Text>
                </View>
              )}
            </View>
          </View>
        </LinearGradient>

        {/* Full Description Section - shows entire admin description */}
        {task.description && task.description.trim() !== '' && (
          <View style={{ paddingHorizontal: 20, marginTop: 8, marginBottom: 8 }}>
            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Description</Text>
            <View style={[styles.descriptionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.descriptionText, { color: theme.text }]} selectable>
                {task.description}
              </Text>
            </View>
          </View>
        )}

        {/* Task Info Section */}
        <View style={{ paddingHorizontal: 20, marginTop: 25, gap: 15 }}>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Task Info</Text>
          
          <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Task Type</Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>{task.has_subtasks ? 'Multi-step' : 'Single Step'}</Text>
            </View>
          </View>

          <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Status</Text>
              <Text style={[styles.infoValue, { color: task.status === 'completed' ? theme.success : theme.primary }]}>
                {task.disabled && task.is_repeatable && task.daily_limit > 0
                  ? 'Daily limit reached'
                  : task.status === 'completed'
                    ? '✓ Completed'
                    : '◉ Available'}
              </Text>
            </View>
            {task.disabled && task.is_repeatable && task.daily_limit > 0 && (
              <Text style={[styles.infoHint, { color: theme.textSecondary }]}>
                You can do this task again tomorrow.
              </Text>
            )}
          </View>

          {task.has_subtasks && (
            <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Progress</Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>
                  {task.subtasks.filter(st => st.status === 'completed').length} / {task.subtasks.length}
                </Text>
              </View>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${(task.subtasks.filter(st => st.status === 'completed').length / task.subtasks.length) * 100}%`,
                      backgroundColor: theme.primary
                    }
                  ]}
                />
              </View>
            </View>
          )}
        </View>

        {/* Subtasks Section */}
        {task.has_subtasks && task.subtasks.length > 0 && (
          <View style={{ paddingHorizontal: 20, marginTop: 30, marginBottom: 20 }}>
            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Subtasks</Text>
            
            <View style={{ gap: 12, marginTop: 15 }}>
              {task.subtasks.map((subtask, index) => (
                <TouchableOpacity
                  key={subtask.id}
                  style={[
                    styles.subtaskItem,
                    {
                      backgroundColor: subtask.status === 'completed' ? theme.card + '80' : theme.card,
                      borderColor: subtask.status === 'completed' ? theme.success : theme.border
                    }
                  ]}
                  onPress={() => {
                    if (subtask.status !== 'completed' || (task?.is_repeatable && !task?.disabled)) {
                      openSubtask(subtask);
                    }
                  }}
                  disabled={!(subtask.status !== 'completed' || (task?.is_repeatable && !task?.disabled))}
                  activeOpacity={(subtask.status !== 'completed' || (task?.is_repeatable && !task?.disabled)) ? 0.7 : 1}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 15, flex: 1 }}>
                    <View style={[styles.subtaskNumber, { backgroundColor: subtask.status === 'completed' ? theme.success : theme.primary, borderColor: subtask.status === 'completed' ? theme.success : theme.primary }]}>
                      {subtask.status === 'completed' ? (
                        <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '800' }}>✓</Text>
                      ) : (
                        <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: '800' }}>{index + 1}</Text>
                      )}
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={[styles.subtaskTitle, { color: subtask.status === 'completed' ? theme.textSecondary : theme.text }]}>
                        {subtask.title}
                      </Text>
                      {subtask.description && (
                        <Text style={[styles.subtaskDesc, { color: theme.textSecondary }]}>
                          {subtask.description}
                        </Text>
                      )}
                    </View>
                  </View>

                  <View style={{ alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }}>
                    <Text style={[styles.subtaskPoints, { color: subtask.status === 'completed' ? theme.textSecondary : theme.primary }]}>
                      +{subtask.reward_points}
                    </Text>
                    {subtask.status === 'completed' ? (
                      <Text style={{ color: theme.success, fontSize: 12, fontWeight: '600' }}>Done</Text>
                    ) : (
                      <Text style={{ color: theme.primary, fontSize: 12, fontWeight: '600' }}>Go →</Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>

      <ThemedPopup
        visible={popupVisible}
        title={popupConfig.title}
        message={popupConfig.message}
        onConfirm={() => setPopupVisible(false)}
        onClose={() => setPopupVisible(false)}
      />

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
    marginBottom: 24,
    textAlign: 'center',
    color: theme.text,
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
  taskHeaderCard: {
    marginHorizontal: 20,
    marginBottom: 30,
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
  },
  taskTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  taskDesc: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
  },
  descriptionCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    marginTop: 10,
  },
  descriptionText: {
    fontSize: 15,
    lineHeight: 24,
    fontWeight: '400',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  infoCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  infoHint: {
    fontSize: 12,
    marginTop: 6,
    opacity: 0.85,
  },
  progressBar: {
    height: 6,
    backgroundColor: theme.border,
    borderRadius: 3,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  actionButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  subtaskItem: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  subtaskNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    borderWidth: 0,
  },
  subtaskTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  subtaskDesc: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: 4,
  },
  subtaskPoints: {
    fontSize: 16,
    fontWeight: '700',
  },
  // WebView styles
  webViewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  webViewBackButton: {
    padding: 8,
    marginRight: 8,
  },
  webViewTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  webViewTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  webViewPoints: {
    fontSize: 12,
    fontWeight: '500',
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  disabledButton: {
    opacity: 0.6,
  },
  completeButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  webView: {
    flex: 1,
  },
  webViewLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
});