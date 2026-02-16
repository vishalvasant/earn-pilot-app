import axios from 'axios';
import { Platform } from 'react-native';
import { useAuthStore } from '../stores/authStore';
import { APP_CONFIG } from '../config/app';

// Resolve base URL from config with sensible local defaults
const rawBaseURL = APP_CONFIG.API_BASE_URL;
let resolvedBaseURL = rawBaseURL;

// On Android emulator, localhost of the host machine is 10.0.2.2
if (Platform.OS === 'android') {
  if (rawBaseURL.includes('127.0.0.1')) {
    resolvedBaseURL = rawBaseURL.replace('127.0.0.1', '10.0.2.2');
  } else if (rawBaseURL.includes('localhost')) {
    resolvedBaseURL = rawBaseURL.replace('localhost', '10.0.2.2');
  }
}

console.log('🔗 API Base URL:', resolvedBaseURL);

export const api = axios.create({ baseURL: `${resolvedBaseURL}/api` });

/** Base URL for assets (icons, storage) – same host as API, no /api suffix */
export const getAssetBaseUrl = (): string => resolvedBaseURL;

api.interceptors.request.use(async (config) => {
  const token = useAuthStore.getState().token;
  if (token) {
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
  // Clean the data to remove empty strings, null, and undefined values
  const cleanData = Object.fromEntries(
    Object.entries(data).filter(([_, value]) => {
      // Remove undefined, null, and empty strings
      return value !== undefined && value !== null && value !== '';
    }).map(([key, value]) => {
      // Ensure strings are trimmed
      if (typeof value === 'string') {
        return [key, value.trim()];
      }
      return [key, value];
    })
  );
  
  console.log('📤 Sending profile update request with data:', cleanData);
  const response = await api.put('/profile', cleanData);
  console.log('📥 Profile update response:', response.data);
  return response.data;
};

/**
 * Logout user
 */
export const logout = async () => {
  const response = await api.post('/logout');
  return response.data;
};

/**
 * Submit referral code (optional; for new Google users). Requires auth.
 */
export const submitReferralCode = async (referralCode?: string) => {
  const response = await api.post<{ success: boolean; message: string; user: any }>(
    '/auth/referral-code',
    referralCode != null && referralCode.trim() !== '' ? { referral_code: referralCode.trim() } : {}
  );
  return response.data;
};
