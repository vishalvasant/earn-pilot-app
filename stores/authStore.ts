import { create } from 'zustand';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import '@react-native-firebase/app'; // Import app first to ensure initialization
import auth from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { APP_CONFIG } from '../config/app';
import { useDataStore } from './dataStore';
import { useUserStore } from './userStore';

interface User {
  id: number;
  name: string;
  email?: string | null;
  profile_picture?: string | null;
  google_id?: string;
  phone?: string;
  referral_code?: string;
  points_balance?: string;
  total_earned?: string;
  status?: string;
  age?: number;
  location?: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  /** True when user just signed up (not in DB before) and must see referral code screen before home. Not persisted. */
  isNewUserPendingReferral: boolean;
  bootstrapped: boolean;
  isLoading: boolean;
  error: string | null;
  
  bootstrap: () => Promise<void>;
  restoreToken: () => Promise<void>;
  setAuth: (payload: { token: string; user: User }) => Promise<void>;
  googleSignIn: () => Promise<{ is_new_user: boolean; user: User; token: string } | void>;
  emailSignIn: (email: string, password: string) => Promise<{ is_new_user: boolean; user: User; token: string } | void>;
  clearNewUserPendingReferral: () => void;
  logout: () => Promise<void>;
  /** Called on 401 – clears local auth only (no API call). Navigator will redirect to login. */
  clearAuthFor401: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  isAuthenticated: false,
  isNewUserPendingReferral: false,
  bootstrapped: false,
  isLoading: false,
  error: null,

  bootstrap: async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const userStr = await AsyncStorage.getItem('user_data');
      const user = userStr ? JSON.parse(userStr) : null;
      
