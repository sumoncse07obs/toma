// src/components/admin/customer/PostLogs.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

/* ========================= tiny API helper ========================= */
const RAW_BASE = String(import.meta.env.VITE_API_BASE || "").replace(/\/+$/g, "");
const API_BASE = RAW_BASE.endsWith("/api") ? RAW_BASE : `${RAW_BASE}/api`;
const TOKEN_KEY = "toma_token";
const norm = (p: string) => `${API_BASE}${p.startsWith("/") ? p : `/${p}`}`.replace(/([^:]\/)\/+/g, "$1");
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
    try { const j = JSON.parse(text); throw new Error(j?.message || res.statusText); }
    catch { throw new Error(text || res.statusText); }
  }
  const ct = res.headers.get("content-type") || "";
  return (ct.includes("application/json") ? await res.json() : (undefined as any)) as T;
}
const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : "—");
const ucfirst = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/* ========================= types ========================= */
type Gen = { id: number; title: string | null; url: string | null; };
type Log = {
  id: number;
  platform: string;
  post_type: "text" | "image" | "video";
  status: "queued" | "posted" | "failed";
  final_status?: string | null;
  posted_on: string | null;
  provider_post_id: string | null; // Submission ID
  publicUrl: string | null;
};

/* normalize → ui */
function normalizeStatus(s: string | null | undefined): "queued" | "posted" | "failed" {
  const v = String(s || "").toLowerCase();
  if (["success", "published", "complete", "completed", "posted"].includes(v)) return "posted";
  if (["fail", "failed", "error"].includes(v)) return "failed";
  return "queued";
}

/* backoff helpers */
const START_DELAY_MS = 5000;   // 5s
const MAX_DELAY_MS   = 60000;  // 60s
const JITTER_MS      = 400;
const nextDelay = (d: number) => Math.min(Math.round(d * 1.7) + Math.floor(Math.random() * JITTER_MS), MAX_DELAY_MS);

/* fixed 30s cadence for DB-driven rechecks */
const POLL_MS = 30000;

