// src/components/admin/Portfolio.tsx
import React, { useEffect, useState } from "react";
import { isAuthed, currentUser, type User as AuthUser } from "@/auth";
import { toast } from "react-toastify";

const API_BASE_URL = `${import.meta.env.VITE_API_BASE || ""}/api`;
const TOKEN_KEY = "toma_token";

function norm(path: string) {
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`.replace(/([^:]\/)\/+/g, "$1");
}

async function api<T = any>(path: string, init?: RequestInit): Promise<T> {
  const url = norm(path);
  const token = localStorage.getItem(TOKEN_KEY);

  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
    ...init,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? res.json() : (undefined as T);
}

// Normalize any of: {user:{...}} | {data:{...}} | {...}
function unwrap<T>(raw: any): T {
  return (raw?.data ?? raw?.user ?? raw) as T;
}

type User = {
  id: number;
  name: string;
  email: string;
  role?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export default function Portfolio() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  // editable user form
  const [userForm, setUserForm] = useState({ name: "", email: "" });
  const [savingUser, setSavingUser] = useState(false);

  // password
  const [password, setPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        if (!isAuthed()) {
          setLoading(false);
          toast.error("Please log in first.");
          return;
        }

        const me: AuthUser | null = currentUser();
        if (!me?.id) {
          setLoading(false);
          toast.error("No current user id found.");
          return;
        }

        // GET /users/:id → { user: {...} } in your API
        const raw = await api<any>(`/users/${me.id}`);
        const data = unwrap<User>(raw);

        setUser(data);
        setUserForm({
          name: data.name ?? "",
          email: data.email ?? "",
        });
      } catch (e: any) {
        console.error(e);
        toast.error(e.message || "Failed to load user");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function saveUser() {
    if (!user?.id) return;
    setSavingUser(true);
    try {
      await api(`/users/${user.id}`, {
        method: "PUT",
        body: JSON.stringify({ name: userForm.name, email: userForm.email }),
      });
      toast.success("User updated");
      setUser({ ...user, name: userForm.name, email: userForm.email });
    } catch (e: any) {
      const msg = e.message || "Failed to update user";
      toast.error(msg.includes("403") ? "You don't have permission to update user info." : msg);
    } finally {
      setSavingUser(false);
    }
  }

  async function changePassword() {
    if (!user?.id || !password) return;
    setSavingPassword(true);
    try {
      await api(`/users/${user.id}/reset-password`, {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      toast.success("Password changed");
      setPassword("");
    } catch (e: any) {
      toast.error(e.message || "Failed to change password");
    } finally {
      setSavingPassword(false);
    }
  }

  if (loading) return <div className="p-6">Loading…</div>;
  if (!user) return <div className="p-6 text-red-600">Could not load user</div>;

  return (
    <div className="p-6 max-w-3xl space-y-8">
      <h1 className="text-2xl font-semibold">Admin Portfolio</h1>

      {/* USER ACCOUNT */}
      <section className="space-y-4 border p-4 rounded-lg bg-white">
        <h2 className="font-semibold text-lg">User Account</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Name</label>
            <input
              value={userForm.name}
              onChange={(e) => setUserForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Email</label>
            <input
              value={userForm.email}
              onChange={(e) => setUserForm((f) => ({ ...f, email: e.target.value }))}
              className="w-full border rounded px-3 py-2"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium">Role</label>
            <input
              value={user.role ?? ""}
              readOnly
              className="w-full border rounded px-3 py-2 bg-slate-50 text-slate-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Created</label>
            <input
              value={user.created_at ?? ""}
              readOnly
              className="w-full border rounded px-3 py-2 bg-slate-50 text-slate-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Updated</label>
            <input
              value={user.updated_at ?? ""}
              readOnly
              className="w-full border rounded px-3 py-2 bg-slate-50 text-slate-600"
            />
          </div>
        </div>

        <button
          onClick={saveUser}
          disabled={savingUser}
          className="bg-slate-900 text-white px-4 py-2 rounded hover:opacity-90 disabled:opacity-50"
        >
          {savingUser ? "Saving…" : "Save User"}
        </button>
      </section>

      {/* CHANGE PASSWORD */}
      <section className="space-y-4 border p-4 rounded-lg bg-white">
        <h2 className="font-semibold text-lg">Change Password</h2>
        <div>
          <label className="block text-sm font-medium">New Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border rounded px-3 py-2"
          />
        </div>
        <button
          onClick={changePassword}
          disabled={savingPassword || !password}
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
        >
          {savingPassword ? "Updating…" : "Update Password"}
        </button>
      </section>
    </div>
  );
}
