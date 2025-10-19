// src/components/admin/customer/TopicPromptSettings.tsx
import React from "react";
import { useParams, useLocation } from "react-router-dom";
import { toast } from "react-toastify";

type PromptFor = "topic";

export type PromptSetting = {
  id: number;
  customer_id: number;
  prompt_for: PromptFor;

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

/* =========================
   DEFAULTS (mirrors your blog seed)
   ========================= */

const DEFAULT_TOPIC_PROMPTS: Omit<
  PromptSetting,
  "id" | "customer_id" | "prompt_for" | "created_at" | "updated_at" | "is_active"
> = {
  summary_prompt:
    "Summarize the following blog post in under 200 words. Maintain a clear, insightful, and friendly tone. Highlight the key differences between ETFs and individual stocks, including their respective advantages and considerations for investors. Ensure the summary is engaging and suitable for audiences on platforms like LinkedIn, Facebook, X (formerly Twitter), and Threads.",
  short_summary_prompt:
    "Write a short post (max 250 characters) based on this blog summary. The tone should be professional yet conversational—sounding human, not overly polished. Avoid hashtags and emojis.",
  video_script_prompt:
    "Write a short video script in 5 to 7 sentences based on this summary. The script should flow as a single paragraph, sound natural and engaging, and be directly related to the topic. Avoid hashtags, emojis, quotation marks, or informal language. Return only the script as a single paragraph with no extra text.",
  make_image_prompt:
    "Create a professional, minimalist image for a financial newsletter brand. The image must have no text, labels, or typography. Use only these colors: #000000, #1683EE, and market-related colors like green and red from stock indicators. The visual should convey clarity, trust, and strategic thinking through abstract shapes, lighting, and layout. Avoid clutter, icons, or annotations. Ensure a modern, clean, and refined style suitable for a LinkedIn audience. Communicate the theme using a visual metaphor only.",

  tiktok_video_title_prompt:
    "Write a compelling Tiktok video post title in 70 characters or fewer based on this blog summary. The title should be smart, professional, and relevant to business professionals. Avoid hashtags, emojis, quotation marks, or informal language. Return only the title with no extra text.",
  tiktok_video_content_prompt:
    "Write a short Tiktok video post (max 250 characters) based on this blog summary. The tone should be professional yet conversational—sounding human, not overly polished. Avoid hashtags and emojis.",

  threads_title_prompt:
    "Write a compelling Threads post title in 70 characters or fewer based on this blog summary. The title should be smart, professional, and relevant to business professionals. Avoid hashtags, emojis, quotation marks, or informal language. Return only the title with no extra text.",
  threads_content_prompt:
    "Write a short Threads post (max 250 characters) based on this blog summary. The tone should be professional yet conversational—sounding human, not overly polished. Avoid hashtags and emojis. Do not include a title.",
  threads_video_title_prompt:
    "Write a compelling Threads video post title in 70 characters or fewer based on this blog summary. The title should be smart, professional, and relevant to business professionals. Avoid hashtags, emojis, quotation marks, or informal language. Return only the title with no extra text.",
  threads_video_content_prompt:
    "Write a short Threads video post (max 250 characters) based on this blog summary. The tone should be professional yet conversational—sounding human, not overly polished. Avoid hashtags and emojis.",

  twitter_title_prompt:
    "Write a compelling Twitter post title in 70 characters or fewer based on this blog summary. The title should be smart, professional, and relevant to business professionals. Avoid hashtags, emojis, quotation marks, or informal language. Return only the title with no extra text.",
  twitter_content_prompt:
    "Write a short Twitter post (max 250 characters) based on this blog summary. The tone should be professional yet conversational—sounding human, not overly polished. Avoid hashtags and emojis. Do not include a title. End the post with this exact URL",
  twitter_video_title_prompt:
    "Write a compelling Twitter video post title in 70 characters or fewer based on this blog summary. The title should be smart, professional, and relevant to business professionals. Avoid hashtags, emojis, quotation marks, or informal language. Return only the title with no extra text.",
  twitter_video_content_prompt:
    "Write a short Twitter video post (max 250 characters) based on this blog summary. The tone should be professional yet conversational—sounding human, not overly polished. Avoid hashtags and emojis.",

  instagram_title_prompt:
    "Write a compelling Instagram post title in 70 characters or fewer based on this blog summary. The title should be smart, professional, and relevant to business professionals. Avoid hashtags, emojis, quotation marks, or informal language. Return only the title with no extra text.",
  instagram_content_prompt:
    "Write a short Instagram post (max 250 characters) based on this blog summary. The tone should be professional yet conversational—sounding human, not overly polished. Avoid hashtags and emojis. Do not include a title. End the post with this exact URL",
  instagram_video_title_prompt:
    "Write a compelling Instagram video post title in 70 characters or fewer based on this blog summary. The title should be smart, professional, and relevant to business professionals. Avoid hashtags, emojis, quotation marks, or informal language. Return only the title with no extra text.",
  instagram_video_content_prompt:
    "Write a short Instagram video post (max 250 characters) based on this blog summary. The tone should be professional yet conversational—sounding human, not overly polished. Avoid hashtags and emojis.",
  instagram_reels_title_prompt:
    "Write a compelling Instagram video post title in 70 characters or fewer based on this blog summary. The title should be smart, professional, and relevant to business professionals. Avoid hashtags, emojis, quotation marks, or informal language. Return only the title with no extra text.",
  instagram_reels_content_prompt:
    "Write a short Instagram reels post (max 250 characters) based on this blog summary. The tone should be professional yet conversational—sounding human, not overly polished. Avoid hashtags and emojis.",

  facebook_title_prompt:
    "Write a compelling Facebook post title in 70 characters or fewer based on this blog summary. The title should be smart, professional, and relevant to business professionals. Avoid hashtags, emojis, quotation marks, or informal language. Return only the title with no extra text.",
  facebook_content_prompt:
    "Write a short Facebook post (max 250 characters) based on this blog summary. The tone should be professional yet conversational—sounding human, not overly polished. Avoid hashtags and emojis. Do not include a title. End the post with this exact URL",
  facebook_video_title_prompt:
    "Write a compelling Facebook video post title in 70 characters or fewer based on this blog summary. The title should be smart, professional, and relevant to business professionals. Avoid hashtags, emojis, quotation marks, or informal language. Return only the title with no extra text.",
  facebook_video_content_prompt:
    "Write a short Facebook video post (max 250 characters) based on this blog summary. The tone should be professional yet conversational—sounding human, not overly polished. Avoid hashtags and emojis.",
  facebook_reels_title_prompt:
    "Write a compelling Facebook reels post title in 70 characters or fewer based on this blog summary. The title should be smart, professional, and relevant to business professionals. Avoid hashtags, emojis, quotation marks, or informal language. Return only the title with no extra text.",
  facebook_reels_content_prompt:
    "Write a short Facebook reels post (max 250 characters) based on this blog summary. The tone should be professional yet conversational—sounding human, not overly polished. Avoid hashtags and emojis.",

  linkedin_title_prompt:
    "Write a compelling LinkedIn post title in 70 characters or fewer based on this blog summary. The title should be smart, professional, and relevant to business professionals. Avoid hashtags, emojis, quotation marks, or informal language. Return only the title with no extra text.",
  linkedin_content_prompt:
    "Write a short LinkedIn post (max 250 characters) based on this blog summary. The tone should be professional yet conversational—sounding human, not overly polished. Avoid hashtags and emojis. Do not include a title. End the post with this exact URL.",
  linkedin_video_title_prompt:
    "Write a compelling LinkedIn post title in 70 characters or fewer based on this blog summary. The title should be smart, professional, and relevant to business professionals. Avoid hashtags, emojis, quotation marks, or informal language. Return only the title with no extra text.",
  linkedin_video_content_prompt:
    "Write a short LinkedIn post (max 250 characters) based on this blog summary. The tone should be professional yet conversational—sounding human, not overly polished. Avoid hashtags and emojis.",

  youtube_video_title_prompt:
    "Write a compelling Youtube video post title in 70 characters or fewer based on this blog summary. The title should be smart, professional, and relevant to business professionals. Avoid hashtags, emojis, quotation marks, or informal language. Return only the title with no extra text.",
  youtube_video_content_prompt:
    "Write a short Youtube video post (max 250 characters) based on this blog summary. The tone should be professional yet conversational—sounding human, not overly polished. Avoid hashtags and emojis.",

  pinterest_title_prompt: "just copy short summary.",
  pinterest_content_prompt: "just copy short summary.",
};

/* =========================
   API helper
   ========================= */

const API_BASE = `${import.meta.env.VITE_API_BASE}/api`;
const TOKEN_KEY = "toma_token";
const PROMPT_FOR: PromptFor = "topic";

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
    throw new Error(`HTTP ${res.status}: ${msg}`);
  }
  const ct = res.headers.get("content-type") || "";
  return (ct.includes("application/json") ? await res.json() : (undefined as any)) as T;
}

