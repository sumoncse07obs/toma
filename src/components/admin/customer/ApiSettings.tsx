// src/components/admin/customer/ApiSettings.tsx
import React from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { toast } from "react-toastify";

type Settings = {
  openai_api_key?: string | null;
  blotato_api_key?: string | null;
  dumplingai_api_key?: string | null;

  blotato_twitter_id?: string | null;
  blotato_linkeidin_id?: string | null; // keep current backend key
  blotato_facebook_id?: string | null;
  blotato_tiktok_id?: string | null;
  blotato_instagram_id?: string | null;
  blotato_threads_id?: string | null;
  blotato_pinterest_id?: string | null;
  blotato_bluesky_id?: string | null;
  blotato_youtube_id?: string | null;

  blotato_facebook_page_ids?: string[] | null;
  blotato_linkeidin_page_ids?: string[] | null; // keep current backend key

  // NEW: LinkedIn on/off for frontend usage
  blotato_linkeidin_active?: boolean | null;
};

type CustomerMeta = {
  id: number;
  customer_number?: string | null;
  business_name?: string | null;
  user?: { name?: string | null } | null;
};

/* =========================
   API helper (Bearer only)
   ========================= */
const API_BASE = `${import.meta.env.VITE_API_BASE}/api`;
const TOKEN_KEY = "toma_token";

