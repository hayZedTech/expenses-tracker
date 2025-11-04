// src/App.tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import type { ReactElement } from 'react';
import { useAuthStore } from './contexts/useAuthStore';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import ResetPassword from './pages/ResetPassword';

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
      <Route path="/" element={<Auth />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route path="/reset-password" element={<ResetPassword />} />
    </Routes>
  );
}
