// src/pages/TodoList.tsx
import { useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabaseClient";
import { Link, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import type { JSX } from "react/jsx-runtime";

type Todo = {
  id: string;
  email: string;
  task: string;
  done: boolean;
  created_at?: string;
  updated_at?: string;
};

export default function TodoList(): JSX.Element {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTask, setNewTask] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>("");
  const [opLoadingId, setOpLoadingId] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const navigate = useNavigate();

  // ✅ Load logged-in user
  useEffect(() => {
    async function getUser() {
      const { data } = await supabase.auth.getUser();
      setUserEmail(data.user?.email ?? null);
    }
    getUser();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, sess) => {
      setUserEmail(sess?.user?.email ?? null);
    });

    return () => {
      try {
        listener?.subscription.unsubscribe();
      } catch {}
    };
  }, []);

  // ✅ Fetch todos once user email is known
  useEffect(() => {
    if (userEmail) fetchTodos();
  }, [userEmail]);

  async function fetchTodos() {
    if (!userEmail) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("expenses_todos")
        .select("*")
        .eq("email", userEmail)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTodos(data ?? []);
    } catch (err) {
      console.error("fetch todos error:", err);
      setTodos([]);
    } finally {
      setLoading(false);
    }
  }

  async function addTodo() {
    if (!userEmail) {
      Swal.fire({ icon: "warning", title: "Not signed in", text: "Please sign in to save todos." });
      return;
    }
    const trimmed = newTask.trim();
    if (!trimmed) return;

    setAdding(true);
    try {
      const { error } = await supabase
        .from("expenses_todos")
        .insert({ email: userEmail, task: trimmed, done: false });

      if (error) throw error;
      setNewTask("");
      await fetchTodos();
      inputRef.current?.focus();
    } catch (err) {
      console.error("add todo error:", err);
      Swal.fire({ icon: "error", title: "Error", text: "Could not add todo." });
    } finally {
      setAdding(false);
    }
  }

  async function toggleDone(id: string, done: boolean) {
    setOpLoadingId(id);
    try {
      const { error } = await supabase.from("expenses_todos").update({ done: !done }).eq("id", id);
      if (error) throw error;
      setTodos((t) => t.map((x) => (x.id === id ? { ...x, done: !done } : x)));
    } catch (err) {
      console.error("toggle error:", err);
    } finally {
      setOpLoadingId(null);
    }
  }

  function startEdit(todo: Todo) {
    setEditingId(todo.id);
    setEditingText(todo.task);
    setTimeout(() => {
      document.querySelector<HTMLInputElement>("#edit-input")?.focus();
    }, 50);
  }

  async function saveEdit() {
    if (!editingId) return;
    const trimmed = editingText.trim();
    if (!trimmed) {
      Swal.fire({
        title: "Task is empty",
        text: "Delete the task instead or enter some text.",
        icon: "warning",
      });
      return;
    }
    setOpLoadingId(editingId);
    try {
      const { error } = await supabase.from("expenses_todos").update({ task: trimmed }).eq("id", editingId);
      if (error) throw error;
      setTodos((t) => t.map((x) => (x.id === editingId ? { ...x, task: trimmed } : x)));
      setEditingId(null);
      setEditingText("");
    } catch (err) {
      console.error("save edit error:", err);
      Swal.fire({ icon: "error", title: "Error", text: "Could not save changes." });
    } finally {
      setOpLoadingId(null);
    }
  }

  async function deleteTodo(id: string) {
    const res = await Swal.fire({
      title: "Delete task?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete",
    });
    if (!res.isConfirmed) return;
    setOpLoadingId(id);
    try {
      const { error } = await supabase.from("expenses_todos").delete().eq("id", id);
      if (error) throw error;
      setTodos((t) => t.filter((x) => x.id !== id));
    } catch (err) {
      console.error("delete error:", err);
      Swal.fire({ icon: "error", title: "Error", text: "Could not delete task." });
    } finally {
      setOpLoadingId(null);
    }
  }

  async function clearAll() {
    if (!userEmail) return;
    const res = await Swal.fire({
      title: "Clear all tasks?",
      text: "This will remove all tasks for your account.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, clear all",
    });
    if (!res.isConfirmed) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("expenses_todos").delete().eq("email", userEmail);
      if (error) throw error;
      setTodos([]);
      Swal.fire({ icon: "success", title: "Cleared", text: "All tasks removed." });
    } catch (err) {
      console.error("clear all error:", err);
      Swal.fire({ icon: "error", title: "Error", text: "Could not clear tasks." });
    } finally {
      setLoading(false);
    }
  }

  // ✅ Keyboard shortcuts for editing
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (editingId) {
        if (e.key === "Enter") saveEdit();
        if (e.key === "Escape") {
          setEditingId(null);
          setEditingText("");
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editingId, editingText]);


  // Proper logout: sign out from Supabase, clear local state and redirect
  async function handleLogout(): Promise<void> {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("logout error:", err);
    } finally {
      try {
        localStorage.removeItem("user");
      } catch {}
      setUserEmail(null);
      setTodos([]);
      navigate("/");
    }
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-white pt-[50px] md:pt-10">
      <div className="max-w-3xl mx-auto px-4">
       {/* Header */}
