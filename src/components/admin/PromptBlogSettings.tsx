// src/components/admin/PromptBlogSettings.tsx
import React from "react";
export type Customer = {
  id: number;
  customer_number: string;
  business_name?: string | null;
  city?: string | null;
  state?: string | null;
  user?: { id: number; name: string; email: string };
};

export type PromptBlog = {
  id: number;
  customer_id: number;

  summary_prompt?: string | null;
  short_summary_prompt?: string | null;
  video_script_prompt?: string | null;
  make_image_prompt?: string | null;

  tiktok_video_title_prompt?: string | null;
  tiktok_video_content_prompt?: string | null;

  threads_title_prompt?: string | null;
  threads_content_prompt?: string | null;
  threads_video_title_prompt?: string | null;
  threads_video_content_prompt?: string | null;

  twitter_title_prompt?: string | null;
  twitter_content_prompt?: string | null;
  twitter_video_title_prompt?: string | null;
  twitter_video_content_prompt?: string | null;

  instagram_title_prompt?: string | null;
  instagram_content_prompt?: string | null;
  instagram_video_title_prompt?: string | null;
  instagram_video_content_prompt?: string | null;
  instagram_reels_title_prompt?: string | null;
  instagram_reels_content_prompt?: string | null;

  facebook_title_prompt?: string | null;
  facebook_content_prompt?: string | null;
  facebook_video_title_prompt?: string | null;
  facebook_video_content_prompt?: string | null;
  facebook_reels_title_prompt?: string | null;
  facebook_reels_content_prompt?: string | null;

  linkedin_title_prompt?: string | null;
  linkedin_content_prompt?: string | null;
  linkedin_video_title_prompt?: string | null;
  linkedin_video_content_prompt?: string | null;

  youtube_video_title_prompt?: string | null;
  youtube_video_content_prompt?: string | null;

  pinterest_title_prompt?: string | null;
  pinterest_content_prompt?: string | null;

  is_active?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

type CustomersListResponse = {
  data: Customer[];
  total: number;
  page: number;
  per_page: number;
} & Record<string, any>;

/* =========================
   API helper
   ========================= */

const API_BASE = `${import.meta.env.VITE_API_BASE}/api`;
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
    console.error("[API ERROR]", res.status, res.statusText, path, msg);
    throw new Error(`HTTP ${res.status}: ${msg}`);
  }
  const ct = res.headers.get("content-type") || "";
  return (ct.includes("application/json")
    ? await res.json()
    : (undefined as any)) as T;
}

const CustomersAPI = {
  async list(params?: { q?: string; page?: number; per_page?: number }) {
    const qs = new URLSearchParams();
    if (params?.q) qs.set("q", params.q);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.per_page) qs.set("per_page", String(params.per_page));
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    // NOTE: API_BASE already ends with /api, so we use /customers here (NOT /api/customers)
    return api<CustomersListResponse>(`/customers${suffix}`);
  },
};

// unwrap helper for {data: ...} or raw object
const unwrap = <T,>(res: any): T => (res?.data ?? res) as T;

