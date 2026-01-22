// Dashboard API integration for mobile app
import { api } from './api';
import { useDataStore } from '../stores/dataStore';

export interface DashboardData {
  balance: number;
  energy_points: number;
  pending_amount: number;
  total_withdrawn: number;
  total_earned: number;
  lifetime_points: number;
  pending_tasks: number;
  completed_tasks: number;
  recent_activities: Array<{
    id: string;
    type: 'credit' | 'withdrawal';
    category: string;
    amount: number;
    description: string;
    date: string;
    time: string;
    status: string;
  }>;
}

export interface DashboardResponse {
  success: boolean;
  data: DashboardData;
}

export const getDashboardDetails = async (): Promise<DashboardResponse> => {
  try {
    // Try to get tasks from store first (to avoid duplicate API call)
    const dataStore = useDataStore.getState();
    let tasks = dataStore.tasks;
    
    // If tasks are not in store or stale, fetch them
    if (tasks.length === 0) {
      try {
        await dataStore.fetchTasks();
        tasks = useDataStore.getState().tasks;
      } catch (error) {
        console.warn('Failed to fetch tasks from store, fetching directly:', error);
        // Fallback to direct API call
        const tasksResponse = await api.get('/tasks');
        tasks = tasksResponse.data.data || [];
      }
    }
    
    // Fetch wallet balance and stats (primary data source) in parallel with activity
    const [walletResponse, activityResponse] = await Promise.all([
      api.get('/wallet/balance'),
      api.get('/wallet/activity?per_page=5'),
    ]);
    
    const walletData = walletResponse.data.data;
    const recentActivities = activityResponse.data.data;
    
    const pendingTasks = tasks.filter((task: any) => task.status === 'available' && !task.disabled).length;
    const completedTasks = tasks.filter((task: any) => task.status === 'completed').length;

    return {
      success: true,
      data: {
        balance: walletData.balance,
        energy_points: walletData.energy_points,
        pending_amount: walletData.pending_amount,
        total_withdrawn: walletData.total_withdrawn,
        total_earned: walletData.total_earned,
        lifetime_points: walletData.lifetime_points,
        pending_tasks: pendingTasks,
        completed_tasks: completedTasks,
        recent_activities: recentActivities,
      },
    };
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    // Fallback to profile endpoint if wallet endpoint fails
    try {
      const profileResponse = await api.get('/profile');
      const user = profileResponse.data.user;
      
      return {
        success: true,
        data: {
          balance: parseFloat(user.points_balance || '0'),
          energy_points: parseFloat(user.energy_points || '0'),
          pending_amount: 0,
          total_withdrawn: 0,
          total_earned: parseFloat(user.total_earned || '0'),
          lifetime_points: parseFloat(user.total_earned || '0'),
          pending_tasks: 0,
          completed_tasks: 0,
          recent_activities: [],
        },
      };
    } catch (fallbackError) {
      console.error('Error fetching profile fallback:', fallbackError);
      throw fallbackError;
    }
  }
};
