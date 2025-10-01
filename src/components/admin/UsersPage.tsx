import React from "react";
const API_BASE = `${import.meta.env.VITE_API_BASE}/api`;
const TOKEN_KEY = "toma_token";
const API = (path: string) =>
  `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`.replace(/([^:]\/)\/+/g, "$1");

// ----------------------------
// Types
// ----------------------------
export type UserRow = {
  id: number;
  name: string;
  email: string;
  role: "admin" | "user" | "customer";
  email_verified_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Paginated<T> = {
  data: T[];
  current_page: number;
  first_page_url: string | null;
  from: number | null;
  last_page: number;
  last_page_url: string | null;
  links: Array<{ url: string | null; label: string; active: boolean }>;
  next_page_url: string | null;
  path: string;
  per_page: number;
  prev_page_url: string | null;
  to: number | null;
  total: number;
};

// ----------------------------
// Small utilities
// ----------------------------
function clsx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function formatDT(s?: string | null) {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s ?? "—";
  return d.toLocaleString();
}

// ----------------------------
// API helpers (Bearer token; no credentials: "include")
// ----------------------------
async function apiGet<T>(url: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem(TOKEN_KEY);
  const res = await fetch(url.replace(/([^:]\/)\/+/g, "$1"), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const text = await res.text().catch(() => "");
  if (!res.ok) {
    let msg = text || res.statusText;
    try {
      const j = JSON.parse(text);
      msg = j?.message || msg;
    } catch {}
    throw new Error(`HTTP ${res.status}: ${msg}`);
  }
  try {
    return text ? JSON.parse(text) : ({} as T);
  } catch {
    return {} as T;
  }
}

async function apiSend<T>(url: string, method: string, body?: unknown): Promise<T> {
  const token = localStorage.getItem(TOKEN_KEY);
  const res = await fetch(url.replace(/([^:]\/)\/+/g, "$1"), {
    method,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text().catch(() => "");
  if (!res.ok) {
    let msg = text || res.statusText;
    try {
      const j = JSON.parse(text);
      msg = j?.message || msg;
    } catch {}
    throw new Error(`HTTP ${res.status}: ${msg}`);
  }
  try {
    return text ? JSON.parse(text) : ({} as T);
  } catch {
    return {} as T;
  }
}

// ----------------------------
// Dialog primitives
// ----------------------------
function Backdrop({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 bg-black/40 z-40"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    />
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={clsx("bg-white rounded-2xl shadow-xl p-6 z-50 w-[560px] max-w-[95vw]", className)}>
      {children}
    </div>
  );
}

function Field({ label, children, error }: { label: string; children: React.ReactNode; error?: string }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      {children}
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </label>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={clsx(
        "w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-4",
        "focus:ring-indigo-100 focus:border-indigo-500 placeholder:text-gray-400",
        props.className as string
      )}
    />
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={clsx(
        "w-full rounded-xl border border-gray-300 px-3 py-2 bg-white focus:outline-none",
        "focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500",
        props.className as string
      )}
    />
  );
}

function Line() {
  return <div className="h-px bg-gray-200 my-4" />;
}

function PrimaryBtn(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={clsx(
        "inline-flex items-center justify-center rounded-xl px-4 py-2 font-medium",
        "bg-indigo-600 text-white hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-200",
        props.disabled && "opacity-50 cursor-not-allowed",
        (props.className as string) || ""
      )}
    />
  );
}

function GhostBtn(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={clsx(
        "inline-flex items-center justify-center rounded-xl px-3 py-2 font-medium",
        "text-gray-700 hover:bg-gray-100",
        props.className as string
      )}
    />
  );
}

// ----------------------------
// Modals
// ----------------------------
function CreateUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = React.useState({
    name: "",
    email: "",
    password: "",
    role: "user" as "admin" | "user" | "customer",
  });
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setErr(null);
    setErrors({});
    try {
      await apiSend(API("/users"), "POST", form);
      onCreated();
      onClose();
    } catch (e: any) {
      try {
        const j = JSON.parse(e.message.replace(/^HTTP \d+:\s*/, ""));
        if (j?.errors)
          setErrors(
            Object.fromEntries(
              Object.entries(j.errors).map(([k, v]: any) => [k, (v?.[0] as string) || ""])
            )
          );
        else setErr(j?.message || e.message);
      } catch {
        setErr(e.message);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Backdrop onClose={onClose} />
      <div className="fixed inset-0 z-50 grid place-items-center p-4">
        <Card>
          <h2 className="text-xl font-semibold">Add New User</h2>
          <Line />
          <div className="grid gap-3">
            <Field label="Name" error={errors.name}>
              <TextInput
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Full name"
              />
            </Field>
            <Field label="Email" error={errors.email}>
              <TextInput
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="name@example.com"
              />
            </Field>
            <Field label="Password" error={errors.password}>
              <TextInput
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
              />
            </Field>
            <Field label="Role" error={errors.role}>
              <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as any })}>
                <option value="user">user</option>
                <option value="customer">customer</option>
                <option value="admin">admin</option>
              </Select>
            </Field>
          </div>
          {err ? <p className="mt-3 text-sm text-red-600">{err}</p> : null}
          <div className="mt-6 flex items-center justify-end gap-2">
            <GhostBtn onClick={onClose}>Cancel</GhostBtn>
            <PrimaryBtn onClick={submit} disabled={busy}>
              Create
            </PrimaryBtn>
          </div>
        </Card>
      </div>
    </>
  );
}

