import { create } from 'zustand';

interface UserState {
  profile: { name?: string; age?: number; location?: string } | null;
  setProfile: (profile: UserState['profile']) => void;
}

export const useUserStore = create<UserState>((set) => ({
  profile: null,
  setProfile: (profile) => set({ profile }),
}));
