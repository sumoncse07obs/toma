// src/pages/SettingsPage.tsx
import React from "react";

type Settings = {
  openai_api_key?: string | null;
  blotato_api_key?: string | null;
  dumplingai_api_key?: string | null;

  blotato_twitter_id?: string | null;
  blotato_linkeidin_id?: string | null;
  blotato_facebook_id?: string | null;
  blotato_tiktok_id?: string | null;
  blotato_instagram_id?: string | null;
  blotato_threads_id?: string | null;
  blotato_pinterest_id?: string | null;
  blotato_bluesky_id?: string | null;
  blotato_youtube_id?: string | null;

  blotato_facebook_page_ids?: string[] | null;
  blotato_linkeidin_page_ids?: string[] | null;
};

const API_BASE = "/api"; // Vite proxy -> http://tomaapi.thedrivingtrafficformula.com

export default function SettingsPage() {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [showKey, setShowKey] = React.useState<Record<string, boolean>>({});

  const [form, setForm] = React.useState<Settings>({});

  // Textareas for multi page IDs keep a visible text version
  const [fbPagesText, setFbPagesText] = React.useState("");
  const [liPagesText, setLiPagesText] = React.useState("");

  React.useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/settings`, {
          headers: { Accept: "application/json" },
          credentials: "include",
        });
        const json = await res.json();
        const data: Settings = json?.data ?? {};
        setForm(data);
        setFbPagesText((data.blotato_facebook_page_ids ?? []).join(", "));
        setLiPagesText((data.blotato_linkeidin_page_ids ?? []).join(", "));
      } catch (e: any) {
        setMsg("Failed to load settings.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const onChange = (key: keyof Settings) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
  };

  const toggleShow = (key: string) => {
    setShowKey((s) => ({ ...s, [key]: !s[key] }));
  };

  const save = async () => {
    setSaving(true);
    setMsg(null);

    const payload: any = { ...form };
    payload.blotato_facebook_page_ids = fbPagesText;
    payload.blotato_linkeidin_page_ids = liPagesText;

    try {
      const res = await fetch(`${API_BASE}/settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Save failed");
      setMsg("Saved!");
      // normalize textareas with any cleaning done by server:
      const saved: Settings = json.data;
      setFbPagesText((saved.blotato_facebook_page_ids ?? []).join(", "));
      setLiPagesText((saved.blotato_linkeidin_page_ids ?? []).join(", "));
      setForm(saved);
    } catch (e: any) {
      setMsg(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

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

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-6">Integration Settings</h1>

      <div className="grid grid-cols-1 gap-6">
        <section className="rounded-xl border p-4">
          <h2 className="font-medium mb-3">API Keys</h2>
          {maskedInput("OpenAI API Key", "openai_api_key")}
          {maskedInput("Blotato API Key", "blotato_api_key")}
          {maskedInput("DumplingAI API Key", "dumplingai_api_key")}
        </section>

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

        <section className="rounded-xl border p-4">
          <h2 className="font-medium mb-3">Page IDs (Multiple)</h2>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              Facebook Page IDs (comma separated)
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
              LinkedIn Page IDs (comma separated)
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
          {msg && <span className="text-sm">{msg}</span>}
        </div>
      </div>
    </div>
  );
}
