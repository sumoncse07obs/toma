// src/components/user/LaunchPost.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { currentUser } from "@/auth";

type PostType = "text" | "image" | "video";
type PreviewSize = "sm" | "md" | "lg";

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
  video_url: string | null;

  facebook_title: string | null;
  facebook_content: string | null;
  facebook_video_title: string | null;
  facebook_video_content: string | null;
  facebook_reels_title: string | null;
  facebook_reels_content: string | null;

  instagram_title: string | null;
  instagram_content: string | null;
  instagram_video_title: string | null;
  instagram_video_content: string | null;
  instagram_reels_title: string | null;
  instagram_reels_content: string | null;

  threads_title: string | null;
  threads_content: string | null;
  threads_video_title: string | null;
  threads_video_content: string | null;

  x_title: string | null;
  x_content: string | null;
  x_video_title: string | null;
  x_video_content: string | null;

  tiktok_video_title: string | null;
  tiktok_video_content: string | null;

  linkedin_title: string | null;
  linkedin_content: string | null;
  linkedin_video_title: string | null;
  linkedin_video_content: string | null;

  youtube_video_title: string | null;
  youtube_video_description: string | null;

  pinterest_title?: string | null;
  pinterest_description?: string | null;
};

// Prefer proxy in dev: set VITE_API_BASE="/api". In prod set full origin.
const API_BASE = `${import.meta.env.VITE_API_BASE}/api`;
const TOKEN_KEY = "toma_token";

