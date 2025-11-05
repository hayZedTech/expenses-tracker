// src/stores/useAuthStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type User = { email: string; fullname?: string } | null;

type AuthState = {
  user: User;
  setUser: (user: User) => void;
  clearUser: () => void;
};

export const useAuthStore = create<AuthState>()(
  // <-- give persist the AuthState generic so TS won't infer `never`
  persist<AuthState>(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      clearUser: () => set({ user: null }),
    }),
    {
      name: 'auth-storage', // localStorage key
      // partialize: (state) => ({ user: state.user }), // persist only the user
    }
  )
);
