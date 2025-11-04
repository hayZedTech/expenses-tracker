import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import Swal from 'sweetalert2';

export default function ResetPassword() {
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const accessToken = searchParams.get('access_token'); // Supabase sends this in the link

  useEffect(() => {
    if (!accessToken) {
      Swal.fire({
        icon: 'error',
        title: 'Invalid link',
        text: 'Password reset link is invalid or expired.',
      }).then(() => navigate('/auth'));
    }
  }, [accessToken, navigate]);

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!newPassword) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      await Swal.fire({
        icon: 'success',
        title: 'Password Reset',
        text: 'Your password has been updated successfully!',
      });

      navigate('/auth');
    } catch (err: any) {
      const msg = (err?.message || 'Failed to reset password').toString();
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: msg,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-sm">
        <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">Reset Password</h2>
        <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
          <input
            type="password"
            placeholder="New Password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 font-semibold transition-colors disabled:bg-gray-400 cursor-pointer"
          >
            {loading ? 'Processing...' : 'Reset Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
