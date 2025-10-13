import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  bootstrapped: boolean;
  bootstrap: () => Promise<void>;
  setAuth: (payload: { token: string | null }) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  isAuthenticated: false,
  bootstrapped: false,
  bootstrap: async () => {
    const token = await AsyncStorage.getItem('auth_token');
    set({ token, isAuthenticated: !!token, bootstrapped: true });
  },
  setAuth: async ({ token }) => {
    if (token) await AsyncStorage.setItem('auth_token', token);
    set({ token, isAuthenticated: !!token });
  },
  logout: async () => {
    await AsyncStorage.removeItem('auth_token');
    set({ token: null, isAuthenticated: false });
  },
}));
