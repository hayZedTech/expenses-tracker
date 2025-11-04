// src/pages/ResetPassword.tsx
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

export default function ResetPassword() {
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [recoveryToken, setRecoveryToken] = useState('');
  const [showPassword, setShowPassword] = useState(false); // <-- password eye

  // Grab access_token from URL (hash or query)
  useEffect(() => {
    let token = '';

    // First check query string
    const queryToken = new URLSearchParams(window.location.search).get('access_token');
    if (queryToken) token = queryToken;

    // Then check hash (Supabase uses hash in many cases)
    if (!token && window.location.hash) {
      const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
      const hashParams = new URLSearchParams(hash.replace('#', '&'));
      token = hashParams.get('access_token') || '';
    }

    if (token) {
      setRecoveryToken(token);
      // set session immediately
      supabase.auth.setSession({ access_token: token, refresh_token: '' }).catch(console.error);

      // Clean URL
      window.history.replaceState(null, '', '/reset-password');
    }
  }, []);

  async function handleUpdatePassword() {
    if (!newPassword) return Swal.fire('Error', 'Please enter a new password', 'error');
    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      await Swal.fire('Success', 'Password updated. You can now log in.', 'success');
      navigate('/'); // back to login
    } catch (err: any) {
      Swal.fire('Error', err.message || 'Failed to update password', 'error');
    } finally {
      setLoading(false);
    }
  }

  if (!recoveryToken) {
    return <p className="text-center mt-20">No recovery token found. Check your email link.</p>;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 px-4">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-sm">
        <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">Reset Password</h2>

        {/* Password field with eye */}
        <div className="relative mb-4">
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="New Password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-2 text-gray-500 hover:text-gray-700 cursor-pointer"
          >
            {showPassword ? '🙈' : '👁️'}
          </button>
        </div>

        <button
          onClick={handleUpdatePassword}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 font-semibold w-full"
        >
          {loading ? 'Updating...' : 'Update Password'}
        </button>
      </div>
    </div>
  );
}
