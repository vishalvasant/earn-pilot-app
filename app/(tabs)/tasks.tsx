import React, { useMemo, useRef, useState, useEffect } from 'react';
import { SafeAreaView, ScrollView, StatusBar, Text, View, StyleSheet, TouchableOpacity, Animated, ActivityIndicator } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../hooks/useTheme';
import { api } from '../../services/api';
import { useAdMob } from '../../hooks/useAdMob';
import FixedBannerAd from '../../components/FixedBannerAd';

interface Task {
  id: number;
  title: string;
  description?: string;
  category?: string;
  reward_points: number;
  type?: string;
  status: string;
  disabled?: boolean;
  has_subtasks?: boolean;
  subtasks?: any[];
  is_repeatable?: boolean;
  daily_limit?: number;
  links?: string[];
}

export default function TasksScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const { shouldShowBanner, getBannerAdId } = useAdMob();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  const [readExpanded, setReadExpanded] = useState(true);
  const [watchExpanded, setWatchExpanded] = useState(false);
  const [otherExpanded, setOtherExpanded] = useState(false);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'completed'>('all');

  const todayIndex = (new Date().getDate() % 5) || 2; // Highlight one day (D2 in reference)

  // Fetch tasks from database
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoading(true);
        const response = await api.get('/tasks');
        console.log('📋 Tasks API Response:', response.data);
        const tasks = response.data.data || [];
        console.log('📋 Fetched tasks:', tasks);
        setAllTasks(tasks);
      } catch (error) {
        console.error('Error fetching tasks:', error);
        setAllTasks([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, []);

  // Categorize tasks by title keywords (since no type field exists)
  const readTasks = allTasks.filter((task) => {
    const title = task.title.toLowerCase();
    return title.includes('read') || title.includes('article') || title.includes('news') || title.includes('explore') || title.includes('profile');
  });
  const watchTasks = allTasks.filter((task) => {
    const title = task.title.toLowerCase();
    return title.includes('watch') || title.includes('video') || title.includes('stream') || title.includes('ad');
  });

  // All other tasks that don't match categories
  const otherTasks = allTasks.filter((task) => {
    const title = task.title.toLowerCase();
    const isRead = title.includes('read') || title.includes('article') || title.includes('news') || title.includes('explore') || title.includes('profile');
    const isWatch = title.includes('watch') || title.includes('video') || title.includes('stream') || title.includes('ad');
    return !isRead && !isWatch;
  });

  // Filter tasks based on status
  const filterTasksByStatus = (tasks: Task[]) => {
    if (filterStatus === 'all') return tasks;
    if (filterStatus === 'open') return tasks.filter(task => task.status !== 'completed' && task.status !== 'done');
    if (filterStatus === 'completed') return tasks.filter(task => task.status === 'completed' || task.status === 'done');
    return tasks;
  };

  const filteredReadTasks = filterTasksByStatus(readTasks);
  const filteredWatchTasks = filterTasksByStatus(watchTasks);
  const filteredOtherTasks = filterTasksByStatus(otherTasks);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }] }>
      <StatusBar barStyle={theme.background === '#ffffff' ? 'dark-content' : 'light-content'} backgroundColor={theme.background} />
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: shouldShowBanner ? 100 : 24 }}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {/* Header */}
          <View style={styles.topHeader}>
            <Text style={styles.logoText}>DAILY<Text style={{ color: theme.primary }}>TASKS</Text></Text>
          </View>

          {/* Filter Tabs */}
          <View style={[styles.filterContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
            {(['all', 'open', 'completed'] as const).map((status) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.filterTab,
                  filterStatus === status && { backgroundColor: theme.primary }
                ]}
                onPress={() => setFilterStatus(status)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.filterTabText,
                  { color: filterStatus === status ? '#ffffff' : theme.text }
                ]}>
                  {status === 'all' ? 'All' : status === 'open' ? 'Open' : 'Completed'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Active Modules */}
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Active Modules</Text>

          {loading ? (
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 40 }}>
              <ActivityIndicator size="large" color={theme.primary} />
            </View>
          ) : (
            <>
              {/* Read & Earn */}
              <TouchableOpacity style={[styles.expandableCard, { borderColor: theme.border, backgroundColor: theme.card }]} onPress={() => setReadExpanded(!readExpanded)} activeOpacity={0.8}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
                    <Text style={{ fontSize: 25 }}>📰</Text>
                    <View>
                      <Text style={[styles.expandTitle, { color: theme.text }]}>Read & Earn</Text>
                      <Text style={[styles.taskCount, { color: theme.textSecondary }]}>{filteredReadTasks.length} tasks</Text>
                    </View>
                  </View>
                  <Text style={{ color: theme.primary }}>{readExpanded ? '▲' : '▼'}</Text>
                </View>
              </TouchableOpacity>
              {readExpanded && (
                <View style={{ paddingHorizontal: 0 }}>
                  {filteredReadTasks.length > 0 ? (
                    filteredReadTasks.map((task) => (
                      <TouchableOpacity 
                        key={task.id} 
                        style={[styles.listItem, { backgroundColor: theme.card, borderColor: theme.border }]}
                        onPress={() => {
                          console.log('🎯 Task detail navigation disabled - add screen later:', task.id);
                        }}
                        activeOpacity={0.7}
                        disabled={false}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.listText, { color: task.disabled ? theme.textSecondary : theme.text }]}>{task.title}</Text>
                          {task.description && <Text style={[styles.taskDesc, { color: theme.textSecondary }]}>{task.description}</Text>}
                          {task.has_subtasks && <Text style={[styles.subtaskIndicator, { color: theme.primary }]}>Has {task.subtasks?.length || 0} subtasks →</Text>}
                        </View>
                        <Text style={{ color: task.disabled ? theme.textSecondary : theme.primary, fontWeight: 'bold', marginLeft: 10 }}>+{task.reward_points}</Text>
                      </TouchableOpacity>
                    ))
                  ) : (
                    <Text style={[styles.noTasksText, { color: theme.textSecondary }]}>No read tasks available</Text>
                  )}
                </View>
              )}

              {/* Watch & Earn */}
              <TouchableOpacity style={[styles.expandableCard, { borderColor: theme.border, backgroundColor: theme.card }]} onPress={() => setWatchExpanded(!watchExpanded)} activeOpacity={0.8}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
                    <Text style={{ fontSize: 25 }}>🎥</Text>
                    <View>
                      <Text style={[styles.expandTitle, { color: theme.text }]}>Watch & Earn</Text>
                      <Text style={[styles.taskCount, { color: theme.textSecondary }]}>{filteredWatchTasks.length} tasks</Text>
                    </View>
                  </View>
                  <Text style={{ color: theme.primary }}>{watchExpanded ? '▲' : '▼'}</Text>
                </View>
              </TouchableOpacity>
              {watchExpanded && (
                <View style={{ paddingHorizontal: 0 }}>
                  {filteredWatchTasks.length > 0 ? (
                    filteredWatchTasks.map((task) => (
                      <TouchableOpacity 
                        key={task.id} 
                        style={[styles.listItem, { backgroundColor: theme.card, borderColor: theme.border }]}
                        onPress={() => {
                          console.log('🎯 Task detail navigation disabled - add screen later:', task.id);
                        }}
                        activeOpacity={0.7}
                        disabled={false}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.listText, { color: task.disabled ? theme.textSecondary : theme.text }]}>{task.title}</Text>
                          {task.description && <Text style={[styles.taskDesc, { color: theme.textSecondary }]}>{task.description}</Text>}
                          {task.has_subtasks && <Text style={[styles.subtaskIndicator, { color: theme.primary }]}>Has {task.subtasks?.length || 0} subtasks →</Text>}
                        </View>
                        <Text style={{ color: task.disabled ? theme.textSecondary : theme.primary, fontWeight: 'bold', marginLeft: 10 }}>+{task.reward_points}</Text>
                      </TouchableOpacity>
                    ))
                  ) : (
                    <Text style={[styles.noTasksText, { color: theme.textSecondary }]}>No watch tasks available</Text>
                  )}
                </View>
              )}

              {/* Other Tasks (if any) */}
              {filteredOtherTasks.length > 0 && (
                <>
                  <TouchableOpacity style={[styles.expandableCard, { borderColor: theme.border, backgroundColor: theme.card }]} onPress={() => setOtherExpanded(!otherExpanded)} activeOpacity={0.8}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
                        <Text style={{ fontSize: 25 }}>⭐</Text>
                        <View>
                          <Text style={[styles.expandTitle, { color: theme.text }]}>Special Tasks</Text>
                          <Text style={[styles.taskCount, { color: theme.textSecondary }]}>{filteredOtherTasks.length} tasks</Text>
                        </View>
                      </View>
                      <Text style={{ color: theme.primary }}>{otherExpanded ? '▲' : '▼'}</Text>
                    </View>
                  </TouchableOpacity>
                  {otherExpanded && (
                    <View style={{ paddingHorizontal: 0 }}>
                      {filteredOtherTasks.map((task) => (
                        <TouchableOpacity 
                          key={task.id} 
                          style={[styles.listItem, { backgroundColor: theme.card, borderColor: theme.border }]}
                          onPress={() => {
                            console.log('🎯 Task detail navigation disabled - add screen later:', task.id);
                          }}
                          activeOpacity={0.7}
                          disabled={false}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.listText, { color: task.disabled ? theme.textSecondary : theme.text }]}>{task.title}</Text>
                            {task.description && <Text style={[styles.taskDesc, { color: theme.textSecondary }]}>{task.description}</Text>}
                            {task.has_subtasks && <Text style={[styles.subtaskIndicator, { color: theme.primary }]}>Has {task.subtasks?.length || 0} subtasks →</Text>}
                          </View>
                          <Text style={{ color: task.disabled ? theme.textSecondary : theme.primary, fontWeight: 'bold', marginLeft: 10 }}>+{task.reward_points}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </>
              )}
            </>
          )}

          <View style={{ height: 150 }} />
        </Animated.View>
      </ScrollView>
      
      {/* Fixed Banner Ad above Tab Bar */}
      <FixedBannerAd
        shouldShowBanner={shouldShowBanner}
        getBannerAdId={getBannerAdId}
        backgroundColor={theme.background}
      />
    </SafeAreaView>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  topHeader: {
    paddingHorizontal: 20,
    paddingTop: 35,
    paddingBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoText: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5, color: theme.text },
  sectionLabel: { fontSize: 11, fontWeight: '800', marginHorizontal: 25, marginTop: 25, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 2 },
  filterContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginVertical: 15,
    borderRadius: 16,
    borderWidth: 1,
    padding: 6,
    gap: 8,
    justifyContent: 'space-between',
  },
  filterTab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dailyRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 10 },
  dayBox: { width: '18%', paddingVertical: 10, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  dayBoxToday: {},
  dayText: { fontSize: 13, fontWeight: '600' },
  dayPoints: { fontSize: 13, fontWeight: '600' },
  expandableCard: { backgroundColor: theme.card, marginHorizontal: 20, marginBottom: 15, padding: 20, borderRadius: 24, borderWidth: 1 },
  expandTitle: { fontSize: 16, fontWeight: '600' },
  taskCount: { fontSize: 12, marginTop: 4 },
  listItem: { backgroundColor: theme.card, marginHorizontal: 20, marginBottom: 10, paddingVertical: 18, paddingHorizontal: 20, borderRadius: 22, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  listText: { fontSize: 16, fontWeight: '600' },
  taskDesc: { fontSize: 13, marginTop: 4 },
  subtaskIndicator: { fontSize: 12, marginTop: 6, fontWeight: '500' },
  noTasksText: { fontSize: 14, marginHorizontal: 20, marginBottom: 15, textAlign: 'center' },
});
