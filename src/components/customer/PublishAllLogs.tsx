// src/components/customer/blog_pages/PublishBlogLogs.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { currentUser } from "@/auth";

/* ========================= API base (reused) ========================= */
const RAW_BASE = String(import.meta.env.VITE_API_BASE || "").replace(/\/+$/g, "");
const API_BASE = RAW_BASE.endsWith("/api") ? RAW_BASE : `${RAW_BASE}/api`;
const TOKEN_KEY = "toma_token";

function norm(path: string) {
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`.replace(
    /([^:]\/)\/+/g,
    "$1"
  );
}
async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem(TOKEN_KEY);
  const res = await fetch(norm(path), {
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
    let msg = text || res.statusText || "Request failed";
    try {
      const j = JSON.parse(text);
      msg = j?.message || msg;
    } catch {}
    throw new Error(`HTTP ${res.status}: ${msg}`);
  }
  const ct = res.headers.get("content-type") || "";
  return (ct.includes("application/json")
    ? await res.json()
    : (undefined as any)) as T;
}

function getCustomerId(): number {
  const u: any = currentUser?.() ?? null;
  return (
    u?.customer_id ??
    u?.customer?.id ??
    u?.profile?.customer_id ??
    u?.company?.customer_id ??
    1
  );
}

const fmt = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString() : "—";
const ucfirst = (s: string) =>
  s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

/* ========================= Types we need ========================= */
type ContentGeneration = {
  id: number;
  customer_id: number;
  title: string | null;
  url: string | null;
};

type PublishLog = {
  id: number;
  content_generation_id: number;
  platform: string;
  post_type: "text" | "image" | "video";
  status: "queued" | "posted" | "failed";
  posted_on: string | null;
  provider_post_id: string | null;
  publicUrl: string | null;
  final_status?: string | null;
};

type Row = {
  gen: ContentGeneration;
  log: PublishLog;
  checking?: boolean;
  lastCheckedAt?: number | null;
  lastRawStatus?: string | null;
};

/* ============== Normalize/derive status ============== */
function normalizeStatus(
  s: string | null | undefined
): "queued" | "posted" | "failed" {
  const v = String(s || "").toLowerCase();
  if (["success", "published", "complete", "completed", "posted"].includes(v))
    return "posted";
  if (["fail", "failed", "error"].includes(v)) return "failed";
  return "queued";
}

function effectiveLogStatus(
  log: PublishLog | null | undefined
): "queued" | "posted" | "failed" {
  if (!log) return "queued";
  if (log.final_status) return normalizeStatus(log.final_status);
  return log.status ?? "queued";
}

/* ========================= The Logs Page ========================= */
export default function PublishBlogLogs() {
  const navigate = useNavigate();
  const customerId = useMemo(() => getCustomerId(), []);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [perPage] = useState(20);
  const [hasMore, setHasMore] = useState(true);

  const [rows, setRows] = useState<Row[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const intervalRef = useRef<number | null>(null);

  /* ------------------------ Load one page of gens ------------------------ */
  async function loadPage(p: number) {
    const qs = new URLSearchParams({
      customer_id: String(customerId),
      page: String(p),
      per_page: String(perPage),
    });

    const out = await api<any>(`/content-generations?${qs.toString()}`);
    const raw: any[] = out?.data ?? out ?? [];

    const gens: ContentGeneration[] = raw.map((g: any) => ({
      id: g.id,
      customer_id: g.customer_id,
      title: g.title ?? null,
      url: g.url ?? null,
    }));

    const meta = out?.meta;
    if (
      meta &&
      typeof meta?.current_page === "number" &&
      typeof meta?.last_page === "number"
    ) {
      setHasMore(meta.current_page < meta.last_page);
    } else {
      setHasMore((raw?.length ?? 0) === perPage);
    }

    return gens;
  }

  /* ------------------ For a generation, load ALL logs ------------------ */
  async function fetchLogsFor(genId: number): Promise<PublishLog[]> {
    const qs = new URLSearchParams({ content_generation_id: String(genId) });
    const js = await api<any>(`/publish/logs?${qs.toString()}`);
    return js?.data ?? [];
  }

  /* ----------------------------- Initial load ----------------------------- */
  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const gens = await loadPage(1);
        if (cancel) return;

        const rowsBuilt: Row[] = [];
        for (const g of gens) {
          const logs = await fetchLogsFor(g.id).catch(() => []);
          for (const log of logs) {
            rowsBuilt.push({ gen: g, log, checking: false, lastCheckedAt: null, lastRawStatus: null });
          }
        }

        if (cancel) return;
        setRows(rowsBuilt);
        setPage(1);
      } catch (e: any) {
        if (!cancel) setErr(e?.message || "Failed to load logs");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [customerId]);

  /* ------------------------------ Load more ------------------------------ */
  async function loadMore() {
    const next = page + 1;
    setLoading(true);
    try {
      const gens = await loadPage(next);
      const rowsBuilt: Row[] = [];
      for (const g of gens) {
        const logs = await fetchLogsFor(g.id).catch(() => []);
        for (const log of logs) {
          rowsBuilt.push({ gen: g, log, checking: false, lastCheckedAt: null, lastRawStatus: null });
        }
      }
      setRows((prev) => [...prev, ...rowsBuilt]);
      setPage(next);
    } catch (e: any) {
      setErr(e?.message || "Failed to load more");
    } finally {
      setLoading(false);
    }
  }

  /* ------------------------ Manual status check (one) ------------------------ */
  async function checkOne(rowIdx: number) {
    setRows((prev) => {
      const cp = [...prev];
      if (cp[rowIdx]) cp[rowIdx].checking = true;
      return cp;
    });
    try {
      let r = rows[rowIdx];
      if (!r) return;

      if (!r?.log?.provider_post_id) return;

      const subId = r.log!.provider_post_id!;
      const js = await api<any>(`/publish/status/${subId}`);
      const ui = normalizeStatus(js?.status);
      const publicUrl = js?.publicUrl ?? null;

      const newLog: PublishLog = {
        ...r.log,
        status: ui,
        publicUrl: publicUrl,
        posted_on:
          ui === "posted" ? new Date().toISOString() : r.log?.posted_on ?? null,
        final_status: r.log?.final_status ?? null,
      };

      updateRow(rowIdx, {
        log: newLog,
        checking: false,
        lastCheckedAt: Date.now(),
        lastRawStatus: String(js?.status || ""),
      });
    } catch {
      updateRow(rowIdx, {
        checking: false,
        lastCheckedAt: Date.now(),
        lastRawStatus: "error",
      });
    }
  }

  function updateRow(idx: number, patch: Partial<Row>) {
    setRows((prev) => {
      const cp = [...prev];
      if (!cp[idx]) return prev;
      cp[idx] = { ...cp[idx], ...patch };
      return cp;
    });
  }

  /* ---------------------- Auto-refresh queued statuses ---------------------- */
  useEffect(() => {
    if (!autoRefresh) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    intervalRef.current = window.setInterval(async () => {
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const eff = effectiveLogStatus(r.log);
        if (eff === "queued" && r.log?.provider_post_id && !r.checking) {
          await checkOne(i);
        }
      }
    }, 12000) as unknown as number;

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [autoRefresh, rows]);

  const anyQueued = rows.some(
    (r) => effectiveLogStatus(r.log) === "queued"
  );

  /* --------------------------------- UI --------------------------------- */
  return (
    <div className="min-h-screen bg-white p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold">Publish Logs · Blog</h1>
          <div className="text-sm text-gray-500">
            Showing logs directly from <code>publish_logs</code>.
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100"
            onClick={() => navigate("/customer/blog/list")}
          >
            Back
          </button>
          <label className="flex items-center gap-2 text-sm text-gray-600 select-none">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto refresh queued
          </label>
          <button
            className={`px-4 py-2 rounded-md ${
              anyQueued
                ? "bg-teal-600 text-white hover:bg-teal-700"
                : "bg-gray-200 text-gray-500"
            }`}
            disabled={!anyQueued}
            onClick={async () => {
              for (let i = 0; i < rows.length; i++) {
                const r = rows[i];
                if (
                  effectiveLogStatus(r.log) === "queued" &&
                  r.log?.provider_post_id
                ) {
                  await checkOne(i);
                }
              }
            }}
          >
            Refresh all queued
          </button>
        </div>
      </div>

      {err && <div className="mb-3 text-red-600">{err}</div>}

      <div className="overflow-x-auto border rounded-lg">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-700">
            <tr>
              <th className="px-3 py-2 w-16 text-left">GenID</th>
              <th className="px-3 py-2 text-left">Title</th>
              <th className="px-3 py-2 text-left">Platform</th>
              <th className="px-3 py-2 text-left">Type</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Posted On</th>
              <th className="px-3 py-2 text-left">Public URL</th>
              <th className="px-3 py-2 text-left">Submission ID</th>
              <th className="px-3 py-2 text-left w-40">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !loading && (
              <tr>
                <td colSpan={9} className="text-center text-gray-500 py-6">
                  No logs found.
                </td>
              </tr>
            )}

            {rows.map((r, idx) => {
              const eff = effectiveLogStatus(r.log);
              const badge =
                eff === "posted"
                  ? "text-green-700 bg-green-100"
                  : eff === "failed"
                  ? "text-red-700 bg-red-100"
                  : "text-amber-700 bg-amber-100";

              return (
                <tr key={`${r.gen.id}-${r.log.id}`} className="border-t">
                  <td className="px-3 py-2 align-top">{r.gen.id}</td>
                  <td className="px-3 py-2 align-top">
                    <div className="font-medium text-gray-900">
                      {r.gen.title || "(untitled)"}
                    </div>
                    {r.gen.url && (
                      <a
                        href={r.gen.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Source link
                      </a>
                    )}
                  </td>
                  <td className="px-3 py-2 align-top">
                    {r.log.platform.replace(/_/g, " ")}
                  </td>
                  <td className="px-3 py-2 align-top">
                    {ucfirst(r.log.post_type)}
                  </td>
                  <td className="px-3 py-2 align-top">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded ${badge}`}
                    >
                      {eff === "posted"
                        ? "Published"
                        : eff === "failed"
                        ? "Failed"
                        : "Queued"}
                    </span>
                    {r.checking && (
                      <span className="ml-2 text-xs text-gray-500">
                        checking…
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 align-top">{fmt(r.log.posted_on)}</td>
                  <td className="px-3 py-2 align-top">
                    {r.log.publicUrl ? (
                      <a
                        href={r.log.publicUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        View
                      </a>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 align-top">
                    <div className="font-mono text-[11px] break-all text-gray-700">
                      {r.log.provider_post_id || "—"}
                    </div>
                    <div className="text-[10px] text-gray-400">
                      {r.lastCheckedAt && (
                        <>last {new Date(r.lastCheckedAt).toLocaleTimeString()}</>
                      )}
                      {r.lastRawStatus && <> · raw: {r.lastRawStatus}</>}
                    </div>
                  </td>
                  <td className="px-3 py-2 align-top">
                    <div className="flex items-center gap-2">
                      <button
                        className="px-3 py-1 rounded-md border border-gray-300 hover:bg-gray-100"
                        onClick={() => checkOne(idx)}
                        disabled={r.checking || !r.log?.provider_post_id}
                      >
                        Check now
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {loading && (
              <tr>
                <td colSpan={9} className="text-center py-4 text-gray-500">
                  Loading…
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="text-sm text-gray-500">{rows.length} logs</div>
        <div className="flex items-center gap-2">
          <button
            className={`px-4 py-2 rounded-md ${
              hasMore
                ? "bg-gray-100 hover:bg-gray-200"
                : "bg-gray-200 text-gray-400"
            } border border-gray-300`}
            disabled={!hasMore || loading}
            onClick={() => void loadMore()}
          >
            Load more
          </button>
        </div>
      </div>
    </div>
  );
}
