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

// console.log('🔗 API Base URL:', resolvedBaseURL);

export const api = axios.create({ baseURL: `${resolvedBaseURL}/api` });

/** Base URL for assets (icons, storage) – same host as API, no /api suffix */
export const getAssetBaseUrl = (): string => resolvedBaseURL;

api.interceptors.request.use(async (config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // console.log('📤 API Request:', config.method?.toUpperCase(), config.url);
  return config;
});

api.interceptors.response.use(
  (res) => {
    // console.log('✅ API Response:', res.config.url, res.status);
    return res;
  },
  (err) => {
    // On 401, clear auth so app redirects to login
    if (err.response?.status === 401) {
      const { useAuthStore } = require('../stores/authStore');
      useAuthStore.getState().clearAuthFor401?.();
    }
    return Promise.reject(err);
  },
);

// ==========================
// Authentication API Methods
// ==========================

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
  
  // console.log('📤 Sending profile update request with data:', cleanData);
  const response = await api.put('/profile', cleanData);
  // console.log('📥 Profile update response:', response.data);
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