function norm(path: string) {
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`.replace(/([^:]\/)\/+/g, "$1");
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
    const err = new Error(`HTTP ${res.status}: ${msg}`) as any;
    err.status = res.status;
    throw err;
  }

  const ct = res.headers.get("content-type") || "";
  return (ct.includes("application/json") ? await res.json() : (undefined as any)) as T;
}

/* =========================
   Helpers
   ========================= */
function textToIdArray(txt: string): string[] {
  return txt
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
function arrayToText(arr?: string[] | null): string {
  return (arr ?? []).join(", ");
}

// Normalize various backend shapes (0/1, "true"/"false", etc.) to boolean
function toBool(v: any): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") return ["1", "true", "yes", "on"].includes(v.toLowerCase());
  return false;
}

/** Get customer id from route patterns */
function useCustomerId(): number | null {
  const params = useParams();
  const location = useLocation();

  const candidates = [
    params.id,
    // @ts-ignore – allow common alternates
    params.customerId,
    // @ts-ignore
    params.cid,
  ].filter(Boolean) as string[];

  for (const c of candidates) {
    const n = Number(c);
    if (!Number.isNaN(n) && n > 0) return n;
  }

  const m = location.pathname.match(/customer-dashboard\/(\d+)/i);
  if (m?.[1]) {
    const n = Number(m[1]);
    if (!Number.isNaN(n) && n > 0) return n;
  }
  return null;
}

/* =========================
   Component
   ========================= */
export default function ApiSettings() {
  const nav = useNavigate();
  const location = useLocation();
  const customerId = useCustomerId();

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [authIssue, setAuthIssue] = React.useState<null | { code: number; text: string }>(null);
  const [error, setError] = React.useState<string | null>(null);

  const [showKey, setShowKey] = React.useState<Record<string, boolean>>({});
  const [form, setForm] = React.useState<Settings>({});

  const [fbPagesText, setFbPagesText] = React.useState("");
  const [liPagesText, setLiPagesText] = React.useState("");

  // Customer meta (number + name)
  const [customer, setCustomer] = React.useState<CustomerMeta | null>(null);

  // Single source of truth for invalid id -> show toast once via effect
  const invalidId = !customerId;
  React.useEffect(() => {
    if (invalidId) toast.error("Invalid or missing customer ID in the URL.");
  }, [invalidId]);

  if (invalidId) {
    return (
      <div className="max-w-xl mx-auto p-6">
        <h1 className="text-xl font-semibold mb-3">Integration Settings</h1>
        <div className="rounded-lg border border-rose-300 bg-rose-50 p-4 text-rose-900">
          Invalid or missing customer ID in the URL. Expected route:
          <div className="mt-1 font-mono text-sm">/admin/customer-dashboard/:id/api</div>
          <div className="mt-3 text-xs text-slate-600">
            Debug: <span className="font-mono">{location.pathname}</span>
          </div>
        </div>
        <button className="mt-4 rounded-lg border px-4 py-2" onClick={() => nav(-1)}>
          Go Back
        </button>
      </div>
    );
  }

  // Load settings + customer meta in parallel
  React.useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      setAuthIssue(null);
      try {
        const [settingsRes, customerRes] = await Promise.allSettled([
          api<any>(`/settings?customer_id=${customerId}`),
          api<any>(`/customers/${customerId}`),
        ]);

        if (!alive) return;

        // Settings
        if (settingsRes.status === "fulfilled") {
          const raw: Settings = settingsRes.value?.data ?? settingsRes.value ?? {};
          const data: Settings = {
            ...raw,
            blotato_linkeidin_active: toBool(raw.blotato_linkeidin_active),
          };
          setForm(data);
          setFbPagesText(arrayToText(data.blotato_facebook_page_ids));
          setLiPagesText(arrayToText(data.blotato_linkeidin_page_ids));
        } else {
          const e: any = settingsRes.reason;
          if (e?.status === 401 || e?.status === 419) {
            setAuthIssue({ code: e.status, text: "Unauthenticated. Please sign in again." });
            toast.warn("Session expired. Please sign in again.");
          } else if (e?.status === 403) {
            setAuthIssue({ code: e.status, text: "Forbidden. You lack permission to view settings." });
            toast.error("You don’t have permission to view these settings.");
          } else {
            const m = e?.message || "Failed to load settings.";
            setError(m);
            toast.error(m);
          }
        }

        // Customer meta (non-blocking)
        if (customerRes.status === "fulfilled") {
          const c: CustomerMeta = customerRes.value?.data ?? customerRes.value ?? null;
          if (c) setCustomer(c);
        }
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [customerId]);

  const onChange =
    (key: keyof Settings) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((f) => ({ ...f, [key]: e.target.value }));
    };

  const toggleShow = (key: string) => {
    setShowKey((s) => ({ ...s, [key]: !s[key] }));
  };

  // Save
  const save = async () => {
    setSaving(true);
    setError(null);
    setAuthIssue(null);

    const payload: Settings = {
      ...form,
      blotato_facebook_page_ids: textToIdArray(fbPagesText),
      blotato_linkeidin_page_ids: textToIdArray(liPagesText),

      // If backend prefers booleans, this is fine. If it needs 0/1, convert here.
      blotato_linkeidin_active: !!form.blotato_linkeidin_active,
    };

    try {
      await api<any>(`/settings?customer_id=${customerId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      toast.success("Settings saved.");
    } catch (e: any) {
      if (e?.status === 401 || e?.status === 419) {
        setAuthIssue({ code: e.status, text: "Unauthenticated. Please sign in again." });
        toast.warn("Session expired. Please sign in again.");
      } else if (e?.status === 403) {
        setAuthIssue({ code: e.status, text: "Forbidden. You lack permission to modify settings." });
        toast.error("You don’t have permission to modify these settings.");
      } else {
        const m = e?.message || "Save failed";
        setError(m);
        toast.error(m);
      }
    } finally {
      setSaving(false);
    }
  };

  if (authIssue) {
    return (
      <div className="max-w-xl mx-auto p-6">
        <h1 className="text-xl font-semibold mb-2">Integration Settings</h1>
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900 mb-4">
          {authIssue.text}
        </div>
        <div className="flex gap-3">
          <button className="rounded-lg bg-black text-white px-4 py-2" onClick={() => nav("/", { replace: true })}>
            Go to Login
          </button>
          <button className="rounded-lg border px-4 py-2" onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (loading) return <div className="p-6">Loading settings…</div>;

  const maskedInput = (label: string, field: keyof Settings) => (
    <div className="mb-4">
      <label className="block text-sm font-medium mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type={showKey[field as string] ? "text" : "password"}
          className="w-full rounded-md border px-3 py-2"
          value={(form[field] as string) || ""}
          onChange={onChange(field)}
          placeholder={`Enter ${label}`}
          autoComplete="off"
        />
        <button
          type="button"
          className="rounded-md border px-3 py-2 text-sm"
          onClick={() => toggleShow(field as string)}
        >
          {showKey[field as string] ? "Hide" : "Show"}
        </button>
      </div>
    </div>
  );

  const textInput = (label: string, field: keyof Settings, placeholder?: string) => (
    <div className="mb-4">
      <label className="block text-sm font-medium mb-1">{label}</label>
      <input
        type="text"
        className="w-full rounded-md border px-3 py-2"
        value={(form[field] as string) || ""}
        onChange={onChange(field)}
        placeholder={placeholder}
      />
    </div>
  );

  // Friendly header line (optional to render)
  const displayNumber = customer?.customer_number ?? `${customerId}`;
  const displayName = customer?.business_name || customer?.user?.name || "—";

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-1">Integration Settings</h1>
      <p className="text-sm text-slate-500 mb-6">
        Customer #{displayNumber} • {displayName}
      </p>

      <div className="grid grid-cols-1 gap-6">
        {/* API Keys */}
        <section className="rounded-xl border p-4">
          <h2 className="font-medium mb-3">API Keys</h2>
          {maskedInput("OpenAI API Key", "openai_api_key")}
          {maskedInput("Blotato API Key", "blotato_api_key")}
          {maskedInput("DumplingAI API Key", "dumplingai_api_key")}
        </section>

        {/* Blotato Account IDs */}
        <section className="rounded-xl border p-4">
          <h2 className="font-medium mb-3">Blotato Account IDs</h2>

          {textInput("Twitter ID", "blotato_twitter_id")}

          {/* LinkedIn ID + Active toggle */}
          <div className="mb-4">
            <div className="flex items-center justify-between gap-3">
              <label className="block text-sm font-medium mb-1">LinkedIn ID</label>

              {/* Toggle switch */}
              <button
                type="button"
                role="switch"
                aria-checked={!!form.blotato_linkeidin_active}
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    blotato_linkeidin_active: !toBool(f.blotato_linkeidin_active),
                  }))
                }
                className={[
                  "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200",
                  !!form.blotato_linkeidin_active ? "bg-emerald-500" : "bg-slate-300",
                ].join(" ")}
                title={!!form.blotato_linkeidin_active ? "LinkedIn: Active" : "LinkedIn: Inactive"}
              >
                <span
                  className={[
                    "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200",
                    !!form.blotato_linkeidin_active ? "translate-x-5" : "translate-x-0",
                  ].join(" ")}
                />
              </button>
            </div>

            <input
              type="text"
              className="mt-2 w-full rounded-md border px-3 py-2"
              value={form.blotato_linkeidin_id || ""}
              onChange={onChange("blotato_linkeidin_id")}
              placeholder="urn:li:person:..., or account ID"
            />

            <p className="mt-1 text-xs text-slate-500">
              Status: {form.blotato_linkeidin_active ? "Active (shown/used on frontend)" : "Inactive (hidden/ignored on frontend)"}
            </p>
          </div>

          {textInput("Facebook ID", "blotato_facebook_id")}
          {textInput("TikTok ID", "blotato_tiktok_id")}
          {textInput("Instagram ID", "blotato_instagram_id")}
          {textInput("Threads ID", "blotato_threads_id")}
          {textInput("Pinterest ID", "blotato_pinterest_id")}
          {textInput("Bluesky ID", "blotato_bluesky_id")}
          {textInput("YouTube ID", "blotato_youtube_id")}
        </section>

        {/* Page IDs (multiple) */}
        <section className="rounded-xl border p-4">
          <h2 className="font-medium mb-3">Page IDs (Multiple)</h2>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              Facebook Page IDs (comma separated — e.g., 9927653170252, 9927653170252)
            </label>
            <textarea
              className="w-full rounded-md border px-3 py-2 min-h-[80px]"
              value={fbPagesText}
              onChange={(e) => setFbPagesText(e.target.value)}
              placeholder="123, 456, 789"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              LinkedIn Page IDs (comma separated — e.g., urn:li:organization:123, urn:li:organization:456)
            </label>
            <textarea
              className="w-full rounded-md border px-3 py-2 min-h-[80px]"
              value={liPagesText}
              onChange={(e) => setLiPagesText(e.target.value)}
              placeholder="urn:li:organization:123, urn:li:organization:456"
            />
          </div>
        </section>

        <div className="flex items-center gap-3">
          <button
            onClick={save}
            disabled={saving}
            className="rounded-lg bg-black text-white px-4 py-2 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}
