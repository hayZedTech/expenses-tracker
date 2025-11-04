// src/pages/Dashboard.tsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { JSX } from "react/jsx-runtime";

type Expense = {
  id: string;
  email: string;
  description: string;
  amount: number;
  category: string;
  created_at: string;
};

type Filter = "today" | "week" | "month" | "all";

export default function Dashboard(): JSX.Element {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [description, setDescription] = useState<string>("");
  const [amount, setAmount] = useState<number | "">("");
  const [category, setCategory] = useState<string>("Other");
  const [loading, setLoading] = useState<boolean>(false);
  const [email, setEmail] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [budget, setBudget] = useState<number | "">("");

  const navigate = useNavigate();

  // --- AUTH: get user & listen for changes
  useEffect(() => {
    async function getUser() {
      const { data } = await supabase.auth.getUser();
      setEmail(data.user?.email ?? null);
    }
    getUser();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => {
      try {
        listener.subscription.unsubscribe();
      } catch {}
    };
  }, []);

  // --- FETCH BUDGET
  async function fetchBudget() {
    if (!email) return;
    const { data, error } = await supabase
      .from("expenses_profiles")
      .select("budget")
      .eq("email", email)
      .single();
    if (!error && data) {
      setBudget(data.budget ?? "");
    }
  }

  // --- FETCH EXPENSES with filter
  async function fetchExpenses() {
    if (!email) return;
    setLoading(true);

    let query = supabase
      .from<Expense>("expenses__expenses")
      .select("*")
      .eq("email", email)
      .order("created_at", { ascending: false });

    const now = new Date();
    if (filter === "today") {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).toISOString();
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();
      query = query.gte("created_at", start).lte("created_at", end);
    } else if (filter === "week") {
      const start = new Date();
      start.setDate(start.getDate() - 7);
      query = query.gte("created_at", start.toISOString());
    } else if (filter === "month") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      query = query.gte("created_at", start);
    }

    const { data, error } = await query;
    if (error) console.error("Error fetching expenses:", error);
    else if (data) setExpenses(data);
    setLoading(false);
  }

  useEffect(() => {
    fetchExpenses();
    fetchBudget();
  }, [email, filter]);

  // --- ADD EXPENSE
  async function handleAddExpense(e: React.FormEvent) {
    e.preventDefault();
    if (!description || !amount || !email) return;
    const { error } = await supabase.from("expenses__expenses").insert({
      email,
      description,
      amount,
      category,
    });
    if (error) console.error("Error adding expense:", error);
    else {
      setDescription("");
      setAmount("");
      setCategory("Other");
      fetchExpenses();
    }
  }

  // --- DELETE EXPENSE
  async function handleDeleteExpense(id: string) {
    const { error } = await supabase.from("expenses__expenses").delete().eq("id", id);
    if (error) console.error("Error deleting expense:", error);
    else fetchExpenses();
  }

  // --- SAVE BUDGET (per user)
  async function handleSaveBudget(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!email) return;
    const budgetValue = typeof budget === "string" && budget !== "" ? Number(budget) : budget;
    if (budgetValue === "" || budgetValue === null) return;
    const { error } = await supabase.from("expenses_profiles").upsert({
      email,
      budget: budgetValue,
    });
    if (error) console.error("Error saving budget:", error);
    else fetchBudget();
  }

  // --- LOGOUT
  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/");
  }

  // --- EXPORT CSV
  function exportCSV() {
    if (expenses.length === 0) return alert("No expenses to export");
    const headers = ["Description", "Amount", "Category", "Date"];
    const rows = expenses.map((e) => [
      `"${e.description.replace(/"/g, '""')}"`,
      e.amount,
      e.category,
      new Date(e.created_at).toLocaleString(),
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "expenses.csv");
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  // --- Derived stats
  const totalAmount = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses]);
  const count = expenses.length;
  const highest = useMemo(() => {
    if (expenses.length === 0) return 0;
    return Math.max(...expenses.map((e) => e.amount));
  }, [expenses]);
  const avg = count === 0 ? 0 : totalAmount / count;

  // --- Category chart data
  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of expenses) {
      map[e.category] = (map[e.category] || 0) + e.amount;
    }
    return Object.keys(map).map((k) => ({ category: k, total: map[k] }));
  }, [expenses]);

  // --- Monthly chart data (group by YYYY-MM)
  const monthlyData = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of expenses) {
      const d = new Date(e.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      map[key] = (map[key] || 0) + e.amount;
    }
    return Object.keys(map)
      .sort()
      .map((k) => {
        const [y, m] = k.split("-");
        const label = new Date(Number(y), Number(m) - 1).toLocaleString(undefined, { month: "short", year: "numeric" });
        return { month: label, total: map[k] };
      });
  }, [expenses]);

  // --- UI
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white transition-colors">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">💰 Expense Tracker</h1>
            <p className="text-sm text-gray-600 mt-1">Track spending, set budgets, and visualize your money.</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilter("today")}
              className={`px-2 py-1 rounded-lg text-sm ${filter === "today" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-800"}`}
            >
              Today
            </button>
            <button
              onClick={() => setFilter("week")}
              className={`px-2 py-1 rounded-lg text-sm ${filter === "week" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-800"}`}
            >
              This Week
            </button>
            <button
              onClick={() => setFilter("month")}
              className={`px-2 py-1 rounded-lg text-sm ${filter === "month" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-800"}`}
            >
              This Month
            </button>
            <button
              onClick={() => setFilter("all")}
              className={`px-2 py-1 rounded-lg text-sm ${filter === "all" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-800"}`}
            >
              All
            </button>

            <button onClick={handleLogout} className="ml-1 bg-red-600 text-white px-2 py-2 rounded-lg text-sm">Logout</button>
          </div>
        </div>

        {/* Top cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl shadow">
            <p className="text-sm text-gray-500">Total Spent</p>
            <p className="text-xl font-bold text-gray-900">₦{totalAmount.toLocaleString()}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow">
            <p className="text-sm text-gray-500">Transactions</p>
            <p className="text-xl font-bold text-gray-900">{count}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow">
            <p className="text-sm text-gray-500">Highest</p>
            <p className="text-xl font-bold text-gray-900">₦{highest.toLocaleString()}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow">
            <p className="text-sm text-gray-500">Average</p>
            <p className="text-xl font-bold text-gray-900">₦{Math.round(avg).toLocaleString()}</p>
          </div>
        </div>

        {/* Budget + Export */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <form onSubmit={handleSaveBudget} className="flex gap-2 items-center">
            <input
              type="number"
              placeholder="Monthly budget (₦)"
              value={budget as any}
              onChange={(e) => setBudget(e.target.value === "" ? "" : Number(e.target.value))}
              className="px-3 py-2 rounded-lg border"
            />
            <button type="submit" className="bg-green-600 text-white px-3 py-2 rounded-lg">Save Budget</button>
          </form>

          <div className="flex items-center gap-3">
            <button onClick={exportCSV} className="bg-indigo-600 text-white px-3 py-2 rounded-lg">Export CSV</button>
          </div>
        </div>

        {/* Budget progress */}
        {budget !== "" && budget !== null && (
          <div className="mb-6">
            <div className="flex justify-between mb-2">
              <p className={`text-sm ${totalAmount > Number(budget) ? "text-red-500" : "text-gray-700"}`}>
                Budget: ₦{Number(budget).toLocaleString()} — Spent: ₦{totalAmount.toLocaleString()} ({Math.min(((totalAmount / Number(budget)) * 100), 100).toFixed(0)}%)
              </p>
              <p className="text-sm text-gray-500">{count} items</p>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                style={{ width: `${Math.min((totalAmount / Number(budget)) * 100, 100)}%` }}
                className={`h-3 rounded-full transition-all ${totalAmount > Number(budget) ? "bg-red-500" : "bg-blue-500"}`}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="col-span-2 bg-white p-4 rounded-xl shadow">
            {/* Category Chart */}
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Spending by Category</h3>
            {categoryData.length === 0 ? (
              <p className="text-sm text-gray-500">No data</p>
            ) : (
              <div className="w-full h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="total" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Monthly chart */}
            <h3 className="text-sm font-semibold text-gray-700 mt-6 mb-2">Monthly Spending</h3>
            {monthlyData.length === 0 ? (
              <p className="text-sm text-gray-500">No monthly data</p>
            ) : (
              <div className="w-full h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="total" fill="#10b981" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Right column: form + list */}
          <div className="bg-white p-4 rounded-xl shadow flex flex-col gap-4">
            <form onSubmit={handleAddExpense} className="flex flex-col gap-3">
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                type="text"
                placeholder="Description"
                className="px-3 py-2 rounded-lg border"
                required
              />
              <div className="flex gap-2">
                <input
                  value={amount as any}
                  onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
                  type="number"
                  placeholder="Amount"
                  className="px-3 py-2 rounded-lg border w-32"
                  required
                />
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="px-3 py-2 rounded-lg border">
                  <option>Food</option>
                  <option>Transport</option>
                  <option>Shopping</option>
                  <option>Health</option>
                  <option>Entertainment</option>
                  <option>Other</option>
                </select>
              </div>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg">Add</button>
            </form>

            {/* Recent list */}
            <div>
              <h4 className="font-semibold text-gray-700 mb-3">Recent expenses</h4>
              {loading ? (
                <p className="text-sm text-gray-500">Loading...</p>
              ) : expenses.length === 0 ? (
                <p className="text-sm text-gray-500">No expenses — add your first one</p>
              ) : (
                <ul className="space-y-3 max-h-72 overflow-auto">
                  {expenses.map((exp) => (
                    <li key={exp.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                      <div>
                        <div className="flex gap-2 items-baseline">
                          <p className="font-medium text-gray-800">{exp.description}</p>
                          <span className="text-xs text-gray-500">· {exp.category}</span>
                        </div>
                        <p className="text-xs text-gray-500">{new Date(exp.created_at).toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="font-semibold text-green-700">₦{exp.amount}</p>
                        <button onClick={() => handleDeleteExpense(exp.id)} className="text-red-600">Delete</button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
