// src/pages/Admin.tsx
import { useEffect, useState, useCallback } from "react";
import Swal from "sweetalert2";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";

interface UserProfile {
  id: string;
  email: string;
  fullname?: string;
  created_at?: string;
  email_confirmed_at?: string;
}

export default function Admin() {
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const ADMIN_EMAILS = [import.meta.env.VITE_ADMIN_EMAIL];

  // Detect base URL for Supabase Functions (local or deployed)
 // src/lib/functions.ts
   const FUNCTIONS_BASE_URL =
  import.meta.env.VITE_SUPABASE_FUNCTIONS_URL ||
  (window.location.hostname === "localhost"
    ? "http://localhost:8000" // local dev server for Supabase functions
    : `${window.location.origin}/api`); // Vercel deployed functions
 



  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${FUNCTIONS_BASE_URL}/list-users`);
      const data = await res.json();

      if (!data.success) throw new Error(data.error || "Failed to fetch users");

      const sortedUsers = (data.users || []).sort((a: any, b: any) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      });

      setUsers(sortedUsers);
    } catch (err: any) {
      Swal.fire("Error", err.message || "Failed to load users", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const checkAdminSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user?.email && ADMIN_EMAILS.includes(session.user.email)) {
        if (!session.user.email_confirmed_at) {
          await supabase.auth.signOut();
          setIsLoggedIn(false);
          return;
        }
        setAdminEmail(session.user.email);
        setIsLoggedIn(true);
        fetchUsers();
      } else {
        setIsLoggedIn(false);
      }
    };

    checkAdminSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
        setIsLoggedIn(false);
        setUsers([]);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, [fetchUsers]);

  async function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { error, data } = await supabase.auth.signInWithPassword({
        email: adminEmail,
        password: adminPassword,
      });
      if (error) throw error;

      if (!data.user?.email_confirmed_at) {
        await Swal.fire(
          "Email not confirmed",
          "Please confirm your admin email before logging in.",
          "warning"
        );
        await supabase.auth.signOut();
        return;
      }

      if (!ADMIN_EMAILS.includes(adminEmail)) {
        await Swal.fire("Access Denied", "You are not authorized as admin.", "error");
        await supabase.auth.signOut();
        return;
      }

      setIsLoggedIn(true);
      fetchUsers();
    } catch (err: any) {
      Swal.fire("Login Failed", err.message, "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(user: UserProfile) {
    const confirm = await Swal.fire({
      title: "Delete user?",
      text: `Delete ${user.email}? This cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete",
    });
    if (!confirm.isConfirmed) return;

    try {
      setLoading(true);
      const res = await fetch(`${FUNCTIONS_BASE_URL}/delete-user`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user.id }),
      });
      const data = await res.json();

      if (!data.success) throw new Error(data.error || "Failed to delete user");

      Swal.fire("Deleted!", `${user.email} removed from Auth and table.`, "success");
      fetchUsers();
    } catch (err: any) {
      Swal.fire("Error", err.message || "Could not delete user", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setIsLoggedIn(false);
    setAdminEmail("");
    setAdminPassword("");
    setUsers([]);
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-gray-100 to-gray-300">
        <form onSubmit={handleAdminLogin} className="bg-white shadow-xl rounded-2xl p-8 w-full max-w-sm">
          <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">Admin Login</h2>
          <input
            type="email"
            placeholder="Admin Email"
            value={adminEmail}
            onChange={(e) => setAdminEmail(e.target.value)}
            required
            className="w-full mb-4 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <input
            type="password"
            placeholder="Password"
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
            required
            className="w-full mb-6 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium transition"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-200 p-6">
      <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-xl p-6">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
          <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
          <div className="flex gap-3">
            <button
              onClick={() => navigate("/dashboard")}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg transition"
            >
              ← Back
            </button>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition"
            >
              Logout
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : users.length === 0 ? (
          <p className="text-center text-gray-600 py-10">No users found.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg shadow">
            <table className="min-w-full border border-gray-200 divide-y divide-gray-200">
              <thead className="bg-blue-600 text-white">
                <tr>
                  <th className="py-3 px-2 sm:px-4 text-left text-sm sm:text-base">Full Name</th>
                  <th className="py-3 px-2 sm:px-4 text-left text-sm sm:text-base">Email</th>
                  <th className="py-3 px-2 sm:px-4 text-left text-sm sm:text-base">Created At</th>
                  <th className="py-3 px-2 sm:px-4 text-center text-sm sm:text-base">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user, index) => (
                  <tr
                    key={user.id}
                    className={`${index % 2 === 0 ? "bg-gray-50" : "bg-white"} hover:bg-blue-50 transition`}
                  >
                    <td className="py-2 px-2 sm:px-4 text-sm sm:text-base">{user.fullname || "-"}</td>
                    <td className="py-2 px-2 sm:px-4 text-sm sm:text-base">{user.email}</td>
                    <td className="py-2 px-2 sm:px-4 text-sm sm:text-base">
                      {user.created_at ? new Date(user.created_at).toLocaleString() : "-"}
                    </td>
                    <td className="py-2 px-2 sm:px-4 text-center text-sm sm:text-base">
                      <button
                        onClick={() => handleDelete(user)}
                        className="bg-red-600 hover:bg-red-700 text-white px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm transition"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
