import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type AuthState = {
  user: { email: string; fullname?: string } | null;
  setUser: (user: { email: string; fullname?: string } | null) => void;
  clearUser: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      clearUser: () => set({ user: null }),
    }),
    {
      name: 'auth-storage', // Key used in localStorage
    }
  )
);
