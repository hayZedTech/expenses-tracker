// src/App.tsx
import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import type { ReactElement } from 'react';
import { supabase } from './lib/supabaseClient';
import { useAuthStore } from './contexts/useAuthStore'; 
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import ResetPassword from './pages/ResetPassword';
import Admin from './pages/Admin';
import ToDoList from './pages/TodoList';

function ProtectedRoute({ children }: { children: ReactElement }) {
  const { user } = useAuthStore();

  // If user is not logged in, redirect to Auth
  if (!user) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default function App() {
  const setUser = useAuthStore((state) => state.setUser);
  const clearUser = useAuthStore((state) => state.clearUser);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    // 1. Check for an active session on mount to sync the persistent store
    const initSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser({ email: session.user.email!, fullname: session.user.user_metadata?.fullname });
      } else {
        clearUser();
      }
      setInitializing(false);
    };

    initSession();

    // 2. Listen for auth changes (Login, Logout, Password Recovery)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setUser({ email: session.user.email!, fullname: session.user.user_metadata?.fullname });
      } else {
        clearUser();
      }
    });

    return () => subscription.unsubscribe();
  }, [setUser, clearUser]);

  // Prevent routing before we know the actual auth state
  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-gray-500 font-medium">Loading session...</p>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Auth />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Protected routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      {/* ✅ To-Do List route (protected like dashboard) */}
      <Route
        path="/todos"
        element={
          <ProtectedRoute>
            <ToDoList />
          </ProtectedRoute>
        }
      />

      {/* ✅ Admin route (not protected by user auth) */}
      <Route path="/admin" element={<Admin />} />
    </Routes>
  );
}