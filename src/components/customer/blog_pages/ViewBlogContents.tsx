// src/components/customer/BlogContentsDetails.tsx
import React from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { currentUser, isAuthed, refreshUser, type User } from "@/components/auth";

type ContentGeneration = {
  id: number;
  customer_id: number;
  url: string;
  url_hash: string;
  title: string | null;
  status: "idle" | "queued" | "processing" | "completed" | "failed";
  progress: number;
  model: string;
  error: string | null;
  last_run_at: string | null;

  summary: string | null;
  short_summary: string | null;
  video_script: string | null;
  image_url: string | null;

  tiktok_video_title: string | null;
  tiktok_video_content: string | null;

  threads_title: string | null;
  threads_content: string | null;
  threads_video_title: string | null;
  threads_video_content: string | null;

  x_title: string | null;
  x_content: string | null;
  x_video_title: string | null;
  x_video_content: string | null;

  instagram_title: string | null;
  instagram_content: string | null;
  instagram_video_title: string | null;
  instagram_video_content: string | null;
  instagram_reels_title: string | null;
  instagram_reels_content: string | null;

  facebook_title: string | null;
  facebook_content: string | null;
  facebook_video_title: string | null;
  facebook_video_content: string | null;
  facebook_reels_title: string | null;
  facebook_reels_content: string | null;

  linkedin_title: string | null;
  linkedin_content: string | null;
  linkedin_video_title: string | null;
  linkedin_video_content: string | null;

  youtube_video_title: string | null;
  youtube_video_description: string | null;

  pinterest_title: string | null;
  pinterest_description: string | null;

  video_url: string | null;

  /** NEW: Blotato tracking fields */
  blotato_video_id?: string | null;
  blotato_video_status?: string | null;
  blotato_video_checked_at?: string | null;

  created_at?: string;
  updated_at?: string;
};

const API_BASE_URL = `${import.meta.env.VITE_API_BASE}/api`;
const TOKEN_KEY = "toma_token";

function fmt(ts: string | null) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString();
}
function cls(...xs: Array<string | null | false | undefined>) {
  return xs.filter(Boolean).join(" ");
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  if (!path.startsWith("/")) path = `/${path}`;
  const url = `${API_BASE_URL}${path}`.replace(/([^:]\/)\/+/g, "$1");
  const token = localStorage.getItem(TOKEN_KEY);

  const res = await fetch(url, {
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
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
  }

  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    return undefined as T;
  }
  const data = await res.json();
  return data as T;
}

function CopyBtn({ value }: { value: string }) {
  return (
    <button
      className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded"
      onClick={() => navigator.clipboard.writeText(value || "")}
      disabled={!value}
      title={value ? "Copy" : "Nothing to copy"}
    >
      Copy
    </button>
  );
}

type StringFields = {
  [K in keyof ContentGeneration]: ContentGeneration[K] extends string | null ? K : never;
}[keyof ContentGeneration];

type SaveState = "idle" | "saving" | "saved" | "error";

