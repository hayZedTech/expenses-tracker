import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type User = {
  email: string;
  fullname?: string;
};

type AuthState = {
  user: User | null;
  setUser: (user: User | null) => void;
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
      name: 'auth-storage', // localStorage key
      
    }
  )
);
