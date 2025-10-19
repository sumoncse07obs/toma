// src/components/admin/customer/blog/ViewBlog.tsx
import React, { useEffect } from "react";
import { toast } from "react-toastify";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { currentUser, isAuthed, refreshUser, type User } from "@/auth";

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

  blotato_video_id?: string | null;
  blotato_video_status?: string | null;
  blotato_video_checked_at?: string | null;

  created_at?: string | null;
  updated_at?: string | null;
};

// ---- Hardened API base ----
const API_HOST = String(import.meta.env.VITE_API_BASE || "").replace(/\/+$/, "");
const API_BASE_URL = API_HOST ? `${API_HOST}/api` : "/api";
const TOKEN_KEY = "toma_token";

/** --------- Helpers --------- */
function fmt(ts: string | null) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString();
}
function cls(...xs: Array<string | null | false | undefined>) {
  return xs.filter(Boolean).join(" ");
}
/** MySQL DATETIME (UTC): YYYY-MM-DD HH:MM:SS */
function toMySQLDateTimeUTC(d = new Date()) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getUTCFullYear();
  const mm = pad(d.getUTCMonth() + 1);
  const dd = pad(d.getUTCDate());
  const HH = pad(d.getUTCHours());
  const MM = pad(d.getUTCMinutes());
  const SS = pad(d.getUTCSeconds());
  return `${yyyy}-${mm}-${dd} ${HH}:${MM}:${SS}`;
}
function fmtElapsed(ms: number) {
  if (ms < 0) ms = 0;
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  if (h > 0) return `${h}h ${m}m ${ss}s`;
  if (m > 0) return `${m}m ${ss}s`;
  return `${ss}s`;
}

// helper to build content-generations endpoints
const cg = (id: number, tail: string = "") => `/content-generations/${id}${tail}`;

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
    mode: "cors",
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

function getCustomerIdFromUrlPath(pathname: string): number | undefined {
  const m = pathname.match(/\/admin\/customer-dashboard\/(\d+)(?:\/|$)/);
  if (!m) return undefined;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : undefined;
}
function toNumberId(raw: unknown): number | undefined {
  if (raw == null) return undefined;
  const n =
    typeof raw === "string" ? parseInt(raw, 10) :
    typeof raw === "number" ? raw : Number(raw as any);
  return Number.isFinite(n) ? n : undefined;
}

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
      setContent((prev) => (prev ? ({ ...prev, [field]: next } as ContentGeneration) : prev));
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
          {pill && <span className={cls("text-xs rounded-full px-2 py-0.5", pillCls)}>{pill}</span>}
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