const PromptBlogAPI = {
  async getByCustomer(customerId: number) {
    // NOT /api/prompt-blog — API_BASE has /api
    const res = await api<any>(`/prompt-blog?customer_id=${customerId}`);
    return unwrap<PromptBlog | null>(res);
  },
  async create(payload: Omit<PromptBlog, "id" | "created_at" | "updated_at">) {
    const res = await api<any>(`/prompt-blog`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return unwrap<PromptBlog>(res);
  },
  async update(id: number, payload: Partial<PromptBlog>) {
    // IMPORTANT: backend prohibits customer_id on update — do NOT send it
    const { id: _i, customer_id: _c, created_at: _ca, updated_at: _ua, ...rest } = payload as any;
    const res = await api<any>(`/prompt-blog/${id}`, {
      method: "PUT",
      body: JSON.stringify(rest),
    });
    return unwrap<PromptBlog>(res);
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

function Textarea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
    label?: string;
    hint?: string;
    rows?: number;
  }
) {
  const { label, hint, className = "", ...rest } = props;
  return (
    <label className="block">
      {label ? (
        <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      ) : null}
      <textarea
        className={`w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 ${className}`}
        {...rest}
      />
      {hint ? <span className="mt-1 block text-xs text-slate-500">{hint}</span> : null}
    </label>
  );
}

/* =========================
   Field Groups (keeps the JSX small)
   ========================= */

type FieldKey = keyof Omit<
  PromptBlog,
  "id" | "customer_id" | "created_at" | "updated_at" | "is_active"
>;

type FieldDef = { key: FieldKey; label: string; rows?: number; placeholder?: string };

const FIELD_GROUPS: { title: string; items: FieldDef[] }[] = [
  {
    title: "Core",
    items: [
      {
        key: "summary_prompt",
        label: "Summary Prompt",
        rows: 3,
        placeholder:
          "Summarize {{source}} in 120–180 words for {{audience}}. Keep it actionable and positive. End with a question.",
      },
      {
        key: "short_summary_prompt",
        label: "Short Summary Prompt",
        rows: 2,
        placeholder: "One-sentence TL;DR (<140 chars) with a hook. No hashtags.",
      },
      {
        key: "video_script_prompt",
        label: "Video Script Prompt",
        rows: 5,
        placeholder:
          "Write a 60s script with hook, 3 beats, CTA. Mention {{brand}}. Conversational. Add b-roll suggestions.",
      },
      {
        key: "make_image_prompt",
        label: "Make Image Prompt",
        rows: 3,
        placeholder:
          "Generate an image concept describing scene, style, lighting, subject; include brand colors {{colors}}.",
      },
    ],
  },
  {
    title: "TikTok",
    items: [
      { key: "tiktok_video_title_prompt", label: "TikTok Video Title", rows: 2 },
      { key: "tiktok_video_content_prompt", label: "TikTok Video Content", rows: 4 },
    ],
  },
  {
    title: "Threads",
    items: [
      { key: "threads_title_prompt", label: "Threads Title", rows: 2 },
      { key: "threads_content_prompt", label: "Threads Content", rows: 4 },
      { key: "threads_video_title_prompt", label: "Threads Video Title", rows: 2 },
      { key: "threads_video_content_prompt", label: "Threads Video Content", rows: 4 },
    ],
  },
  {
    title: "Twitter / X",
    items: [
      { key: "twitter_title_prompt", label: "X Title", rows: 2 },
      { key: "twitter_content_prompt", label: "X Content", rows: 4 },
      { key: "twitter_video_title_prompt", label: "X Video Title", rows: 2 },
      { key: "twitter_video_content_prompt", label: "X Video Content", rows: 4 },
    ],
  },
  {
    title: "Instagram",
    items: [
      { key: "instagram_title_prompt", label: "Instagram Title", rows: 2 },
      { key: "instagram_content_prompt", label: "Instagram Content", rows: 4 },
      { key: "instagram_video_title_prompt", label: "Instagram Video Title", rows: 2 },
      { key: "instagram_video_content_prompt", label: "Instagram Video Content", rows: 4 },
      { key: "instagram_reels_title_prompt", label: "Reels Title", rows: 2 },
      { key: "instagram_reels_content_prompt", label: "Reels Content", rows: 4 },
    ],
  },
  {
    title: "Facebook",
    items: [
      { key: "facebook_title_prompt", label: "Facebook Title", rows: 2 },
      { key: "facebook_content_prompt", label: "Facebook Content", rows: 4 },
      { key: "facebook_video_title_prompt", label: "Facebook Video Title", rows: 2 },
      { key: "facebook_video_content_prompt", label: "Facebook Video Content", rows: 4 },
      { key: "facebook_reels_title_prompt", label: "Facebook Reels Title", rows: 2 },
      { key: "facebook_reels_content_prompt", label: "Facebook Reels Content", rows: 4 },
    ],
  },
  {
    title: "LinkedIn",
    items: [
      { key: "linkedin_title_prompt", label: "LinkedIn Title", rows: 2 },
      { key: "linkedin_content_prompt", label: "LinkedIn Content", rows: 4 },
      { key: "linkedin_video_title_prompt", label: "LinkedIn Video Title", rows: 2 },
      { key: "linkedin_video_content_prompt", label: "LinkedIn Video Content", rows: 4 },
    ],
  },
  {
    title: "YouTube",
    items: [
      { key: "youtube_video_title_prompt", label: "YouTube Video Title", rows: 2 },
      { key: "youtube_video_content_prompt", label: "YouTube Video Description", rows: 4 },
    ],
  },
  {
    title: "Pinterest",
    items: [
      { key: "pinterest_title_prompt", label: "Pinterest Title", rows: 2 },
      { key: "pinterest_content_prompt", label: "Pinterest Description", rows: 4 },
    ],
  },
];

/* =========================
   Component
   ========================= */

export default function PromptBlogSettings() {
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [custLoading, setCustLoading] = React.useState(false);
  const [custError, setCustError] = React.useState<string | null>(null);

  const [selectedCustomerId, setSelectedCustomerId] = React.useState<number | null>(null);

  const [record, setRecord] = React.useState<PromptBlog | null>(null);
  const [form, setForm] = React.useState<Partial<PromptBlog>>({});
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  // load customers (first 200)
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      setCustLoading(true);
      setCustError(null);
      try {
        const res = await CustomersAPI.list({ page: 1, per_page: 200 });
        if (!mounted) return;
        const rows = Array.isArray((res as any).data)
          ? (res as any).data
          : Array.isArray((res as any).items)
          ? (res as any).items
          : [];
        setCustomers(rows);
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

  // fetch prompt_blog for selected customer
  React.useEffect(() => {
    if (!selectedCustomerId) {
      setRecord(null);
      setForm({});
      return;
    }
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      setMessage(null);
      try {
        const data = await PromptBlogAPI.getByCustomer(selectedCustomerId);
        if (!mounted) return;
        setRecord(data);
        setForm((data ?? { customer_id: selectedCustomerId, is_active: true }) as Partial<PromptBlog>);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message ?? "Failed to load prompt settings");
        setRecord(null);
        setForm({ customer_id: selectedCustomerId, is_active: true });
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [selectedCustomerId]);

  function updateField<K extends FieldKey>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!selectedCustomerId) {
      setError("Please select a customer first.");
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const currentId = (record as any)?.id ?? (form as any)?.id ?? null;

      if (currentId) {
        // UPDATE: do NOT send customer_id (backend prohibits it)
        const { id: _i, customer_id: _c, created_at: _ca, updated_at: _ua, ...rest } = form as any;
        const updated = await PromptBlogAPI.update(Number(currentId), rest);
        setRecord(updated);
        setForm(updated);
        setMessage("Saved changes.");
      } else {
        // CREATE: include customer_id
        const { id: _i, created_at: _ca, updated_at: _ua, ...rest } = form as any;
        const created = await PromptBlogAPI.create({
          ...rest,
          customer_id: selectedCustomerId,
          is_active: (form.is_active ?? true) as boolean,
        });
        setRecord(created);
        setForm(created);
        setMessage("Created prompt settings.");
      }
    } catch (e: any) {
      setError(e?.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  // Back to company picker
  function handleBackToPicker() {
    setSelectedCustomerId(null);
    setRecord(null);
    setForm({});
    setMessage(null);
    setError(null);
  }

  function handleResetToLoaded() {
    if (record) setForm(record);
  }

  function handleClearAll() {
    const cleared: Partial<PromptBlog> = { customer_id: selectedCustomerId ?? 0, is_active: true };
    setForm(cleared);
  }

  const customerLabel = React.useMemo(() => {
    const c = customers.find((x) => x.id === selectedCustomerId);
    if (!c) return "";
    const name = c.business_name || c.user?.name || c.customer_number;
    const cityState = [c.city, c.state].filter(Boolean).join(", ");
    return cityState ? `${name} — ${cityState}` : name;
  }, [customers, selectedCustomerId]);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Prompt Settings (Blog & Social)</h1>
            <p className="text-sm text-slate-600">
              Select a company and define platform-specific prompt templates used by your automation.
            </p>
          </div>
          <div className="flex items-end gap-2">
            <div className="w-72">
              {custLoading ? (
                <div className="text-sm text-slate-500">Loading companies…</div>
              ) : custError ? (
                <div className="text-sm text-rose-600">{custError}</div>
              ) : (
                <Select
                  value={selectedCustomerId ?? ""}
                  onChange={(e) => setSelectedCustomerId(Number(e.target.value) || null)}
                  aria-label="Select Company"
                >
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
            {selectedCustomerId && (
              <Button variant="ghost" onClick={handleBackToPicker}>
                Back to Picker
              </Button>
            )}
            <Button variant="ghost" onClick={handleResetToLoaded} disabled={!record}>
              Reset
            </Button>
            <Button variant="ghost" onClick={handleClearAll} disabled={!selectedCustomerId}>
              Clear All
            </Button>
            <Button onClick={handleSave} disabled={!selectedCustomerId || saving}>
              {saving ? "Saving…" : record?.id ? "Save Changes" : "Create Settings"}
            </Button>
          </div>
        </div>

        {/* Status */}
        {error && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">
            {error}
          </div>
        )}
        {message && (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700">
            {message}
          </div>
        )}

        {!selectedCustomerId ? (
          <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
            Pick a company to begin.
          </div>
        ) : loading ? (
          <div className="rounded-2xl border border-slate-200 p-8 text-center text-slate-500">
            Loading settings for <span className="font-medium">{customerLabel}</span>…
          </div>
        ) : (
          <div className="space-y-8">
            {FIELD_GROUPS.map((group) => (
              <section
                key={group.title}
                className="rounded-2xl border border-slate-200 p-5 shadow-sm"
              >
                <header className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold">{group.title}</h2>
                  <button
                    onClick={handleBackToPicker}
                    className="text-sm text-slate-500 hover:text-slate-800"
                    aria-label="Back to company picker"
                  >
                    ← Back
                  </button>
                </header>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {group.items.map((f) => (
                    <Textarea
                      key={String(f.key)}
                      label={f.label}
                      value={(form[f.key] as string) ?? ""}
                      onChange={(e) => updateField(f.key, e.target.value)}
                      rows={f.rows ?? 3}
                      placeholder={f.placeholder}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