const unwrap = <T,>(res: any): T => (res?.data ?? res) as T;

const PromptSettingAPI = {
  // GET /prompt-setting?customer_id=&prompt_for=
  async getByCustomerAndContext(customerId: number, promptFor: PromptFor) {
    const res = await api<any>(
      `/prompt-setting?customer_id=${customerId}&prompt_for=${encodeURIComponent(promptFor)}`
    );
    return unwrap<PromptSetting | null>(res);
  },
  // POST /prompt-setting (upsert by customer_id + prompt_for)
  async upsert(payload: Omit<PromptSetting, "id" | "created_at" | "updated_at">) {
    const res = await api<any>(`/prompt-setting`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return unwrap<PromptSetting>(res);
  },
  // PUT /prompt-setting/{id}
  async update(id: number, payload: Partial<PromptSetting>) {
    const { id: _i, customer_id: _c, created_at: _ca, updated_at: _ua, ...rest } = payload as any;
    const res = await api<any>(`/prompt-setting/${id}`, {
      method: "PUT",
      body: JSON.stringify(rest),
    });
    return unwrap<PromptSetting>(res);
  },
};

/* =========================
   Route customer id (custom hook)
   ========================= */

function useRouteCustomerId(): number | null {
  const params = useParams();
  const location = useLocation();

  const candidates = [
    params.id as string | undefined,
    // @ts-ignore
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
   UI primitives
   ========================= */

function Button(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" }
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
      {label ? <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span> : null}
      <textarea
        className={`w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 ${className}`}
        {...rest}
      />
      {hint ? <span className="mt-1 block text-xs text-slate-500">{hint}</span> : null}
    </label>
  );
}

/* =========================
   Field Groups
   ========================= */

type FieldKey = keyof Omit<
  PromptSetting,
  "id" | "customer_id" | "prompt_for" | "created_at" | "updated_at" | "is_active"
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
          "Summarize the following blog post in under 200 words. Maintain a clear, insightful, and friendly tone. Highlight the key differences between ETFs and individual stocks, including their respective advantages and considerations for investors. Ensure the summary is engaging and suitable for audiences on platforms like LinkedIn, Facebook, X (formerly Twitter), and Threads.",
      },
      {
        key: "short_summary_prompt",
        label: "Short Summary Prompt",
        rows: 3,
        placeholder: "Write a short post (max 250 characters) based on this blog summary. The tone should be professional yet conversational—sounding human, not overly polished. Avoid hashtags and emojis.",
      },
      {
        key: "video_script_prompt",
        label: "Video Script Prompt",
        rows: 3,
        placeholder:
          "Write a short video script in 5 to 7 sentences based on this summary. The script should flow as a single paragraph, sound natural and engaging, and be directly related to the topic. Avoid hashtags, emojis, quotation marks, or informal language. Return only the script as a single paragraph with no extra text.",
      },
      {
        key: "make_image_prompt",
        label: "Make Image Prompt",
        rows: 3,
        placeholder:
          "Create a professional, minimalist image for a financial newsletter brand. The image must have no text, labels, or typography. Use only these colors: #000000, #1683EE, and market-related colors like green and red from stock indicators. The visual should convey clarity, trust, and strategic thinking through abstract shapes, lighting, and layout. Avoid clutter, icons, or annotations. Ensure a modern, clean, and refined style suitable for a LinkedIn audience. Communicate the theme using a visual metaphor only.",
      },
    ],
  },
  {
    title: "TikTok",
    items: [
      { key: "tiktok_video_title_prompt", label: "TikTok Video Title", rows: 3 },
      { key: "tiktok_video_content_prompt", label: "TikTok Video Content", rows: 3 },
    ],
  },
  {
    title: "Threads",
    items: [
      { key: "threads_title_prompt", label: "Threads Title", rows: 3 },
      { key: "threads_content_prompt", label: "Threads Content", rows: 3 },
      { key: "threads_video_title_prompt", label: "Threads Video Title", rows: 3 },
      { key: "threads_video_content_prompt", label: "Threads Video Content", rows: 3 },
    ],
  },
  {
    title: "Twitter / X",
    items: [
      { key: "twitter_title_prompt", label: "X Title", rows: 3 },
      { key: "twitter_content_prompt", label: "X Content", rows: 3 },
      { key: "twitter_video_title_prompt", label: "X Video Title", rows: 3 },
      { key: "twitter_video_content_prompt", label: "X Video Content", rows: 3 },
    ],
  },
  {
    title: "Instagram",
    items: [
      { key: "instagram_title_prompt", label: "Instagram Title", rows: 3 },
      { key: "instagram_content_prompt", label: "Instagram Content", rows: 3 },
      { key: "instagram_video_title_prompt", label: "Instagram Video Title", rows: 3 },
      { key: "instagram_video_content_prompt", label: "Instagram Video Content", rows: 3 },
      { key: "instagram_reels_title_prompt", label: "Reels Title", rows: 3 },
      { key: "instagram_reels_content_prompt", label: "Reels Content", rows: 3 },
    ],
  },
  {
    title: "Facebook",
    items: [
      { key: "facebook_title_prompt", label: "Facebook Title", rows: 3 },
      { key: "facebook_content_prompt", label: "Facebook Content", rows: 3 },
      { key: "facebook_video_title_prompt", label: "Facebook Video Title", rows: 3 },
      { key: "facebook_video_content_prompt", label: "Facebook Video Content", rows: 3 },
      { key: "facebook_reels_title_prompt", label: "Facebook Reels Title", rows: 3 },
      { key: "facebook_reels_content_prompt", label: "Facebook Reels Content", rows: 3 },
    ],
  },
  {
    title: "LinkedIn",
    items: [
      { key: "linkedin_title_prompt", label: "LinkedIn Title", rows: 3 },
      { key: "linkedin_content_prompt", label: "LinkedIn Content", rows: 3 },
      { key: "linkedin_video_title_prompt", label: "LinkedIn Video Title", rows: 3 },
      { key: "linkedin_video_content_prompt", label: "LinkedIn Video Content", rows: 3 },
    ],
  },
  {
    title: "YouTube",
    items: [
      { key: "youtube_video_title_prompt", label: "YouTube Video Title", rows: 3 },
      { key: "youtube_video_content_prompt", label: "YouTube Video Description", rows: 3 },
    ],
  },
  {
    title: "Pinterest",
    items: [
      { key: "pinterest_title_prompt", label: "Pinterest Title", rows: 3 },
      { key: "pinterest_content_prompt", label: "Pinterest Description", rows: 3 },
    ],
  },
];

