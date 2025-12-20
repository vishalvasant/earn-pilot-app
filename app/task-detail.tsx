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
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (activeSubtask) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.webViewHeader}>
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
            <View style={styles.webViewLoading}>
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
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerBackButton}
            onPress={() => router.back()}
          >
            <Icon name="arrowLeft" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Task Details</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Task Info Card */}
        <View style={[styles.taskCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <LinearGradient
            colors={task.status === 'completed'
              ? ['#e8f5e8', '#f0fff0'] 
              : ['#6366f1', '#8b5cf6']
            }
            style={styles.taskGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.taskHeader}>
              <Text style={[styles.taskTitle, { color: task.status === 'completed' ? theme.success : '#ffffff' }]}>
                {task.title}
              </Text>
              <View style={styles.taskMeta}>
                <Text style={[styles.taskCategory, { color: task.status === 'completed' ? theme.success : 'rgba(255, 255, 255, 0.9)' }]}>
                  {task.has_subtasks ? 'Multi-step Task' : 'Simple Task'}
                </Text>
                <Text style={[styles.taskPoints, { color: task.status === 'completed' ? theme.success : '#ffffff' }]}>
                  🪙 {task.reward_points} points
                </Text>
              </View>
            </View>
          </LinearGradient>
          
          <View style={styles.taskBody}>
            <Text style={[styles.taskDescription, { color: theme.textSecondary }]}>
              {task.description}
            </Text>
            
            <View style={styles.taskStats}>
              <View style={styles.statItem}>
                <Icon name="tasks" size={20} color={theme.primary} />
                <Text style={[styles.statText, { color: theme.text }]}>
                  {task.subtasks.length} Subtasks
                </Text>
              </View>
              <View style={styles.statItem}>
                <Icon name="checkmark" size={20} color={theme.success} />
                <Text style={[styles.statText, { color: theme.text }]}>
                  {task.subtasks.filter(st => st.status === 'completed').length} Completed
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Subtasks Section */}
        <View style={styles.subtasksSection}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Subtasks</Text>
          
          {task.subtasks.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Icon name="tasks" size={48} color={theme.textSecondary} />
              <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
                No subtasks available
              </Text>
            </View>
          ) : (
            task.subtasks
              .map((subtask, index) => (
                <TouchableOpacity
                  key={subtask.id}
                  style={[
                    styles.subtaskCard,
                    { backgroundColor: theme.card, borderColor: theme.border },
                    subtask.status === 'completed' && styles.completedSubtask
                  ]}
                  onPress={() => openSubtask(subtask)}
                  disabled={subtask.status === 'completed'}
                >
                  <View style={styles.subtaskHeader}>
                    <View style={styles.subtaskNumber}>
                      <Text style={[styles.subtaskNumberText, { color: theme.primary }]}>
                        {index + 1}
                      </Text>
                    </View>
                    <View style={styles.subtaskInfo}>
                      <Text style={[
                        styles.subtaskTitle,
                        { color: subtask.status === 'completed' ? theme.textSecondary : theme.text }
                      ]}>
                        {subtask.title}
                      </Text>
                      <Text style={[styles.subtaskDescription, { color: theme.textSecondary }]} numberOfLines={2}>
                        {subtask.description}
                      </Text>
                    </View>
                    <View style={styles.subtaskRight}>
                      <Text style={[styles.subtaskPoints, { color: theme.primary }]}>
                        🪙 {subtask.reward_points}
                      </Text>
                      {subtask.status === 'completed' ? (
                        <Icon name="checkmark" size={24} color={theme.success} />
                      ) : (
                        <Icon name="arrowRight" size={24} color={theme.textSecondary} />
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              ))
          )}
        </View>
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
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerBackButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  taskCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  taskGradient: {
    padding: 20,
  },
  taskHeader: {
    marginBottom: 8,
  },
  taskTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  taskMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskCategory: {
    fontSize: 14,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  taskPoints: {
    fontSize: 18,
    fontWeight: '600',
  },
  taskBody: {
    padding: 20,
  },
  taskDescription: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
  },
  taskStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  subtasksSection: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  emptyState: {
    padding: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  emptyStateText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  subtaskCard: {
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    elevation: 2,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  completedSubtask: {
    opacity: 0.7,
  },
  subtaskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subtaskNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(100, 100, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  subtaskNumberText: {
    fontSize: 14,
    fontWeight: '600',
  },
  subtaskInfo: {
    flex: 1,
    marginRight: 12,
  },
  subtaskTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  subtaskDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  subtaskRight: {
    alignItems: 'flex-end',
  },
  subtaskPoints: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  // WebView styles
  webViewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
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
    backgroundColor: '#ffffff',
  },
});