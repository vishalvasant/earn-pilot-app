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
import { api } from '../../services/api';
import { useTheme } from '../../hooks/useTheme';

const { width } = Dimensions.get('window');

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
    paddingHorizontal: 20,
    paddingVertical: 30,
    paddingTop: 60,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
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
const TaskCard = ({ task, index, theme }: { task: any; index: number; theme: any }) => {
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
    ]).start();
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
      case 'completed': return '✅';
      case 'in_progress': return '⏳';
      case 'available': return '🎯';
      default: return '📋';
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
                {getStatusIcon(task.is_completed ? 'completed' : 'available')} 
                {task.is_completed ? 'Completed' : 'Available'}
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
                  <Text style={styles.subtaskIcon}>
                    {subtask.is_completed ? '✅' : '⭕'}
                  </Text>
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
              <Text style={[styles.metaText, { color: theme.textSecondary }]}>
                🕒 Est. {task.estimated_time || '5 min'}
              </Text>
              <Text style={[styles.metaText, { color: theme.textSecondary }]}>
                🏆 Difficulty: {task.difficulty || 'Easy'}
              </Text>
            </View>
            
            <TouchableOpacity
              style={[
                styles.actionButton,
                { 
                  backgroundColor: task.is_completed ? theme.success : theme.primary,
                  opacity: task.is_completed ? 0.7 : 1
                }
              ]}
              disabled={task.is_completed}
            >
              <Text style={styles.actionButtonText}>
                {task.is_completed ? 'Completed' : 'Start Task'}
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
  const styles = createStyles(theme);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tasks, setTasks] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Mock data for demonstration
  const mockTasks = [
    {
      id: 1,
      title: 'Complete Daily Survey',
      description: 'Answer a quick 5-minute survey about your shopping preferences',
      points: 50,
      is_completed: false,
      estimated_time: '5 min',
      difficulty: 'Easy',
      subtasks: [
        { id: 1, title: 'Answer personal info questions', is_completed: true },
        { id: 2, title: 'Rate product preferences', is_completed: false },
      ]
    },
    {
      id: 2,
      title: 'Watch Advertisement Video',
      description: 'Watch a 30-second promotional video and rate it',
      points: 25,
      is_completed: true,
      estimated_time: '1 min',
      difficulty: 'Easy',
      subtasks: []
    },
    {
      id: 3,
      title: 'Social Media Engagement',
      description: 'Follow our social media accounts and share a post',
      points: 100,
      is_completed: false,
      estimated_time: '10 min',
      difficulty: 'Medium',
      subtasks: [
        { id: 1, title: 'Follow Instagram account', is_completed: false },
        { id: 2, title: 'Like recent posts', is_completed: false },
        { id: 3, title: 'Share story', is_completed: false },
      ]
    },
    {
      id: 4,
      title: 'Product Review',
      description: 'Write a detailed review for a product you recently purchased',
      points: 200,
      is_completed: false,
      estimated_time: '15 min',
      difficulty: 'Hard',
      subtasks: [
        { id: 1, title: 'Upload product photos', is_completed: false },
        { id: 2, title: 'Write detailed review', is_completed: false },
      ]
    },
  ];

  useEffect(() => {
    loadTasks();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      // Try to load from API, fallback to mock data
      try {
        const res = await api.get('/api/tasks');
        setTasks(res.data?.data || mockTasks);
      } catch {
        setTasks(mockTasks);
      }
    } catch (e) {
      setTasks(mockTasks);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadTasks();
    setRefreshing(false);
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
        <LinearGradient
          colors={theme.gradient.secondary as [string, string, ...string[]]}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Explore Opportunities 🧭</Text>
            <Text style={styles.headerSubtitle}>Discover tasks and earn rewards</Text>
            
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
            <TaskCard task={item} index={index} theme={theme} />
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
    </SafeAreaView>
  );
}