function AutoField(props: {
  label: string;
  field: StringFields;
  content: ContentGeneration;
  setContent: React.Dispatch<React.SetStateAction<ContentGeneration | null>>;
  saveField: (field: StringFields, value: string) => Promise<void>;
  rows?: number;
  placeholder?: string;
  className?: string;
  copy?: boolean;
  timersRef: React.MutableRefObject<Record<string, number>>;
  saveStates: Record<string, SaveState>;
  setSaveStates: React.Dispatch<React.SetStateAction<Record<string, SaveState>>>;
  debounceMs?: number;
}) {
  const {
    label,
    field,
    content,
    setContent,
    saveField,
    rows = 6,
    placeholder = "Type here…",
    className,
    copy,
    timersRef,
    saveStates,
    setSaveStates,
    debounceMs = 600,
  } = props;

  const value = (content[field] || "") as string;

  const scheduleSave = React.useCallback(
    (next: string) => {
      setContent((prev) => (prev ? { ...prev, [field]: next } as ContentGeneration : prev));
      setSaveStates((s) => ({ ...s, [field as string]: "saving" }));

      if (timersRef.current[field as string]) {
        window.clearTimeout(timersRef.current[field as string]);
      }

      const t = window.setTimeout(async () => {
        try {
          await saveField(field, next);
          setSaveStates((s) => ({ ...s, [field as string]: "saved" }));
          window.setTimeout(
            () => setSaveStates((s) => ({ ...s, [field as string]: "idle" })),
            1200
          );
        } catch (e) {
          console.error(e);
          setSaveStates((s) => ({ ...s, [field as string]: "error" }));
        }
      }, debounceMs);

      timersRef.current[field as string] = t;
    },
    [debounceMs, field, saveField, setContent, setSaveStates, timersRef]
  );

  const forceSave = async () => {
    if (timersRef.current[field as string]) {
      window.clearTimeout(timersRef.current[field as string]);
      timersRef.current[field as string] = 0 as unknown as number;
    }
    try {
      setSaveStates((s) => ({ ...s, [field as string]: "saving" }));
      await saveField(field, value || "");
      setSaveStates((s) => ({ ...s, [field as string]: "saved" }));
      window.setTimeout(
        () => setSaveStates((s) => ({ ...s, [field as string]: "idle" })),
        1200
      );
    } catch (e) {
      console.error(e);
      setSaveStates((s) => ({ ...s, [field as string]: "error" }));
    }
  };

  const pill =
    saveStates[field as string] === "saving"
      ? "Saving…"
      : saveStates[field as string] === "saved"
      ? "Saved"
      : saveStates[field as string] === "error"
      ? "Error"
      : "";

  const pillCls =
    saveStates[field as string] === "saving"
      ? "bg-amber-100 text-amber-700"
      : saveStates[field as string] === "saved"
      ? "bg-green-100 text-green-700"
      : saveStates[field as string] === "error"
      ? "bg-red-100 text-red-700"
      : "bg-gray-100 text-gray-600";

  return (
    <div className={cls("bg-white rounded-lg border p-4", className)}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <h3 className="font-medium">{label}</h3>
          {pill && (
            <span className={cls("text-xs rounded-full px-2 py-0.5", pillCls)}>{pill}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {saveStates[field as string] === "error" && (
            <button
              className="text-xs text-red-600 hover:text-red-700"
              onClick={forceSave}
              title="Retry save"
            >
              Retry
            </button>
          )}
          {copy && <CopyBtn value={value || ""} />}
        </div>
      </div>

      <textarea
        className="w-full p-2 border rounded text-sm min-h-24"
        rows={rows}
        value={value}
        onChange={(e) => scheduleSave(e.target.value)}
        onBlur={forceSave}
        placeholder={placeholder}
      />
    </div>
  );
}

export default function BlogContentsDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [content, setContent] = React.useState<ContentGeneration | null>(null);

  const [saveStates, setSaveStates] = React.useState<Record<string, SaveState>>({});
  const timersRef = React.useRef<Record<string, number>>({});

  // Image generation local state
  const [genImgLoading, setGenImgLoading] = React.useState(false);
  const [genImgErr, setGenImgErr] = React.useState<string | null>(null);

  // Video generation local state
  const [genVidLoading, setGenVidLoading] = React.useState(false);
  const [genVidErr, setGenVidErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    const currentUserData = currentUser();
    if (currentUserData) {
      setUser(currentUserData);
    } else if (isAuthed()) {
      refreshUser().then((userData) => {
        if (userData) setUser(userData);
      });
    }
  }, []);

  const loadContent = React.useCallback(async () => {
    if (!id || !user) return;
    try {
      setLoading(true);
      setError(null);

      const res = await api<any>(`/content-generations/${id}`);

      if (res && typeof res === "object") {
        if (res.data) setContent(res.data);
        else if (res.id) setContent(res as ContentGeneration);
        else {
          setError(`Unexpected API response format. Keys: ${Object.keys(res).join(", ")}`);
        }
      } else {
        setError("API returned empty or invalid response");
      }
    } catch (e: any) {
      setError(e?.message || "Failed to load content details");
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  React.useEffect(() => {
    if (user && id) loadContent();
  }, [loadContent, user, id]);

  async function saveField(field: StringFields, value: string) {
    if (!content) return;

    await api(`/content-generations/${content.id}`, {
      method: "PUT",
      body: JSON.stringify({ [field]: value }),
    });

    setContent((prev) =>
      prev
        ? ({ ...prev, [field]: value, updated_at: new Date().toISOString() } as ContentGeneration)
        : prev
    );
  }

  async function generateImage() {
    if (!content) return;
    try {
      setGenImgErr(null);
      setGenImgLoading(true);

      const resp = await api<any>(
        `/customers/${content.customer_id}/contents/${content.id}/make-image`,
        { method: "POST" }
      );

      const newUrl =
        resp?.image_url ??
        resp?.data?.image_url ??
        resp?.url ??
        resp?.data?.url ??
        null;

      if (typeof newUrl === "string" && newUrl.length > 0) {
        setContent((prev) =>
          prev
            ? ({
                ...prev,
                image_url: newUrl,
                updated_at: new Date().toISOString(),
              } as ContentGeneration)
            : prev
        );
      } else {
        await loadContent();
      }
    } catch (e: any) {
      setGenImgErr(e?.message || "Failed to generate image");
    } finally {
      setGenImgLoading(false);
    }
  }

  async function generateVideo() {
    if (!content) return;

    try {
      setGenVidErr(null);
      setGenVidLoading(true);

      const resp = await api<any>(
        `/customers/${content.customer_id}/contents/${content.id}/make-video`,
        { method: "POST" }
      );

      const newUrl =
        resp?.video_url ??
        resp?.data?.video_url ??
        resp?.url ??
        resp?.data?.url ??
        null;

      // capture job id + status and persist immediately
      const jobId = resp?.job_id ?? null;
      const status = resp?.status ?? null;

      if (jobId || status) {
        await api(`/content-generations/${content.id}`, {
          method: "PUT",
          body: JSON.stringify({
            blotato_video_id: jobId,
            blotato_video_status: status,
          }),
        });

        setContent((prev) =>
          prev
            ? ({
                ...prev,
                blotato_video_id: jobId ?? prev.blotato_video_id ?? null,
                blotato_video_status: status ?? prev.blotato_video_status ?? null,
                updated_at: new Date().toISOString(),
              } as ContentGeneration)
            : prev
        );
      }

      if (typeof newUrl === "string" && newUrl.length > 0) {
        setContent((prev) =>
          prev
            ? ({
                ...prev,
                video_url: newUrl,
                updated_at: new Date().toISOString(),
              } as ContentGeneration)
            : prev
        );
      } else {
        // If only job_id/status returned, refresh to show latest server values
        await loadContent();
      }
    } catch (e: any) {
      setGenVidErr(e?.message || "Failed to generate video");
    } finally {
      setGenVidLoading(false);
    }
  }

  // NEW: manual "Check Status" button action
  async function checkVideoStatus() {
    if (!content) return;
    try {
      setGenVidErr(null);
      setGenVidLoading(true);

      const suffix = content.blotato_video_id
        ? `?job_id=${encodeURIComponent(content.blotato_video_id)}`
        : "";

      const resp = await api<any>(
        `/customers/${content.customer_id}/contents/${content.id}/check-video${suffix}`
      );

      const status = resp?.status ?? null;
      const jobId = resp?.job_id ?? content.blotato_video_id ?? null;
      const videoUrl =
        resp?.video_url ??
        resp?.data?.video_url ??
        null;

      setContent((prev) =>
        prev
          ? ({
              ...prev,
              blotato_video_status: status ?? prev.blotato_video_status ?? null,
              blotato_video_id: jobId,
              video_url: typeof videoUrl === "string" && videoUrl.length > 0 ? videoUrl : prev.video_url,
              updated_at: new Date().toISOString(),
            } as ContentGeneration)
          : prev
      );
    } catch (e: any) {
      setGenVidErr(e?.message || "Failed to check video status");
    } finally {
      setGenVidLoading(false);
    }
  }

  if (!isAuthed()) {
    return (
      <div className="p-4 md:p-6">
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3">
          <p className="text-sm text-yellow-800">
            You need to be logged in to view content details. Please login to your account first.
          </p>
        </div>
      </div>
    );
  }

  if (loading && !content) {
    return (
      <div className="p-4 md:p-6">
        <div className="flex items-center justify-center py-8">
          <div className="text-gray-500">Loading content details...</div>
        </div>
      </div>
    );
  }

  if (error && !content) {
    return (
      <div className="p-4 md:p-6">
        <div className="mb-4">
          <Link to="/customer/blog/list" className="text-blue-600 hover:text-blue-700 text-sm">
            ← Back to Blogs Automation
          </Link>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-800">
            <strong>Error:</strong> {error}
          </p>
        </div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="p-4 md:p-6">
        <div className="mb-4">
          <Link to="/customer/blog/list" className="text-blue-600 hover:text-blue-700 text-sm">
            ← Back to Blogs Automation
          </Link>
        </div>
        <div className="text-center py-8 text-gray-500">Content not found</div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <Link to="/customer/blog/list" className="text-blue-600 hover:text-blue-700 text-sm">
            ← Back to Blogs Automation
          </Link>

          <div className="flex items-center gap-2">
            <button className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded" onClick={loadContent}>
              Reload
            </button>

            <Link
              to={`/customer/blog/post/${content.id}`}
              className="text-xs px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
            >
              Continue to post →
            </Link>
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-bold mb-2">{content.title || "Untitled Content"}</h1>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>ID: {content.id}</span>
            <span
              className={cls(
                "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium",
                content.status === "completed" && "bg-green-100 text-green-700",
                content.status === "processing" && "bg-amber-100 text-amber-700",
                content.status === "queued" && "bg-blue-100 text-blue-700",
                content.status === "failed" && "bg-red-100 text-red-700",
                content.status === "idle" && "bg-gray-100 text-gray-600"
              )}
            >
              {content.status}
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-700">
            <strong>Error:</strong> {error}
            <button onClick={() => setError(null)} className="ml-2 text-red-500 hover:text-red-700">
              ×
            </button>
          </p>
        </div>
      )}

      {/* Core Content Section */}
      <div className="space-y-6">
        {/* Details */}
        <div className="bg-white rounded-lg border p-4">
          <div className="mb-3">
            <div className="text-gray-600 text-sm mb-1">Source URL:</div>
            <a href={content.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline break-all">
              {content.url}
            </a>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-y-2 gap-x-6 text-sm">
            <div>
              <span className="text-gray-600">Status:</span>
              <span className="ml-2 font-medium">{content.status}</span>
            </div>
            <div>
              <span className="text-gray-600">Progress:</span>
              <span className="ml-2">{content.progress}%</span>
            </div>
            <div>
              <span className="text-gray-600">Model:</span>
              <span className="ml-2">{content.model}</span>
            </div>
            <div>
              <span className="text-gray-600">Last Run:</span>
              <span className="ml-2">{fmt(content.last_run_at)}</span>
            </div>
            <div>
              <span className="text-gray-600">Created:</span>
              <span className="ml-2">{fmt(content.created_at || null)}</span>
            </div>
            <div>
              <span className="text-gray-600">Updated:</span>
              <span className="ml-2">{fmt(content.updated_at || null)}</span>
            </div>

            {/* NEW: Blotato job tracking */}
            <div className="col-span-1 sm:col-span-2 lg:col-span-2">
              <div className="flex items-center gap-2">
                <span className="text-gray-600">Blotato Job ID:</span>
                <span className="ml-1 break-all">{content.blotato_video_id || "—"}</span>
                {content.blotato_video_id ? (
                  <span className="ml-1 inline-block">
                    <CopyBtn value={content.blotato_video_id!} />
                  </span>
                ) : null}
              </div>
            </div>
            <div>
              <span className="text-gray-600">Blotato Status:</span>
              <span className="ml-2">{content.blotato_video_status || "—"}</span>
            </div>
          </div>
        </div>

        {/* Summaries */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AutoField
            label="Summary"
            field="summary"
            content={content}
            setContent={setContent}
            saveField={saveField}
            rows={6}
            copy
            timersRef={timersRef}
            saveStates={saveStates}
            setSaveStates={setSaveStates}
          />
          <AutoField
            label="Short Summary"
            field="short_summary"
            content={content}
            setContent={setContent}
            saveField={saveField}
            rows={6}
            copy
            timersRef={timersRef}
            saveStates={saveStates}
            setSaveStates={setSaveStates}
          />
        </div>

        {/* Video Script */}
        <AutoField
          label="Video Script"
          field="video_script"
          content={content}
          setContent={setContent}
          saveField={saveField}
          rows={6}
          copy
          timersRef={timersRef}
          saveStates={saveStates}
          setSaveStates={setSaveStates}
        />

        {/* Image URL + Generate button */}
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <h3 className="font-medium">Image URL</h3>
              {genImgLoading && (
                <span className="text-xs rounded-full px-2 py-0.5 bg-amber-100 text-amber-700">
                  Generating…
                </span>
              )}
              {genImgErr && (
                <span className="text-xs rounded-full px-2 py-0.5 bg-red-100 text-red-700" title={genImgErr}>
                  Error
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                className="text-xs px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                onClick={generateImage}
                disabled={genImgLoading}
                title="Generate an image using the saved prompt for this content"
              >
                {genImgLoading ? "Generating…" : "Generate Image"}
              </button>
              {content.image_url ? (
                <a
                  href={content.image_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded"
                >
                  Open
                </a>
              ) : null}
            </div>
          </div>

          <AutoField
            label=""
            field="image_url"
            content={content}
            setContent={setContent}
            saveField={saveField}
            rows={2}
            copy
            timersRef={timersRef}
            saveStates={saveStates}
            setSaveStates={setSaveStates}
          />
          <div className="mt-2 text-xs text-gray-600">
            Do not like this image? Want to upload your image ?{" "}
            <Link
              to={`/customer/blog/posttoblotato/${content.id}`}
              className="text-blue-600 hover:text-blue-700 underline"
            >
              Click here...
            </Link>
          </div>
        </div>

        {/* Video url + Generate + Check button */}
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <h3 className="font-medium">Video URL</h3>
              {genVidLoading && (
                <span className="text-xs rounded-full px-2 py-0.5 bg-amber-100 text-amber-700">
                  Working…
                </span>
              )}
              {genVidErr && (
                <span className="text-xs rounded-full px-2 py-0.5 bg-red-100 text-red-700" title={genVidErr}>
                  Error
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                className="text-xs px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                onClick={generateVideo}
                disabled={genVidLoading || !(content.video_script && content.video_script.trim().length)}
                title={content.video_script ? "Generate a video from the saved Video Script" : "Add a Video Script first"}
              >
                {genVidLoading ? "Generating…" : "Generate Video"}
              </button>

              {/* NEW: Check Status button */}
              <button
                className="text-xs px-3 py-1 rounded bg-gray-100 text-gray-800 hover:bg-gray-200 disabled:opacity-50"
                onClick={checkVideoStatus}
                disabled={genVidLoading || !(content.blotato_video_id || content.blotato_video_status)}
                title={content.blotato_video_id ? "Check Blotato status and pull URL if ready" : "Generate a video first"}
              >
                Check Status
              </button>

              {content.video_url ? (
                <a
                  href={content.video_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded"
                >
                  View Video
                </a>
              ) : null}
              {content.video_url ? (
                <a
                  href={'https://my.blotato.com/videos'}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded"
                >
                  Edit Video
                </a>
              ) : null}
            </div>
          </div>

          <AutoField
            label=""
            field="video_url"
            content={content}
            setContent={setContent}
            saveField={saveField}
            rows={2}
            copy
            timersRef={timersRef}
            saveStates={saveStates}
            setSaveStates={setSaveStates}
          />

          <div className="mt-2 text-xs text-gray-600">
            Do not like this video? Want to upload your video ?{" "}
            <Link
              to={`/customer/blog/posttoblotato/${content.id}`}
              className="text-blue-600 hover:text-blue-700 underline"
            >
              Click here...
            </Link>
          </div>
        </div>

        {/* TikTok */}
        <div className="bg-white rounded-lg border">
          <div className="bg-gray-50 px-4 py-2 border-b">
            <h2 className="font-semibold">TikTok</h2>
          </div>
          <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AutoField label="TikTok Video Title" field="tiktok_video_title" content={content} setContent={setContent} saveField={saveField} rows={3} copy timersRef={timersRef} saveStates={saveStates} setSaveStates={setSaveStates} />
            <AutoField label="TikTok Video Content" field="tiktok_video_content" content={content} setContent={setContent} saveField={saveField} rows={3} copy timersRef={timersRef} saveStates={saveStates} setSaveStates={setSaveStates} />
          </div>
        </div>

        {/* Threads */}
        <div className="bg-white rounded-lg border">
          <div className="bg-gray-50 px-4 py-2 border-b">
            <h2 className="font-semibold">Threads</h2>
          </div>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AutoField label="Threads Title" field="threads_title" content={content} setContent={setContent} saveField={saveField} rows={3} copy timersRef={timersRef} saveStates={saveStates} setSaveStates={setSaveStates} />
              <AutoField label="Threads Content" field="threads_content" content={content} setContent={setContent} saveField={saveField} rows={3} copy timersRef={timersRef} saveStates={saveStates} setSaveStates={setSaveStates} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AutoField label="Threads Video Title" field="threads_video_title" content={content} setContent={setContent} saveField={saveField} rows={3} copy timersRef={timersRef} saveStates={saveStates} setSaveStates={setSaveStates} />
              <AutoField label="Threads Video Content" field="threads_video_content" content={content} setContent={setContent} saveField={saveField} rows={3} copy timersRef={timersRef} saveStates={saveStates} setSaveStates={setSaveStates} />
            </div>
          </div>
        </div>

        {/* Twitter / X */}
        <div className="bg-white rounded-lg border">
          <div className="bg-gray-50 px-4 py-2 border-b">
            <h2 className="font-semibold">Twitter / X</h2>
          </div>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AutoField label="X Title" field="x_title" content={content} setContent={setContent} saveField={saveField} rows={3} copy timersRef={timersRef} saveStates={saveStates} setSaveStates={setSaveStates} />
              <AutoField label="X Content" field="x_content" content={content} setContent={setContent} saveField={saveField} rows={3} copy timersRef={timersRef} saveStates={saveStates} setSaveStates={setSaveStates} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AutoField label="X Video Title" field="x_video_title" content={content} setContent={setContent} saveField={saveField} rows={3} copy timersRef={timersRef} saveStates={saveStates} setSaveStates={setSaveStates} />
              <AutoField label="X Video Content" field="x_video_content" content={content} setContent={setContent} saveField={saveField} rows={3} copy timersRef={timersRef} saveStates={saveStates} setSaveStates={setSaveStates} />
            </div>
          </div>
        </div>

        {/* Instagram */}
        <div className="bg-white rounded-lg border">
          <div className="bg-gray-50 px-4 py-2 border-b">
            <h2 className="font-semibold">Instagram</h2>
          </div>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AutoField label="Instagram Title" field="instagram_title" content={content} setContent={setContent} saveField={saveField} rows={3} copy timersRef={timersRef} saveStates={saveStates} setSaveStates={setSaveStates} />
              <AutoField label="Instagram Content" field="instagram_content" content={content} setContent={setContent} saveField={saveField} rows={3} copy timersRef={timersRef} saveStates={saveStates} setSaveStates={setSaveStates} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AutoField label="Instagram Video Title" field="instagram_video_title" content={content} setContent={setContent} saveField={saveField} rows={3} copy timersRef={timersRef} saveStates={saveStates} setSaveStates={setSaveStates} />
              <AutoField label="Instagram Video Content" field="instagram_video_content" content={content} setContent={setContent} saveField={saveField} rows={3} copy timersRef={timersRef} saveStates={saveStates} setSaveStates={setSaveStates} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AutoField label="Reels Title" field="instagram_reels_title" content={content} setContent={setContent} saveField={saveField} rows={3} copy timersRef={timersRef} saveStates={saveStates} setSaveStates={setSaveStates} />
              <AutoField label="Reels Content" field="instagram_reels_content" content={content} setContent={setContent} saveField={saveField} rows={3} copy timersRef={timersRef} saveStates={saveStates} setSaveStates={setSaveStates} />
            </div>
          </div>
        </div>

        {/* Facebook */}
        <div className="bg-white rounded-lg border">
          <div className="bg-gray-50 px-4 py-2 border-b">
            <h2 className="font-semibold">Facebook</h2>
          </div>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AutoField label="Facebook Title" field="facebook_title" content={content} setContent={setContent} saveField={saveField} rows={3} copy timersRef={timersRef} saveStates={saveStates} setSaveStates={setSaveStates} />
              <AutoField label="Facebook Content" field="facebook_content" content={content} setContent={setContent} saveField={saveField} rows={3} copy timersRef={timersRef} saveStates={saveStates} setSaveStates={setSaveStates} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AutoField label="Facebook Video Title" field="facebook_video_title" content={content} setContent={setContent} saveField={saveField} rows={3} copy timersRef={timersRef} saveStates={saveStates} setSaveStates={setSaveStates} />
              <AutoField label="Facebook Video Content" field="facebook_video_content" content={content} setContent={setContent} saveField={saveField} rows={3} copy timersRef={timersRef} saveStates={saveStates} setSaveStates={setSaveStates} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AutoField label="Facebook Reels Title" field="facebook_reels_title" content={content} setContent={setContent} saveField={saveField} rows={3} copy timersRef={timersRef} saveStates={saveStates} setSaveStates={setSaveStates} />
              <AutoField label="Facebook Reels Content" field="facebook_reels_content" content={content} setContent={setContent} saveField={saveField} rows={3} copy timersRef={timersRef} saveStates={saveStates} setSaveStates={setSaveStates} />
            </div>
          </div>
        </div>

        {/* LinkedIn */}
        <div className="bg-white rounded-lg border">
          <div className="bg-gray-50 px-4 py-2 border-b">
            <h2 className="font-semibold">LinkedIn</h2>
          </div>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AutoField label="LinkedIn Title" field="linkedin_title" content={content} setContent={setContent} saveField={saveField} rows={3} copy timersRef={timersRef} saveStates={saveStates} setSaveStates={setSaveStates} />
              <AutoField label="LinkedIn Content" field="linkedin_content" content={content} setContent={setContent} saveField={saveField} rows={3} copy timersRef={timersRef} saveStates={saveStates} setSaveStates={setSaveStates} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AutoField label="LinkedIn Video Title" field="linkedin_video_title" content={content} setContent={setContent} saveField={saveField} rows={3} copy timersRef={timersRef} saveStates={saveStates} setSaveStates={setSaveStates} />
              <AutoField label="LinkedIn Video Content" field="linkedin_video_content" content={content} setContent={setContent} saveField={saveField} rows={3} copy timersRef={timersRef} saveStates={saveStates} setSaveStates={setSaveStates} />
            </div>
          </div>
        </div>

        {/* YouTube */}
        <div className="bg-white rounded-lg border">
          <div className="bg-gray-50 px-4 py-2 border-b">
            <h2 className="font-semibold">YouTube</h2>
          </div>
          <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AutoField label="YouTube Video Title" field="youtube_video_title" content={content} setContent={setContent} saveField={saveField} rows={3} copy timersRef={timersRef} saveStates={saveStates} setSaveStates={setSaveStates} />
            <AutoField label="YouTube Video Description" field="youtube_video_description" content={content} setContent={setContent} saveField={saveField} rows={3} copy timersRef={timersRef} saveStates={saveStates} setSaveStates={setSaveStates} />
          </div>
        </div>

        {/* Pinterest */}
        <div className="bg-white rounded-lg border">
          <div className="bg-gray-50 px-4 py-2 border-b">
            <h2 className="font-semibold">Pinterest</h2>
          </div>
          <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AutoField label="Pinterest Title" field="pinterest_title" content={content} setContent={setContent} saveField={saveField} rows={3} copy timersRef={timersRef} saveStates={saveStates} setSaveStates={setSaveStates} />
            <AutoField label="Pinterest Description" field="pinterest_description" content={content} setContent={setContent} saveField={saveField} rows={3} copy timersRef={timersRef} saveStates={saveStates} setSaveStates={setSaveStates} />
          </div>
        </div>

        {content.error && (
          <div className="bg-red-50 rounded-lg border border-red-200 p-4">
            <h2 className="font-semibold text-red-800 mb-2">Error Details</h2>
            <p className="text-red-700 text-sm">{content.error}</p>
          </div>
        )}
      </div>

      <div className="mt-8 flex justify-end">
        <Link
          to={`/customer/blog/post/${content.id}`}
          className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
        >
          Continue to post →
        </Link>
      </div>
    </div>
  );
}
