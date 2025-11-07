// src/App.tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import type { ReactElement } from 'react';
import { useAuthStore } from './contexts/useAuthStore';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import ResetPassword from './pages/ResetPassword';
import Admin from './pages/Admin';
import ToDoList from './pages/TodoList'; // ✅ Added this import

function ProtectedRoute({ children }: { children: ReactElement }) {
  const { user } = useAuthStore();

  // If user is not logged in, redirect to Auth
  if (!user) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default function App() {
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