function EditUserModal({
  user,
  onClose,
  onUpdated,
}: {
  user: UserRow;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [form, setForm] = React.useState({ name: user.name, email: user.email, role: user.role });
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setErr(null);
    setErrors({});
    try {
      await apiSend(API(`/users/${user.id}`), "PUT", form);
      onUpdated();
      onClose();
    } catch (e: any) {
      try {
        const j = JSON.parse(e.message.replace(/^HTTP \d+:\s*/, ""));
        if (j?.errors)
          setErrors(
            Object.fromEntries(
              Object.entries(j.errors).map(([k, v]: any) => [k, (v?.[0] as string) || ""])
            )
          );
        else setErr(j?.message || e.message);
      } catch {
        setErr(e.message);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Backdrop onClose={onClose} />
      <div className="fixed inset-0 z-50 grid place-items-center p-4">
        <Card>
          <h2 className="text-xl font-semibold">Edit User</h2>
          <Line />
          <div className="grid gap-3">
            <Field label="Name" error={errors.name}>
              <TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Email" error={errors.email}>
              <TextInput type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label="Role" error={errors.role}>
              <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as any })}>
                <option value="user">user</option>
                <option value="customer">customer</option>
                <option value="admin">admin</option>
              </Select>
            </Field>
          </div>
          {err ? <p className="mt-3 text-sm text-red-600">{err}</p> : null}
          <div className="mt-6 flex items-center justify-end gap-2">
            <GhostBtn onClick={onClose}>Cancel</GhostBtn>
            <PrimaryBtn onClick={submit} disabled={busy}>
              Save
            </PrimaryBtn>
          </div>
        </Card>
      </div>
    </>
  );
}

