import { create } from 'zustand';
import { api } from '../services/api';

interface Task {
  id: number;
  title: string;
  description?: string;
  reward_points: number;
  status?: string;
  is_featured?: boolean;
  featured?: boolean;
  disabled?: boolean;
  [key: string]: any;
}

// NOTE: this is now "quiz categories" for the category-first quiz flow
interface QuizCategory {
  id: number;
  name?: string;
  description?: string;
  color?: string;
  icon_url?: string | null;
  quiz_count?: number;
  [key: string]: any;
}

interface DataState {
  // Tasks
  tasks: Task[];
  featuredTasks: Task[];
  tasksLoading: boolean;
  tasksLastFetched: number | null;
  tasksError: string | null;
  
  // Quizzes
  quizzes: QuizCategory[];
  quizzesLoading: boolean;
  quizzesLastFetched: number | null;
  quizzesError: string | null;
  
  // Profile
  profile: any | null;
  profileLoading: boolean;
  profileLastFetched: number | null;
  profileError: string | null;
  
  // Actions
  fetchTasks: (force?: boolean) => Promise<void>;
  fetchFeaturedTasks: (force?: boolean) => Promise<void>;
  fetchQuizzes: (force?: boolean) => Promise<void>;
  fetchProfile: (force?: boolean) => Promise<void>;
  fetchAllInitialData: () => Promise<void>;
  clearData: () => void;
}

// Cache duration: 30 seconds (can be adjusted)
const CACHE_DURATION = 30 * 1000;

