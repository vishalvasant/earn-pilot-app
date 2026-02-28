// Dashboard API integration for mobile app
import { api } from './api';
import { useDataStore } from '../stores/dataStore';

function isNetworkError(error: unknown): boolean {
  const err = error as { message?: string; code?: string };
  return err?.message === 'Network Error' || err?.code === 'ERR_NETWORK';
}

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

const fetchDashboardFromApi = async () => {
  const [walletResponse, activityResponse] = await Promise.all([
    api.get('/wallet/balance'),
    api.get('/wallet/activity?per_page=5'),
  ]);
  const walletData = walletResponse.data.data;
  const recentActivities = activityResponse.data.data;
  const dataStore = useDataStore.getState();
  const tasks = dataStore.tasks || [];
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
};

export const getDashboardDetails = async (): Promise<DashboardResponse> => {
  try {
    return await fetchDashboardFromApi();
  } catch (error) {
    if (isNetworkError(error)) {
      try {
        await new Promise((r) => setTimeout(r, 1500));
        return await fetchDashboardFromApi();
      } catch (retryError) {
        console.error('Error fetching dashboard data (retry failed):', retryError);
      }
    } else {
      console.error('Error fetching dashboard data:', error);
    }
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
