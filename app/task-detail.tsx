import React, { useState, useEffect } from 'react';
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { useAdMob } from '../hooks/useAdMob';
import Icon from '../components/Icon';
import { api } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import ThemedPopup from '../components/ThemedPopup';

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
  const { taskId } = useLocalSearchParams();
  const router = useRouter();
  const theme = useTheme();
  const { showInterstitial } = useAdMob();
  
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSubtask, setActiveSubtask] = useState<Subtask | null>(null);
  const [showingAd, setShowingAd] = useState(false);
  const [webViewKey, setWebViewKey] = useState(0);
  const [completingSubtask, setCompletingSubtask] = useState<number | null>(null);
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

  const fetchTaskDetail = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/tasks/${taskId}`);
      setTask(response.data.data);
    } catch (error: any) {
      console.error('Error fetching task detail:', error);
      showPopup(
        'Error',
        error.response?.data?.message || 'Failed to load task details'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubtaskComplete = async (subtask: Subtask) => {
    if (subtask.status === 'completed') {
      showPopup('Already Completed', 'You have already completed this subtask.');
      return;
    }

    try {
      // Show an interstitial before completing a subtask
      try { await showInterstitial(); } catch {}
      setCompletingSubtask(subtask.id);
      const response = await api.post(`/tasks/subtasks/${subtask.id}/complete`);
      
      if (response.data.success) {
        // Update the subtask in local state
        setTask(prevTask => {
          if (!prevTask) return null;
          return {
            ...prevTask,
            subtasks: prevTask.subtasks.map(st =>
              st.id === subtask.id ? { ...st, status: 'completed' } : st
            )
          };
        });

        showPopup(
          'Subtask Completed!',
          `You earned ${subtask.reward_points} points for completing "${subtask.title}"`
        );
        
        setActiveSubtask(null);
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

  const openSubtask = async (subtask: Subtask) => {
    if (subtask.status === 'completed') {
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
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.text }]}>
            {showingAd ? 'Loading ad...' : 'Loading task details...'}
          </Text>
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
            onPress={() => router.back()}
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
              completingSubtask === activeSubtask.id && styles.disabledButton
            ]}
            onPress={() => handleSubtaskComplete(activeSubtask)}
            disabled={completingSubtask === activeSubtask.id}
          >
            {completingSubtask === activeSubtask.id ? (
              <ActivityIndicator size="small" color="#ffffff" />
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
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.topHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
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
          <View style={{ gap: 15 }}>
            <View style={{ gap: 8 }}>
              <Text style={[styles.taskTitle, { color: task.status === 'completed' ? theme.success : '#ffffff' }]}>
                {task.title}
              </Text>
              <Text style={[styles.taskDesc, { color: task.status === 'completed' ? theme.success + 'CC' : 'rgba(255, 255, 255, 0.85)' }]}>
                {task.description}
              </Text>
            </View>

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
                {task.status === 'completed' ? '✓ Completed' : '◉ Available'}
              </Text>
            </View>
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
                    if (subtask.status !== 'completed') {
                      openSubtask(subtask);
                    }
                  }}
                  disabled={subtask.status === 'completed'}
                  activeOpacity={subtask.status === 'completed' ? 1 : 0.7}
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
                        <Text style={[styles.subtaskDesc, { color: theme.textSecondary }]} numberOfLines={2}>
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
        onClose={() => setPopupVisible(false)}
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
  subtaskItem: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    lineHeight: 18,
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