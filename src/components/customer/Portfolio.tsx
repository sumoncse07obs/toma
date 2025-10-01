// src/components/customer/Portfolio.tsx
import React, { useEffect, useState } from "react";
import { isAuthed } from "@/auth";
import { toast } from "react-toastify";

const API_BASE_URL = `${import.meta.env.VITE_API_BASE}/api`;
const TOKEN_KEY = "toma_token";

async function api<T = any>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
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

type CustomerMe = {
  id: number;
  user_id: number;
  customer_number: string;
  business_name?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  about?: string | null;
  user?: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
};

export default function Portfolio() {
  const [loading, setLoading] = useState(true);

  // state from /customers/me
  const [customer, setCustomer] = useState<CustomerMe | null>(null);

  // user form (editable fields only)
  const [userForm, setUserForm] = useState({ name: "", email: "" });
  const [savingUser, setSavingUser] = useState(false);

  // customer form (editable fields only)
  const [custForm, setCustForm] = useState({
    business_name: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    about: "",
  });
  const [savingCustomer, setSavingCustomer] = useState(false);

  // password
  const [password, setPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    (async () => {
      if (!isAuthed()) {
        setLoading(false);
        toast.error("Please log in first.");
        return;
      }
      try {
        // one call returns both customer + nested user
        const raw = await api<any>("/customers/me");
        const data: CustomerMe = (raw?.data ?? raw) as CustomerMe;

        setCustomer(data);

        setCustForm({
          business_name: data.business_name ?? "",
          phone: data.phone ?? "",
          address: data.address ?? "",
          city: data.city ?? "",
          state: data.state ?? "",
          about: data.about ?? "",
        });

        setUserForm({
          name: data.user?.name ?? "",
          email: data.user?.email ?? "",
        });
      } catch (e: any) {
        console.error(e);
        toast.error(e.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function saveUser() {
    if (!customer?.user) return;
    setSavingUser(true);
    try {
      await api(`/users/${customer.user.id}`, {
        method: "PUT",
        body: JSON.stringify({ name: userForm.name, email: userForm.email }),
      });
      toast.success("User updated");
      setCustomer({
        ...customer,
        user: { ...customer.user, name: userForm.name, email: userForm.email },
      });
    } catch (e: any) {
      const msg = e.message || "Failed to update user";
      toast.error(msg.includes("403") ? "You don't have permission to update user info." : msg);
    } finally {
      setSavingUser(false);
    }
  }

  async function saveCustomer() {
    if (!customer) return;
    setSavingCustomer(true);
    try {
      await api(`/customers/${customer.id}`, {
        method: "PUT",
        body: JSON.stringify({
          business_name: custForm.business_name ?? "",
          phone: custForm.phone ?? "",
          address: custForm.address ?? "",
          city: custForm.city ?? "",
          state: custForm.state ?? "",
          about: custForm.about ?? "",
        }),
      });
      toast.success("Customer updated");
      setCustomer({ ...customer, ...custForm });
    } catch (e: any) {
      toast.error(e.message || "Failed to update customer");
    } finally {
      setSavingCustomer(false);
    }
  }

  async function changePassword() {
    if (!customer?.user || !password) return;
    setSavingPassword(true);
    try {
      await api(`/users/${customer.user.id}/reset-password`, {
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
  if (!customer) return <div className="p-6 text-red-600">Could not load profile</div>;

  return (
    <div className="p-6 max-w-3xl space-y-8">
      <h1 className="text-2xl font-semibold">My Portfolio</h1>

      {/* USER ACCOUNT (IDs hidden) */}
      <section className="space-y-4 border p-4 rounded-lg bg-white">
        <h2 className="font-semibold text-lg">User Account</h2>

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

        <button
          onClick={saveUser}
          disabled={savingUser}
          className="bg-slate-900 text-white px-4 py-2 rounded hover:opacity-90 disabled:opacity-50"
        >
          {savingUser ? "Saving…" : "Save User"}
        </button>
      </section>

      {/* CUSTOMER PROFILE (IDs hidden) */}
      <section className="space-y-4 border p-4 rounded-lg bg-white">
        <h2 className="font-semibold text-lg">Customer Profile</h2>

        <div>
          <label className="block text-sm font-medium">Business Name</label>
          <input
            value={custForm.business_name}
            onChange={(e) => setCustForm((f) => ({ ...f, business_name: e.target.value }))}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Phone</label>
            <input
              value={custForm.phone}
              onChange={(e) => setCustForm((f) => ({ ...f, phone: e.target.value }))}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">State</label>
            <input
              value={custForm.state}
              onChange={(e) => setCustForm((f) => ({ ...f, state: e.target.value }))}
              className="w-full border rounded px-3 py-2"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">City</label>
            <input
              value={custForm.city}
              onChange={(e) => setCustForm((f) => ({ ...f, city: e.target.value }))}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Address</label>
            <input
              value={custForm.address}
              onChange={(e) => setCustForm((f) => ({ ...f, address: e.target.value }))}
              className="w-full border rounded px-3 py-2"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium">About</label>
          <textarea
            value={custForm.about}
            onChange={(e) => setCustForm((f) => ({ ...f, about: e.target.value }))}
            className="w-full border rounded px-3 py-2 min-h-[90px]"
          />
        </div>

        <button
          onClick={saveCustomer}
          disabled={savingCustomer}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {savingCustomer ? "Saving…" : "Save Customer"}
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