export default function PostLogs() {
  const { id } = useParams<{ id: string }>();
  const postId = Number(id);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [gen, setGen] = useState<Gen | null>(null);
  const [logs, setLogs] = useState<Log[]>([]);

  // auto-check state per row
  type AutoMeta = { checking: boolean; delay: number; nextAt: number | null; lastRaw?: string | null; };
  const [auto, setAuto] = useState<Record<number, AutoMeta>>({}); // key = log.id
  const [autoOn, setAutoOn] = useState(true);

  const ticker = useRef<number | null>(null);
  const poller = useRef<number | null>(null);
  const isBatchChecking = useRef(false);

  /* -------------------- common: refresh logs list -------------------- */
  async function refreshLogs() {
    const logsResp = await api<any>(`/publish/logs?content_generation_id=${postId}`);
    const list: Log[] = logsResp?.data ?? [];
    setLogs(list);

    // re-seed autos for any new rows (keep existing where possible)
    const now = Date.now();
    setAuto(prev => {
      const merged: Record<number, AutoMeta> = { ...prev };
      for (const row of list) {
        const effective =
          row.final_status === "published" ? "posted" :
          row.final_status === "failed" ? "failed" :
          row.status;

        if (!merged[row.id]) {
          merged[row.id] = {
            checking: false,
            delay: START_DELAY_MS,
            nextAt: (effective === "queued" && row.provider_post_id) ? now + START_DELAY_MS : null,
            lastRaw: null,
          };
        } else {
          // if it became non-queued, stop auto
          if (effective !== "queued") merged[row.id].nextAt = null;
        }
      }
      return merged;
    });
  }

  /* -------------------- fetch post + all its logs (initial) -------------------- */
  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const genResp = await api<any>(`/content-generations/${postId}`);
        const g = genResp?.data ?? genResp;
        if (cancel) return;
        setGen({ id: g.id, title: g.title ?? null, url: g.url ?? null });

        if (cancel) return;
        await refreshLogs();
      } catch (e: any) {
        if (!cancel) setErr(e?.message || "Failed to load logs");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [postId]);

  /* -------------------- manual check a single row -------------------- */
  async function checkNow(logIndex: number) {
    const row = logs[logIndex];
    if (!row?.provider_post_id) return;

    // flag checking
    setAuto(prev => ({ ...prev, [row.id]: { ...(prev[row.id] || { delay: START_DELAY_MS, nextAt: null }), checking: true } }));

    try {
      const js = await api<any>(`/publish/status/${row.provider_post_id}`);
      const ui = normalizeStatus(js?.status);

      setLogs(prev => {
        const cp = [...prev];
        const current = cp[logIndex];
        if (!current) return prev;
        cp[logIndex] = {
          ...current,
          status: ui === "posted" ? "posted" : ui === "failed" ? "failed" : "queued",
          publicUrl: js?.publicUrl ?? current.publicUrl,
          posted_on: ui === "posted" ? new Date().toISOString() : current.posted_on,
        };
        return cp;
      });

      setAuto(prev => {
        const meta = prev[row.id] || { delay: START_DELAY_MS, nextAt: null };
        const stillQueued = normalizeStatus(js?.status) === "queued";
        return {
          ...prev,
          [row.id]: {
            checking: false,
            lastRaw: String(js?.status || ""),
            delay: stillQueued ? nextDelay(meta.delay) : meta.delay,
            nextAt: stillQueued ? Date.now() + nextDelay(meta.delay) : null,
          },
        };
      });
    } catch {
      // on error, keep backoff schedule moving
      setAuto(prev => {
        const meta = prev[row.id] || { delay: START_DELAY_MS, nextAt: null };
        const d = nextDelay(meta.delay);
        return { ...prev, [row.id]: { ...meta, checking: false, nextAt: Date.now() + d, delay: d, lastRaw: "error" } };
      });
    }
  }

  /* -------------------- global auto-check ticker (per-row backoff) -------------------- */
  useEffect(() => {
    // clear on unmount
    return () => { if (ticker.current) { clearInterval(ticker.current); ticker.current = null; } };
  }, []);

  useEffect(() => {
    if (ticker.current) { clearInterval(ticker.current); ticker.current = null; }
    if (!autoOn) return;

    ticker.current = window.setInterval(async () => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;

      const now = Date.now();
      // loop rows; fire checks that are due
      for (let i = 0; i < logs.length; i++) {
        const r = logs[i];
        const meta = auto[r.id];
        if (!r?.provider_post_id) continue;

        // prefer final_status when present
        const effective =
          r.final_status === "published" ? "posted" :
          r.final_status === "failed" ? "failed" :
          r.status;

        if (effective !== "queued") continue;         // only auto-check queued
        if (!meta || meta.checking) continue;         // skip if already checking
        if (meta.nextAt && now >= meta.nextAt) {
          await checkNow(i);                           // updates both logs[] and auto[]
        }
      }
    }, 1000) as unknown as number;

    return () => { if (ticker.current) { clearInterval(ticker.current); ticker.current = null; } };
  }, [autoOn, logs, auto]);

  /* -------------------- fixed 30s poll: check DB-eligible rows -------------------- */
  useEffect(() => {
    // clear on unmount
    return () => { if (poller.current) { clearInterval(poller.current); poller.current = null; } };
  }, []);

  useEffect(() => {
    if (poller.current) { clearInterval(poller.current); poller.current = null; }

    // always run, independent of autoOn toggle (you said: "on every 30s I want to check...")
    poller.current = window.setInterval(async () => {
      if (isBatchChecking.current) return;
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;

      isBatchChecking.current = true;
      try {
        // pick rows with empty final_status AND a provider_post_id
        const targets: number[] = [];
        for (let i = 0; i < logs.length; i++) {
          const r = logs[i];
          const finalEmpty = !r.final_status || r.final_status.trim() === "";
          if (finalEmpty && r.provider_post_id) targets.push(i);
        }

        // sequential checks to avoid rate-limiting
        for (const idx of targets) {
          await checkNow(idx);
        }

        // refresh from DB to capture any new rows or backend-updated fields (e.g., final_status)
        await refreshLogs();
      } catch {
        // swallow polling errors
      } finally {
        isBatchChecking.current = false;
      }
    }, POLL_MS) as unknown as number;

    return () => { if (poller.current) { clearInterval(poller.current); poller.current = null; } };
  }, [logs]); // rebind when logs array identity changes

  /* -------------------- derived flags -------------------- */
  const anyAutoActive = useMemo(
    () => Object.values(auto).some(m => m.nextAt !== null),
    [auto]
  );

  /* -------------------------------- UI -------------------------------- */
  return (
    <div className="min-h-screen bg-white p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold">Publish Logs · Post #{postId}</h1>
          {gen?.title && <div className="text-sm text-gray-700">{gen.title}</div>}
          {gen?.url && (
            <a href={gen.url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">
              Source link
            </a>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* clock icon that animates when auto is running */}
          <span className="inline-flex items-center text-sm text-gray-600">
            <span className={`mr-2 ${anyAutoActive && autoOn ? "animate-pulse" : ""}`} aria-hidden>
              🕒
            </span>
            {anyAutoActive && autoOn ? "Auto-checking…" : "Idle"}
          </span>

          <label className="flex items-center gap-2 text-sm text-gray-600 select-none">
            <input type="checkbox" checked={autoOn} onChange={(e) => setAutoOn(e.target.checked)} />
            Auto check
          </label>

          <button
            className="px-4 py-2 rounded-md border border-gray-300 hover:bg-gray-100"
            onClick={() => navigate(`/customer/blog/view/${postId}`)}
          >
            Back to post
          </button>
        </div>
      </div>

      {err && <div className="mb-3 text-red-600">{err}</div>}

      <div className="overflow-x-auto border rounded-lg">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-700">
            <tr>
              <th className="text-left px-3 py-2">Platform</th>
              <th className="text-left px-3 py-2">Type</th>
              <th className="text-left px-3 py-2">Status</th>
              <th className="text-left px-3 py-2">Posted On</th>
              <th className="text-left px-3 py-2">Public URL</th>
              <th className="text-left px-3 py-2">Submission ID</th>
              <th className="text-left px-3 py-2 w-40">Actions</th>
            </tr>
          </thead>
          <tbody>
            {!loading && logs.length === 0 && (
              <tr><td colSpan={7} className="text-center text-gray-500 py-6">No logs yet.</td></tr>
            )}

            {logs.map((r, idx) => {
              const effective =
                r.final_status === "published" ? "posted" :
                r.final_status === "failed" ? "failed" :
                r.status;

              const badge =
                effective === "posted" ? "text-green-700 bg-green-100"
                : effective === "failed" ? "text-red-700 bg-red-100"
                : "text-amber-700 bg-amber-100";

              const meta = auto[r.id];
              const nextIn =
                meta?.nextAt ? Math.max(0, Math.round((meta.nextAt - Date.now()) / 1000)) : null;

              return (
                <tr key={r.id} className="border-top">
                  <td className="px-3 py-2 align-top">{r.platform.replace(/_/g, " ")}</td>
                  <td className="px-3 py-2 align-top">{ucfirst(r.post_type)}</td>

                  <td className="px-3 py-2 align-top">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded ${badge}`}>
                      {effective === "posted" ? "Published" : effective === "failed" ? "Failed" : "Queued"}
                    </span>
                    {/* show per-row auto/backoff info if queued */}
                    {effective === "queued" && r.provider_post_id && (
                      <span className="ml-2 text-[11px] text-gray-500">
                        {meta?.checking ? "checking…" : nextIn !== null ? `next ${nextIn}s` : ""}
                      </span>
                    )}
                  </td>

                  <td className="px-3 py-2 align-top">{fmt(r.posted_on)}</td>

                  <td className="px-3 py-2 align-top">
                    {r.publicUrl ? (
                      <a href={r.publicUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                        View
                      </a>
                    ) : <span className="text-gray-400">—</span>}
                  </td>

                  <td className="px-3 py-2 align-top">
                    <div className="font-mono text-[11px] break-all text-gray-700">{r.provider_post_id || "—"}</div>
                    {meta?.lastRaw && <div className="text-[10px] text-gray-400">raw: {meta.lastRaw}</div>}
                  </td>

                  <td className="px-3 py-2 align-top">
                    <div className="flex items-center gap-2">
                      <button
                        className="px-3 py-1 rounded-md border border-gray-300 hover:bg-gray-100"
                        onClick={() => checkNow(idx)}
                        disabled={!r.provider_post_id || meta?.checking}
                      >
                        Check now
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {loading && (
              <tr><td colSpan={7} className="text-center py-4 text-gray-500">Loading…</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
