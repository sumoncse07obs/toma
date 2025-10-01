// src/components/customer/launch_pages/ListLaunchContents.tsx
import React from "react";
import { currentUser, isAuthed, refreshUser, type User } from "@/auth";
import { Link } from "react-router-dom";

type ContentGeneration = {
  id: number;
  customer_id: number;
  prompt_for?: string | null;
  url?: string | null;
  title: string | null;
  status: "idle" | "queued" | "processing" | "completed" | "failed";
  last_run_at: string | null;
  created_at?: string;
  updated_at?: string;
};

type Props = {
  customerId?: number;
  perPage?: number;
};

/* ========= CONFIG ========= */
const CONTEXT: "blog" | "youtube" | "topic" | "launch" = "launch";
const API_BASE_URL = `${import.meta.env.VITE_API_BASE}/api`;
const TOKEN_KEY = "toma_token";

function qs(params: Record<string, any>) {
  const s = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") s.append(k, String(v));
  });
  const str = s.toString();
  return str ? `?${str}` : "";
}

function fmt(ts: string | null) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString();
}

function cls(...xs: Array<string | null | false | undefined>) {
  return xs.filter(Boolean).join(" ");
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  if (!path.startsWith("/")) path = `/${path}`;
  const url = `${API_BASE_URL}${path}`.replace(/([^:]\/)\/+/g, "$1");
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
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
  }

  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) return undefined as T;
  return (await res.json()) as T;
}

function toNumberId(raw: unknown): number | undefined {
  if (raw == null) return undefined;
  const n =
    typeof raw === "string"
      ? parseInt(raw, 10)
      : typeof raw === "number"
      ? raw
      : Number(raw as any);
  return Number.isFinite(n) ? n : undefined;
}

// helper: fetch /customers/me
async function getCustomerIdFromMe(): Promise<number | undefined> {
  try {
    const res = await api<any>("/customers/me");
    const obj = (res?.data ?? res) || {};
    const id = obj?.id ?? obj?.customer_id;
    return Number.isFinite(id) ? Number(id) : undefined;
  } catch {
    return undefined;
  }
}

export default function ListLaunchContents({ customerId, perPage = 10 }: Props) {
  const [user, setUser] = React.useState<User | null>(null);
  const [customerIdFromAPI, setCustomerIdFromAPI] = React.useState<number | undefined>(undefined);

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const validCustomerId: number | undefined = React.useMemo(() => {
    const candidate =
      customerIdFromAPI ??
      customerId ??
      (user as any)?.customer_id ??
      (user as any)?.customer?.id ??
      (user as any)?.profile?.customer_id;

    return toNumberId(candidate);
  }, [customerIdFromAPI, customerId, user]);

  const [q, setQ] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [rows, setRows] = React.useState<ContentGeneration[]>([]);
  const [total, setTotal] = React.useState(0);

  React.useEffect(() => {
    const cu = currentUser();
    if (cu) {
      setUser(cu);
    } else if (isAuthed()) {
      refreshUser().then((ud) => ud && setUser(ud));
    }
  }, []);

  // fetch /customers/me if no id yet
  React.useEffect(() => {
    (async () => {
      if (!isAuthed()) return;
      const already = toNumberId(
        customerId ??
          (user as any)?.customer_id ??
          (user as any)?.customer?.id ??
          (user as any)?.profile?.customer_id
      );
      if (!already) {
        const id = await getCustomerIdFromMe();
        setCustomerIdFromAPI(id);
      }
    })();
  }, [customerId, user]);

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!validCustomerId) {
        setRows([]);
        setTotal(0);
        setError("No customer selected/available. Please make sure your account has a customer profile.");
        return;
      }

      const params = {
        customer_id: validCustomerId,
        prompt_for: CONTEXT,
        page,
        per_page: perPage,
        q,
      };

      const res = await api<any>(`/content-generations${qs(params)}`, {
        method: "GET",
      });

      if (res && typeof res === "object") {
        if (Array.isArray(res)) {
          setRows(res);
          setTotal(res.length);
        } else if (Array.isArray(res.data)) {
          setRows(res.data);
          setTotal(res.total ?? res.data.length ?? 0);
        } else if (Array.isArray(res.items)) {
          setRows(res.items);
          setTotal(res.total ?? res.items.length ?? 0);
        } else {
          setError(`Unexpected API response format. Keys: ${Object.keys(res).join(", ")}`);
          setRows([]);
          setTotal(0);
        }
      } else {
        setError("API returned empty or invalid response");
        setRows([]);
        setTotal(0);
      }
    } catch (e: any) {
      setError(e.message || "Failed to load");
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [validCustomerId, page, perPage, q]);

  React.useEffect(() => {
    if (user || !isAuthed()) load();
  }, [load, user]);

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <div className="p-4 md:p-6">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Launch Automation</h1>
        <div className="flex gap-2">
          <Link
            to="/customer/launch/new"
            className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm hover:bg-blue-700 transition-colors"
          >
            New Automation
          </Link>
          <button
            onClick={() => load()}
            className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      {!isAuthed() && (
        <div className="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3">
          <p className="text-sm text-yellow-800">
            You need to be logged in to view content generations. Please login to your account first.
          </p>
        </div>
      )}

      {isAuthed() && !validCustomerId && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-700">
            We couldn’t determine your customer ID. Ensure your user profile is linked to a customer, or pass <code>customerId</code> as a prop.
          </p>
        </div>
      )}

      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <input
          value={q}
          onChange={(e) => {
            setPage(1);
            setQ(e.target.value);
          }}
          placeholder="Search title…"
          className="w-full md:w-80 rounded-lg border px-3 py-2 outline-none focus:ring"
        />
        <div className="text-sm text-gray-500">
          {loading ? "Loading…" : `${total} result${total === 1 ? "" : "s"}`}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <table className="min-w-[640px] w-full text-left">
          <thead className="bg-gray-50 text-sm">
            <tr>
              <th className="px-3 py-2 font-medium">Title</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Last Run</th>
              <th className="px-3 py-2 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2">
                  <span className="block max-w-[32rem] truncate" title={r.title || ""}>
                    {r.title || <span className="text-gray-400 italic">—</span>}
                  </span>
                </td>

                <td className="px-3 py-2">
                  <span
                    className={cls(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                      r.status === "completed" && "bg-green-100 text-green-700",
                      r.status === "processing" && "bg-amber-100 text-amber-700",
                      r.status === "queued" && "bg-blue-100 text-blue-700",
                      r.status === "failed" && "bg-red-100 text-red-700",
                      r.status === "idle" && "bg-gray-100 text-gray-600"
                    )}
                  >
                    {r.status}
                  </span>
                </td>

                <td className="px-3 py-2">{fmt(r.last_run_at)}</td>

                <td className="px-3 py-2">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      to={`/customer/${CONTEXT}/view/${r.id}`}
                      className="rounded-md border px-2 py-1 hover:bg-gray-50 transition-colors text-blue-600 hover:text-blue-700"
                    >
                      View
                    </Link>
                  </div>
                </td>
              </tr>
            ))}

            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-gray-500">
                  No records yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="text-sm text-gray-500">Page {page} of {totalPages}</div>
        <div className="flex items-center gap-2">
          <button
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-gray-50"
          >
            Prev
          </button>
          <button
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <strong>Error:</strong> {error}
        </div>
      )}
    </div>
  );
}
