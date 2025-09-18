// src/components/admin/CustomersPage.tsx
import React, { useEffect, useMemo, useState } from "react";

/** ===== Types ===== */
export type Customer = {
  id: number;
  user_id: number;
  customer_number: string;
  business_name?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  about?: string | null;
  is_active?: boolean | number; // API may return 1/0 or true/false
  active?: boolean;             // fallback if backend exposes this
  created_at?: string | null;
  updated_at?: string | null;
  user?: {
    id: number;
    name: string;
    email: string;
    role: "admin" | "customer" | "user";
    created_at?: string | null;
    updated_at?: string | null;
  };
};

type CustomersListResponse = {
  data: Customer[];
  total: number;
  page: number;
  per_page: number;
};

/** ===== API helper ===== */
const API_BASE = import.meta.env.VITE_API_BASE ?? "http://127.0.0.1:8000";
const AUTH_TOKEN = localStorage.getItem("token"); // optional Bearer

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`.replace(/([^:]\/)\/+/g, "$1"); // collapse double slashes
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {}),
      ...init?.headers,
    },
    ...init, // no credentials to avoid CORS with *
  });
  if (!res.ok) {
    const text = await res.text();
    console.error("[API ERROR]", res.status, res.statusText, url, text);
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  return res.json();
}

const CustomersAPI = {
  async list(params?: { q?: string; page?: number; per_page?: number }) {
    const qs = new URLSearchParams();
    if (params?.q) qs.set("q", params.q);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.per_page) qs.set("per_page", String(params.per_page));
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return api<CustomersListResponse>(`/api/customers/${suffix}`);
  },

  async create(payload: {
    // user fields
    name: string;
    email: string;
    password?: string;
    // customer fields
    business_name?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    about?: string;
  }) {
    return api<Customer>(`/api/customers`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async update(id: number, payload: Partial<Omit<Customer, "id" | "user_id" | "user">>) {
    return api<Customer>(`/api/customers/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async toggleActive(id: number) {
    return api<Customer>(`/api/customers/${id}/toggle`, { method: "PATCH" });
  },
};

/** ===== UI Primitives ===== */
function Input(
  props: React.InputHTMLAttributes<HTMLInputElement> & { label?: string; hint?: string }
) {
  const { label, hint, className = "", ...rest } = props;
  const id = useMemo(() => rest.id ?? `in_${Math.random().toString(36).slice(2)}`, [rest.id]);
  return (
    <label className="block">
      {label ? <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span> : null}
      <input
        id={id}
        className={`w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 ${className}`}
        {...rest}
      />
      {hint ? <span className="mt-1 block text-xs text-slate-500">{hint}</span> : null}
    </label>
  );
}

function Textarea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; hint?: string }
) {
  const { label, hint, className = "", ...rest } = props;
  const id = useMemo(() => rest.id ?? `ta_${Math.random().toString(36).slice(2)}`, [rest.id]);
  return (
    <label className="block">
      {label ? <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span> : null}
      <textarea
        id={id}
        className={`w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 ${className}`}
        rows={4}
        {...rest}
      />
      {hint ? <span className="mt-1 block text-xs text-slate-500">{hint}</span> : null}
    </label>
  );
}

function Button(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" }
) {
  const { variant = "primary", className = "", ...rest } = props;
  const base =
    "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium transition shadow-sm";
  const styles = {
    primary:
      "bg-indigo-600 text-white hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
    ghost: "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50",
    danger:
      "bg-rose-600 text-white hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500",
  } as const;
  return <button className={`${base} ${styles[variant]} ${className}`} {...rest} />;
}

