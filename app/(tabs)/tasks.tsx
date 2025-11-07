import React, { useEffect, useState, useRef } from 'react';
import { 
  ActivityIndicator,
  FlatList, 
  SafeAreaView, 
  Text, 
  View, 
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Animated,
  Dimensions,
  RefreshControl
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { api } from '../../services/api';
import { useTheme } from '../../hooks/useTheme';
import Icon from '../../components/Icon';
import ThemedPopup from '../../components/ThemedPopup';

const { width, height: screenHeight } = Dimensions.get('window');
const HEADER_HEIGHT = screenHeight * 0.30; // 30% of screen height

// Task interface for type safety
interface Task {
  id: number;
  title: string;
  description: string;
  points: number;
  energy_cost: number;
  is_completed: boolean;
  disabled: boolean;
  estimated_time: string;
  difficulty: string;
  subtasks: any[];
}

// Create styles function (defined here for use in TaskCard)
const createStyles = (theme: any) => StyleSheet.create({
  container: {
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
  header: {
    marginBottom: 20,
  },
  headerGradient: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 50,
    height: HEADER_HEIGHT,
  },
  headerContent: {
    flex: 1,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  tasksList: {
    flex: 1,
  },
  tasksContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  taskCard: {
    marginBottom: 16,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  taskGradient: {
    padding: 16,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  taskTitleSection: {
    flex: 1,
    marginRight: 12,
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  taskStatus: {
    fontSize: 14,
    fontWeight: '500',
  },
  pointsBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  pointsText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  taskContent: {
    padding: 16,
  },
  taskDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  subtasksContainer: {
    marginBottom: 16,
  },
  subtasksTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  subtaskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  subtaskIcon: {
    fontSize: 12,
    marginRight: 8,
  },
  subtaskText: {
    fontSize: 12,
    flex: 1,
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskMeta: {
    flex: 1,
  },
  metaText: {
    fontSize: 12,
    marginBottom: 2,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
});

// Enhanced TaskCard component with animations
const TaskCard = ({ task, index, theme, onComplete, router }: { 
  task: any; 
  index: number; 
  theme: any; 
  onComplete: (task: any) => void;
  router: any;
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const styles = createStyles(theme);

  useEffect(() => {
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
    }, index * 100);
  }, []);

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.97,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Navigate to task detail page after animation completes
      router.push(`/task-detail?taskId=${task.id}`);
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return theme.success;
      case 'in_progress': return theme.warning;
      case 'available': return theme.primary;
      default: return theme.textSecondary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return 'checkmark';
      case 'in_progress': return 'pending';
      case 'available': return 'target';
      default: return 'tasks';
    }
  };

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [
          { translateY: slideAnim },
          { scale: scaleAnim }
        ],
      }}
    >
      <TouchableOpacity
        style={[
          styles.taskCard,
          { 
            backgroundColor: theme.card, 
            borderColor: theme.border,
            shadowColor: theme.text,
          }
        ]}
        onPress={handlePress}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={task.is_completed ? ['#e8f5e8', '#f0fff0'] : theme.gradient.primary}
          style={styles.taskGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.taskHeader}>
            <View style={styles.taskTitleSection}>
              <Text style={[
                styles.taskTitle, 
                { color: task.is_completed ? theme.success : '#ffffff' }
              ]}>
                {task.title}
              </Text>
              <Text style={[
                styles.taskStatus,
                { color: task.is_completed ? theme.success : 'rgba(255, 255, 255, 0.9)' }
              ]}>
                <Icon 
                  name={getStatusIcon(task.is_completed ? 'completed' : 'available')} 
                  size={16} 
                  color={task.is_completed ? theme.success : 'rgba(255, 255, 255, 0.9)'} 
                />
                {' '}{task.is_completed ? 'Completed' : 'Available'}
              </Text>
            </View>
            <View style={[
              styles.pointsBadge,
              { backgroundColor: task.is_completed ? theme.success : 'rgba(255, 255, 255, 0.2)' }
            ]}>
              <Text style={[
                styles.pointsText,
                { color: task.is_completed ? '#ffffff' : '#ffffff' }
              ]}>
                {task.points} pts
              </Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.taskContent}>
          <Text style={[styles.taskDescription, { color: theme.textSecondary }]} numberOfLines={2}>
            {task.description}
          </Text>
          
          {task.subtasks && task.subtasks.length > 0 && (
            <View style={styles.subtasksContainer}>
              <Text style={[styles.subtasksTitle, { color: theme.text }]}>
                Subtasks ({task.subtasks.length})
              </Text>
              {task.subtasks.slice(0, 2).map((subtask: any, idx: number) => (
                <View key={idx} style={styles.subtaskItem}>
                  <Icon 
                    name={subtask.is_completed ? 'checkmark' : 'pending'} 
                    size={14} 
                    color={subtask.is_completed ? theme.success : theme.textSecondary} 
                  />
                  <Text style={[
                    styles.subtaskText, 
                    { 
                      color: subtask.is_completed ? theme.success : theme.textSecondary,
                      textDecorationLine: subtask.is_completed ? 'line-through' : 'none'
                    }
                  ]} numberOfLines={1}>
                    {subtask.title}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.taskFooter}>
            <View style={styles.taskMeta}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Icon name="time" size={14} color={theme.textSecondary} />
                <Text style={[styles.metaText, { color: theme.textSecondary }]}>
                  Est. {task.estimated_time || '5 min'}
                </Text>
              </View>
              {task.energy_cost > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={[styles.metaText, { color: theme.warning }]}>
                    ⚡ {task.energy_cost} energy
                  </Text>
                </View>
              )}
            </View>
            
            <TouchableOpacity
              style={[
                styles.actionButton,
                { 
                  backgroundColor: task.is_completed ? theme.success : (task.disabled ? theme.textSecondary : theme.primary),
                  opacity: (task.is_completed || task.disabled) ? 0.7 : 1
                }
              ]}
              disabled={task.is_completed || task.disabled}
              onPress={() => onComplete(task)}
            >
              <Text style={styles.actionButtonText}>
                {task.is_completed ? '✓ Completed' : 'Complete Task'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function TasksScreen() {
  const theme = useTheme();
  const router = useRouter();
  const styles = createStyles(theme);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState('all');
  const [userEnergy, setUserEnergy] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Popup state management
  const [popupVisible, setPopupVisible] = useState(false);
  const [popupConfig, setPopupConfig] = useState({
    title: '',
    message: '',
    confirmText: 'OK',
    cancelText: '',
    onConfirm: () => {},
    onCancel: () => {}
  });

  const showPopup = (title: string, message: string, confirmText = 'OK', onConfirm = () => {}) => {
    setPopupConfig({ 
      title, 
      message, 
      confirmText, 
      cancelText: '', 
      onConfirm: () => {
        setPopupVisible(false);
        onConfirm();
      }, 
      onCancel: () => {} 
    });
    setPopupVisible(true);
  };

  const showConfirmPopup = (title: string, message: string, onConfirm: () => void) => {
    setPopupConfig({ 
      title, 
      message, 
      confirmText: 'Complete', 
      cancelText: 'Cancel',
      onConfirm: () => {
        setPopupVisible(false);
        onConfirm();
      },
      onCancel: () => {
        setPopupVisible(false);
      }
    });
    setPopupVisible(true);
  };

  useEffect(() => {
    loadTasks();
    loadUserEnergy();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const res = await api.get('/tasks');
      const tasksData = res.data?.data || [];
      
      // Transform API data to match UI expectations
      const formattedTasks = tasksData.map((task: any) => ({
        id: task.id,
        title: task.title,
        description: task.description,
        points: task.reward_points,
        energy_cost: task.energy_cost || 0,
        is_completed: task.status === 'completed',
        disabled: task.disabled || false,
        estimated_time: '5 min', // Default, can be added to backend
        difficulty: 'Medium', // Default, can be added to backend
        subtasks: task.subtasks || [],
      }));
      
      setTasks(formattedTasks);
    } catch (error) {
      console.error('Failed to load tasks:', error);
      showPopup('Error', 'Failed to load tasks. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadUserEnergy = async () => {
    try {
      const res = await api.get('/wallet/balance');
      setUserEnergy(res.data?.data?.energy_points || 0);
    } catch (error) {
      console.error('Failed to load energy:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadTasks(), loadUserEnergy()]);
    setRefreshing(false);
  };

  const handleCompleteTask = async (task: any) => {
    if (task.is_completed || task.disabled) {
      return;
    }

    // Check energy requirement
    if (task.energy_cost > 0 && userEnergy < task.energy_cost) {
      showPopup(
        'Insufficient Energy',
        `This task requires ${task.energy_cost} energy points. You have ${userEnergy}. Play mini-games to earn more energy!`
      );
      return;
    }

    showConfirmPopup(
      'Complete Task',
      `Complete "${task.title}" for ${task.reward_points} points?${task.energy_cost > 0 ? `\n\n⚡ Will use ${task.energy_cost} energy` : ''}`,
      async () => {
        try {
          // Step 1: Start the task (deducts energy if needed). Idempotent.
          await api.post(`/tasks/${task.id}/start`);

          // Step 2: Complete the task
          const res = await api.post(`/tasks/${task.id}/complete`);
          showPopup('Success! 🎉', res.data.message || 'Task completed successfully!');
          await handleRefresh(); // Reload tasks and energy
        } catch (error: any) {
          const errorMsg = error.response?.data?.message || 'Failed to complete task';
          showPopup('Error', errorMsg);
        }
      }
    );
  };

  const filteredTasks = tasks.filter(task => {
    if (filter === 'completed') return task.is_completed;
    if (filter === 'available') return !task.is_completed;
    return true;
  });

  const FilterButton = ({ title, value, active }: { title: string; value: string; active: boolean }) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        { 
          backgroundColor: active ? theme.primary : theme.card,
          borderColor: active ? theme.primary : theme.border
        }
      ]}
      onPress={() => setFilter(value)}
      activeOpacity={0.8}
    >
      <Text style={[
        styles.filterButtonText,
        { color: active ? '#ffffff' : theme.text }
      ]}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar 
          barStyle={theme.background === '#ffffff' ? 'dark-content' : 'light-content'} 
          backgroundColor={theme.background}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading opportunities...</Text>
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
      
      <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <LinearGradient
            colors={theme.gradient.primary as [string, string, ...string[]]}
            style={styles.headerGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
          <View style={styles.headerContent}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.headerTitle}>Explore Opportunities 🧭</Text>
                <Text style={styles.headerSubtitle}>Discover tasks and earn rewards</Text>
              </View>
              <View style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginLeft: 12 }}>
                <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: '600' }}>
                  ⚡ {userEnergy}
                </Text>
              </View>
            </View>
            
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{filteredTasks.filter(t => !t.is_completed).length}</Text>
                <Text style={styles.statLabel}>Available</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{filteredTasks.filter(t => t.is_completed).length}</Text>
                <Text style={styles.statLabel}>Completed</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{filteredTasks.reduce((sum, t) => sum + (t.points || 0), 0)}</Text>
                <Text style={styles.statLabel}>Total Points</Text>
              </View>
            </View>
          </View>
        </LinearGradient>
        </View>

        {/* Filters */}
        <View style={styles.filtersContainer}>
          <FilterButton title="All Opportunities" value="all" active={filter === 'all'} />
          <FilterButton title="Available" value="available" active={filter === 'available'} />
          <FilterButton title="Completed" value="completed" active={filter === 'completed'} />
        </View>

        {/* Tasks List */}
        <FlatList
          style={styles.tasksList}
          contentContainerStyle={styles.tasksContent}
          data={filteredTasks}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item, index }) => (
            <TaskCard task={item} index={index} theme={theme} onComplete={handleCompleteTask} router={router} />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[theme.primary]}
              tintColor={theme.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🧭</Text>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No opportunities found</Text>
              <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                Pull down to refresh or check back later
              </Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      </Animated.View>

      <ThemedPopup
        visible={popupVisible}
        title={popupConfig.title}
        message={popupConfig.message}
        confirmText={popupConfig.confirmText}
        cancelText={popupConfig.cancelText || undefined}
        onConfirm={popupConfig.onConfirm}
        onCancel={popupConfig.onCancel}
        onClose={() => setPopupVisible(false)}
      />
    </SafeAreaView>
  );
}
