import React, { useMemo, useRef, useState, useEffect } from 'react';
import { SafeAreaView, ScrollView, StatusBar, Text, View, StyleSheet, TouchableOpacity, Animated, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../hooks/useTheme';
import { useDataStore } from '../../stores/dataStore';
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
  // const navigation = useNavigation();
  const navigation = useNavigation<any>();
  const { shouldShowBanner, getBannerAdId } = useAdMob();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  const [readExpanded, setReadExpanded] = useState(true);
  const [watchExpanded, setWatchExpanded] = useState(false);
  const [otherExpanded, setOtherExpanded] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'completed'>('open'); // Default to 'open'
  
  // Use centralized data store for tasks
  const { tasks: allTasks, tasksLoading: loading, fetchTasks } = useDataStore();

  // Fetch tasks from store (will use cache if available)
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

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
          <View style={styles.filterSection}>
            <View style={[styles.filterContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.tabsWrapper}>
                {(['all', 'open', 'completed'] as const).map((status) => {
                  const isActive = filterStatus === status;
                  return (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.filterTab,
                        { flex: 1 },
                        isActive && { backgroundColor: theme.primary + '15' }
                      ]}
                      onPress={() => setFilterStatus(status)}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.filterTabText,
                        { 
                          color: isActive ? theme.primary : theme.textSecondary,
                          fontWeight: isActive ? '700' : '600'
                        }
                      ]}>
                        {status === 'all' ? 'All' : status === 'open' ? 'Open' : 'Completed'}
                      </Text>
                      {isActive && (
                        <View style={[styles.tabIndicator, { backgroundColor: theme.primary }]} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>

          {loading ? (
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 40 }}>
              <ActivityIndicator size="large" color={theme.primary} />
            </View>
          ) : (
            <>
              {/* Read & Earn */}
              <TouchableOpacity 
                style={styles.categoryLabel} 
                onPress={() => setReadExpanded(!readExpanded)} 
                activeOpacity={0.6}
              >
                <View style={styles.categoryHeader}>
                  <Text style={styles.categoryIcon}>📰</Text>
                  <View style={styles.categoryInfo}>
                    <Text style={[styles.expandTitle, { color: theme.text }]}>Read & Earn</Text>
                    <Text style={[styles.taskCount, { color: theme.textSecondary }]}>
                      {filteredReadTasks.length} {filteredReadTasks.length === 1 ? 'task' : 'tasks'}
                    </Text>
                  </View>
                  <Text style={[styles.expandIcon, { color: theme.textSecondary }]}>
                    {readExpanded ? '▲' : '▼'}
                  </Text>
                </View>
              </TouchableOpacity>
              {readExpanded && filteredReadTasks.length > 0 && (
                <View style={[styles.divider, { backgroundColor: theme.border }]} />
              )}
              {readExpanded && (
                <View style={styles.tasksList}>
                  {filteredReadTasks.length > 0 ? (
                    filteredReadTasks.map((task, index) => (
                      <TouchableOpacity 
                        key={task.id} 
                        style={[
                          styles.listItem, 
                          { 
                            backgroundColor: theme.card, 
                            borderColor: theme.border,
                          }
                        ]}
                        onPress={() => {
                          navigation.navigate('TaskDetail', { taskId: task.id });
                        }}
                        activeOpacity={0.7}
                        disabled={task.disabled}
                      >
                        <View style={styles.taskContent}>
                          <View style={styles.taskInfo}>
                            <Text style={[
                              styles.listText, 
                              { color: task.disabled ? theme.textSecondary : theme.text }
                            ]}>
                              {task.title}
                            </Text>
                            {task.description && (
                              <Text style={[styles.taskDesc, { color: theme.textSecondary }]} numberOfLines={2}>
                                {task.description}
                              </Text>
                            )}
                            {task.has_subtasks && (
                              <View style={styles.subtaskBadge}>
                                <Text style={[styles.subtaskIndicator, { color: theme.primary }]}>
                                  {task.subtasks?.length || 0} subtasks →
                                </Text>
                              </View>
                            )}
                          </View>
                          <View style={[styles.rewardBadge, { backgroundColor: theme.primary + '15' }]}>
                            <Text style={[
                              styles.rewardText, 
                              { color: task.disabled ? theme.textSecondary : theme.primary }
                            ]}>
                              +{task.reward_points}
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    ))
                  ) : (
                    <View style={styles.emptyState}>
                      <Text style={[styles.emptyStateIcon]}>📭</Text>
                      <Text style={[styles.noTasksText, { color: theme.textSecondary }]}>
                        No read tasks available
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Watch & Earn */}
              <TouchableOpacity 
                style={styles.categoryLabel} 
                onPress={() => setWatchExpanded(!watchExpanded)} 
                activeOpacity={0.6}
              >
                <View style={styles.categoryHeader}>
                  <Text style={styles.categoryIcon}>🎥</Text>
                  <View style={styles.categoryInfo}>
                    <Text style={[styles.expandTitle, { color: theme.text }]}>Watch & Earn</Text>
                    <Text style={[styles.taskCount, { color: theme.textSecondary }]}>
                      {filteredWatchTasks.length} {filteredWatchTasks.length === 1 ? 'task' : 'tasks'}
                    </Text>
                  </View>
                  <Text style={[styles.expandIcon, { color: theme.textSecondary }]}>
                    {watchExpanded ? '▲' : '▼'}
                  </Text>
                </View>
              </TouchableOpacity>
              {watchExpanded && filteredWatchTasks.length > 0 && (
                <View style={[styles.divider, { backgroundColor: theme.border }]} />
              )}
              {watchExpanded && (
                <View style={styles.tasksList}>
                  {filteredWatchTasks.length > 0 ? (
                    filteredWatchTasks.map((task) => (
                      <TouchableOpacity 
                        key={task.id} 
                        style={[
                          styles.listItem, 
                          { 
                            backgroundColor: theme.card, 
                            borderColor: theme.border,
                          }
                        ]}
                        onPress={() => {
                          navigation.navigate('TaskDetail', { taskId: task.id });
                        }}
                        activeOpacity={0.7}
                        disabled={task.disabled}
                      >
                        <View style={styles.taskContent}>
                          <View style={styles.taskInfo}>
                            <Text style={[
                              styles.listText, 
                              { color: task.disabled ? theme.textSecondary : theme.text }
                            ]}>
                              {task.title}
                            </Text>
                            {task.description && (
                              <Text style={[styles.taskDesc, { color: theme.textSecondary }]} numberOfLines={2}>
                                {task.description}
                              </Text>
                            )}
                            {task.has_subtasks && (
                              <View style={styles.subtaskBadge}>
                                <Text style={[styles.subtaskIndicator, { color: theme.primary }]}>
                                  {task.subtasks?.length || 0} subtasks →
                                </Text>
                              </View>
                            )}
                          </View>
                          <View style={[styles.rewardBadge, { backgroundColor: theme.primary + '15' }]}>
                            <Text style={[
                              styles.rewardText, 
                              { color: task.disabled ? theme.textSecondary : theme.primary }
                            ]}>
                              +{task.reward_points}
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    ))
                  ) : (
                    <View style={styles.emptyState}>
                      <Text style={[styles.emptyStateIcon]}>📭</Text>
                      <Text style={[styles.noTasksText, { color: theme.textSecondary }]}>
                        No watch tasks available
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Other Tasks (if any) */}
              {filteredOtherTasks.length > 0 && (
                <>
                  <TouchableOpacity 
                    style={styles.categoryLabel} 
                    onPress={() => setOtherExpanded(!otherExpanded)} 
                    activeOpacity={0.6}
                  >
                    <View style={styles.categoryHeader}>
                      <Text style={styles.categoryIcon}>⭐</Text>
                      <View style={styles.categoryInfo}>
                        <Text style={[styles.expandTitle, { color: theme.text }]}>Special Tasks</Text>
                        <Text style={[styles.taskCount, { color: theme.textSecondary }]}>
                          {filteredOtherTasks.length} {filteredOtherTasks.length === 1 ? 'task' : 'tasks'}
                        </Text>
                      </View>
                      <Text style={[styles.expandIcon, { color: theme.textSecondary }]}>
                        {otherExpanded ? '▲' : '▼'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  {otherExpanded && filteredOtherTasks.length > 0 && (
                    <View style={[styles.divider, { backgroundColor: theme.border }]} />
                  )}
                  {otherExpanded && (
                    <View style={styles.tasksList}>
                      {filteredOtherTasks.map((task) => (
                        <TouchableOpacity 
                          key={task.id} 
                          style={[
                            styles.listItem, 
                            { 
                              backgroundColor: theme.card, 
                              borderColor: theme.border,
                            }
                          ]}
                          onPress={() => {
                            console.log('🎯 Task detail navigation disabled - add screen later:', task.id);
                          }}
                          activeOpacity={0.7}
                          disabled={false}
                        >
                          <View style={styles.taskContent}>
                            <View style={styles.taskInfo}>
                              <Text style={[
                                styles.listText, 
                                { color: task.disabled ? theme.textSecondary : theme.text }
                              ]}>
                                {task.title}
                              </Text>
                              {task.description && (
                                <Text style={[styles.taskDesc, { color: theme.textSecondary }]} numberOfLines={2}>
                                  {task.description}
                                </Text>
                              )}
                              {task.has_subtasks && (
                                <View style={styles.subtaskBadge}>
                                  <Text style={[styles.subtaskIndicator, { color: theme.primary }]}>
                                    {task.subtasks?.length || 0} subtasks →
                                  </Text>
                                </View>
                              )}
                            </View>
                            <View style={[styles.rewardBadge, { backgroundColor: theme.primary + '15' }]}>
                              <Text style={[
                                styles.rewardText, 
                                { color: task.disabled ? theme.textSecondary : theme.primary }
                              ]}>
                                +{task.reward_points}
                              </Text>
                            </View>
                          </View>
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
    paddingBottom: 24,
  },
  logoText: { 
    fontSize: 28, 
    fontWeight: '800', 
    letterSpacing: -0.5, 
    color: theme.text,
  },
  sectionLabel: { 
    fontSize: 11, 
    fontWeight: '800', 
    marginHorizontal: 25, 
    marginTop: 25, 
    marginBottom: 12, 
    textTransform: 'uppercase', 
    letterSpacing: 2 
  },
  filterSection: {
    marginBottom: 12,
  },
  filterContainer: {
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 8,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  tabsWrapper: {
    flexDirection: 'row',
    position: 'relative',
  },
  filterTab: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    minHeight: 52,
    borderRadius: 12,
  },
  filterTabText: {
    fontSize: 15,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 6,
    left: '20%',
    right: '20%',
    height: 3,
    borderRadius: 2,
  },
  categoryLabel: {
    marginHorizontal: 20,
    marginTop: 24,
    marginBottom: 0,
    paddingVertical: 14,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  categoryIcon: {
    fontSize: 22,
  },
  categoryInfo: {
    flex: 1,
  },
  divider: {
    height: 1,
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 4,
    opacity: 0.3,
  },
  expandTitle: { 
    fontSize: 18, 
    fontWeight: '700',
    marginBottom: 3,
    letterSpacing: -0.2,
  },
  taskCount: { 
    fontSize: 13, 
    fontWeight: '500',
    opacity: 0.7,
  },
  expandIcon: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 'auto',
    opacity: 0.6,
  },
  tasksList: {
    paddingHorizontal: 0,
    marginBottom: 8,
    marginTop: 4,
  },
  listItem: { 
    backgroundColor: theme.card, 
    marginHorizontal: 20, 
    marginBottom: 10, 
    paddingVertical: 16, 
    paddingHorizontal: 18, 
    borderRadius: 16, 
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  taskContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  taskInfo: {
    flex: 1,
  },
  listText: { 
    fontSize: 16, 
    fontWeight: '600',
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  taskDesc: { 
    fontSize: 13, 
    marginTop: 5,
    lineHeight: 18,
    opacity: 0.8,
  },
  subtaskBadge: {
    marginTop: 6,
  },
  subtaskIndicator: { 
    fontSize: 12, 
    fontWeight: '600',
  },
  rewardBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    minWidth: 56,
    alignItems: 'center',
  },
  rewardText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 12,
    opacity: 0.5,
  },
  noTasksText: { 
    fontSize: 15, 
    fontWeight: '500',
    textAlign: 'center',
  },
});
