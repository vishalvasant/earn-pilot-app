// Dashboard API integration for mobile app
import { api } from './api';

export interface DashboardResponse {
  success: boolean;
  data: {
    points_balance: string;
    energy_points: string;
    total_earned: string;
    referral_code: string;
    status: string;
    last_active_at: string;
    created_at: string;
    // Add more fields as needed from backend response
  };
}

export const getDashboardDetails = async (): Promise<DashboardResponse> => {
  // If backend exposes a dashboard endpoint, update the path below
  const response = await api.get('/profile'); // fallback to profile for now
  const data = response.data;
  return {
    success: data.success,
    data: {
      points_balance: data.user.points_balance,
      energy_points: data.user.energy_points,
      total_earned: data.user.total_earned,
      referral_code: data.user.referral_code,
      status: data.user.status,
      last_active_at: data.user.last_active_at,
      created_at: data.user.created_at,
      // Add more fields if available
    },
  };
};