function PasswordModal({ user, onClose }: { user: UserRow; onClose: () => void }) {
  const [password, setPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [ok, setOk] = React.useState(false);

  async function submit() {
    setBusy(true);
    setErr(null);
    try {
      await apiSend(API(`/users/${user.id}/reset-password`), "POST", { password });
      setOk(true);
      setTimeout(onClose, 900);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Backdrop onClose={onClose} />
      <div className="fixed inset-0 z-50 grid place-items-center p-4">
        <Card>
          <h2 className="text-xl font-semibold">Change Password</h2>
          <Line />
          <Field label={`New password for ${user.email}`}>
            <TextInput
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          {err ? <p className="mt-3 text-sm text-red-600">{err}</p> : null}
          {ok ? <p className="mt-3 text-sm text-green-600">Password updated.</p> : null}
          <div className="mt-6 flex items-center justify-end gap-2">
            <GhostBtn onClick={onClose}>Close</GhostBtn>
            <PrimaryBtn onClick={submit} disabled={busy || !password}>
              Update
            </PrimaryBtn>
          </div>
        </Card>
      </div>
    </>
  );
}

// ----------------------------
// Main page
// ----------------------------
export default function UsersPage() {
  const [rows, setRows] = React.useState<UserRow[]>([]);
  const [loading, setLoading] = React.useState(false);

  const [search, setSearch] = React.useState("");
  const [role, setRole] = React.useState<string>("");
  const [sortBy, setSortBy] = React.useState("created_at");
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("desc");
  const [perPage, setPerPage] = React.useState(10);
  const [page, setPage] = React.useState(1);
  const [total, setTotal] = React.useState(0);
  const [lastPage, setLastPage] = React.useState(1);

  const [stats, setStats] = React.useState<any | null>(null);

  const [showCreate, setShowCreate] = React.useState(false);
  const [editUser, setEditUser] = React.useState<UserRow | null>(null);
  const [pwUser, setPwUser] = React.useState<UserRow | null>(null);

  async function load() {
    setLoading(true);
    try {
      const url = new URL(API("/users"));
      if (search) url.searchParams.set("search", search);
      if (role) url.searchParams.set("role", role);
      url.searchParams.set("sort_by", sortBy);
      url.searchParams.set("sort_order", sortOrder);
      url.searchParams.set("per_page", String(perPage));
      url.searchParams.set("page", String(page));

      const data = await apiGet<Paginated<UserRow>>(url.toString());
      setRows(Array.isArray(data.data) ? data.data : []);
      setTotal(Number(data.total) || 0);
      setLastPage(Number(data.last_page) || 1);
    } finally {
      setLoading(false);
    }
  }

  async function loadStats() {
    try {
      const data = await apiGet<any>(API("/user-statistics"));
      setStats(data);
    } catch {
      // ignore stats errors
    }
  }

  React.useEffect(() => {
    load();
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, role, sortBy, sortOrder, perPage, page]);

  function toggleSort(col: string) {
    if (sortBy === col) setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    else {
      setSortBy(col);
      setSortOrder("asc");
    }
  }

  async function remove(u: UserRow) {
    if (!confirm(`Delete ${u.email}?`)) return;
    await apiSend(API(`/users/${u.id}`), "DELETE");
    load();
    loadStats();
  }

  return (
    <div className="p-6 space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Users</h1>
          <p className="text-gray-500">Manage admins, users, and customers.</p>
        </div>
        <div className="flex items-center gap-2">
          <PrimaryBtn onClick={() => setShowCreate(true)}>+ New User</PrimaryBtn>
        </div>
      </header>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="md:col-span-2">
          <Field label="Search">
            <TextInput
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="name, email, role…"
            />
          </Field>
        </div>
        <div>
          <Field label="Role">
            <Select
              value={role}
              onChange={(e) => {
                setRole(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All</option>
              <option value="admin">admin</option>
              <option value="user">user</option>
              <option value="customer">customer</option>
            </Select>
          </Field>
        </div>
        <div>
          <Field label="Per page">
            <Select
              value={String(perPage)}
              onChange={(e) => {
                setPerPage(Number(e.target.value));
                setPage(1);
              }}
            >
              {[10, 15, 25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {Object.entries({
            Total: stats.total_users,
            Admins: stats.admin_count,
            Users: stats.user_count,
            Customers: stats.customer_count,
            Verified: stats.verified_users,
            "New (7d)": stats.recent_users,
          }).map(([k, v]) => (
            <div key={k} className="bg-white rounded-2xl shadow p-4 text-center">
              <div className="text-sm text-gray-500">{k}</div>
              <div className="text-2xl font-semibold">{v}</div>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl shadow overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-gray-600">
              {[
                ["name", "Name"],
                ["email", "Email"],
                ["role", "Role"],
                ["email_verified_at", "Verified"],
                ["created_at", "Created"],
                ["updated_at", "Updated"],
              ].map(([key, label]) => (
                <th
                  key={key}
                  className="px-4 py-3 font-medium cursor-pointer select-none"
                  onClick={() => toggleSort(key)}
                >
                  <div className="inline-flex items-center gap-1">
                    {label}
                    {sortBy === key && (
                      <span className="text-xs text-gray-400">
                        {sortOrder === "asc" ? "▲" : "▼"}
                      </span>
                    )}
                  </div>
                </th>
              ))}
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-gray-500">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-gray-500">
                  No users found.
                </td>
              </tr>
            ) : (
              rows.map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="px-4 py-3 font-medium">{u.name}</td>
                  <td className="px-4 py-3">{u.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={clsx(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                        u.role === "admin" && "bg-purple-100 text-purple-700",
                        u.role === "user" && "bg-blue-100 text-blue-700",
                        u.role === "customer" && "bg-emerald-100 text-emerald-700"
                      )}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">{u.email_verified_at ? "Yes" : "No"}</td>
                  <td className="px-4 py-3">{formatDT(u.created_at)}</td>
                  <td className="px-4 py-3">{formatDT(u.updated_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <GhostBtn onClick={() => setEditUser(u)}>Edit</GhostBtn>
                      <GhostBtn onClick={() => setPwUser(u)}>Password</GhostBtn>
                      <GhostBtn className="text-red-600" onClick={() => remove(u)}>
                        Delete
                      </GhostBtn>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-gray-600">Total: {total}</div>
        <div className="flex items-center gap-2">
          <GhostBtn onClick={() => setPage(1)} disabled={page <= 1}>
            « First
          </GhostBtn>
          <GhostBtn onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
            ‹ Prev
          </GhostBtn>
          <span className="text-sm">
            Page {page} / {lastPage}
          </span>
          <GhostBtn
            onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
            disabled={page >= lastPage}
          >
            Next ›
          </GhostBtn>
          <GhostBtn onClick={() => setPage(lastPage)} disabled={page >= lastPage}>
            Last »
          </GhostBtn>
        </div>
      </div>

      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            load();
            loadStats();
          }}
        />
      )}
      {editUser && (
        <EditUserModal
          user={editUser}
          onClose={() => setEditUser(null)}
          onUpdated={() => {
            load();
            loadStats();
          }}
        />
      )}
      {pwUser && <PasswordModal user={pwUser} onClose={() => setPwUser(null)} />}
    </div>
  );
}