function Badge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"
      }`}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}

/** ===== Create/Edit Modal ===== */
function CustomerForm({
  mode,
  initial,
  onCancel,
  onSaved,
}: {
  mode: "create" | "edit";
  initial?: Partial<Customer> & { user_name?: string; user_email?: string };
  onCancel: () => void;
  onSaved: (c: Customer) => void;
}) {
  const [submitting, setSubmitting] = useState(false);

  // User fields (only used in create)
  const [user_name, setUserName] = useState(initial?.user?.name ?? (initial as any)?.user_name ?? "");
  const [user_email, setUserEmail] = useState(
    initial?.user?.email ?? (initial as any)?.user_email ?? ""
  );
  const [password, setPassword] = useState("");

  // Customer fields
  const [business_name, setBusinessName] = useState(initial?.business_name ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [city, setCity] = useState(initial?.city ?? "");
  const [state, setState] = useState(initial?.state ?? "");
  const [about, setAbout] = useState(initial?.about ?? "");

  const isEdit = mode === "edit";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (isEdit && initial?.id) {
        const updated = await CustomersAPI.update(initial.id, {
          business_name,
          phone,
          address,
          city,
          state,
          about,
        });
        onSaved(updated);
      } else {
        const created = await CustomersAPI.create({
          name: user_name,
          email: user_email,
          password: password || undefined,
          business_name,
          phone,
          address,
          city,
          state,
          about,
        });
        onSaved(created);
      }
    } catch (err: any) {
      alert(err?.message ?? "Failed to save");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{isEdit ? "Edit Customer" : "Add New Customer"}</h3>
          <button onClick={onCancel} className="text-slate-500 hover:text-slate-700">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isEdit && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                label="User Name"
                value={user_name}
                onChange={(e) => setUserName(e.target.value)}
                required
              />
              <Input
                label="User Email"
                type="email"
                value={user_email}
                onChange={(e) => setUserEmail(e.target.value)}
                required
              />
              <Input
                label="Temp Password (optional)"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                hint="If blank, backend can auto-generate or send reset."
              />
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              label="Business Name"
              value={business_name ?? ""}
              onChange={(e) => setBusinessName(e.target.value)}
            />
            <Input label="Phone" value={phone ?? ""} onChange={(e) => setPhone(e.target.value)} />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Input label="Address" value={address ?? ""} onChange={(e) => setAddress(e.target.value)} />
            <Input label="City" value={city ?? ""} onChange={(e) => setCity(e.target.value)} />
            <Input label="State" value={state ?? ""} onChange={(e) => setState(e.target.value)} />
          </div>

          <Textarea label="About" value={about ?? ""} onChange={(e) => setAbout(e.target.value)} />

          <div className="mt-6 flex items-center justify-end gap-3">
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (isEdit ? "Saving…" : "Creating…") : isEdit ? "Save Changes" : "Create Customer"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

/** ===== Page ===== */
export default function CustomersPage() {
  const [data, setData] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState<null | { mode: "create" } | { mode: "edit"; record: Customer }>(null);

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await CustomersAPI.list({ q, page, per_page: perPage });
      setData(res.data);
      setTotal(res.total);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load customers");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, perPage]);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    await load();
  }

  async function handleToggleActive(c: Customer) {
    try {
      const updated = await CustomersAPI.toggleActive(c.id);
      setData((prev) => prev.map((x) => (x.id === c.id ? updated : x)));
    } catch (err: any) {
      alert(err?.message ?? "Failed to toggle");
    }
  }

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Customers</h1>
            <p className="text-sm text-slate-600">Manage customers (create user with role=customer, edit, activate/deactivate).</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setShowForm({ mode: "create" })}>+ New Customer</Button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">
            {error}
          </div>
        )}

        {/* Search */}
        <form onSubmit={handleSearch} className="mb-4 flex flex-col gap-2 md:flex-row md:items-center">
          <Input
            placeholder="Search by name, email, number…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="md:w-80"
          />
          <Button type="submit" variant="ghost" className="md:ml-2">
            Search
          </Button>
        </form>

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-600">
                  Customer #
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-600">
                  Business
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-600">
                  Contact
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-600">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                    Loading…
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                    No customers found.
                  </td>
                </tr>
              ) : (
                data.map((c) => {
                  const active =
                    typeof c.is_active === "number"
                      ? c.is_active === 1
                      : (c.is_active as boolean) ?? c.active ?? true;

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3 font-mono text-sm text-slate-800">
                        {c.customer_number}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{c.business_name || "—"}</div>
                        <div className="text-xs text-slate-500">
                          {c.city || ""}{c.city && c.state ? ", " : ""}{c.state || ""}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm">{c.user?.name ?? "—"}</div>
                        <div className="text-xs text-slate-500">{c.user?.email ?? ""}</div>
                        {c.phone && <div className="text-xs text-slate-500">{c.phone}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <Badge active={!!active} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            onClick={() => setShowForm({ mode: "edit", record: c })}
                            className="px-3"
                            title="Edit"
                          >
                            ✎ Edit
                          </Button>
                          <Button
                            variant={active ? "danger" : "primary"}
                            onClick={() => handleToggleActive(c)}
                            className="px-3"
                            title={active ? "Deactivate" : "Activate"}
                          >
                            {active ? "Deactivate" : "Activate"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="mt-4 flex flex-col items-center justify-between gap-3 md:flex-row">
          <div className="text-sm text-slate-600">
            Page {page} of {Math.max(1, Math.ceil(total / perPage))} • {total} total
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              ← Prev
            </Button>
            <Input
              type="number"
              value={page}
              onChange={(e) => setPage(Math.max(1, Number(e.target.value) || 1))}
              className="w-20 text-center"
            />
            <Button
              variant="ghost"
              disabled={page >= Math.max(1, Math.ceil(total / perPage))}
              onClick={() => setPage((p) => p + 1)}
            >
              Next →
            </Button>
            <select
              className="ml-2 rounded-xl border border-slate-300 px-3 py-2 text-sm"
              value={perPage}
              onChange={(e) => {
                setPerPage(Number(e.target.value));
                setPage(1);
              }}
            >
              {[10, 20, 50].map((n) => (
                <option key={n} value={n}>
                  {n}/page
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {showForm && (
        <CustomerForm
          mode={showForm.mode}
          initial={showForm.mode === "edit" ? showForm.record : undefined}
          onCancel={() => setShowForm(null)}
          onSaved={() => {
            setShowForm(null);
            load(); // refresh
          }}
        />
      )}
    </div>
  );
}
