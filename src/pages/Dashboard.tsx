// src/pages/Dashboard.tsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
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
  const [editingId, setEditingId] = useState<string | null>(null);

  // per-button loading states so only the selected button spins
  const [formLoading, setFormLoading] = useState(false); // add/save expense
  const [budgetLoading, setBudgetLoading] = useState(false); // save budget
  const [clearLoading, setClearLoading] = useState(false); // clear all
  const [deletingId, setDeletingId] = useState<string | null>(null); // delete per-expense

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
    if (error) {
      console.error("Error fetching budget:", error);
      return;
    }
    if (data) setBudget(data.budget ?? "");
  }

  // --- FETCH EXPENSES
  async function fetchExpenses() {
    if (!email) return;
    setLoading(true);
    try {
      let query: any = supabase
        .from("expenses__expenses")
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

      const res = await query;
      const data = res?.data as Expense[] | null;
      const error = res?.error;

      if (error) {
        console.error("Error fetching expenses:", error);
        setExpenses([]);
      } else setExpenses(data ?? []);
    } catch (err) {
      console.error("Error fetching expenses:", err);
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchExpenses();
    fetchBudget();
  }, [email, filter]);

  // This function drives the button spinner and performs add/update actions.
  async function handleAddOrSave() {
    setFormLoading(true);
    try {
      if (!description || !amount || !email) {
        // stop spinner before exit
        setFormLoading(false);
        return;
      }

      if (editingId) {
        // Update flow (same as your update code)
        const { error } = await supabase
          .from("expenses__expenses")
          .update({ description, amount, category })
          .eq("id", editingId);
        if (error) {
          console.error("Error updating expense:", error);
          await Swal.fire({ icon: "error", title: "Error", text: error.message || "Failed to update expense" });
        } else {
          const updatedDescription = description;
          const updatedAmount = amount as number;
          setDescription("");
          setAmount("");
          setCategory("Other");
          setEditingId(null);
          await fetchExpenses();
          Swal.fire({
            icon: "success",
            title: "Expense updated",
            text: `${updatedDescription} — ₦${Number(updatedAmount).toLocaleString()}`,
            timer: 2000,
            showConfirmButton: false,
          });
        }
      } else {
        // Insert flow (same as your insert code)
        const { error } = await supabase.from("expenses__expenses").insert({
          email,
          description,
          amount,
          category,
        });
        if (error) {
          console.error("Error adding expense:", error);
          await Swal.fire({ icon: "error", title: "Error", text: error.message || "Failed to add expense" });
        } else {
          const addedDescription = description;
          const addedAmount = amount as number;
          setDescription("");
          setAmount("");
          setCategory("Other");
          await fetchExpenses();
          Swal.fire({
            icon: "success",
            title: "Expense added!",
            text: `${addedDescription} — ₦${Number(addedAmount).toLocaleString()}`,
            timer: 2000,
            showConfirmButton: false,
          });
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFormLoading(false);
    }
  }

  // --- ADD or UPDATE EXPENSE (form submit - still supported via Enter)
  async function handleAddExpense(e: React.FormEvent) {
    e.preventDefault();
    if (!description || !amount || !email) return;

    if (editingId) {
      // Update flow
      const { error } = await supabase
        .from("expenses__expenses")
        .update({ description, amount, category })
        .eq("id", editingId);
      if (error) {
        console.error("Error updating expense:", error);
      } else {
        const updatedDescription = description;
        const updatedAmount = amount as number;
        setDescription("");
        setAmount("");
        setCategory("Other");
        setEditingId(null);
        fetchExpenses();
        Swal.fire({
          icon: "success",
          title: "Expense updated",
          text: `${updatedDescription} — ₦${Number(updatedAmount).toLocaleString()}`,
          timer: 2000,
          showConfirmButton: false,
        });
      }
      return;
    }

    // Insert flow
    const { error } = await supabase.from("expenses__expenses").insert({
      email,
      description,
      amount,
      category,
    });
    if (error) {
      console.error("Error adding expense:", error);
    } else {
      // store current values for the alert (state setters are async)
      const addedDescription = description;
      const addedAmount = amount as number;
      setDescription("");
      setAmount("");
      setCategory("Other");
      fetchExpenses();
      Swal.fire({
        icon: "success",
        title: "Expense added!",
        text: `${addedDescription} — ₦${Number(addedAmount).toLocaleString()}`,
        timer: 2000,
        showConfirmButton: false,
      });
    }
  }

  // --- DELETE EXPENSE


async function handleDeleteExpense(id: string, desc: string, amt?: number) {
  // Ask for confirmation first
  const confirmResult = await Swal.fire({
    title: "Are you sure?",
    text: `Delete "${desc}"${amt ? ` — ₦${Number(amt).toLocaleString()}` : ""}?`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#d33",
    cancelButtonColor: "#3085d6",
    confirmButtonText: "Yes, delete it",
    cancelButtonText: "Cancel",
  });

  // If user cancelled, stop here
  if (!confirmResult.isConfirmed) return;

  setDeletingId(id);

  try {
    const { error } = await supabase.from("expenses__expenses").delete().eq("id", id);

    if (error) {
      console.error("Error deleting expense:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to delete expense. Try again.",
      });
    } else {
      fetchExpenses();
      Swal.fire({
        icon: "info",
        title: "Expense deleted",
        text: `${desc}${amt ? ` — ₦${Number(amt).toLocaleString()}` : ""}`,
        timer: 2000,
        showConfirmButton: false,
      });
    }
  } catch (err) {
    console.error(err);
    Swal.fire({
      icon: "error",
      title: "Unexpected error",
      text: "Something went wrong.",
    });
  } finally {
    setDeletingId(null);
  }
}


  // --- EDIT: populate form with an expense
  function handleEditExpense(exp: Expense) {
    setEditingId(exp.id);
    setDescription(exp.description);
    setAmount(exp.amount);
    setCategory(exp.category);
    // scroll to top of form if needed (keeps user focus)
    const top = document.querySelector("form");
    if (top) top.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  // --- CANCEL EDIT
  function handleCancelEdit() {
    setEditingId(null);
    setDescription("");
    setAmount("");
    setCategory("Other");
  }

  // --- CLEAR ALL EXPENSES for this user (with confirm)
  async function handleClearExpenses() {
    if (!email) return;
    const result = await Swal.fire({
      title: "Clear all expenses?",
      text: "This will permanently delete all your expenses. This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, clear all",
      cancelButtonText: "Cancel",
    });
    if (result.isConfirmed) {
      setClearLoading(true);
      try {
        const { error } = await supabase.from("expenses__expenses").delete().eq("email", email);
        if (error) {
          console.error("Error clearing expenses:", error);
          await Swal.fire({ icon: "error", title: "Error", text: error.message || "Failed to clear expenses" });
        } else {
          fetchExpenses();
          await Swal.fire({ icon: "success", title: "Cleared", text: "All expenses removed." });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setClearLoading(false);
      }
    }
  }

  // --- SAVE BUDGET
  async function handleSaveBudget(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!email) return;
    setBudgetLoading(true);
    try {
      const budgetValue = typeof budget === "string" && budget !== "" ? Number(budget) : budget;
      if (budgetValue === "" || budgetValue === null) {
        setBudgetLoading(false);
        return;
      }

      const { error } = await supabase
        .from("expenses_profiles")
        .update({ budget: budgetValue })
        .eq("email", email);

      if (error) {
        console.error("Error saving budget:", error);
      } else {
        fetchBudget();
        Swal.fire({
          icon: "success",
          title: "Budget saved",
          text: `₦${Number(budgetValue).toLocaleString()}`,
          timer: 2000,
          showConfirmButton: false,
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setBudgetLoading(false);
    }
  }

  // --- LOGOUT
  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/");
  }

  // --- EXPORT CSV
  function exportCSV() {
    if (expenses.length === 0) return Swal.fire("No expenses to export");
    const headers = ["Description", "Amount", "Category", "Date"];
    // keep amounts numeric in CSV so columns remain correct
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
  const highest = useMemo(() => (expenses.length === 0 ? 0 : Math.max(...expenses.map((e) => e.amount))), [expenses]);
  const avg = count === 0 ? 0 : totalAmount / count;

  // --- Category chart
  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of expenses) map[e.category] = (map[e.category] || 0) + e.amount;
    return Object.keys(map)
      .sort((a, b) => map[b] - map[a])
      .map((k) => ({ category: k, total: map[k] }));
  }, [expenses]);

  const pieData = useMemo(() => categoryData.map((c) => ({ name: c.category, value: c.total })), [categoryData]);
  const totalByCategories = useMemo(() => pieData.reduce((s, p) => s + p.value, 0), [pieData]);

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

  const COLORS = ["#6366F1", "#10B981", "#F97316", "#EF4444", "#3B82F6", "#8B5CF6", "#F59E0B", "#06B6D4"];

  const remainingBudget = budget !== "" && budget !== null ? Number(budget) - totalAmount : null;

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-white transition-colors">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">💰 Expense Tracker</h1>
            <p className="text-sm text-gray-600 mt-1">Track spending, set budgets, and visualize your money.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {(["today", "week", "month", "all"] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2 py-1 rounded-lg text-sm cursor-pointer ${filter === f ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-800"}`}
              >
                {f === "today" ? "Today" : f === "week" ? "This Week" : f === "month" ? "This Month" : "All"}
              </button>
            ))}
            <button onClick={handleLogout} className="ml-1 bg-red-600 text-white px-2 py-2 rounded-lg text-sm cursor-pointer">Logout</button>
          </div>
        </div>

        {/* Top stats cards */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 mb-6">
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
          <div className="bg-white p-4 rounded-xl shadow">
            <p className="text-sm text-gray-500">Budget</p>
            <p className={`font-bold text-xl md:text-sm ${
                remainingBudget !== null && remainingBudget < 0 ? "text-red-600" : "text-green-600"
              }`}
            >

              ₦{budget ? Number(budget).toLocaleString() : "0"} {remainingBudget !== null ? (remainingBudget >= 0 ? `— ₦${remainingBudget.toLocaleString()} left` : `— Over by ₦${Math.abs(remainingBudget).toLocaleString()}`) : ""}
            </p>
          </div>
        </div>

        {/* Budget form + export + clear */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <form onSubmit={handleSaveBudget} className="flex gap-2 items-center">
            <input
              type="number"
              placeholder="Monthly budget (₦)"
              value={budget as any}
              onChange={(e) => setBudget(e.target.value === "" ? "" : Number(e.target.value))}
              className="px-3 py-2 rounded-lg border"
            />
            <button
              type="submit"
              className="bg-green-600 text-white px-3 py-2 rounded-lg cursor-pointer flex items-center gap-2"
              disabled={budgetLoading}
            >
              {budgetLoading ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    ></path>
                  </svg>
                  <span>Saving...</span>
                </>
              ) : (
                "Save Budget"
              )}
            </button>
          </form>
          <div className="flex items-center gap-3">
            <button onClick={exportCSV} className="bg-indigo-600 text-white px-3 py-2 rounded-lg cursor-pointer">Export CSV</button>
            <button
              onClick={handleClearExpenses}
              className="bg-red-500 text-white px-3 py-2 rounded-lg cursor-pointer flex items-center gap-2"
              disabled={clearLoading}
            >
              {clearLoading ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    ></path>
                  </svg>
                  <span>Clearing...</span>
                </>
              ) : (
                "Clear All"
              )}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Charts area */}
          <div className="col-span-2 bg-white p-4 rounded-xl shadow">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Pie chart */}
              <div className="flex flex-col items-center">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Spending by Category</h3>
                {pieData.length === 0 ? (
                  <p className="text-sm text-gray-500">No category data</p>
                ) : (
                  <div className="w-full h-56 flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius="50%"
                          outerRadius="80%"
                          paddingAngle={4}
                          label={(entry) => `${entry.name}`}
                        >
                          {pieData.map((_, idx) => (
                            <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => `₦${Number(value).toLocaleString()}`} />
                        <Legend verticalAlign="bottom" height={36} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
                {pieData.length > 0 && (
                  <div className="w-full mt-3">
                    <ul className="space-y-2">
                      {pieData.slice(0, 5).map((p, i) => {
                        const percent = totalByCategories ? ((p.value / totalByCategories) * 100).toFixed(0) : "0";
                        return (
                          <li key={p.name} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="w-3 h-3 rounded-sm" style={{ background: COLORS[i % COLORS.length] }} />
                              <span className="text-sm text-gray-700">{p.name}</span>
                            </div>
                            <div className="text-sm text-gray-500">{percent}% — ₦{p.value.toLocaleString()}</div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>

              {/* Monthly bar chart */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Monthly Spending</h3>
                {monthlyData.length === 0 ? (
                  <p className="text-sm text-gray-500">No monthly data</p>
                ) : (
                  <div className="w-full h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" tickFormatter={(m) => m} />
                        <YAxis />
                        <Tooltip formatter={(value: number) => `₦${Number(value).toLocaleString()}`} />
                        <Bar dataKey="total" fill="#10b981" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
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
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="px-3 py-2 rounded-lg border cursor-pointer">
                  <option>Food</option>
                  <option>Transport</option>
                  <option>Shopping</option>
                  <option>Health</option>
                  <option>Entertainment</option>
                  <option>Other</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="bg-blue-600 text-white px-5 py-2 rounded-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  disabled={formLoading}
                  onClick={handleAddOrSave}
                >
                  {formLoading ? (
                    <>
                      <svg
                        className="animate-spin h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                        ></path>
                      </svg>
                      <span>{editingId ? "Saving..." : "Adding..."}</span>
                    </>
                  ) : (
                    <span>{editingId ? "Save" : "Add"}</span>
                  )}
                </button>

                {editingId && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="bg-gray-300 text-gray-800 px-3 py-2 rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>

            {/* Recent expenses */}
            <div>
              <h4 className="font-semibold text-gray-700 mb-3">Recent expenses</h4>
              {loading ? (
                <p className="text-sm text-gray-500">Loading...</p>
              ) : expenses.length === 0 ? (
                <p className="text-sm text-gray-500">No expenses — add your first one</p>
              ) : (
                <ul className="space-y-3 max-h-72 overflow-auto">
                  {expenses.map((exp) => (
                    <li key={exp.id} className="flex justify-between items-start bg-gray-50 p-3 rounded-lg gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 break-words">{exp.description}</p>
                        <span className="text-xs text-gray-500">{exp.category}</span>
                        <p className="text-xs text-gray-500 mt-1">{new Date(exp.created_at).toLocaleString()}</p>
                      </div>
                      <div className="flex-shrink-0 flex flex-col items-end gap-1">
                        <p className="font-semibold text-green-700">₦{exp.amount.toLocaleString()}</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditExpense(exp)}
                            className="px-3 py-1 text-sm text-blue-600 border border-blue-600 rounded hover:bg-blue-600 hover:text-white transition cursor-pointer"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() => handleDeleteExpense(exp.id, exp.description, exp.amount)}
                            className="text-red-600 text-sm cursor-pointer flex items-center gap-2 border border-red-600 rounded hover:bg-red-600 hover:text-white transition px-2"
                            disabled={deletingId === exp.id}
                          >
                            {deletingId === exp.id ? (
                              <>
                                <svg
                                  className="animate-spin h-4 w-4"
                                  xmlns="http://www.w3.org/2000/svg"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                >
                                  <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                  ></circle>
                                  <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                                  ></path>
                                </svg>
                                <span>Deleting...</span>
                              </>
                            ) : (
                              "Delete"
                            )}
                          </button>
                        </div>
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