      set({ 
        token, 
        user,
        isAuthenticated: !!token && !!user, 
        bootstrapped: true 
      });
    } catch (error) {
      console.error('Error bootstrapping auth:', error);
      set({ bootstrapped: true });
    }
  },

  restoreToken: async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const userStr = await AsyncStorage.getItem('user_data');
      const user = userStr ? JSON.parse(userStr) : null;
      
      set({ 
        token, 
        user,
        isAuthenticated: !!token && !!user, 
        bootstrapped: true 
      });
    } catch (error) {
      console.error('Error restoring token:', error);
      set({ bootstrapped: true });
    }
  },

  setAuth: async ({ token, user }) => {
    try {
      if (token) {
        await AsyncStorage.setItem('auth_token', token);
        await AsyncStorage.setItem('user_data', JSON.stringify(user));
      }
      set({ token, user, isAuthenticated: true, error: null });
    } catch (error) {
      console.error('Error setting auth:', error);
      set({ error: 'Failed to save authentication data' });
    }
  },

  googleSignIn: async () => {
    set({ isLoading: true, error: null });
    try {
      // Ensure GoogleSignin is configured before use
      GoogleSignin.configure({
        webClientId: APP_CONFIG.GOOGLE_WEB_CLIENT_ID,
        offlineAccess: true,
        forceCodeForRefreshToken: true,
        scopes: ['profile', 'email'],
      });
      console.log('GoogleSignin reconfigured for authentication');
      
      // Check Play Services
      await GoogleSignin.hasPlayServices();
      console.log('Play Services available');
      
      // Get Google user data
      const userInfo = await GoogleSignin.signIn();
      console.log('Google Sign-In result:', JSON.stringify(userInfo, null, 2));

      // Extract ID token from the correct location
      // GoogleSignin.signIn() returns: { idToken, user: {...} } or { data: { idToken, user: {...} } }
      // Type definitions may omit idToken; use fallback chain for runtime shape
      const idToken = (userInfo as any).idToken ?? (userInfo as any).data?.idToken;
      
      if (!idToken) {
        console.error('No idToken found in response. Full response:', JSON.stringify(userInfo, null, 2));
        console.error('Response keys:', Object.keys(userInfo));
        throw new Error('No ID token received from Google. Please try again.');
      }
      
      console.log('ID Token extracted successfully, length:', idToken.length);

      // Create Firebase credential and sign in
      console.log('Creating Firebase credential...');
      const credential = auth.GoogleAuthProvider.credential(idToken);
      console.log('Firebase credential created');
      
      console.log('Attempting Firebase sign in with credential...');
      const userCredential = await auth().signInWithCredential(credential);
      console.log('Firebase authentication successful:', userCredential.user.uid);
      
      console.log('Getting Firebase token...');
      const firebaseToken = await userCredential.user.getIdToken();
      console.log('Firebase token obtained, length:', firebaseToken.length);

      // Send to backend for validation
      console.log('Calling backend API:', `${APP_CONFIG.API_BASE_URL}/api/auth/google-signin`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      try {
        const response = await fetch(
          `${APP_CONFIG.API_BASE_URL}/api/auth/google-signin`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify({
              firebase_token: firebaseToken,
              app_identifier: APP_CONFIG.APP_IDENTIFIER,
              fcm_token: '',
              device_type: 'Android',
            }),
            signal: controller.signal,
          }
        );
        
        clearTimeout(timeoutId);
        console.log('Backend response status:', response.status);

        // Parse response as JSON (backend always returns JSON)
        let data;
        try {
          data = await response.json();
          console.log('Backend response data:', JSON.stringify(data, null, 2));
        } catch (parseError: any) {
          console.error('Failed to parse JSON response:', parseError);
          // If JSON parsing fails, the response might be an error page
          throw new Error(`Server returned invalid response (${response.status}). Please try again.`);
        }

        if (!response.ok) {
          // Extract error message from backend response
          const errorMessage = data?.message || data?.error || `Authentication failed: ${response.status}`;
          console.error('Backend authentication error:', errorMessage);
          throw new Error(errorMessage);
        }

        // Backend returns: { success: true, user: {...}, token: "...", is_new_user?: boolean }
        if (data.success && data.user && data.token) {
          const isNewUser = !!data.is_new_user;
          console.log('Auth response: is_new_user =', data.is_new_user, '→ show referral screen =', isNewUser);
          // Persist and set auth + referral flag in one update so RootStack never shows MainApp first for new users
          await AsyncStorage.setItem('auth_token', data.token);
          await AsyncStorage.setItem('user_data', JSON.stringify(data.user));
          set({
            token: data.token,
            user: data.user,
            isAuthenticated: true,
            isNewUserPendingReferral: isNewUser,
            isLoading: false,
            error: null,
          });
          console.log('Authentication completed successfully', isNewUser ? '(new user → referral screen)' : '');
          return { is_new_user: isNewUser, user: data.user, token: data.token };
        } else {
          console.error('Invalid response structure:', data);
          throw new Error(data?.message || 'Login failed: Invalid response from server');
        }
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          throw new Error('Network timeout - please check your internet connection');
        }
        if (fetchError.message.includes('Network request failed') || fetchError.message.includes('Failed to fetch')) {
          throw new Error('Cannot connect to server. Please check your internet connection and ensure the server is running.');
        }
        // Re-throw the error with its message
        throw fetchError;
      }
    } catch (error: any) {
      console.error('Google Sign-In error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      set({ 
        error: error.message || 'Failed to sign in with Google',
        isLoading: false 
      });
      throw error;
    }
  },

  emailSignIn: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    const deviceType = Platform.OS === 'ios' ? 'iOS' : 'Android';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetch(
        `${APP_CONFIG.API_BASE_URL}/api/auth/login`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({
            email: email.trim(),
            password,
            app_identifier: APP_CONFIG.APP_IDENTIFIER,
            fcm_token: '',
            device_type: deviceType,
          }),
          signal: controller.signal,
        }
      );
      clearTimeout(timeoutId);
      let data: any;
      try {
        data = await response.json();
      } catch {
        throw new Error(`Server returned invalid response (${response.status}). Please try again.`);
      }
      if (!response.ok) {
        const msg = data?.message || data?.errors?.email?.[0] || data?.error || `Login failed: ${response.status}`;
        throw new Error(msg);
      }
      if (data.success && data.user && data.token) {
        const isNewUser = !!data.is_new_user;
        await AsyncStorage.setItem('auth_token', data.token);
        await AsyncStorage.setItem('user_data', JSON.stringify(data.user));
        set({
          token: data.token,
          user: data.user,
          isAuthenticated: true,
          isNewUserPendingReferral: isNewUser,
          isLoading: false,
          error: null,
        });
        return { is_new_user: isNewUser, user: data.user, token: data.token };
      }
      throw new Error(data?.message || 'Login failed: Invalid response from server');
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error('Network timeout - please check your internet connection');
      }
      if (err.message?.includes('Network request failed') || err.message?.includes('Failed to fetch')) {
        throw new Error('Cannot connect to server. Please check your internet connection.');
      }
      set({ error: err.message || 'Sign in failed', isLoading: false });
      throw err;
    }
  },

  clearNewUserPendingReferral: () => {
    set({ isNewUserPendingReferral: false });
  },

  logout: async () => {
    try {
      const token = get().token;
      const user = get().user;
      if (token) {
        try {
          const { cleanupDeviceToken } = await import('../services/fcm');
          await cleanupDeviceToken(token);
        } catch (_e) { /* ignore */ }
        try {
          const { logout: apiLogout } = await import('../services/api');
          await apiLogout();
        } catch (_e) { /* ignore */ }
      }
      if (user?.google_id) {
        try {
          await GoogleSignin.signOut();
          await auth().signOut();
        } catch (_e) { /* ignore */ }
      }
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('user_data');
      set({ token: null, user: null, isAuthenticated: false, isNewUserPendingReferral: false });
      useDataStore.getState().clearData();
      useUserStore.getState().clearProfile();
      console.log('✅ Logout complete');
    } catch (error) {
      console.error('Logout error:', error);
    }
  },

  clearAuthFor401: async () => {
    try {
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('user_data');
      set({ token: null, user: null, isAuthenticated: false, isNewUserPendingReferral: false });
      useDataStore.getState().clearData();
      useUserStore.getState().clearProfile();
    } catch (e) {
      console.error('clearAuthFor401 error:', e);
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));
