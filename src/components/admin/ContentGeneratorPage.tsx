// src/components/admin/ContentGeneratorPage.tsx
import React from "react";
export type Customer = {
  id: number;
  customer_number: string;
  business_name?: string | null;
  city?: string | null;
  state?: string | null;
  user?: { id: number; name: string; email: string };
};

type CustomersListResponse = {
  data: Customer[];
  total: number;
  page: number;
  per_page: number;
};

type GenerationStartResponse =
  | { outputs: Record<string, string | null>; message?: string }
  | { job_id: string; message?: string };

type GenerationStatusResponse = {
  status: "queued" | "processing" | "completed" | "failed";
  progress?: number; // 0-100
  outputs?: Record<string, string | null> | string | null;
  error?: string;
};

/** ---- History Row (adapt to your schema) ---- */
export type ContentGeneration = {
  id: number;
  customer_id: number;
  url: string;
  title?: string | null;
  status: "queued" | "processing" | "completed" | "failed";
  progress?: number | null;
  outputs?: Record<string, string | null> | string | null; // may be TEXT(JSON)
  error?: string | null;
  created_at: string;
  updated_at: string;
  // any other columns (e.g., job_id, url_hash, etc.) will appear under "All database fields"
};

type GenerationsListResponse = {
  data: ContentGeneration[];
  total: number;
  page: number;
  per_page: number;
};

/* =========================
   API helper
   ========================= */

const API_BASE = `${import.meta.env.VITE_API_BASE}/api`


