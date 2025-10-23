// src/components/customer/PublishedLogs.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { currentUser } from "@/auth";
import { toast } from "react-toastify";

/* ========================= API base (reused) ========================= */
const RAW_BASE = String(import.meta.env.VITE_API_BASE || "").replace(/\/+$/g, "");
const API_BASE = RAW_BASE.endsWith("/api") ? RAW_BASE : `${RAW_BASE}/api`;
const TOKEN_KEY = "toma_token";

function norm(path: string) {
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`.replace(
    /([^:]\/)\/+?/g,
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
  return (ct.includes("application/json") ? await res.json() : (undefined as any)) as T;
}

function getCustomerIdFallback(): number {
  const u: any = currentUser?.() ?? null;
  return (
    u?.customer_id ??
    u?.customer?.id ??
    u?.profile?.customer_id ??
    u?.company?.customer_id ??
    1
  );
}

const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : "—");
const ucfirst = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

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
  provider_response?: unknown | null;
};
type Row = {
  gen: ContentGeneration;
  log: PublishLog;
  checking?: boolean;
  lastCheckedAt?: number | null;
  lastRawStatus?: string | null;
};
type MeResponse = { data?: { id?: number; customer_id?: number } | null };

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
  return (log.status as any) ?? "queued";
}

/* ============== provider_response JSON helpers + modal ============== */
function toObject(x: unknown): any {
  if (x == null) return null;
  if (typeof x === "string") { try { return JSON.parse(x); } catch { return { raw: x }; } }
  return x;
}
function prettyJson(x: unknown): string {
  const o = toObject(x);
  try { return JSON.stringify(o, null, 2); } catch { return String(x ?? ""); }
}

function Modal({
  open, onClose, title, children,
}: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" aria-modal="true" role="dialog" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative z-10 w-[min(900px,92vw)] max-h-[85vh] bg-white rounded-xl shadow-lg border p-4 md:p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="px-3 py-1.5 rounded-md border border-gray-300 hover:bg-gray-100">Close</button>
        </div>
        <div className="overflow-auto">{children}</div>
      </div>
    </div>
  );
}

/* ========================= The Logs Page ========================= */
const VALID_CONTEXTS = new Set(["all", "blog", "youtube", "launch", "topic"]);

export default function PublishedLogs() {
  const { context: ctxParam } = useParams<{ context?: string }>();
  const context = ctxParam?.toLowerCase() ?? "all";
  const validContext = VALID_CONTEXTS.has(context) ? context : "all";

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [perPage] = useState(20);
  const [hasMore, setHasMore] = useState(true);

  const [rows, setRows] = useState<Row[]>([]);
  const intervalRef = useRef<number | null>(null);

  // 🔎 From/To (YYYY-MM-DD) synced to URL
  const urlFrom = searchParams.get("from") || "";
  const urlTo = searchParams.get("to") || "";
  const [fromDate, setFromDate] = useState<string>(urlFrom);
  const [toDate, setToDate] = useState<string>(urlTo);

  const titleLabel = validContext === "all" ? "All" : ucfirst(validContext);

  // Modal state
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsRow, setDetailsRow] = useState<Row | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsErr, setDetailsErr] = useState<string | null>(null);

  // Customer
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [customerErr, setCustomerErr] = useState<string | null>(null);
  const [customerLoading, setCustomerLoading] = useState(true);

  // ✅ Resolve customer_id first, then fetch data (prevents ?customer_id=null)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setCustomerLoading(true);
      setCustomerErr(null);
      try {
        // Prefer server source
        const me = await api<MeResponse>("/customers/me");
        const cid = me?.data?.customer_id ?? null;
        const resolved = cid ?? getCustomerIdFallback();
        if (!cancelled) setCustomerId(Number(resolved));
      } catch (e: any) {
        // Fallback to local currentUser if /customers/me fails
        const fallback = getCustomerIdFallback();
        if (!fallback) {
          if (!cancelled)
            setCustomerErr(
              "Could not determine customer_id. Make sure you're logged in and /customers/me is protected."
            );
        } else {
          if (!cancelled) setCustomerId(Number(fallback));
        }
      } finally {
        if (!cancelled) setCustomerLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  /* ------------------------ Load one page of gens ------------------------ */
  async function loadPage(p: number) {
    if (customerId == null) {
      // Guard so we never hit the API with ?customer_id=null
      throw new Error("Customer not resolved yet");
    }
    const qs = new URLSearchParams({
      customer_id: String(customerId),
      page: String(p),
      per_page: String(perPage),
    });
    if (validContext !== "all") {
      qs.set("prompt_for", validContext);
    }
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

  /* ----------------------------- Initial + context load ----------------------------- */
  useEffect(() => {
    // Don’t start until customerId is known
    if (customerId == null) return;

    let cancel = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        // reset when customer/context changes
        setRows([]);
        setPage(1);
        const gens = await loadPage(1);
        if (cancel) return;

        const rowsBuilt: Row[] = [];
        for (const g of gens) {
          const logs = await fetchLogsFor(g.id).catch(() => []);
          for (const log of logs) {
            rowsBuilt.push({
              gen: g,
              log,
              checking: false,
              lastCheckedAt: null,
              lastRawStatus: null,
            });
          }
        }
        if (cancel) return;
        setRows(rowsBuilt);
      } catch (e: any) {
        if (!cancel) setErr(e?.message || "Failed to load logs");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [customerId, validContext]);

  /* ------------------------------ Load more ------------------------------ */
  async function loadMore() {
    if (customerId == null) return;
    const next = page + 1;
    setLoading(true);
    try {
      const gens = await loadPage(next);
      const rowsBuilt: Row[] = [];
      for (const g of gens) {
        const logs = await fetchLogsFor(g.id).catch(() => []);
        for (const log of logs) {
          rowsBuilt.push({
            gen: g,
            log,
            checking: false,
            lastCheckedAt: null,
            lastRawStatus: null,
          });
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
  function updateRow(idx: number, patch: Partial<Row>) {
    setRows((prev) => {
      const cp = [...prev];
      if (!cp[idx]) return prev;
      cp[idx] = { ...cp[idx], ...patch };
      return cp;
    });
  }
  async function checkOne(rowIdx: number) {
    setRows((prev) => {
      const cp = [...prev];
      if (cp[rowIdx]) cp[rowIdx].checking = true;
      return cp;
    });
    try {
      const r = rows[rowIdx];
      if (!r?.log?.provider_post_id) return;

      const subId = r.log.provider_post_id;
      const js = await api<any>(`/publish/status/${subId}`);
      const ui = normalizeStatus(js?.status);
      const publicUrl = js?.publicUrl ?? null;

      const newLog: PublishLog = {
        ...r.log,
        status: ui,
        publicUrl,
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

  /* ---------------------- Auto-refresh queued statuses ---------------------- */
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current as any);
      intervalRef.current = null;
    }
    if (!rows.length) return;

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
        clearInterval(intervalRef.current as any);
        intervalRef.current = null;
      }
    };
  }, [rows]);

  /* --------------------------- Date range filtering --------------------------- */
  function startOfDay(d: Date) {
    const c = new Date(d);
    c.setHours(0, 0, 0, 0);
    return c;
  }
  function endOfDay(d: Date) {
    const c = new Date(d);
    c.setHours(23, 59, 59, 999);
    return c;
  }
  const fromTs = useMemo(
    () => (fromDate ? startOfDay(new Date(fromDate)).getTime() : null),
    [fromDate]
  );
  const toTs = useMemo(
    () => (toDate ? endOfDay(new Date(toDate)).getTime() : null),
    [toDate]
  );

  const filteredRows = useMemo(() => {
    if (!fromTs && !toTs) return rows;
    return rows.filter((r) => {
      if (!r.log?.posted_on) return false;
      const t = new Date(r.log.posted_on).getTime();
      if (Number.isNaN(t)) return false;
      if (fromTs && t < fromTs) return false;
      if (toTs && t > toTs) return false;
      return true;
    });
  }, [rows, fromTs, toTs]);

  /* ------------------------ On-demand provider_response modal ------------------------ */
  async function openDetails(row: Row) {
    setDetailsOpen(true);
    setDetailsErr(null);

    if (row.log.provider_response != null) {
      setDetailsRow(row);
      setDetailsLoading(false);
      return;
    }

    setDetailsLoading(true);
    try {
      const qs = new URLSearchParams({
        content_generation_id: String(row.gen.id),
        platform: row.log.platform,
        post_type: row.log.post_type,
      }).toString();

      const resp = await api<any>(`/publish/logs/latest?${qs}`);
      const latest = resp?.data ?? resp;

      const mergedLog: PublishLog = {
        ...row.log,
        provider_response: latest?.provider_response ?? null,
        publicUrl: row.log.publicUrl ?? latest?.publicUrl ?? null,
      };
      const mergedRow: Row = { ...row, log: mergedLog };

      setDetailsRow(mergedRow);
      setRows(prev =>
        prev.map(r =>
          r.gen.id === row.gen.id && r.log.id === row.log.id ? mergedRow : r
        )
      );
    } catch (e: any) {
      setDetailsErr(e?.message || "Failed to load provider response");
      setDetailsRow(row);
    } finally {
      setDetailsLoading(false);
    }
  }

  /* --------------------------------- UI --------------------------------- */
  return (
    <div className="min-h-screen bg-white p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold">Publish Logs · {titleLabel}</h1>
          <div className="text-sm text-gray-500">
            Showing logs directly from <code>publish_logs</code>
            {validContext !== "all" ? (
              <> · filtered by <code>prompt_for={validContext}</code></>
            ) : null}
            .
          </div>
          {customerLoading && (
            <div className="text-xs text-gray-500 mt-1">Resolving customer…</div>
          )}
          {customerErr && (
            <div className="text-xs text-red-600 mt-1">{customerErr}</div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100"
            onClick={() => navigate("/customer/dashboard")}
          >
            Back
          </button>
        </div>
      </div>

      {/* 🔎 Date range controls */}
      <div className="mb-4 p-3 border rounded-lg bg-gray-50 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-gray-600 mb-1">From</label>
          <input
            type="date"
            className="px-3 py-2 border rounded-md bg-white"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">To</label>
          <input
            type="date"
            className="px-3 py-2 border rounded-md bg-white"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>
        <button
          className="px-4 py-2 rounded-md border border-gray-300 bg-white hover:bg-gray-100"
          onClick={() => {
            const next = new URLSearchParams(searchParams);
            if (fromDate) next.set("from", fromDate);
            else next.delete("from");
            if (toDate) next.set("to", toDate);
            else next.delete("to");
            setSearchParams(next, { replace: true });
          }}
        >
          Apply
        </button>
        {(fromDate || toDate) && (
          <button
            className="px-4 py-2 rounded-md border border-gray-300 bg-white hover:bg-gray-100"
            onClick={() => {
              setFromDate("");
              setToDate("");
              const next = new URLSearchParams(searchParams);
              next.delete("from");
              next.delete("to");
              setSearchParams(next, { replace: true });
            }}
          >
            Clear
          </button>
        )}
        <div className="ml-auto" />
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
            {filteredRows.length === 0 && !loading && (
              <tr>
                <td colSpan={9} className="text-center text-gray-500 py-6">
                  No logs found
                  {fromDate || toDate ? " in this date range." : "."}
                </td>
              </tr>
            )}

            {filteredRows.map((r) => {
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
                  <td className="px-3 py-2 align-top">{ucfirst(r.log.post_type)}</td>

                  {/* Status: clickable underlined pill to open modal */}
                  <td className="px-3 py-2 align-top">
                    <button
                      onClick={() => openDetails(r)}
                      title="View provider response"
                      className={`cursor-pointer inline-flex items-center px-2 py-0.5 rounded transition
                        underline underline-offset-2
                        ${eff === "posted"
                          ? "text-green-700 bg-green-100 hover:bg-green-200"
                          : eff === "failed"
                          ? "text-red-700 bg-red-100 hover:bg-red-200"
                          : "text-amber-700 bg-amber-100 hover:bg-amber-200"}`}
                    >
                      {eff === "posted" ? "Published" : eff === "failed" ? "Failed" : "Queued"}
                    </button>

                    {r.checking && (
                      <span className="ml-2 text-xs text-gray-500">checking…</span>
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
                        onClick={() => {
                          const idx = rows.findIndex(
                            (x) => x.log.id === r.log.id && x.gen.id === r.gen.id
                          );
                          if (idx >= 0) void checkOne(idx);
                        }}
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
        <div className="text-sm text-gray-500">
          {filteredRows.length} logs
          {fromDate || toDate ? " (filtered)" : ""}
        </div>
        <div className="flex items-center gap-2">
          <button
            className={`px-4 py-2 rounded-md ${
              hasMore ? "bg-gray-100 hover:bg-gray-200" : "bg-gray-200 text-gray-400"
            } border border-gray-300`}
            disabled={!hasMore || loading}
            onClick={() => void loadMore()}
          >
            Load more
          </button>
        </div>
      </div>

      {/* Provider response modal */}
      <Modal
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        title={
          detailsRow
            ? `Provider Response · Gen #${detailsRow.gen.id} · ${detailsRow.log.platform} (${detailsRow.log.post_type})`
            : "Provider Response"
        }
      >
        {detailsLoading && <div className="text-sm text-gray-600">Loading…</div>}
        {detailsErr && <div className="text-sm text-red-600 mb-2">{detailsErr}</div>}

        {!detailsLoading && !detailsErr && (
          detailsRow?.log?.provider_response ? (
            <pre className="text-xs bg-gray-50 border rounded-md p-3 overflow-auto">
              {prettyJson(detailsRow.log.provider_response)}
            </pre>
          ) : (
            <div className="text-sm text-gray-600">No provider response available.</div>
          )
        )}
      </Modal>
    </div>
  );
}