/** normalize URL and keep one slash */
function norm(path: string) {
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`.replace(
    /([^:]\/)\/+/g,
    "$1"
  );
}

/** token-based API helper (no cookies/credentials) */
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
    // try to surface backend error
    const text = await res.text().catch(() => "");
    let msg = text || res.statusText || "Request failed";
    try {
      const j = JSON.parse(text);
      msg = j?.message || msg;
    } catch {}
    throw new Error(`HTTP ${res.status}: ${msg}`);
  }
  const ct = res.headers.get("content-type") || "";
  return (ct.includes("application/json")
    ? await res.json()
    : (undefined as any)) as T;
}

function getCustomerIdFromAuth(): number {
  const u: any = currentUser?.() ?? null;
  return (
    u?.customer_id ??
    u?.customer?.id ??
    u?.profile?.customer_id ??
    u?.company?.customer_id ??
    1
  );
}

type FieldKeys = { title?: keyof ContentGeneration; content?: keyof ContentGeneration };

const FIELD_MAP: Record<string, { text: FieldKeys; image: FieldKeys; video: FieldKeys }> = {
  Facebook: {
    text:  { title: "facebook_title",         content: "facebook_content" },
    image: { title: "facebook_title",         content: "facebook_content" },
    video: { title: "facebook_video_title",   content: "facebook_video_content" },
  },
  Instagram: {
    text:  { title: "instagram_title",        content: "instagram_content" },
    image: { title: "instagram_title",        content: "instagram_content" },
    video: { title: "instagram_video_title",  content: "instagram_video_content" },
  },
  Threads: {
    text:  { title: "threads_title",          content: "threads_content" },
    image: { title: "threads_title",          content: "threads_content" },
    video: { title: "threads_video_title",    content: "threads_video_content" },
  },
  "Twitter/X": {
    text:  { title: "x_title",                content: "x_content" },
    image: { title: "x_title",                content: "x_content" },
    video: { title: "x_video_title",          content: "x_video_content" },
  },
  Reals: { text: {}, image: {}, video: {} }, // UI-only "Reels" option
  "Tick Tok": {
    text:  { title: "tiktok_video_title",     content: "tiktok_video_content" },
    image: { title: "tiktok_video_title",     content: "tiktok_video_content" },
    video: { title: "tiktok_video_title",     content: "tiktok_video_content" },
  },
  "Linkedin Business": {
    text:  { title: "linkedin_title",         content: "linkedin_content" },
    image: { title: "linkedin_title",         content: "linkedin_content" },
    video: { title: "linkedin_video_title",   content: "linkedin_video_content" },
  },
  "Linkedin Personal": {
    text:  { title: "linkedin_title",         content: "linkedin_content" },
    image: { title: "linkedin_title",         content: "linkedin_content" },
    video: { title: "linkedin_video_title",   content: "linkedin_video_content" },
  },
  "YouTube Short": {
    text:  { title: "youtube_video_title",    content: "youtube_video_description" },
    image: { title: "youtube_video_title",    content: "youtube_video_description" },
    video: { title: "youtube_video_title",    content: "youtube_video_description" },
  },
};

// helpers
const isPlayableVideo = (url?: string | null) =>
  !!url && /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(url);

const mediaBoxClassBySize: Record<PreviewSize, string> = {
  sm: "w-64 h-40",
  md: "w-96 h-56",
  lg: "w-full h-72",
};

// Normalize FE -> BE platform keys
function normalizePlatform(ui: string, reelsPlatform: "facebook" | "instagram"): string {
  if (ui === "Reals") return reelsPlatform === "facebook" ? "facebook_reels" : "instagram_reels";
  if (ui === "Twitter/X") return "x";
  if (ui === "Tick Tok") return "tiktok";
  if (ui === "YouTube Short") return "youtube_short";
  if (ui === "Linkedin Business") return "linkedin_page";
  if (ui === "Linkedin Personal") return "linkedin_personal";
  return ui.toLowerCase(); // facebook, instagram, threads
}

// Which post types are allowed per platform (UI rule)
function allowedPostTypes(ui: string): PostType[] {
  if (ui === "Reals") return ["video"];
  if (ui === "Tick Tok") return ["video"];
  if (ui === "YouTube Short") return ["video"];
  if (ui === "Instagram") return ["image", "video"]; // no text-only
  return ["text", "image", "video"];
}

// format date safely
const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : "—");

export default function LaunchPost() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [videoUrl, setVideoUrl] = useState("");
  const [title, setTitle] = useState("Title Output Goes Here");
  const [description, setDescription] = useState("Description Output Goes Here");

  const [postType, setPostType] = useState<PostType>("text");
  const [selectedPlatform, setSelectedPlatform] = useState<string>("Facebook");
  const [reelsPlatform, setReelsPlatform] = useState<"facebook" | "instagram">("facebook");

  const [record, setRecord] = useState<ContentGeneration | null>(null);

  const [savingVideo, setSavingVideo] =
    useState<"idle" | "saving" | "saved" | "error">("idle");
  const [videoSaveError, setVideoSaveError] = useState<string | null>(null);

  const [previewSize, setPreviewSize] = useState<PreviewSize>("sm");

  // approve button local state
  const [approveStatus, setApproveStatus] =
    useState<"idle" | "posting" | "posted" | "error">("idle");
  const [approveError, setApproveError] = useState<string | null>(null);

  // publish tracking (status + posted_on + urls)
  const [lastSubmissionId, setLastSubmissionId] = useState<string | null>(null);
  const [lastPublishLogId, setLastPublishLogId] = useState<number | null>(null);
  const [publishStatus, setPublishStatus] = useState<"idle" | "queued" | "posted" | "failed">("idle");
  const [postedOnIso, setPostedOnIso] = useState<string | null>(null);
  const [publicUrl, setPublicUrl] = useState<string | null>(null);

  const customerId = useMemo(() => getCustomerIdFromAuth(), []);
  const platforms = Object.keys(FIELD_MAP);

  // load record
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        const json = await api<any>(`/content-generations/${id}`, {
          headers: { Accept: "application/json" },
        });
        const data: ContentGeneration = json?.data ?? json;
        if (cancelled) return;
        setRecord(data);
        setVideoUrl(data.video_url ?? "");
        // initial platform is Facebook; ensure postType allowed for that platform
        const initial: PostType = data.video_url ? "video" : "text";
        const allowed = allowedPostTypes("Facebook");
        setPostType(allowed.includes(initial) ? initial : allowed[0]);
      } catch (e: any) {
        if (!cancelled) setLoadError(e.message || "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (id) load();
    return () => { cancelled = true; };
  }, [id]);

  // persist video_url
  async function persistVideoUrl(url: string) {
    if (!record?.id) return;
    const trimmed = (url ?? "").trim();
    if (!trimmed) return;
    try {
      setSavingVideo("saving");
      setVideoSaveError(null);
      await api(`/content-generations/${record.id}/video-url`, {
        method: "PATCH",
        body: JSON.stringify({ video_url: trimmed }),
      });
      setRecord((prev) => (prev ? { ...prev, video_url: trimmed } : prev));
      setSavingVideo("saved");
      setTimeout(() => setSavingVideo("idle"), 1000);
    } catch (err: any) {
      setSavingVideo("error");
      setVideoSaveError(err?.message || "Failed to save video URL");
    }
  }

  // debounce save on change
  useEffect(() => {
    if (!record?.id) return;
    const trimmed = (videoUrl ?? "").trim();
    if (!trimmed || trimmed === (record.video_url ?? "").trim()) return;
    const t = setTimeout(() => { void persistVideoUrl(trimmed); }, 700);
    return () => clearTimeout(t);
  }, [videoUrl, record?.id, record?.video_url]);

  // map fields -> title/description shown
  useEffect(() => {
    if (!record) return;
    let keys: FieldKeys | undefined;
    if (selectedPlatform === "Reals") {
      keys =
        reelsPlatform === "facebook"
          ? { title: "facebook_reels_title", content: "facebook_reels_content" }
          : { title: "instagram_reels_title", content: "instagram_reels_content" };
    } else {
      const map = FIELD_MAP[selectedPlatform];
      if (!map) return;
      keys = map[postType];
    }
    const newTitle = keys?.title ? (record[keys.title] as string | null) ?? "" : "";
    const newContent = keys?.content ? (record[keys.content] as string | null) ?? "" : "";
    setTitle(newTitle);
    setDescription(newContent);
  }, [selectedPlatform, postType, reelsPlatform, record]);

  // when switching platforms, force a valid postType for that platform
  const pickPlatform = (p: string) => {
    setSelectedPlatform(p);
    if (p === "Reals") {
      setReelsPlatform("facebook");
    }
    const allowed = allowedPostTypes(p);
    setPostType((prev) => (allowed.includes(prev) ? prev : allowed[0]));
  };

  // preview data
  const previewMedia = useMemo(() => {
    const img = record?.image_url || "";
    const vid = (videoUrl || record?.video_url || "").trim();
    return {
      showImage: selectedPlatform !== "Reals" && postType === "image",
      imageUrl: img,
      showVideo: postType === "video",
      videoUrl: vid,
    };
  }, [postType, selectedPlatform, record?.image_url, record?.video_url, videoUrl]);

  // ---- Load latest publish log on mount / platform change ----
  useEffect(() => {
    if (!record?.id) return;

    const platformKey = normalizePlatform(selectedPlatform, reelsPlatform);
    const post_type_normalized: PostType = selectedPlatform === "Reals" ? "video" : postType;

    const loadLatest = async () => {
      try {
        const params = new URLSearchParams({
          content_generation_id: String(record.id),
          platform: platformKey,
          post_type: post_type_normalized,
        });
        const js = await api<any>(`/publish/logs/latest?${params.toString()}`, {
          headers: { Accept: "application/json" },
        });
        const log = js?.data;

        if (!log) {
          setPublishStatus("idle");
          setPostedOnIso(null);
          setPublicUrl(null);
          setLastSubmissionId(null);
          setLastPublishLogId(null);
          return;
        }

        const st = (log.status as "queued" | "posted" | "failed") ?? "queued";
        setPublishStatus(st);
        setPostedOnIso(log.posted_on ?? null);
        setPublicUrl(log.public_url ?? null);
        setLastSubmissionId(log.provider_post_id ?? null);
        setLastPublishLogId(log.id ?? null);
      } catch {
        // ignore for UX
      }
    };

    void loadLatest();
  }, [record?.id, selectedPlatform, reelsPlatform, postType]);

  // Poll Blotato status endpoint (backend proxy) until published/failed
  useEffect(() => {
    if (!lastSubmissionId) return;
    if (publishStatus === "posted" || publishStatus === "failed") return;

    let stop = false;
    const controller = new AbortController();

    const check = async () => {
      try {
        const js = await api<any>(`/publish/status/${lastSubmissionId}`, {
          signal: controller.signal,
        });
        const st = (js?.status ?? "queued") as string;
        if (st === "published") {
          setPublishStatus("posted");
          setPublicUrl(js?.publicUrl || null);
          setPostedOnIso(new Date().toISOString());
          return true;
        }
        if (st === "failed") {
          setPublishStatus("failed");
          return true;
        }
        return false;
      } catch {
        return false;
      }
    };

    (async () => {
      const done = await check();
      if (done) return;
      const iv = setInterval(async () => {
        if (stop) return clearInterval(iv);
        const finished = await check();
        if (finished) clearInterval(iv);
      }, 10000);
    })();

    return () => {
      stop = true;
      controller.abort();
    };
  }, [lastSubmissionId, publishStatus]);

  // Approve & Publish
  async function approve() {
    if (!record?.id) return;
    setApproveStatus("posting");
    setApproveError(null);

    let keys: FieldKeys;
    if (selectedPlatform === "Reals") {
      keys =
        reelsPlatform === "facebook"
          ? { title: "facebook_reels_title", content: "facebook_reels_content" }
          : { title: "instagram_reels_title", content: "instagram_reels_content" };
    } else {
      keys = FIELD_MAP[selectedPlatform][postType];
    }

    const platformKey = normalizePlatform(selectedPlatform, reelsPlatform);
    const post_type_normalized: PostType =
      selectedPlatform === "Reals" ? "video" : postType;

    const media_payload =
      post_type_normalized === "image"
        ? { image_url: record?.image_url ?? null }
        : post_type_normalized === "video"
        ? { video_url: (videoUrl || record?.video_url || "").trim() || null }
        : {};

    const body = {
      content_generation_id: record.id,
      customer_id: customerId,
      platform: platformKey,
      post_type: post_type_normalized,
      posted_media: platformKey,
      title,
      content: description,
      ...media_payload,
    };

    try {
      const json = await api<any>("/publish", {
        method: "POST",
        body: JSON.stringify(body),
      });

      const first = Array.isArray(json?.data) ? json.data[0] : json?.data;
      const submissionId: string | null = first?.provider_post_id ?? null;
      const publishLogId: number | null = first?.publish_log_id ?? null;
      const initialStatus: "queued" | "posted" | "failed" = first?.status ?? "queued";
      const initialPostedOn: string | null = first?.posted_on ?? null;

      setLastSubmissionId(submissionId);
      setLastPublishLogId(publishLogId);
      setPublishStatus(initialStatus);
      setPostedOnIso(initialPostedOn);
      setPublicUrl(null);

      setApproveStatus("posted");
      setTimeout(() => setApproveStatus("idle"), 1200);
    } catch (err: any) {
      setApproveStatus("error");
      setApproveError(err?.message || "Failed to publish");
    }
  }

  if (loading) return <div className="p-6">Loading post…</div>;
  if (loadError) return <div className="p-6 text-red-600">Failed to load: {loadError}</div>;

  return (
    <div className="min-h-screen bg-white flex flex-col items-center py-8 px-4">
      {/* Header */}
      <h1 className="text-xl font-semibold mb-2">
        Toma <span className="font-bold">Launch</span> Automation
      </h1>
      {/*<div className="text-xs text-gray-500 mb-4">
        Customer ID: <span className="font-medium">{customerId}</span> • Content ID:{" "}
        <span className="font-medium">{record?.id}</span>
      </div> */}

      {/* Back button */}
      <button
        className="mb-6 bg-teal-500 text-white px-6 py-2 rounded-md hover:bg-teal-600"
        onClick={() => {
          const targetId = record?.id ?? (id ? parseInt(id, 10) : null);
          if (targetId) navigate(`/customer/launch/view/${targetId}`);
        }}
      >
        Back
      </button>

      {/* Video URL row */}
      <div className="flex gap-3 items-center w-full max-w-4xl mb-1">
        <label className="text-sm font-medium whitespace-nowrap">Put New Video Url Here</label>
        <input
          type="text"
          placeholder="Put Updated Video Url Here From Blotato"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          onBlur={() => {
            const trimmed = (videoUrl ?? "").trim();
            if (trimmed && trimmed !== (record?.video_url ?? "").trim()) {
              void persistVideoUrl(trimmed);
            }
          }}
          className="flex-1 h-11 border border-gray-300 rounded-md px-4 outline-none focus:ring-2 focus:ring-teal-400"
        />
      </div>

      {/* Save status row */}
      <div className="w-full max-w-4xl mb-6 text-xs min-h-5">
        {savingVideo === "saving" && <span className="text-amber-600">Saving…</span>}
        {savingVideo === "saved" && <span className="text-green-600">Saved</span>}
        {savingVideo === "error" && (
          <span className="text-red-600">Save failed{videoSaveError ? `: ${videoSaveError}` : ""}</span>
        )}
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl">
        {/* Left: platforms */}
        <div className="space-y-2">
          {platforms.map((p) => {
            const active = p === selectedPlatform;
            return (
              <button
                key={p}
                onClick={() => pickPlatform(p)}
                className={`w-full py-2 rounded-md border ${
                  active
                    ? "bg-blue-100 border-blue-400 text-blue-600 font-medium"
                    : "bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>

        {/* Center: Title + Description */}
        <div className="border border-gray-300 rounded-lg p-4 space-y-4">
          <textarea
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            rows={2}
            className="w-full border border-gray-300 rounded-md p-2 text-sm outline-none resize-none"
            placeholder="Post title"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={6}
            className="w-full border border-gray-300 rounded-md p-2 text-sm outline-none resize-none"
            placeholder="Post text / description"
          />

          {/* Radios */}
          {selectedPlatform === "Reals" ? (
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input type="radio" checked={reelsPlatform === "facebook"} onChange={() => setReelsPlatform("facebook")} />
                Facebook
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" checked={reelsPlatform === "instagram"} onChange={() => setReelsPlatform("instagram")} />
                Instagram
              </label>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Only render allowed post types for the selected platform */}
              {allowedPostTypes(selectedPlatform).includes("text") && (
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={postType === "text"}
                    onChange={() => setPostType("text")}
                  />
                  Post Text Only
                </label>
              )}
              {allowedPostTypes(selectedPlatform).includes("image") && (
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={postType === "image"}
                    onChange={() => setPostType("image")}
                  />
                  Post Text and Image
                </label>
              )}
              {allowedPostTypes(selectedPlatform).includes("video") && (
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={postType === "video"}
                    onChange={() => setPostType("video")}
                  />
                  Post Text and Video
                </label>
              )}
            </div>
          )}
        </div>

        {/* Right: actions + STATUS PANEL */}
        <div className="flex flex-col justify-between space-y-4">
          <button
            className="w-full bg-orange-500 text-white py-2 rounded-md hover:bg-orange-600"
            onClick={() => {
              alert("Scheduling stub — wire this to your API.");
            }}
          >
            Schedule The Post
          </button>

          <button
            className={`w-full text-white py-2 rounded-md ${approveStatus === "posting" ? "bg-teal-300" : "bg-teal-500 hover:bg-teal-600"}`}
            disabled={approveStatus === "posting"}
            onClick={() => void approve()}
          >
            {approveStatus === "posting" ? "Submitting…" : "Approve & Publish"}
          </button>

          <div className="rounded-md border border-gray-200 p-3 text-sm bg-gray-50">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Publish status</span>
              <span className={`font-medium ${
                publishStatus === "posted" ? "text-green-600" :
                publishStatus === "failed" ? "text-red-600" :
                publishStatus === "queued" ? "text-amber-600" : "text-gray-500"
              }`}>
                {publishStatus === "idle" ? "—" :
                 publishStatus === "queued" ? "Queued" :
                 publishStatus === "posted" ? "Published" :
                 "Failed"}
              </span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-gray-600">Posted on</span>
              <span className="font-medium text-gray-900">{fmt(postedOnIso)}</span>
            </div>

            {publicUrl && (
              <div className="mt-2">
                <a href={publicUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                  View on platform
                </a>
              </div>
            )}

            {lastSubmissionId && (
              <div className="mt-2 text-[11px] text-gray-500 break-all">
                Submission ID: <span className="font-mono">{lastSubmissionId}</span>
              </div>
            )}
          </div>

          <div className="min-h-5 text-xs">
            {approveStatus === "posted" && <span className="text-green-600">Submitted to Blotato.</span>}
            {approveStatus === "error" && (
              <span className="text-red-600">Publish failed{approveError ? `: ${approveError}` : ""}</span>
            )}
          </div>
        </div>

        {/* Live Preview */}
        <div className="md:col-span-2 border border-gray-300 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold text-gray-700">
              Live Preview ·{" "}
              {selectedPlatform === "Reals"
                ? `Reels · ${reelsPlatform === "facebook" ? "Facebook" : "Instagram"}`
                : `${selectedPlatform} · ${postType.toUpperCase()}`}
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-500">Preview size:</span>
              {(["sm","md","lg"] as const).map((s) => (
                <label key={s} className="flex items-center gap-1 cursor-pointer">
                  <input type="radio" checked={previewSize === s} onChange={() => setPreviewSize(s)} />
                  <span className={previewSize === s ? "font-medium" : ""}>{s.toUpperCase()}</span>
                </label>
              ))}
            </div>
          </div>

          {previewMedia.showVideo ? (
            isPlayableVideo(previewMedia.videoUrl) ? (
              <div className={`rounded-md mb-3 border border-gray-200 overflow-hidden flex items-center justify-center bg-black/5 ${mediaBoxClassBySize[previewSize]}`}>
                <video key={previewMedia.videoUrl} src={previewMedia.videoUrl} controls className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className={`rounded-md mb-3 border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-sm ${mediaBoxClassBySize[previewSize]}`}>
                {previewMedia.videoUrl ? "Video URL isn't a direct .mp4/.webm/.mov/.m4v — preview not available" : "No video URL provided"}
              </div>
            )
          ) : previewMedia.showImage ? (
            previewMedia.imageUrl ? (
              <div className={`rounded-md mb-3 border border-gray-200 overflow-hidden bg-gray-50 ${mediaBoxClassBySize[previewSize]}`}>
                <img src={previewMedia.imageUrl} alt="Post image" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className={`rounded-md mb-3 border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-sm ${mediaBoxClassBySize[previewSize]}`}>
                No image available
              </div>
            )
          ) : null}

          <div className="text-base font-medium text-gray-900 whitespace-pre-wrap">
            {title?.trim() ? title : <span className="text-gray-400">Title will appear here…</span>}
          </div>

          <div className="mt-2 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
            {description?.trim() ? description : <span className="text-gray-400">Description will appear here…</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
