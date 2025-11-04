import { create } from 'zustand';

type AuthState = {
  user: { email: string; fullname?: string } | null;
  setUser: (user: { email: string; fullname?: string } | null) => void;
  clearUser: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  clearUser: () => set({ user: null }),
}));