async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`.replace(/([^:]\/)\/+/g, "$1");
  const token = localStorage.getItem("token");

  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  return res.json();
}

const unwrap = <T,>(res: any): T => (res?.data ?? res) as T;

const CustomersAPI = {
  async list(params?: { q?: string; page?: number; per_page?: number }) {
    const qs = new URLSearchParams();
    if (params?.q) qs.set("q", params.q);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.per_page) qs.set("per_page", String(params.per_page));
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return api<CustomersListResponse>(`/api/customers${suffix}`);
  },
};

const ContentGenAPI = {
  async start(payload: { customer_id: number; url: string }) {
    const res = await api<any>(`/api/generate-contents`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return unwrap<GenerationStartResponse>(res);
  },
  async status(jobId: string) {
    const res = await api<any>(`/api/generate-contents/${jobId}`);
    return unwrap<GenerationStatusResponse>(res);
  },
};

const HistoryAPI = {
  async list(params: { customer_id: number; page?: number; per_page?: number; q?: string }) {
    const qs = new URLSearchParams();
    qs.set("customer_id", String(params.customer_id));
    if (params.page) qs.set("page", String(params.page));
    if (params.per_page) qs.set("per_page", String(params.per_page));
    if (params.q) qs.set("q", params.q);
    return api<GenerationsListResponse>(`/api/content-generations?${qs.toString()}`);
  },
  async get(id: number) {
    const res = await api<any>(`/api/content-generations/${id}`);
    return unwrap<ContentGeneration>(res);
  },
  async delete(id: number) {
    await api<void>(`/api/content-generations/${id}`, { method: "DELETE" });
  },
};

/* =========================
   UI primitives
   ========================= */

function Button(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "ghost" | "danger";
  }
) {
  const { variant = "primary", className = "", ...rest } = props;
  const base =
    "inline-flex items-center justify-center rounded-xl px-3 py-2 text-xs md:text-sm font-medium transition shadow-sm";
  const styles = {
    primary:
      "bg-indigo-600 text-white hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
    ghost: "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50",
    danger:
      "bg-rose-600 text-white hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500",
  } as const;
  return <button className={`${base} ${styles[variant]} ${className}`} {...rest} />;
}

function Input(
  props: React.InputHTMLAttributes<HTMLInputElement> & { label?: string; hint?: string }
) {
  const { label, hint, className = "", ...rest } = props;
  return (
    <label className="block">
      {label ? <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span> : null}
      <input
        className={`w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 ${className}`}
        {...rest}
      />
      {hint ? <span className="mt-1 block text-xs text-slate-500">{hint}</span> : null}
    </label>
  );
}

function Select(
  props: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string }
) {
  const { label, className = "", ...rest } = props;
  return (
    <label className="block">
      {label ? (
        <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      ) : null}
      <select
        className={`w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 ${className}`}
        {...rest}
      />
    </label>
  );
}

function KeyValueBlock({ k, v }: { k: string; v: string | null | undefined }) {
  return (
    <div className="rounded-xl border border-slate-200 p-4 shadow-sm">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {k.replace(/_/g, " ")}
      </div>
      <pre className="whitespace-pre-wrap break-words text-sm text-slate-800">
        {v ?? "—"}
      </pre>
    </div>
  );
}

/* ===== Fancy output cards (to match your Core/TikTok look) ===== */

function GroupCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-semibold">{title}</h3>
        <span className="text-xs text-slate-400">— Back</span>
      </div>
      {children}
    </section>
  );
}

function FieldBox({
  label,
  value,
  minHeight = 200,
}: {
  label: string;
  value: string | null | undefined;
  minHeight?: number;
}) {
  return (
    <div className="rounded-xl border border-slate-200 p-4 shadow-sm">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
        style={{ minHeight }}
      >
        <pre className="whitespace-pre-wrap break-words">{value ?? "—"}</pre>
      </div>
    </div>
  );
}

/* Which outputs belong to which pretty section */
const OUTPUT_GROUPS: Array<{
  id: "core" | "tiktok" | "other";
  title: string;
  keys: string[];
  grid?: string; // optional override for grid cols
}> = [
  {
    id: "core",
    title: "Core",
    keys: ["summary", "short_summary", "video_script", "image_concept"],
    grid: "grid grid-cols-1 gap-4 md:grid-cols-2", // 2x2 like screenshot
  },
  {
    id: "tiktok",
    title: "TikTok",
    keys: ["tiktok_video_title", "tiktok_video_content"],
    grid: "grid grid-cols-1 gap-4 md:grid-cols-2", // 1 row, 2 cols
  },
  // "other" is built at render time for any remaining fields
];

/* =========================
   Helpers
   ========================= */

function formatDate(iso?: string) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso;
  }
}

function badgeForStatus(status: ContentGeneration["status"]) {
  const map: Record<string, string> = {
    queued: "bg-slate-100 text-slate-700",
    processing: "bg-amber-100 text-amber-800",
    completed: "bg-emerald-100 text-emerald-800",
    failed: "bg-rose-100 text-rose-800",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${map[status]}`}>
      {status}
    </span>
  );
}

// parse JSON or accept object
function parseMaybeJson<T = unknown>(val: unknown): T | null {
  if (val == null) return null;
  if (typeof val === "string") {
    try { return JSON.parse(val) as T; } catch { return null; }
  }
  if (typeof val === "object") return val as T;
  return null;
}

/* Output normalization so Load == Generate */
function normalizeOutputs(input: unknown): Record<string, string | null> {
  const raw =
    parseMaybeJson<any>(input) ??
    (typeof input === "object" && input ? (input as any) : null);
  if (!raw) return {};
  const candidate = raw.outputs ?? raw.result ?? raw.data ?? raw;
  if (!candidate || typeof candidate !== "object") return {};
  const out: Record<string, string | null> = {};
  for (const [k, v] of Object.entries(candidate)) {
    if (v == null) out[k] = null;
    else if (typeof v === "string") out[k] = v;
    else out[k] = JSON.stringify(v, null, 2);
  }
  return out;
}

// labels
const OUTPUT_LABELS: Record<string, string> = {
  summary: "Summary",
  short_summary: "Short Summary",
  video_script: "Video Script",
  image_concept: "Image Concept",
  tiktok_video_title: "TikTok Video Title",
  tiktok_video_content: "TikTok Video Content",
};
function prettyLabel(k: string) {
  return OUTPUT_LABELS[k] ?? k.replace(/_/g, " ");
}

