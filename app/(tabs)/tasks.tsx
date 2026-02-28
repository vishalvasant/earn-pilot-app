import React, { useMemo, useRef, useState, useEffect } from 'react';
import { SafeAreaView, ScrollView, StatusBar, Text, View, StyleSheet, TouchableOpacity, Animated, ActivityIndicator } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../hooks/useTheme';
import { useDataStore } from '../../stores/dataStore';
import { useAdMob } from '../../hooks/useAdMob';
import FixedBannerAd from '../../components/FixedBannerAd';
import Skeleton from '../../components/Skeleton';

interface Task {
  id: number;
  title: string;
  description?: string;
  category?: string;
  reward_points: number;
  type?: string;
  status?: string;
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
  const { shouldShowBanner, getBannerAdId, getBannerAdIds, getAdRequestOptions } = useAdMob();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'completed'>('open'); // Default to 'open'
  const isFirstFocusRef = React.useRef(true);

  // Use centralized data store for tasks
  const { tasks: allTasks, tasksLoading: loading, fetchTasks } = useDataStore();

  // Fetch tasks on mount (one request; uses cache)
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);
  // When returning to this tab, force refresh so list is up to date. Skip first focus to avoid double fetch.
  useFocusEffect(
    React.useCallback(() => {
      if (isFirstFocusRef.current) {
        isFirstFocusRef.current = false;
        return;
      }
      fetchTasks(true);
    }, [fetchTasks])
  );

  // Build dynamic categories from API-provided `task.category` (fallback to 'Uncategorized')
  const categories = useMemo(() => {
    const set = new Set<string>();
    allTasks.forEach(t => set.add(t.category?.trim() || 'Uncategorized'));
    return Array.from(set);
  }, [allTasks]);

  useEffect(() => {
    // Initialize expanded state for categories (first category expanded by default)
    if (categories.length > 0 && Object.keys(expandedCategories).length === 0) {
      const init: Record<string, boolean> = {};
      categories.forEach((c, i) => init[c] = i === 0);
      setExpandedCategories(init);
    }
  }, [categories, expandedCategories]);

  // Filter tasks based on status. Repeatable tasks always count as "open" so user can access them (may show "Daily limit reached" on detail).
  const filterTasksByStatus = (tasks: Task[]) => {
    if (filterStatus === 'all') return tasks;
    if (filterStatus === 'open') return tasks.filter(task => task.is_repeatable || (task.status !== 'completed' && task.status !== 'done'));
    if (filterStatus === 'completed') return tasks.filter(task => !task.is_repeatable && (task.status === 'completed' || task.status === 'done'));
    return tasks;
  };

  const tasksByCategory = (category: string) => {
    const list = allTasks.filter(t => (t.category?.trim() || 'Uncategorized') === category);
    return filterTasksByStatus(list);
  };

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
        contentContainerStyle={[
          styles.scrollViewContent,
          { paddingBottom: shouldShowBanner ? 100 : 24 }
        ]}
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
            <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
              <View style={[styles.filterSection, { marginBottom: 16 }]}>
                <View style={[styles.filterContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <View style={styles.tabsWrapper}>
                    <Skeleton width="33%" height={44} borderRadius={12} style={{ marginHorizontal: 2 }} />
                    <Skeleton width="33%" height={44} borderRadius={12} style={{ marginHorizontal: 2 }} />
                    <Skeleton width="33%" height={44} borderRadius={12} style={{ marginHorizontal: 2 }} />
                  </View>
                </View>
              </View>
              {[1, 2, 3].map((i) => (
                <View key={i} style={{ marginTop: 24 }}>
                  <View style={styles.categoryHeader}>
                    <Skeleton width={34} height={34} borderRadius={8} />
                    <View style={{ flex: 1, marginLeft: 14 }}>
                      <Skeleton width={120} height={18} borderRadius={4} />
                      <Skeleton width={60} height={13} style={{ marginTop: 6 }} borderRadius={4} />
                    </View>
                  </View>
                  <View style={{ marginTop: 12, marginHorizontal: 0, gap: 10 }}>
                    {[1, 2, 3].map((j) => (
                      <View key={j} style={[styles.listItem, { backgroundColor: theme.card, borderColor: theme.border }]}>
                        <Skeleton width="70%" height={18} borderRadius={4} />
                        <Skeleton width="50%" height={14} style={{ marginTop: 8 }} borderRadius={4} />
                        <Skeleton width={50} height={32} borderRadius={10} style={{ position: 'absolute', right: 18, top: 16 }} />
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <>
              {/* Render dynamic categories (grouped by category from API) */}
              {categories.map((category) => {
                const items = tasksByCategory(category);
                const expanded = !!expandedCategories[category];
                if (items.length === 0) return null;
                return (
                  <React.Fragment key={category}>
                    <TouchableOpacity
                      style={styles.categoryLabel}
                      onPress={() => setExpandedCategories(prev => ({ ...prev, [category]: !prev[category] }))}
                      activeOpacity={0.6}
                    >
                      <View style={styles.categoryHeader}>
                        <View style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: theme.primary + '15', alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ color: theme.primary, fontWeight: '700' }}>{(category || 'U').charAt(0).toUpperCase()}</Text>
                        </View>
                        <View style={styles.categoryInfo}>
                          <Text style={[styles.expandTitle, { color: theme.text }]}>{category}</Text>
                          <Text style={[styles.taskCount, { color: theme.textSecondary }]}>
                            {items.length} {items.length === 1 ? 'task' : 'tasks'}
                          </Text>
                        </View>
                        <Text style={[styles.expandIcon, { color: theme.textSecondary }]}>
                          {expanded ? '▲' : '▼'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                    {expanded && <View style={[styles.divider, { backgroundColor: theme.border }]} />}
                    {expanded && (
                      <View style={styles.tasksList}>
                        {items.map((task) => (
                          <TouchableOpacity
                            key={task.id}
                            style={[
                              styles.listItem,
                              {
                                backgroundColor: theme.card,
                                borderColor: theme.border,
                              }
                            ]}
                            onPress={() => navigation.navigate('TaskDetail', { taskId: task.id })}
                            activeOpacity={0.7}
                            disabled={task.disabled && !task.is_repeatable}
                          >
                            <View style={styles.taskContent}>
                              <View style={styles.taskInfo}>
                                <Text style={[
                                  styles.listText,
                                  { color: task.disabled && !task.is_repeatable ? theme.textSecondary : theme.text }
                                ]}>
                                  {task.title}
                                </Text>
                                {task.description && (
                                  <Text style={[styles.taskDesc, { color: theme.textSecondary }]} numberOfLines={3}>
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
                                  { color: task.disabled && !task.is_repeatable ? theme.textSecondary : theme.primary }
                                ]}>
                                  +{task.reward_points}
                                </Text>
                              </View>
                            </View>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </React.Fragment>
                );
              })}
            </>
          )}

          <View style={{ height: 150 }} />
        </Animated.View>
      </ScrollView>
      
      {/* Fixed Banner Ad above Tab Bar */}
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
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollViewContent: {
    paddingTop: 0,
  },
  topHeader: {
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoText: { 
    fontSize: 24, 
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
