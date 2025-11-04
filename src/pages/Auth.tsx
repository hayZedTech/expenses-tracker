import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
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
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [message, setMessage] = useState('');
  const [isResetMode, setIsResetMode] = useState(false);

  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);

  // Detect if user is coming from a Supabase password reset link
  useEffect(() => {
    const hash = window.location.hash; // #access_token=...&type=recovery&email=...
    if (!hash) return;

    const params = new URLSearchParams(hash.replace('#', '?'));
    const type = params.get('type');
    const emailFromLink = params.get('email');

    if (type === 'recovery' && emailFromLink) {
      setIsResetMode(true);
      setEmail(emailFromLink);

      // Clean URL hash so it doesn't stay in browser
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  function isDuplicateEmailError(err: any) {
    const msg = (
      err?.message ||
      err?.error_description ||
      err?.details ||
      err?.hint ||
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
      if (isResetMode) {
        // Reset password
        const { error } = await supabase.auth.updateUser({ password: newPassword });

        if (error) throw error;

        await Swal.fire({
          icon: 'success',
          title: 'Password Updated',
          text: 'Your password has been updated. You can now log in.',
        });

        setIsResetMode(false);
        setPassword('');
        setNewPassword('');
        setIsLogin(true);
        return;
      }

      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

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
        const { error, data: signUpData } = await supabase.auth.signUp({ email, password });
        if (error) throw error;

        if (signUpData?.user) {
          const { error: upsertError } = await supabase
            .from('expenses_profiles')
            .upsert({ id: signUpData.user.id, fullname, email });
          if (upsertError) throw upsertError;
        }

        setUser({ email, fullname } as User);
        await Swal.fire({
          icon: 'success',
          title: 'Account created',
          text: 'Check your email to confirm (if required).',
          timer: 1800,
          showConfirmButton: false,
        });
        navigate('/dashboard');
      }
    } catch (err: any) {
      const raw = err?.message || err?.error || err?.detail || err?.hint || JSON.stringify(err);
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

    const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
      redirectTo: `${window.location.origin}/auth`,
    });

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
          {isResetMode ? 'Reset Password' : isLogin ? 'Login' : 'Sign Up'}
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {!isLogin && !isResetMode && (
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
            disabled={isResetMode}
          />

          {isResetMode ? (
            <input
              type="password"
              placeholder="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          ) : (
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}

          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 font-semibold transition-colors disabled:bg-gray-400 cursor-pointer"
          >
            {loading
              ? 'Processing...'
              : isResetMode
              ? 'Update Password'
              : isLogin
              ? 'Login'
              : 'Sign Up'}
          </button>
        </form>

        {!isResetMode && isLogin && (
          <p
            className="text-sm text-right mt-1 text-blue-600 hover:underline cursor-pointer"
            onClick={handleForgotPassword}
          >
            Forgot Password?
          </p>
        )}

        {!isResetMode && (
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
        )}

        {message && (
          <p className={`mt-4 text-center ${message.includes('❌') ? 'text-red-500' : 'text-green-600'}`}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