export default function ViewBlog() {
  // keep :id from your existing route
  const { id, customerId: customerIdParam } = useParams<{ id: string; customerId?: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  // Admin customer id from param or pathname
  const adminCustomerId = React.useMemo(() => {
    const fromParam = toNumberId(customerIdParam);
    const fromPath = getCustomerIdFromUrlPath(location.pathname);
    return fromParam ?? fromPath;
  }, [customerIdParam, location.pathname]);

  // Admin/customer-aware paths
  const backUrl = adminCustomerId
    ? `/admin/customer-dashboard/${adminCustomerId}/blog/list`
    : `/customer/blog/list`;

  const logUrl = (contentId: number) =>
    adminCustomerId
      ? `/admin/customer-dashboard/${adminCustomerId}/blog/log/${contentId}`
      : `/customer/blog/log/${contentId}`;

  const postUrl = (contentId: number) =>
    adminCustomerId
      ? `/admin/customer-dashboard/${adminCustomerId}/blog/post/${contentId}`
      : `/customer/blog/post/${contentId}`;

  const postToBlotatoUrl = (contentId: number) =>
    adminCustomerId
      ? `/admin/customer-dashboard/${adminCustomerId}/blog/posttoblotato/${contentId}`
      : `/customer/blog/posttoblotato/${contentId}`;

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

  // Live timer while polling Blotato
  const [pollStartAt, setPollStartAt] = React.useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = React.useState(0);

  useEffect(() => {
    const currentUserData = currentUser();
    if (currentUserData) {
      setUser(currentUserData);
    } else if (isAuthed()) {
      refreshUser().then((userData) => {
        if (userData) setUser(userData);
      });
    }
  }, []);

  // Start/stop the visible timer when we have a job but no video yet
  useEffect(() => {
    const needsTimer = !!content?.blotato_video_id && !content?.video_url;
    if (needsTimer && pollStartAt == null) {
      setPollStartAt(Date.now());
    }
    if (!needsTimer) {
      setPollStartAt(null);
      setElapsedMs(0);
    }
  }, [content?.blotato_video_id, content?.video_url, pollStartAt]);

  useEffect(() => {
    if (pollStartAt == null) return;
    let t: number | null = null;
    const tick = () => setElapsedMs(Date.now() - pollStartAt);
    tick();
    t = window.setInterval(tick, 1000);
    return () => {
      if (t) window.clearInterval(t);
    };
  }, [pollStartAt]);

  // Poll /content-generations/:id/check-video
  useEffect(() => {
    if (!content) return;
    if (content.video_url) return; // already ready

    let stopped = false;
    let timer: number | null = null;

    const poll = async () => {
      if (stopped || !content) return;

      // optimistic UI
      setContent((prev) =>
        prev
          ? ({ ...prev, blotato_video_status: prev.blotato_video_status || "checking…" } as ContentGeneration)
          : prev
      );

      try {
        const suffix = content.blotato_video_id
          ? `?job_id=${encodeURIComponent(content.blotato_video_id)}`
          : "";

        const resp = await api<any>(cg(content.id, `/check-video${suffix}`));

        const videoUrl: string | null = resp?.video_url ?? resp?.data?.video_url ?? null;
        const status: string | null = resp?.status ?? null;
        const jobId: string | null = resp?.job_id ?? content.blotato_video_id ?? null;

        const checkedAt = toMySQLDateTimeUTC();

        // Persist server-side so other tabs see it
        try {
          await api(cg(content.id), {
            method: "PUT",
            body: JSON.stringify({
              blotato_video_id: jobId,
              blotato_video_status: status ?? (videoUrl ? "completed" : "checking"),
              blotato_video_checked_at: checkedAt,
              ...(videoUrl ? { video_url: videoUrl } : {}),
            }),
          });
        } catch {
          // ignore write errors; UI still updates locally
        }

        // Reflect locally
        setContent((prev) =>
          prev
            ? ({
                ...prev,
                blotato_video_id: jobId,
                blotato_video_status: status ?? (videoUrl ? "completed" : prev.blotato_video_status ?? "checking"),
                blotato_video_checked_at: checkedAt,
                ...(videoUrl ? { video_url: videoUrl } : {}),
                updated_at: checkedAt,
              } as ContentGeneration)
            : prev
        );

        // If ready, stop
        if (videoUrl) {
          toast.success(
            <a href={videoUrl} target="_blank" rel="noreferrer">
              🎉 Your video is ready! Click to view.
            </a>
          );
          if (timer) window.clearInterval(timer);
          timer = null;
          stopped = true;
          return;
        }
      } catch {
        // soft fail; keep polling
      }
    };

    // kick once, then poll
    poll();
    timer = window.setInterval(poll, 15000);

    return () => {
      stopped = true;
      if (timer) window.clearInterval(timer);
      timer = null;
    };
  }, [content?.id, content?.blotato_video_id, content?.video_url]);

  const loadContent = React.useCallback(async () => {
    if (!id || !user) return;
    try {
      setLoading(true);
      setError(null);

      const res = await api<any>(cg(Number(id)));

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

  useEffect(() => {
    if (user && id) loadContent();
  }, [loadContent, user, id]);

  async function saveField(field: StringFields, value: string) {
    if (!content) return;

    await api(cg(content.id), {
      method: "PUT",
      body: JSON.stringify({ [field]: value }),
    });

    const updatedAt = toMySQLDateTimeUTC();
    setContent((prev) =>
      prev ? ({ ...prev, [field]: value, updated_at: updatedAt } as ContentGeneration) : prev
    );
  }

  async function generateImage() {
    if (!content) return;
    try {
      setGenImgErr(null);
      setGenImgLoading(true);

      const resp = await api<any>(cg(content.id, "/make-image"), { method: "POST" });

      const newUrl =
        resp?.image_url ?? resp?.data?.image_url ?? resp?.url ?? resp?.data?.url ?? null;

      const updatedAt = toMySQLDateTimeUTC();

      if (typeof newUrl === "string" && newUrl.length > 0) {
        setContent((prev) =>
          prev
            ? ({
                ...prev,
                image_url: newUrl,
                updated_at: updatedAt,
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

      const resp = await api<any>(cg(content.id, "/make-video"), { method: "POST" });

      const newUrl =
        resp?.video_url ?? resp?.data?.video_url ?? resp?.url ?? resp?.data?.url ?? null;

      const jobId = resp?.job_id ?? null;
      const status = resp?.status ?? "queued";
      const checkedAt = toMySQLDateTimeUTC();

      await api(cg(content.id), {
        method: "PUT",
        body: JSON.stringify({
          blotato_video_id: jobId,
          blotato_video_status: status,
          blotato_video_checked_at: checkedAt,
        }),
      });

      setContent((prev) =>
        prev
          ? ({
              ...prev,
              blotato_video_id: jobId ?? prev.blotato_video_id ?? null,
              blotato_video_status: status ?? prev.blotato_video_status ?? null,
              blotato_video_checked_at: checkedAt,
              updated_at: checkedAt,
            } as ContentGeneration)
          : prev
      );

      if (typeof newUrl === "string" && newUrl.length > 0) {
        const updatedAt = toMySQLDateTimeUTC();
        setContent((prev) =>
          prev
            ? ({
                ...prev,
                video_url: newUrl,
                updated_at: updatedAt,
              } as ContentGeneration)
            : prev
        );
      } else {
        await loadContent();
      }
    } catch (e: any) {
      setGenVidErr(e?.message || "Failed to generate video");
    } finally {
      setGenVidLoading(false);
    }
  }

  // Manual "Check Status" button action
  async function checkVideoStatus() {
    if (!content) return;
    try {
      setGenVidErr(null);
      setGenVidLoading(true);

      const suffix = content.blotato_video_id
        ? `?job_id=${encodeURIComponent(content.blotato_video_id)}`
        : "";

      const resp = await api<any>(cg(content.id, `/check-video${suffix}`));

      const status = resp?.status ?? null;
      const jobId = resp?.job_id ?? content.blotato_video_id ?? null;
      const videoUrl = resp?.video_url ?? resp?.data?.video_url ?? null;
      const checkedAt = toMySQLDateTimeUTC();

      // persist latest status/id/checked_at (and video if ready)
      try {
        await api(cg(content.id), {
          method: "PUT",
          body: JSON.stringify({
            blotato_video_id: jobId,
            blotato_video_status: status ?? (videoUrl ? "completed" : "checking"),
            blotato_video_checked_at: checkedAt,
            ...(videoUrl ? { video_url: videoUrl } : {}),
          }),
        });
      } catch {}

      // reflect locally
      setContent((prev) =>
        prev
          ? ({
              ...prev,
              blotato_video_status: status ?? prev.blotato_video_status ?? "checking",
              blotato_video_id: jobId,
              video_url:
                typeof videoUrl === "string" && videoUrl.length > 0 ? videoUrl : prev.video_url,
              blotato_video_checked_at: checkedAt,
              updated_at: checkedAt,
            } as ContentGeneration)
          : prev
      );

      if (videoUrl) {
        toast.success(
          <a href={videoUrl} target="_blank" rel="noreferrer">
            🎬 Video is ready — open it
          </a>
        );
      }
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
          <Link to={backUrl} className="text-blue-600 hover:text-blue-700 text-sm">
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
          <Link to={backUrl} className="text-blue-600 hover:text-blue-700 text-sm">
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
          <Link to={backUrl} className="text-blue-600 hover:text-blue-700 text-sm">
            ← Back to Blogs Automation
          </Link>

          <div className="flex items-center gap-2">
            <button className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded" onClick={loadContent}>
              Reload
            </button>

            {/* Log button in header */}
            <Link
              to={logUrl(content.id)}
              className="text-xs px-3 py-1 rounded bg-gray-100 text-gray-800 hover:bg-gray-200"
              title="View publish logs for this content"
            >
              Log
            </Link>

            {content.video_url ? (
              <Link
                to={postUrl(content.id)}
                className="text-xs px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
              >
                Continue to post →
              </Link>
            ) : (
              <button
                disabled
                className="text-xs px-3 py-1 rounded bg-gray-300 text-gray-500 cursor-not-allowed"
                title="Video not ready yet"
              >
                Continue to post →
              </button>
            )}
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-bold mb-2">{content.title || "Untitled Content"}</h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
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

            {/* Live poll indicator (only when waiting for Blotato) */}
            {content.blotato_video_id && !content.video_url && (
              <span className="inline-flex items-center gap-2 text-xs rounded-full bg-blue-50 text-blue-700 px-2 py-1">
                <span className="inline-block h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                Checking Blotato… {content.blotato_video_status || "checking"} • {fmtElapsed(elapsedMs)}
              </span>
            )}

            {/* When video exists, show final status */}
            {content.video_url && (
              <span className="inline-flex items-center text-xs rounded-full bg-green-50 text-green-700 px-2 py-1">
                Blotato: {content.blotato_video_status || "completed"}
              </span>
            )}
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

            {/* Blotato job tracking */}
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
            <div>
              <span className="text-gray-600">Last Blotato Check:</span>
              <span className="ml-2">{fmt(content.blotato_video_checked_at || null)}</span>
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
            Do not like this image? Want to upload your image?{" "}
            <Link to={postToBlotatoUrl(content.id)} className="text-blue-600 hover:text-blue-700 underline">
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

              {/* Check Status button */}
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
                  href={"https://my.blotato.com/videos"}
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
            Do not like this video? Want to upload your video?{" "}
            <Link to={postToBlotatoUrl(content.id)} className="text-blue-600 hover:text-blue-700 underline">
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
              <AutoField label="X Title" field="x_video_title" content={content} setContent={setContent} saveField={saveField} rows={3} copy timersRef={timersRef} saveStates={saveStates} setSaveStates={setSaveStates} />
              <AutoField label="X Content" field="x_video_content" content={content} setContent={setContent} saveField={saveField} rows={3} copy timersRef={timersRef} saveStates={saveStates} setSaveStates={setSaveStates} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AutoField label="X Title" field="x_title" content={content} setContent={setContent} saveField={saveField} rows={3} copy timersRef={timersRef} saveStates={saveStates} setSaveStates={setSaveStates} />
              <AutoField label="X Content" field="x_content" content={content} setContent={setContent} saveField={saveField} rows={3} copy timersRef={timersRef} saveStates={saveStates} setSaveStates={setSaveStates} />
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
              <AutoField label="Instagram Title" field="instagram_video_title" content={content} setContent={setContent} saveField={saveField} rows={3} copy timersRef={timersRef} saveStates={saveStates} setSaveStates={setSaveStates} />
              <AutoField label="Instagram Content" field="instagram_video_content" content={content} setContent={setContent} saveField={saveField} rows={3} copy timersRef={timersRef} saveStates={saveStates} setSaveStates={setSaveStates} />
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
              <AutoField label="Facebook Title" field="facebook_video_title" content={content} setContent={setContent} saveField={saveField} rows={3} copy timersRef={timersRef} saveStates={saveStates} setSaveStates={setSaveStates} />
              <AutoField label="Facebook Content" field="facebook_video_content" content={content} setContent={setContent} saveField={saveField} rows={3} copy timersRef={timersRef} saveStates={saveStates} setSaveStates={setSaveStates} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AutoField label="Facebook Title" field="facebook_title" content={content} setContent={setContent} saveField={saveField} rows={3} copy timersRef={timersRef} saveStates={saveStates} setSaveStates={setSaveStates} />
              <AutoField label="Facebook Content" field="facebook_content" content={content} setContent={setContent} saveField={saveField} rows={3} copy timersRef={timersRef} saveStates={saveStates} setSaveStates={setSaveStates} />
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
              <AutoField label="LinkedIn Title" field="linkedin_video_title" content={content} setContent={setContent} saveField={saveField} rows={3} copy timersRef={timersRef} saveStates={saveStates} setSaveStates={setSaveStates} />
              <AutoField label="LinkedIn Content" field="linkedin_video_content" content={content} setContent={setContent} saveField={saveField} rows={3} copy timersRef={timersRef} saveStates={saveStates} setSaveStates={setSaveStates} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AutoField label="LinkedIn Title" field="linkedin_title" content={content} setContent={setContent} saveField={saveField} rows={3} copy timersRef={timersRef} saveStates={saveStates} setSaveStates={setSaveStates} />
              <AutoField label="LinkedIn Content" field="linkedin_content" content={content} setContent={setContent} saveField={saveField} rows={3} copy timersRef={timersRef} saveStates={saveStates} setSaveStates={setSaveStates} />
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

      <div className="mt-8 flex items-center justify-end gap-2">
        {/* Log button in footer */}
        <Link
          to={logUrl(content.id)}
          className="px-4 py-2 rounded bg-gray-100 text-gray-800 hover:bg-gray-200"
          title="View publish logs for this content"
        >
          Log
        </Link>

        {content.video_url ? (
          <Link
            to={postUrl(content.id)}
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            Continue to post →
          </Link>
        ) : (
          <button
            disabled
            className="px-4 py-2 rounded bg-gray-300 text-gray-500 cursor-not-allowed"
            title="Video not ready yet"
          >
            Continue to post →
          </button>
        )}
      </div>
    </div>
  );
}
