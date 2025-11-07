// Dashboard API integration for mobile app
import { api } from './api';

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
    // Fetch wallet balance and stats (primary data source)
    const walletResponse = await api.get('/wallet/balance');
    const walletData = walletResponse.data.data;

    // Fetch recent activity for dashboard
    const activityResponse = await api.get('/wallet/activity?per_page=5');
    const recentActivities = activityResponse.data.data;

    // Fetch tasks to get pending/completed counts
    const tasksResponse = await api.get('/tasks');
    const tasks = tasksResponse.data.data;
    
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
