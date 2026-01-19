import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import '@react-native-firebase/app'; // Import app first to ensure initialization
import auth from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { APP_CONFIG } from '../config/app';

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
  bootstrapped: boolean;
  isLoading: boolean;
  error: string | null;
  
  bootstrap: () => Promise<void>;
  restoreToken: () => Promise<void>;
  setAuth: (payload: { token: string; user: User }) => Promise<void>;
  googleSignIn: () => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  isAuthenticated: false,
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
      const idToken = userInfo.data?.idToken || userInfo.idToken;
      
      if (!idToken) {
        console.error('No idToken found in response:', JSON.stringify(userInfo, null, 2));
        throw new Error('No ID token received from Google');
      }
      
      console.log('ID Token extracted successfully');

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
        const responseText = await response.text();
        console.log('Backend response:', responseText);

        if (!response.ok) {
          let errorData;
          try {
            errorData = JSON.parse(responseText);
          } catch {
            errorData = { message: `HTTP ${response.status}: ${responseText}` };
          }
          throw new Error(errorData.message || `Authentication failed: ${response.status}`);
        }

        const data = JSON.parse(responseText);
        console.log('Backend data:', data);

        if (data.success && data.data) {
          await get().setAuth({
            token: data.data.token,
            user: data.data.user,
          });
          console.log('Authentication completed successfully');
          set({ isLoading: false });
        } else {
          throw new Error('Login failed: Invalid response from server');
        }
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          throw new Error('Network timeout - please check your internet connection');
        }
        if (fetchError.message.includes('Network request failed')) {
          throw new Error('Cannot connect to server. Please make sure the backend server is running.');
        }
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

  logout: async () => {
    try {
      await GoogleSignin.signOut();
      await auth().signOut();
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('user_data');
      set({ token: null, user: null, isAuthenticated: false });
    } catch (error) {
      console.error('Logout error:', error);
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));
