import { create } from 'zustand';

interface UserProfile {
  id?: number;
  name?: string;
  phone?: string;
  email?: string;
  age?: number;
  location?: string;
  referral_code?: string;
  points_balance?: string;
  total_earned?: string;
  status?: string;
}

interface UserState {
  profile: UserProfile | null;
  setProfile: (profile: UserState['profile']) => void;
  clearProfile: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  profile: null,
  setProfile: (profile) => set({ profile }),
  clearProfile: () => set({ profile: null }),
}));
