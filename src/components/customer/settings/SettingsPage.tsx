// src/pages/SettingsPage.tsx
import React from "react";
import { useNavigate } from "react-router-dom";

/* =========================
   Types
   ========================= */

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
   Utils: textarea <-> string[]
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

/* =========================
   Component
   ========================= */

export default function SettingsPage() {
  const nav = useNavigate();

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [authIssue, setAuthIssue] = React.useState<null | { code: number; text: string }>(null);

  const [showKey, setShowKey] = React.useState<Record<string, boolean>>({});
  const [form, setForm] = React.useState<Settings>({});

  // Local textarea mirrors for arrays
  const [fbPagesText, setFbPagesText] = React.useState("");
  const [liPagesText, setLiPagesText] = React.useState("");

  // Load settings on mount
  React.useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setMsg(null);
      setError(null);
      setAuthIssue(null);
      try {
        const json = await api<any>("/settings");
        if (!alive) return;
        const data: Settings = json?.data ?? json ?? {};
        setForm(data);
        setFbPagesText(arrayToText(data.blotato_facebook_page_ids));
        setLiPagesText(arrayToText(data.blotato_linkeidin_page_ids));
      } catch (e: any) {
        if (!alive) return;
        if (e?.status === 401 || e?.status === 419) {
          setAuthIssue({ code: e.status, text: "Unauthenticated. Please sign in again." });
        } else if (e?.status === 403) {
          setAuthIssue({ code: e.status, text: "Forbidden. You lack permission to view settings." });
        } else {
          setError(e?.message || "Failed to load settings.");
        }
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Simple change handlers
  const onChange = (key: keyof Settings) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
  };

  const toggleShow = (key: string) => {
    setShowKey((s) => ({ ...s, [key]: !s[key] }));
  };

  // Save handler
  const save = async () => {
    setSaving(true);
    setMsg(null);
    setError(null);
    setAuthIssue(null);

    // Ensure arrays are sent (backend expects arrays even if empty)
    const payload: Settings = {
      ...form,
      blotato_facebook_page_ids: textToIdArray(fbPagesText),
      blotato_linkeidin_page_ids: textToIdArray(liPagesText),
    };

    try {
      const json = await api<any>("/settings", {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      const saved: Settings = json?.data ?? json ?? payload;
      setForm(saved);
      setFbPagesText(arrayToText(saved.blotato_facebook_page_ids));
      setLiPagesText(arrayToText(saved.blotato_linkeidin_page_ids));
      setMsg("Saved!");
    } catch (e: any) {
      if (e?.status === 401 || e?.status === 419) {
        setAuthIssue({ code: e.status, text: "Unauthenticated. Please sign in again." });
      } else if (e?.status === 403) {
        setAuthIssue({ code: e.status, text: "Forbidden. You lack permission to modify settings." });
      } else {
        setError(e?.message || "Save failed");
      }
    } finally {
      setSaving(false);
    }
  };

  // Small UI helpers
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

  // Auth issue UI
  if (authIssue) {
    return (
      <div className="max-w-xl mx-auto p-6">
        <h1 className="text-xl font-semibold mb-2">Integration Settings</h1>
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900 mb-4">
          {authIssue.text}
        </div>
        <div className="flex gap-3">
          <button
            className="rounded-lg bg-black text-white px-4 py-2"
            onClick={() => nav("/", { replace: true })}
          >
            Go to Login
          </button>
          <button
            className="rounded-lg border px-4 py-2"
            onClick={() => {
              // if token exists but expired, let user retry after reauth elsewhere
              window.location.reload();
            }}
          >
          Retry
          </button>
        </div>
      </div>
    );
  }

  if (loading) return <div className="p-6">Loading settings…</div>;

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-6">Integration Settings</h1>

      {error && (
        <div className="mb-4 rounded-lg border border-rose-300 bg-rose-50 p-3 text-rose-900">
          {error}
        </div>
      )}
      {msg && (
        <div className="mb-4 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-emerald-900">
          {msg}
        </div>
      )}

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
          {textInput("LinkedIn ID", "blotato_linkeidin_id")}
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
          {msg && <span className="text-sm text-emerald-700">{msg}</span>}
        </div>
      </div>
    </div>
  );
}
