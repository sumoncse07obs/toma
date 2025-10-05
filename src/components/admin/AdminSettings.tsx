import React, { useEffect, useMemo, useState } from "react";

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
    method: init?.method || "GET",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
    body: init?.body,
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(errText || `HTTP ${res.status}`);
  }
  return res.json();
}

/* ========================= Types ========================= */
type AdminSettings = {
  id: number;
  sender_email: string;
  receiver_email: string | null;
  support_phone: string | null;
  image_url: string | null;

  ghl_access_token: string | null;
  ghl_refresh_token: string | null;

  twilio_account_sid: string | null;
  twilio_auth_token: string | null;
  twilio_from_number: string | null;

  created_at?: string | null;
  updated_at?: string | null;
};

/* ========================= Component ========================= */
export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<AdminSettings | null>(null);
  const [showTokens, setShowTokens] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await api<AdminSettings>("/admin-settings");
        setForm(data);
      } catch (e: any) {
        setError(e?.message || "Failed to load settings.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const onChange = (key: keyof AdminSettings, value: string) => {
    if (!form) return;
    setForm({ ...form, [key]: value });
  };

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    try {
      setSaving(true);
      setError(null);

      const payload = {
        sender_email: form.sender_email,
        receiver_email: form.receiver_email,
        support_phone: form.support_phone,
        image_url: form.image_url,

        ghl_access_token: form.ghl_access_token,
        ghl_refresh_token: form.ghl_refresh_token,

        twilio_account_sid: form.twilio_account_sid,
        twilio_auth_token: form.twilio_auth_token,
        twilio_from_number: form.twilio_from_number,
      };

      const res = await api<{ message: string; data: AdminSettings }>("/admin-settings", {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      setForm(res.data);
      setSavedAt(new Date().toLocaleTimeString());
    } catch (e: any) {
      setError(e?.message || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Admin Settings</h1>
        <p className="text-gray-500 mt-2">Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Admin Settings</h1>
        <p className="text-red-600 mt-2">{error}</p>
      </div>
    );
  }

  if (!form) return null;

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold">Admin Settings</h1>
      <p className="text-sm text-gray-500 mt-1">
        Manage emails, support phone, branding image, and integrations for GHL & Twilio.
      </p>

      <form onSubmit={onSave} className="mt-6 space-y-8">

        {/* Contact & Branding */}
        <section className="rounded-lg border p-4">
          <h2 className="text-lg font-semibold">Contact & Branding</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium">Sender Email *</label>
              <input
                type="email"
                className="mt-1 w-full rounded-md border px-3 py-2"
                value={form.sender_email || ""}
                onChange={(e) => onChange("sender_email", e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Receiver Email</label>
              <input
                type="email"
                className="mt-1 w-full rounded-md border px-3 py-2"
                value={form.receiver_email || ""}
                onChange={(e) => onChange("receiver_email", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Support Phone</label>
              <input
                type="text"
                className="mt-1 w-full rounded-md border px-3 py-2"
                placeholder="+1 555 123 4567"
                value={form.support_phone || ""}
                onChange={(e) => onChange("support_phone", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Image URL (Logo)</label>
              <input
                type="url"
                className="mt-1 w-full rounded-md border px-3 py-2"
                placeholder="https://example.com/logo.png"
                value={form.image_url || ""}
                onChange={(e) => onChange("image_url", e.target.value)}
              />
            </div>
          </div>
          {form.image_url ? (
            <div className="mt-4">
              <img
                src={form.image_url}
                alt="Logo Preview"
                className="h-12 w-auto object-contain"
                onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
              />
            </div>
          ) : null}
        </section>

        {/* GHL */}
        <section className="rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">GoHighLevel (GHL)</h2>
            <button
              type="button"
              onClick={() => setShowTokens((v) => !v)}
              className="text-sm text-blue-600 hover:underline"
            >
              {showTokens ? "Hide tokens" : "Show tokens"}
            </button>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium">Access Token</label>
              <input
                type={showTokens ? "text" : "password"}
                className="mt-1 w-full rounded-md border px-3 py-2"
                value={form.ghl_access_token || ""}
                onChange={(e) => onChange("ghl_access_token", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Refresh Token</label>
              <input
                type={showTokens ? "text" : "password"}
                className="mt-1 w-full rounded-md border px-3 py-2"
                value={form.ghl_refresh_token || ""}
                onChange={(e) => onChange("ghl_refresh_token", e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* Twilio */}
        <section className="rounded-lg border p-4">
          <h2 className="text-lg font-semibold">Twilio</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium">Account SID</label>
              <input
                type="text"
                className="mt-1 w-full rounded-md border px-3 py-2"
                value={form.twilio_account_sid || ""}
                onChange={(e) => onChange("twilio_account_sid", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Auth Token</label>
              <input
                type={showTokens ? "text" : "password"}
                className="mt-1 w-full rounded-md border px-3 py-2"
                value={form.twilio_auth_token || ""}
                onChange={(e) => onChange("twilio_auth_token", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium">From Number</label>
              <input
                type="text"
                className="mt-1 w-full rounded-md border px-3 py-2"
                placeholder="+1 555 000 1111"
                value={form.twilio_from_number || ""}
                onChange={(e) => onChange("twilio_from_number", e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* Footer actions */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save Settings"}
          </button>
          {savedAt && !saving ? (
            <span className="text-sm text-green-700">Saved at {savedAt}</span>
          ) : null}
          {error ? <span className="text-sm text-red-600">{error}</span> : null}
        </div>
      </form>
    </div>
  );
}
