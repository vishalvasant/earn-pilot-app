import axios from 'axios';
import Constants from 'expo-constants';
import { useAuthStore } from '../stores/authStore';

const baseURL = (Constants.expoConfig?.extra as any)?.API_BASE_URL || 'http://127.0.0.1:8000';

console.log('🔗 API Base URL:', baseURL);

export const api = axios.create({ baseURL: `${baseURL}/api` });

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  console.log('📤 API Request:', config.method?.toUpperCase(), config.url);
  return config;
});

api.interceptors.response.use(
  (res) => {
    console.log('✅ API Response:', res.config.url, res.status);
    return res;
  },
  (err) => {
    console.log('❌ API Error:', err.config?.url, err.message);
    if (err.response) {
      console.log('Response data:', err.response.data);
      console.log('Response status:', err.response.status);
    } else if (err.request) {
      console.log('No response received. Network issue or CORS problem.');
      console.log('Request:', err.request);
    }
    return Promise.reject(err);
  },
);

// ==========================
// Authentication API Methods
// ==========================

export interface SendOtpResponse {
  success: boolean;
  message: string;
  otp?: string; // Present in development mode when SMS not configured
}

export interface VerifyOtpResponse {
  success: boolean;
  message: string;
  user: {
    id: number;
    name: string;
    phone: string;
    email?: string;
    age?: number;
    location?: string;
    referral_code: string;
    points_balance: string;
    total_earned: string;
    status: string;
  };
  token: string;
}

export interface VerifyOtpRequest {
  phone: string;
  otp: string;
  name?: string; // Required for new users
  referral_code?: string; // Optional referral code
}

/**
 * Send OTP to user's phone number
 */
export const sendOtp = async (phone: string): Promise<SendOtpResponse> => {
  const response = await api.post<SendOtpResponse>('/auth/send-otp', { phone });
  return response.data;
};

/**
 * Verify OTP and login/register user
 */
export const verifyOtp = async (data: VerifyOtpRequest): Promise<VerifyOtpResponse> => {
  const response = await api.post<VerifyOtpResponse>('/auth/verify-otp', data);
  return response.data;
};

/**
 * Get user profile
 */
export const getProfile = async () => {
  const response = await api.get('/profile');
  return response.data;
};

/**
 * Update user profile
 */
export const updateProfile = async (data: {
  name?: string;
  email?: string;
  age?: number;
  location?: string;
}) => {
  const response = await api.put('/profile', data);
  return response.data;
};

/**
 * Logout user
 */
export const logout = async () => {
  const response = await api.post('/logout');
  return response.data;
};