export const useDataStore = create<DataState>((set, get) => ({
  // Initial state
  tasks: [],
  featuredTasks: [],
  tasksLoading: false,
  tasksLastFetched: null,
  tasksError: null,
  
  quizzes: [],
  quizzesLoading: false,
  quizzesLastFetched: null,
  quizzesError: null,
  
  profile: null,
  profileLoading: false,
  profileLastFetched: null,
  profileError: null,
  
  // Fetch tasks
  fetchTasks: async (force = false) => {
    const state = get();
    const now = Date.now();
    
    // Check cache if not forcing
    if (!force && state.tasksLastFetched && (now - state.tasksLastFetched) < CACHE_DURATION) {
      console.log('📦 Using cached tasks data');
      return;
    }
    
    // Prevent duplicate concurrent requests
    if (state.tasksLoading) {
      console.log('⏳ Tasks already loading, skipping...');
      return;
    }
    
    set({ tasksLoading: true, tasksError: null });
    
    try {
      const response = await api.get('/tasks');
      const tasks = response.data.data || [];
      
      set({
        tasks,
        tasksLoading: false,
        tasksLastFetched: now,
        tasksError: null,
      });
      
      console.log('✅ Tasks fetched successfully:', tasks.length);
    } catch (error: any) {
      console.error('❌ Error fetching tasks:', error);
      set({
        tasksLoading: false,
        tasksError: error?.message || 'Failed to fetch tasks',
      });
    }
  },
  
  // Fetch featured tasks
  fetchFeaturedTasks: async (force = false) => {
    const state = get();
    
    // Always filter from existing tasks if available (no need for separate API call)
    if (state.tasks.length > 0) {
      const featured = state.tasks.filter((task: Task) => task.is_featured || task.featured);
      set({ featuredTasks: featured.slice(0, 3) });
      return;
    }
    
    // Only try featured endpoint if tasks are not loaded yet
    // But this should rarely happen since tasks are fetched first
    try {
      const featuredResponse = await api.get('/tasks/featured');
      const featured = featuredResponse?.data?.data || [];
      set({ featuredTasks: featured.slice(0, 3) });
    } catch (error) {
      console.log('Featured tasks endpoint not available, will use tasks filter when tasks are loaded');
      // Will be populated when tasks are fetched
    }
  },
  
  // Fetch quizzes
  fetchQuizzes: async (force = false) => {
    const state = get();
    const now = Date.now();
    
    // Check cache if not forcing
    if (!force && state.quizzesLastFetched && (now - state.quizzesLastFetched) < CACHE_DURATION) {
      console.log('📦 Using cached quizzes data');
      return;
    }
    
    // Prevent duplicate concurrent requests
    if (state.quizzesLoading) {
      console.log('⏳ Quizzes already loading, skipping...');
      return;
    }
    
    set({ quizzesLoading: true, quizzesError: null });
    
    try {
      // Category-first quiz flow: fetch categories (Home uses this for "X available")
      const response = await api.get('/quiz-categories');
      const quizzes = response.data.data || [];
      
      set({
        quizzes,
        quizzesLoading: false,
        quizzesLastFetched: now,
        quizzesError: null,
      });
      
      console.log('✅ Quiz categories fetched successfully:', quizzes.length);
    } catch (error: any) {
      console.error('❌ Error fetching quizzes:', error);
      set({
        quizzesLoading: false,
        quizzesError: error?.message || 'Failed to fetch quizzes',
      });
    }
  },
  
  // Fetch profile
  fetchProfile: async (force = false) => {
    const state = get();
    const now = Date.now();
    
    // Check cache if not forcing
    if (!force && state.profileLastFetched && (now - state.profileLastFetched) < CACHE_DURATION && state.profile?.id) {
      console.log('📦 Using cached profile data (ID:', state.profile.id, ')');
      return;
    }
    
    // If cache is valid but profile is missing, we still need to fetch
    if (!force && state.profileLastFetched && (now - state.profileLastFetched) < CACHE_DURATION && !state.profile?.id) {
      console.log('⚠️ Cache timestamp exists but profile is missing, fetching...');
      // Continue to fetch below
    }
    
    // Prevent duplicate concurrent requests
    if (state.profileLoading) {
      console.log('⏳ Profile already loading, skipping...');
      return;
    }
    
    set({ profileLoading: true, profileError: null });
    
    try {
      const response = await api.get('/profile');
      const userData = response.data.user || response.data;
      
      set({
        profile: userData,
        profileLoading: false,
        profileLastFetched: now,
        profileError: null,
      });
      
      console.log('✅ Profile fetched successfully');
    } catch (error: any) {
      console.error('❌ Error fetching profile:', error);
      set({
        profileLoading: false,
        profileError: error?.message || 'Failed to fetch profile',
      });
    }
  },
  
  // Fetch all initial data in parallel
  fetchAllInitialData: async () => {
    const state = get();
    const now = Date.now();
    
    // Check if we have recent data
    const hasRecentData = 
      state.tasksLastFetched && (now - state.tasksLastFetched) < CACHE_DURATION &&
      state.quizzesLastFetched && (now - state.quizzesLastFetched) < CACHE_DURATION &&
      state.profileLastFetched && (now - state.profileLastFetched) < CACHE_DURATION;
    
    if (hasRecentData) {
      console.log('📦 Using cached initial data');
      // Update featured tasks from cached tasks
      const featured = state.tasks.filter((task: Task) => task.is_featured || task.featured);
      set({ featuredTasks: featured.slice(0, 3) });
      return;
    }
    
    // Fetch all data in parallel
    console.log('🚀 Fetching all initial data in parallel...');
    
    try {
      // Get the fetch functions from the store
      const { fetchTasks, fetchQuizzes, fetchProfile } = get();
      
      await Promise.all([
        fetchTasks(true),
        fetchQuizzes(true),
        fetchProfile(true),
      ]);
      
      // After tasks are loaded, update featured tasks (no need for separate API call)
      const updatedState = get();
      const featured = updatedState.tasks.filter((task: Task) => task.is_featured || task.featured);
      set({ featuredTasks: featured.slice(0, 3) });
      
      console.log('✅ All initial data fetched successfully');
    } catch (error) {
      console.error('❌ Error fetching initial data:', error);
    }
  },
  
  // Clear all data (for logout)
  clearData: () => {
    set({
      tasks: [],
      featuredTasks: [],
      quizzes: [],
      profile: null,
      tasksLastFetched: null,
      quizzesLastFetched: null,
      profileLastFetched: null,
      tasksError: null,
      quizzesError: null,
      profileError: null,
    });
  },
}));
