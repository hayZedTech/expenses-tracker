// src/pages/Auth.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuthStore } from '../contexts/useAuthStore';
import Swal from 'sweetalert2';

interface User {
  email: string;
  fullname?: string;
}

export default function Auth() {
  const [fullname, setFullname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [message, setMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);

  function isDuplicateEmailError(err: unknown) {
    const msg = (
      (err as any)?.message ||
      (err as any)?.error_description ||
      (err as any)?.details ||
      (err as any)?.hint ||
      JSON.stringify(err)
    )
      .toString()
      .toLowerCase();
    return (
      msg.includes('already') ||
      msg.includes('duplicate') ||
      msg.includes('user already') ||
      msg.includes('already registered') ||
      msg.includes('unique')
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        // ✅ Check if email is confirmed
        if (!data.user?.email_confirmed_at) {
          await Swal.fire({
            icon: 'warning',
            title: 'Email not confirmed',
            text: 'Please check your email and confirm before logging in.',
          });
          return;
        }

        setUser({ email } as User);
        await Swal.fire({
          icon: 'success',
          title: 'Logged in',
          text: 'Welcome back!',
          timer: 1200,
          showConfirmButton: false,
        });
        navigate('/dashboard');
      } else {
        const { data: signUpData, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;

        if (signUpData?.user) {
          const { error: upsertError } = await supabase
            .from('expenses_profiles')
            .upsert({ id: signUpData.user.id, fullname, email });
          if (upsertError) throw upsertError;
        }

        await Swal.fire({
          icon: 'success',
          title: 'Account created',
          text: 'Check your email to confirm before logging in.',
          timer: 1800,
          showConfirmButton: false,
        });

        // Don't auto-login, just show message
        setEmail('');
        setPassword('');
        setFullname('');
        setIsLogin(true);
      }
    } catch (err: unknown) {
      const raw =
        (err as any)?.message ||
        (err as any)?.error ||
        (err as any)?.detail ||
        (err as any)?.hint ||
        JSON.stringify(err);
      const msg = (raw || 'An error occurred').toString();

      if (!isLogin && isDuplicateEmailError(err)) {
        await Swal.fire({
          icon: 'error',
          title: 'Email already exists',
          text: 'That email is already registered. Try logging in or use a different email.',
        });
        setMessage('❌ Email already in use');
      } else {
        await Swal.fire({ icon: 'error', title: 'Error', text: msg });
        setMessage(`❌ ${msg}`);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    const { value: userEmail } = await Swal.fire({
      title: 'Enter your email',
      input: 'email',
      inputLabel: 'Email for password reset',
      inputPlaceholder: 'Enter your email',
      showCancelButton: true,
    });

    if (!userEmail) return;

    const redirectTo = `${window.location.origin}/reset-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(userEmail, { redirectTo });
    if (error) {
      await Swal.fire({ icon: 'error', title: 'Error', text: error.message });
    } else {
      await Swal.fire({
        icon: 'success',
        title: 'Check your email',
        text: 'A password reset link has been sent to your email.',
      });
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-linear-to-br from-gray-100 to-gray-300 px-4">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-sm">
        <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">
          {isLogin ? 'Login' : 'Sign Up'}
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {!isLogin && (
            <input
              type="text"
              placeholder="Full Name"
              value={fullname}
              onChange={(e) => setFullname(e.target.value)}
              required
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
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
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 font-semibold transition-colors disabled:bg-gray-400 cursor-pointer"
          >
            {loading ? 'Processing...' : isLogin ? 'Login' : 'Sign Up'}
          </button>
        </form>

        {isLogin && (
          <p
            className="text-sm text-right mt-1 text-blue-600 hover:underline cursor-pointer"
            onClick={handleForgotPassword}
          >
            Forgot Password?
          </p>
        )}

        <p className="text-center mt-4 text-gray-700">
          {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
          <span
            className="text-blue-600 hover:underline cursor-pointer"
            onClick={() => {
              setIsLogin(!isLogin);
              setMessage('');
            }}
          >
            {isLogin ? 'Sign Up' : 'Login'}
          </span>
        </p>

        {message && (
          <p className={`mt-4 text-center ${message.includes('❌') ? 'text-red-500' : 'text-green-600'}`}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
