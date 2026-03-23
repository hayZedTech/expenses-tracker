// src/pages/ResetPassword.tsx
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

export default function ResetPassword() {
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // 1. Check if Supabase already established a session from the URL tokens
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        console.log("✅ Session already active");
        setRecoveryReady(true);
        // Clean up URL to remove # and tokens
        window.history.replaceState(null, "", window.location.pathname);
      }
    };

    checkSession();

    // 2. Listener for real-time recovery events
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") && session) {
        console.log("✅ Recovery event triggered");
        setRecoveryReady(true);
      }
    });

    // 3. Manual fallback for the hash (Implicit Flow)
    const checkTokenInUrl = async () => {
      const hash = window.location.hash;
      if (hash.includes("access_token")) {
        const params = new URLSearchParams(hash.replace("#", "&"));
        const access_token = params.get("access_token");
        const refresh_token = params.get("refresh_token");
        if (access_token) {
          await supabase.auth.setSession({ access_token, refresh_token: refresh_token || "" });
          setRecoveryReady(true);
          // Removes the '#' entirely by replacing with just the path
          window.history.replaceState(null, "", window.location.pathname);
        }
      }
    };
    
    checkTokenInUrl();

    return () => listener.subscription.unsubscribe();
  }, []);

  async function handleUpdatePassword() {
    if (!newPassword) {
      return Swal.fire("Error", "Please enter a new password", "error");
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      await Swal.fire("Success", "Password updated. You can now log in.", "success");
      // Explicitly sign out to clear the recovery session before going to login
      await supabase.auth.signOut();
      navigate("/");
    } catch (err: any) {
      Swal.fire("Error", err.message || "Failed to update password", "error");
    } finally {
      setLoading(false);
    }
  }

  if (!recoveryReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-center text-gray-600 font-medium">
          Preparing password reset... <br />
          <span className="text-sm font-normal text-gray-400">Please open the link from your email again if this persists.</span>
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 px-4">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-sm">
        <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">Reset Password</h2>

        <div className="relative mb-4">
          <input
            type={showPassword ? "text" : "password"}
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
            {showPassword ? "🙈" : "👁️"}
          </button>
        </div>

        <button
          onClick={handleUpdatePassword}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 font-semibold w-full transition-colors disabled:bg-gray-400"
        >
          {loading ? "Updating..." : "Update Password"}
        </button>
      </div>
    </div>
  );
}