<div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
  <div>
    <h1 className="text-2xl font-bold text-gray-800">To-Do List</h1>
    <p className="text-sm text-gray-500">Personal tasks — saved to your account</p>
  </div>
  <div className="flex items-center gap-3 flex-wrap">
    <Link
      to="/dashboard"
      className="px-3 py-1 rounded-lg border-4 border-purple-900 bg-white-900 text-purple-900 hover:bg-gray-50"
    >
      Back to Dashboard
    </Link>
    <button
      onClick={() => (userEmail ? clearAll() : navigate("/"))}
      className="px-3 py-2 rounded-lg bg-red-500 text-white"
      disabled={loading}
    >
      Clear All
    </button>

    <button
      onClick={handleLogout}
      className="bg-red-600 text-white px-2 py-2 rounded-lg text-sm cursor-pointer"
    >
      Logout
    </button>
  </div>
</div>


        {/* Add task */}
        <div className="bg-white p-4 rounded-xl shadow">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addTodo();
            }}
            className="flex gap-2"
          >
            <input
              ref={inputRef}
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              placeholder="Add a task..."
              className="flex-1 px-3 py-2 border rounded-lg"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg"
              disabled={adding}
            >
              {adding ? "Adding..." : "Add"}
            </button>
          </form>

          {/* Tasks List */}
          <div className="mt-4">
            {loading ? (
              <p className="text-sm text-gray-500">Loading...</p>
            ) : todos.length === 0 ? (
              <p className="text-sm text-gray-500">No tasks yet — add your first one!</p>
            ) : (
              <ul className="space-y-2">
                {todos.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between bg-gray-50 p-3 rounded-lg"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <input
                        id={`todo-${t.id}`}
                        type="checkbox"
                        checked={t.done}
                        onChange={() => toggleDone(t.id, t.done)}
                        disabled={opLoadingId === t.id}
                        className="w-5 h-5"
                      />
                      <div className="min-w-0">
                        {editingId === t.id ? (
                          <input
                            id="edit-input"
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            className="w-full px-2 py-1 border rounded"
                          />
                        ) : (
                          <label
                            htmlFor={`todo-${t.id}`}
                            className={`cursor-pointer block text-sm ${
                              t.done ? "line-through text-gray-400" : "text-gray-800"
                            }`}
                          >
                            {t.task}
                          </label>
                        )}
                        <div className="text-xs text-gray-400 mt-1">
                          {t.created_at ? new Date(t.created_at).toLocaleString() : ""}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {editingId === t.id ? (
                        <>
                          <button
                            onClick={saveEdit}
                            className="px-2 py-1 bg-green-600 text-white rounded text-sm"
                            disabled={opLoadingId === t.id}
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setEditingId(null);
                              setEditingText("");
                            }}
                            className="px-2 py-1 bg-gray-200 rounded text-sm"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEdit(t)}
                            className="px-2 py-1 text-sm border rounded hover:bg-gray-100"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteTodo(t.id)}
                            className="px-2 py-1 text-sm text-red-600 border border-red-200 rounded hover:bg-red-50"
                            disabled={opLoadingId === t.id}
                          >
                            {opLoadingId === t.id ? "..." : "Delete"}
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