/* =========================
   Defaults application helpers
   ========================= */

const ALL_KEYS = Object.keys(DEFAULT_TOPIC_PROMPTS) as FieldKey[];
const isBlank = (v: unknown) => v == null || (typeof v === "string" && v.trim() === "");

function withDefaults(src: Partial<PromptSetting> | null | undefined): Partial<PromptSetting> {
  const base: Partial<PromptSetting> = { ...DEFAULT_TOPIC_PROMPTS };
  if (!src) return base;
  const out: Partial<PromptSetting> = { ...base };
  for (const k of ALL_KEYS) {
    const val = (src as any)[k];
    out[k] = isBlank(val) ? (base as any)[k] : val;
  }
  return { ...src, ...out };
}

/* =========================
   Component
   ========================= */

export default function TopicPromptSettings() {
  const customerId = useRouteCustomerId();
  const [record, setRecord] = React.useState<PromptSetting | null>(null);
  const [form, setForm] = React.useState<Partial<PromptSetting>>({});
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!customerId) {
      setError("Could not determine your company. Please sign in again.");
      return;
    }
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await PromptSettingAPI.getByCustomerAndContext(customerId, PROMPT_FOR);
        if (!mounted) return;

        if (data) {
          const merged = withDefaults(data);
          setRecord(data);
          setForm({
            ...merged,
            customer_id: customerId,
            prompt_for: PROMPT_FOR,
            is_active: (data as any)?.is_active ?? true,
          });
        } else {
          const merged = withDefaults({ customer_id: customerId, prompt_for: PROMPT_FOR, is_active: true });
          setRecord(null);
          setForm(merged);
        }
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message ?? "Failed to load prompt settings");
        const merged = withDefaults({ customer_id: customerId, prompt_for: PROMPT_FOR, is_active: true });
        setRecord(null);
        setForm(merged);
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [customerId]);

  function updateField<K extends FieldKey>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!customerId) {
      setError("Invalid customer.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const currentId = (record as any)?.id ?? (form as any)?.id ?? null;
      if (currentId) {
        const { id: _i, customer_id: _c, created_at: _ca, updated_at: _ua, ...rest } = form as any;
        const updated = await PromptSettingAPI.update(Number(currentId), {
          ...withDefaults(rest),
          prompt_for: PROMPT_FOR,
        });
        setRecord(updated);
        setForm(withDefaults(updated));
        toast.success("Saved changes.");
      } else {
        const { id: _i, created_at: _ca, updated_at: _ua, ...rest } = form as any;
        const created = await PromptSettingAPI.upsert({
          ...withDefaults(rest),
          customer_id: customerId,
          prompt_for: PROMPT_FOR,
          is_active: (form.is_active ?? true) as boolean,
        });
        setRecord(created);
        setForm(withDefaults(created));
        toast.success("Created prompt settings.");
      }
    } catch (e: any) {
      setError(e?.message ?? "Failed to save");
      toast.error(e?.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  function handleResetToLoaded() {
    if (record) setForm(withDefaults(record));
  }

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Prompt Settings — Topic</h1>
            <p className="text-sm text-slate-600">
              Define topic & social prompt templates used by your automation.
            </p>
          </div>
          <div className="flex items-end gap-2">
            <Button variant="ghost" onClick={handleResetToLoaded} disabled={!record}>
              Reset
            </Button>
            <Button onClick={handleSave} disabled={!customerId || saving}>
              {saving ? "Saving…" : record?.id ? "Save Changes" : "Create Settings"}
            </Button>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">
            {error}
          </div>
        )}

        {!customerId ? (
          <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
            Determining your company…
          </div>
        ) : loading ? (
          <div className="rounded-2xl border border-slate-200 p-8 text-center text-slate-500">
            Loading your settings…
          </div>
        ) : (
          <>
            <div className="space-y-8">
              {FIELD_GROUPS.map((group) => (
                <section key={group.title} className="rounded-2xl border border-slate-200 p-5 shadow-sm">
                  <header className="mb-4">
                    <h2 className="text-lg font-semibold">{group.title}</h2>
                  </header>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {group.items.map((f) => (
                      <Textarea
                        key={String(f.key)}
                        label={f.label}
                        value={(form[f.key] as string) ?? ""}
                        onChange={(e) => updateField(f.key, e.target.value)}
                        rows={3}
                        placeholder={f.placeholder}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>

            <div className="mt-8 flex justify-end">
              <Button onClick={handleSave} disabled={!customerId || saving}>
                {saving ? "Saving…" : record?.id ? "Save Changes" : "Create Settings"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