// pretty stringify for db values
function toDisplay(val: any): string {
  if (val == null) return "—";
  if (typeof val === "string") return val;
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  return JSON.stringify(val, null, 2);
}

/* =========================
   Component
   ========================= */

export default function ContentGeneratorPage() {
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [custLoading, setCustLoading] = React.useState(false);
  const [custError, setCustError] = React.useState<string | null>(null);

  const [customerId, setCustomerId] = React.useState<number | null>(null);
  const [url, setUrl] = React.useState("");

  const [starting, setStarting] = React.useState(false);
  const [polling, setPolling] = React.useState(false);
  const [jobId, setJobId] = React.useState<string | null>(null);
  const [progress, setProgress] = React.useState<number | null>(null);

  const [outputs, setOutputs] = React.useState<Record<string, string | null> | null>(null);

  const [meta, setMeta] = React.useState<Record<string, string>>({});
  const [rawRecord, setRawRecord] = React.useState<any>(null);

  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  const [hist, setHist] = React.useState<ContentGeneration[]>([]);
  const [histPage, setHistPage] = React.useState(1);
  const [histTotal, setHistTotal] = React.useState(0);
  const [histPerPage, setHistPerPage] = React.useState(10);
  const [histQ, setHistQ] = React.useState("");
  const [histLoading, setHistLoading] = React.useState(false);

  const resultsRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      setCustLoading(true);
      setCustError(null);
      try {
        const res = await CustomersAPI.list({ page: 1, per_page: 200 });
        if (!mounted) return;
        setCustomers(res.data);
      } catch (e: any) {
        if (!mounted) return;
        setCustError(e?.message ?? "Failed to load customers");
      } finally {
        if (!mounted) return;
        setCustLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  React.useEffect(() => {
    if (!polling || !jobId) return;
    let cancelled = false;
    const timer = setInterval(async () => {
      try {
        const res = await ContentGenAPI.status(jobId);
        if (cancelled) return;
        if (res.progress !== undefined) setProgress(res.progress);
        if (res.status === "failed") {
          setPolling(false);
          setError(res.error ?? "Generation failed.");
        } else if (res.status === "completed") {
          setPolling(false);
          setOutputs(normalizeOutputs(res.outputs ?? {}));
          setMessage("Generation completed.");
          if (customerId) refreshHistory(customerId, histPage, histPerPage, histQ);
        }
      } catch (e: any) {
        if (cancelled) return;
        setPolling(false);
        setError(e?.message ?? "Failed to poll generation status.");
      }
    }, 2000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [polling, jobId, customerId, histPage, histPerPage, histQ]);

  const customerLabel = React.useMemo(() => {
    const c = customers.find((x) => x.id === customerId);
    if (!c) return "";
    const name = c.business_name || c.user?.name || c.customer_number;
    const cityState = [c.city, c.state].filter(Boolean).join(", ");
    return cityState ? `${name} — ${cityState}` : name;
  }, [customers, customerId]);

  function resetAll() {
    setCustomerId(null);
    setUrl("");
    setOutputs(null);
    setMeta({});
    setRawRecord(null);
    setJobId(null);
    setProgress(null);
    setMessage(null);
    setError(null);
    setHist([]);
    setHistPage(1);
    setHistTotal(0);
    setHistQ("");
  }

  async function handleStart() {
    setError(null);
    setMessage(null);
    setOutputs(null);
    setMeta({});
    setRawRecord(null);
    setJobId(null);
    setProgress(null);

    if (!customerId) { setError("Please select a company."); return; }
    if (!url || !/^https?:\/\//i.test(url)) { setError("Please enter a valid URL starting with http:// or https://"); return; }

    setStarting(true);
    try {
      const res = await ContentGenAPI.start({ customer_id: customerId, url });
      if ("outputs" in res && res.outputs) {
        setOutputs(normalizeOutputs(res.outputs));
        setMessage("Generation completed.");
        await refreshHistory(customerId, histPage, histPerPage, histQ);
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      } else if ("job_id" in res && res.job_id) {
        setJobId(res.job_id);
        setPolling(true);
        setMessage("Generation started…");
      } else {
        setError("Unexpected response from server.");
      }
    } catch (e: any) {
      setError(e?.message ?? "Failed to start generation.");
    } finally {
      setStarting(false);
    }
  }

  function copyAll() {
    const parts: string[] = [];
    if (Object.keys(meta).length) {
      parts.push("## Record details");
      parts.push(Object.entries(meta).map(([k, v]) => `### ${k}\n${v ?? ""}`).join("\n\n"));
    }
    if (outputs) {
      parts.push("## Generated outputs");
      parts.push(Object.entries(outputs).map(([k, v]) => `### ${k}\n${v ?? ""}`).join("\n\n"));
    }
    const text = parts.join("\n\n");
    if (!text) return;
    navigator.clipboard.writeText(text).then(
      () => setMessage("Copied to clipboard."),
      () => setError("Failed to copy.")
    );
  }

  function downloadJSON() {
    const payload = { meta, outputs, full: rawRecord ?? undefined };
    if (!Object.keys(meta).length && !outputs && !rawRecord) return;
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const u = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = u;
    a.download = `content-generation-${meta.id ?? "unknown"}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(u);
  }

  async function refreshHistory(custId: number, page = 1, per = histPerPage, q = histQ) {
    try {
      setHistLoading(true);
      const res = await HistoryAPI.list({ customer_id: custId, page, per_page: per, q });
      setHist(res.data);
      setHistTotal(res.total);
      setHistPage(res.page);
      setHistPerPage(res.per_page);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load history.");
    } finally {
      setHistLoading(false);
    }
  }

  React.useEffect(() => {
    if (!customerId) return;
    refreshHistory(customerId, 1, histPerPage, histQ);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  async function handleUseRow(row: ContentGeneration) {
    try {
      const full = await HistoryAPI.get(row.id);

      const parsedOutputs = normalizeOutputs(full.outputs ?? row.outputs ?? {});
      const details: Record<string, string> = {
        id: String(full.id),
        customer_id: String(full.customer_id),
        url: full.url ?? "",
        title: full.title ?? "",
        status: full.status,
        progress: full.progress != null ? String(full.progress) : "",
        error: full.error ?? "",
        created_at: full.created_at ?? "",
        updated_at: full.updated_at ?? "",
      };

      setMeta(details);
      setOutputs(parsedOutputs);
      setRawRecord(full);
      setUrl(full.url || row.url || "");
      setMessage(`Loaded full record #${row.id}`);
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (e: any) {
      setError(e?.message ?? "Failed to load row.");
    }
  }

  async function handleDelete(row: ContentGeneration) {
    if (!confirm(`Delete generation #${row.id}? This cannot be undone.`)) return;
    try {
      await HistoryAPI.delete(row.id);
      setMessage(`Deleted #${row.id}`);
      if (customerId) await refreshHistory(customerId, histPage, histPerPage, histQ);
      if (String(row.id) === meta.id) { setMeta({}); setOutputs(null); setRawRecord(null); }
    } catch (e: any) {
      setError(e?.message ?? "Failed to delete.");
    }
  }

  function totalPages() {
    return Math.max(1, Math.ceil(histTotal / histPerPage));
  }

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Generate Contents from URL</h1>
            <p className="text-sm text-slate-600">
              Choose a company, paste a blog/article URL, then generate. Click{" "}
              <span className="font-medium">Load</span> on any history row to view the full record (meta + outputs + all DB fields).
            </p>
          </div>
          <div className="flex items-end gap-2">
            <Button variant="ghost" onClick={resetAll}>Reset</Button>
          </div>
        </div>

        {/* Status */}
        {error && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">{error}</div>}
        {message && <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700">{message}</div>}

        {/* Form */}
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="md:col-span-1">
            {custLoading ? (
              <div className="text-sm text-slate-500">Loading companies…</div>
            ) : custError ? (
              <div className="text-sm text-rose-600">{custError}</div>
            ) : (
              <Select label="Company" value={customerId ?? ""} onChange={(e) => setCustomerId(Number(e.target.value) || null)}>
                <option value="">— Select Company —</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {(c.business_name || c.user?.name || `#${c.customer_number}`) +
                      (c.city || c.state ? ` (${[c.city, c.state].filter(Boolean).join(", ")})` : "")}
                  </option>
                ))}
              </Select>
            )}
          </div>

          <div className="md:col-span-2">
            <Input
              label="Blog / Article URL"
              placeholder="https://example.com/blog-post"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
        </div>

        <div className="mb-8 flex items-center gap-3">
          <Button onClick={handleStart} disabled={!customerId || !url || starting || polling}>
            {starting ? "Starting…" : polling ? "Generating…" : "Generate Contents"}
          </Button>
          {polling && <div className="text-sm text-slate-600">{progress !== null ? `In progress… ${progress}%` : "In progress…"}</div>}
          {customerId && (
            <div className="text-sm text-slate-500">Selected: <span className="font-medium">
              {(customers.find(x=>x.id===customerId)?.business_name) || (customers.find(x=>x.id===customerId)?.user?.name) || customers.find(x=>x.id===customerId)?.customer_number}
            </span></div>
          )}
        </div>

        {/* Anchor for scroll */}
        <div ref={resultsRef} />

        {/* Record details */}
        {Object.keys(meta).length > 0 && (
          <div className="mb-8 rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold">Record details</h2>
              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={() => { setMeta({}); setOutputs(null); setRawRecord(null); }}>Clear Results</Button>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {Object.entries(meta).map(([k, v]) => (
                <KeyValueBlock key={`meta-${k}`} k={k} v={v} />
              ))}
            </div>
          </div>
        )}

        {/* ========== Generated outputs (Core/TikTok/Other) — primary UI ========== */}
        {outputs && (
          <>
            <div className="mb-4 flex items-center gap-2">
              <Button variant="ghost" onClick={copyAll}>Copy All</Button>
              <Button variant="ghost" onClick={downloadJSON}>Download JSON</Button>
            </div>

            {Object.keys(outputs).length === 0 ? (
              <div className="mb-10 rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
                No output fields on this record.
              </div>
            ) : (
              <div className="space-y-6">
                {(() => {
                  // Hide empty strings/nulls so the cards stay clean
                  const entries = Object.entries(outputs).filter(([, v]) => {
                    if (v == null) return false;
                    const s = typeof v === "string" ? v.trim() : String(v).trim();
                    return s.length > 0;
                  });
                  const present = entries.map(([k]) => k);

                  const used = new Set<string>();
                  OUTPUT_GROUPS.forEach(g => g.keys.forEach(k => used.add(k)));

                  const otherKeys = present.filter(k => !used.has(k)).sort();

                  const sections: React.ReactNode[] = [];

                  for (const group of OUTPUT_GROUPS) {
                    const keysInGroup = group.keys.filter(k => present.includes(k));
                    if (keysInGroup.length === 0) continue;
                    sections.push(
                      <GroupCard key={group.id} title={group.title}>
                        <div className={group.grid ?? "grid grid-cols-1 gap-4"}>
                          {keysInGroup.map((k) => (
                            <FieldBox key={k} label={prettyLabel(k)} value={outputs[k] ?? ""} />
                          ))}
                        </div>
                      </GroupCard>
                    );
                  }

                  if (otherKeys.length > 0) {
                    sections.push(
                      <GroupCard key="other" title="Other">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          {otherKeys.map((k) => (
                            <FieldBox key={k} label={prettyLabel(k)} value={outputs[k] ?? ""} />
                          ))}
                        </div>
                      </GroupCard>
                    );
                  }

                  return <div className="mb-10 space-y-6">{sections}</div>;
                })()}
              </div>
            )}
          </>
        )}

        {!outputs && Object.keys(meta).length === 0 && (
          <div className="mb-10 rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
            {polling ? "Working on it…" : "Results will appear here after you generate or load a history row."}
          </div>
        )}

        {/* ========== All database fields (collapsed by default) ========== */}
        {rawRecord && (
          <details className="mb-8 rounded-2xl border border-slate-200 p-5 shadow-sm">
            <summary className="cursor-pointer text-base font-semibold">
              All database fields
              <span className="ml-2 text-xs font-normal text-slate-500">(developer view)</span>
            </summary>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              {Object.entries(rawRecord)
                .filter(([k]) => k !== "outputs")
                .filter(([, v]) => !(v === null || v === "")) // hide empty rows
                .sort(([a],[b]) => a.localeCompare(b))
                .map(([k, v]) => (
                  <KeyValueBlock key={`db-${k}`} k={k} v={toDisplay(v)} />
                ))}
            </div>
          </details>
        )}

        {/* ======== History (per company) ======== */}
        {customerId && (
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">History for this company</h2>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Filter by URL or title…"
                value={histQ}
                onChange={(e) => setHistQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") refreshHistory(customerId, 1, histPerPage, histQ);
                }}
                className="w-64"
              />
              <Button variant="ghost" onClick={() => refreshHistory(customerId, 1, histPerPage, histQ)}>Search</Button>
            </div>
          </div>
        )}

        {customerId && (
          <div className="rounded-2xl border border-slate-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold">ID</th>
                    <th className="px-4 py-2 text-left font-semibold">Status</th>
                    <th className="px-4 py-2 text-left font-semibold">Title / URL</th>
                    <th className="px-4 py-2 text-left font-semibold">Updated</th>
                    <th className="px-4 py-2 text-left font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {histLoading ? (
                    <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-500">Loading history…</td></tr>
                  ) : hist.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-500">No history yet.</td></tr>
                  ) : (
                    hist.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2">#{row.id}</td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            {badgeForStatus(row.status)}
                            {typeof row.progress === "number" && row.status !== "completed" ? (
                              <span className="text-xs text-slate-500">{row.progress}%</span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 py-2 max-w-[420px]">
                          <div className="truncate font-medium">{row.title || "Untitled"}</div>
                          <a className="truncate text-xs text-indigo-600 hover:underline" href={row.url} target="_blank" rel="noreferrer" title={row.url}>
                            {row.url}
                          </a>
                        </td>
                        <td className="px-4 py-2">{formatDate(row.updated_at)}</td>
                        <td className="px-4 py-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Button variant="ghost" onClick={() => handleUseRow(row)}>Load</Button>
                            <Button variant="danger" onClick={() => handleDelete(row)}>Delete</Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {histTotal > 0 && (
              <div className="flex items-center justify-between px-4 py-3">
                <div className="text-xs text-slate-600">Page {histPage} of {Math.max(1, Math.ceil(histTotal / histPerPage))} • {histTotal} total</div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" onClick={() => { if (!customerId) return; const p = Math.max(1, histPage - 1); refreshHistory(customerId, p, histPerPage, histQ); }} disabled={histPage <= 1}>Prev</Button>
                  <Button variant="ghost" onClick={() => { if (!customerId) return; const p = Math.min(Math.max(1, Math.ceil(histTotal / histPerPage)), histPage + 1); refreshHistory(customerId, p, histPerPage, histQ); }} disabled={histPage >= Math.max(1, Math.ceil(histTotal / histPerPage))}>Next</Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
