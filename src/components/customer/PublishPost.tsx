// src/components/customer/PublishPost.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";

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

/* ========================= API base (robust) ========================= */
const RAW_BASE = String(import.meta.env.VITE_API_BASE || "").replace(/\/+$/g, "");
const API_BASE = RAW_BASE.endsWith("/api") ? RAW_BASE : `${RAW_BASE}/api`;

const API_BASE_URL = `${import.meta.env.VITE_API_BASE}/api`;
const TOKEN_KEY = "toma_token";

const baseJsonHeaders: HeadersInit = {
  "Content-Type": "application/json",
  Accept: "application/json",
};

function authHeader(): HeadersInit {
  const t = localStorage.getItem(TOKEN_KEY);
  return t ? { Authorization: `Bearer ${t}` } : {};
}

/** normalize URL and keep one slash */
function norm(path: string) {
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`.replace(/([^:]\/)\/+/g, "$1");
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

async function getCustomerIdFromAuth(): Promise<number> {
  const response = await fetch(`${API_BASE_URL}/customers/me`, {
    method: "GET",
    headers: { ...baseJsonHeaders, ...authHeader() },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch customer data");
  }

  const { data } = await response.json();
  return data.customer_id; // Make sure backend returns this
}

/* ===================== Status normalization + polling helpers ===================== */
function normalizeStatus(s: string | null | undefined): "queued" | "posted" | "failed" {
  const v = String(s || "").toLowerCase();
  if (["success", "published", "complete", "completed", "posted"].includes(v)) return "posted";
  if (["fail", "failed", "error"].includes(v)) return "failed";
  return "queued";
}

const BASE_POLL_MS = 4000; // start at 4s
const MAX_POLL_MS = 20000; // cap at 20s
const MAX_TOTAL_MS = 10 * 60 * 1000; // give up after 10 min

function nextDelay(prev: number) {
  const n = Math.min(Math.round(prev * 1.6), MAX_POLL_MS);
  const jitter = Math.floor(Math.random() * 500);
  return n + jitter;
}

/* =============================== Field map =============================== */
type FieldKeys = { title?: keyof ContentGeneration; content?: keyof ContentGeneration };

const FIELD_MAP: Record<string, { text: FieldKeys; image: FieldKeys; video: FieldKeys }> = {
  Facebook: {
    text: { title: "facebook_title", content: "facebook_content" },
    image: { title: "facebook_title", content: "facebook_content" },
    video: { title: "facebook_video_title", content: "facebook_video_content" },
  },
  Instagram: {
    text: { title: "instagram_title", content: "instagram_content" },
    image: { title: "instagram_title", content: "instagram_content" },
    video: { title: "instagram_video_title", content: "instagram_video_content" },
  },
  Threads: {
    text: { title: "threads_title", content: "threads_content" },
    image: { title: "threads_title", content: "threads_content" },
    video: { title: "threads_video_title", content: "threads_video_content" },
  },
  "Twitter/X": {
    text: { title: "x_title", content: "x_content" },
    image: { title: "x_title", content: "x_content" },
    video: { title: "x_video_title", content: "x_video_content" },
  },
  Reals: { text: {}, image: {}, video: {} },
  "Tick Tok": {
    text: { title: "tiktok_video_title", content: "tiktok_video_content" },
    image: { title: "tiktok_video_title", content: "tiktok_video_content" },
    video: { title: "tiktok_video_title", content: "tiktok_video_content" },
  },
  "Linkedin Business": {
    text: { title: "linkedin_title", content: "linkedin_content" },
    image: { title: "linkedin_title", content: "linkedin_content" },
    video: { title: "linkedin_video_title", content: "linkedin_video_content" },
  },
  "Linkedin Personal": {
    text: { title: "linkedin_title", content: "linkedin_content" },
    image: { title: "linkedin_title", content: "linkedin_content" },
    video: { title: "linkedin_video_title", content: "linkedin_video_content" },
  },
  "YouTube Short": {
    text: { title: "youtube_video_title", content: "youtube_video_description" },
    image: { title: "youtube_video_title", content: "youtube_video_description" },
    video: { title: "youtube_video_title", content: "youtube_video_description" },
  },
};

const isPlayableVideo = (url?: string | null) =>
  !!url && /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(url);

/* ===== blotato host check ===== */
function isBlotatoHosted(u?: string | null) {
  if (!u) return false;
  try {
    const host = new URL(u).hostname.toLowerCase();
    return host.endsWith("blotato.io") || host.endsWith("blotato.com");
  } catch {
    return false;
  }
}

const mediaBoxClassBySize: Record<PreviewSize, string> = { sm: "w-64 h-40", md: "w-96 h-56", lg: "w-full h-72" };

function normalizePlatform(ui: string, reelsPlatform: "facebook" | "instagram"): string {
  if (ui === "Reals") return reelsPlatform === "facebook" ? "facebook_reels" : "instagram_reels";
  if (ui === "Twitter/X") return "x";
  if (ui === "Tick Tok") return "tiktok";
  if (ui === "YouTube Short") return "youtube_short";
  if (ui === "Linkedin Business") return "linkedin_page";
  if (ui === "Linkedin Personal") return "linkedin_personal";
  return ui.toLowerCase();
}
function allowedPostTypes(ui: string): PostType[] {
  if (ui === "Reals") return ["video"];
  if (ui === "Tick Tok") return ["video"];
  if (ui === "YouTube Short") return ["video"];
  if (ui === "Instagram") return ["image", "video"];
  return ["text", "image", "video"];
}
const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : "—");

/* ====== Scheduling helpers ====== */
function roundToNext5Min(d = new Date()) {
  const ms = 1000 * 60 * 5;
  return new Date(Math.ceil(d.getTime() / ms) * ms);
}
function toLocalInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const h = pad(d.getHours());
  const min = pad(d.getMinutes());
  return `${y}-${m}-${day}T${h}:${min}`;
}
function localInputToISO(v: string) {
  const dt = new Date(v.replace(" ", "T"));
  return isNaN(dt.getTime()) ? null : dt.toISOString();
}

// ---- UTC clock helpers ----
function nowUtcIsoSeconds() {
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mi = String(d.getUTCMinutes()).padStart(2, "0");
  const ss = String(d.getUTCSeconds()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}Z`;
}

/* ===================== Customer Settings types/helpers ===================== */
type CustomerSettings = {
  blotato_facebook_id?: string | null;
  blotato_facebook_page_ids?: string[] | string | null;

  blotato_instagram_id?: string | null;
  blotato_threads_id?: string | null;
  blotato_twitter_id?: string | null; // X/Twitter
  blotato_tiktok_id?: string | null;

  // NOTE: API uses "linkeidin" spelling
  blotato_linkeidin_id?: string | null;
  blotato_linkeidin_page_ids?: string[] | string | null;
  blotato_linkeidin_active?: boolean | null; // NEW toggle

  blotato_youtube_id?: string | null;
  blotato_pinterest_id?: string | null;
};

function hasId(v: unknown): boolean {
  if (!v) return false;
  if (Array.isArray(v)) return v.some((x) => String(x ?? "").trim() !== "");
  const s = String(v).trim();
  if (!s) return false;
  return s.split(",").map((x) => x.trim()).filter(Boolean).length > 0;
}

/* =============================== Component =============================== */
export default function PublishPost() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // ------- derive dynamic context (blog | youtube | topic | launch) -------
  const context = useMemo<"blog" | "youtube" | "topic" | "launch">(() => {
    const p = pathname.toLowerCase();
    if (p.includes("/customer/youtube/") || p.includes("/youtube/")) return "youtube";
    if (p.includes("/customer/topic/") || p.includes("/topic/")) return "topic";
    if (p.includes("/customer/launch/") || p.includes("/launch/")) return "launch";
    return "blog";
  }, [pathname]);

  const TITLE_BY_CONTEXT: Record<typeof context, string> = {
    blog: "Tomaa Blog Automation",
    youtube: "Tomaa YouTube Automation",
    topic: "Tomaa Topic Automation",
    launch: "Tomaa Launch Automation",
  };

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [videoUrl, setVideoUrl] = useState("");
  const [title, setTitle] = useState("Title Output Goes Here");
  const [description, setDescription] = useState("Description Output Goes Here");

  const [postType, setPostType] = useState<PostType>("text");
  const [selectedPlatform, setSelectedPlatform] = useState<string>("Facebook");
  const [reelsPlatform, setReelsPlatform] = useState<"facebook" | "instagram">("facebook");

  const [record, setRecord] = useState<ContentGeneration | null>(null);

  const [savingVideo, setSavingVideo] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [videoSaveError, setVideoSaveError] = useState<string | null>(null);

  const [previewSize, setPreviewSize] = useState<PreviewSize>("sm");

  const [approveStatus, setApproveStatus] = useState<"idle" | "posting" | "posted" | "error">("idle");
  const [approveError, setApproveError] = useState<string | null>(null);

  // publish tracking
  const [lastSubmissionId, setLastSubmissionId] = useState<string | null>(null);
  const [lastPublishLogId, setLastPublishLogId] = useState<number | null>(null);
  const [publishStatus, setPublishStatus] = useState<"idle" | "queued" | "posted" | "failed">("idle");
  const [postedOnIso, setPostedOnIso] = useState<string | null>(null);
  const [publicUrl, setPublicUrl] = useState<string | null>(null);

  // UI: overlay while waiting for final status (disabled per your note)
  const showStatusOverlay = false;

  // debug heartbeat
  const [lastCheckAt, setLastCheckAt] = useState<number | null>(null);
  const [lastStatusRaw, setLastStatusRaw] = useState<string | null>(null);
  const [nextPollInMs, setNextPollInMs] = useState<number | null>(null);
  const [latestLogPollMs, setLatestLogPollMs] = useState<number>(5000);

  const platformKey = useMemo(
    () => normalizePlatform(selectedPlatform, reelsPlatform),
    [selectedPlatform, reelsPlatform]
  );
  const effectivePostType: PostType = selectedPlatform === "Reals" ? "video" : postType;

  // ====== dynamic links (Back / Logs) ======
  const contentId = record?.id ?? (id ? parseInt(id, 10) : null);
  const backUrl = useMemo(
    () => (contentId != null ? `/customer/${context}/view/${contentId}` : "/customer"),
    [context, contentId]
  );
  const logsUrl = useMemo(
    () => (contentId != null ? `/customer/${context}/log/${contentId}` : "#"),
    [context, contentId]
  );

  // ====== Scheduling modal state ======
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduledAtLocal, setScheduledAtLocal] = useState<string>("");
  const [scheduleErr, setScheduleErr] = useState<string | null>(null);

  // ====== UTC clock state (for modal) ======
  const [nowUtcIso, setNowUtcIso] = useState<string>(nowUtcIsoSeconds());
  const [customerId, setCustomerId] = useState<number | null>(null);

  // Build "convert" link from record.prompt_for (fallback to context) + id
  const promptFor = (record as any)?.prompt_for || context; // 'blog' | 'topic' | 'youtube' | 'launch'
  const genId = record?.id ?? (id ? parseInt(id, 10) : null);

  // detect if you're under /customer/* (most of your screens are)
  const isCustomerRoute = pathname.toLowerCase().includes("/customer/");
  const rootPrefix = isCustomerRoute ? "/customer" : "";

  // ABSOLUTE path so it doesn't append to the current URL
  const convertHref = genId ? `${rootPrefix}/${promptFor}/posttoblotato/${genId}` : "#";

  useEffect(() => {
    // Fetch customerId when component mounts
    const fetchCustomerId = async () => {
      try {
        const idNum = await getCustomerIdFromAuth();
        setCustomerId(idNum);
      } catch (error) {
        console.error("Failed to fetch customer ID:", error);
      }
    };
    fetchCustomerId();
  }, []);

  // Tick UTC clock while modal is open
  useEffect(() => {
    if (!showSchedule) return;
    setNowUtcIso(nowUtcIsoSeconds());
    const t = window.setInterval(() => setNowUtcIso(nowUtcIsoSeconds()), 1000);
    return () => clearInterval(t);
  }, [showSchedule]);

  /* ----------------------------- load record ----------------------------- */
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        const json = await api<any>(`/content-generations/${id}`, { headers: { Accept: "application/json" } });
        const data: ContentGeneration = json?.data ?? json;
        if (cancelled) return;
        setRecord(data);
        setVideoUrl(data.video_url ?? "");
        const initial: PostType = data.video_url ? "video" : "text";
        const allowed = allowedPostTypes("Facebook");
        setPostType(allowed.includes(initial) ? initial : allowed[0]);

        // Default schedule time ~10 minutes from now (rounded)
        const def = roundToNext5Min(new Date(Date.now() + 10 * 60 * 1000));
        setScheduledAtLocal(toLocalInputValue(def));
      } catch (e: any) {
        if (!cancelled) setLoadError(e.message || "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (id) load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  /* -------------------------- persist video_url -------------------------- */
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

  useEffect(() => {
    if (!record?.id) return;
    const trimmed = (videoUrl ?? "").trim();
    if (!trimmed || trimmed === (record.video_url ?? "").trim()) return;
    const t = setTimeout(() => {
      void persistVideoUrl(trimmed);
    }, 700);
    return () => clearTimeout(t);
  }, [videoUrl, record?.id, record?.video_url]);

  /* --------------------- map fields -> title/description --------------------- */
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
    const newTitle = keys?.title ? ((record as any)[keys.title] as string | null) ?? "" : "";
    const newContent = keys?.content ? ((record as any)[keys.content] as string | null) ?? "" : "";
    setTitle(newTitle);
    setDescription(newContent);
  }, [selectedPlatform, postType, reelsPlatform, record]);

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

  /* -------------------- Settings load & platform availability -------------------- */
  const [settings, setSettings] = useState<CustomerSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState<boolean>(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSettings(customerIdNum: number) {
      setSettingsLoading(true);
      setSettingsError(null);

      const token = localStorage.getItem(TOKEN_KEY) || "";
      const authHeaders = {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      try {
        let js: any;

        // Try /settings/{id} first
        try {
          js = await api<any>(`/settings/${customerIdNum}`, {
            headers: authHeaders,
          });
        } catch {
          // Fallback: /settings?customer_id={id}
          const q = new URLSearchParams({ customer_id: String(customerIdNum) });
          js = await api<any>(`/settings?${q.toString()}`, {
            headers: authHeaders,
          });
        }

        const data = js?.data ?? js;
        if (!cancelled) setSettings(data || {});
      } catch (e: any) {
        if (!cancelled) setSettingsError(e?.message || "Failed to load settings");
      } finally {
        if (!cancelled) setSettingsLoading(false);
      }
    }

    if (customerId) loadSettings(customerId);
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  // Enabled platforms (LinkedIn Personal respects blotato_linkeidin_active toggle)
  const enabled = useMemo(() => {
    const s = settings || {};

    const facebookOn = hasId(s.blotato_facebook_id) || hasId(s.blotato_facebook_page_ids);
    const instagramOn = hasId(s.blotato_instagram_id);
    const threadsOn = hasId(s.blotato_threads_id);
    const xOn = hasId(s.blotato_twitter_id);
    const tiktokOn = hasId(s.blotato_tiktok_id);

    // Gate personal by toggle; default true if undefined for backward compat
    const linkedinActive = s.blotato_linkeidin_active === undefined ? true : !!s.blotato_linkeidin_active;
    const linkedinPersonalOn = linkedinActive && hasId(s.blotato_linkeidin_id);
    const linkedinPageOn = hasId(s.blotato_linkeidin_page_ids);

    const youtubeShortOn = hasId(s.blotato_youtube_id);
    const reelsOn = facebookOn || instagramOn;
    const pinterestOn = hasId(s.blotato_pinterest_id);

    return {
      facebookOn,
      instagramOn,
      threadsOn,
      xOn,
      tiktokOn,
      linkedinPersonalOn,
      linkedinPageOn,
      youtubeShortOn,
      reelsOn,
      pinterestOn,
    };
  }, [settings]);

  const visiblePlatforms = useMemo(() => {
    const order = Object.keys(FIELD_MAP);
    return order.filter((p) => {
      if (p === "Facebook") return enabled.facebookOn;
      if (p === "Instagram") return enabled.instagramOn;
      if (p === "Threads") return enabled.threadsOn;
      if (p === "Twitter/X") return enabled.xOn;
      if (p === "Reals") return enabled.reelsOn;
      if (p === "Tick Tok") return enabled.tiktokOn;

      if (p === "Linkedin Business") return enabled.linkedinPageOn;
      if (p === "Linkedin Personal") return enabled.linkedinPersonalOn;

      if (p === "YouTube Short") return enabled.youtubeShortOn;
      // if (p === "Pinterest") return enabled.pinterestOn;
      return true;
    });
  }, [enabled]);

  // Keep selected in sync
  useEffect(() => {
    if (!visiblePlatforms.includes(selectedPlatform)) {
      const first = visiblePlatforms[0];
      if (first) setSelectedPlatform(first);
    }
  }, [visiblePlatforms, selectedPlatform]);

  useEffect(() => {
    if (selectedPlatform !== "Reals") return;
    if (reelsPlatform === "facebook" && !enabled.facebookOn && enabled.instagramOn) {
      setReelsPlatform("instagram");
    } else if (reelsPlatform === "instagram" && !enabled.instagramOn && enabled.facebookOn) {
      setReelsPlatform("facebook");
    }
  }, [selectedPlatform, reelsPlatform, enabled.facebookOn, enabled.instagramOn]);

  const pickPlatform = (p: string) => {
    setSelectedPlatform(p);
    if (p === "Reals") {
      if (enabled.facebookOn) setReelsPlatform("facebook");
      else if (enabled.instagramOn) setReelsPlatform("instagram");
    }
    const allowed = allowedPostTypes(p);
    setPostType((prev) => (allowed.includes(prev) ? prev : allowed[0]));
  };

  /* -------------- load latest log (uses final_status/publicUrl) -------------- */
  useEffect(() => {
    if (!record?.id) return;

    const loadLatest = async () => {
      try {
        const params = new URLSearchParams({
          content_generation_id: String(record.id),
          platform: platformKey,
          post_type: effectivePostType,
        });
        const js = await api<any>(`/publish/logs/latest?${params.toString()}`, { headers: { Accept: "application/json" } });
        const log = js?.data;

        if (!log) {
          setPublishStatus("idle");
          setPostedOnIso(null);
          setPublicUrl(null);
          setLastSubmissionId(null);
          setLastPublishLogId(null);
          return;
        }

        const finalStatus = String(log.final_status || "").toLowerCase();
        if (finalStatus === "published") {
          setPublishStatus("posted");
          setPublicUrl(log.publicUrl ?? null);
          setPostedOnIso(log.posted_on ?? null);
        } else if (finalStatus === "failed") {
          setPublishStatus("failed");
          setPostedOnIso(log.posted_on ?? null);
        } else {
          const st = (log.status as "queued" | "posted" | "failed") ?? "queued";
          setPublishStatus(st);
          setPostedOnIso(log.posted_on ?? null);
          setPublicUrl(log.publicUrl ?? null);
        }

        const subId: string | null = log.provider_post_id ?? null;
        setLastSubmissionId(subId);
        setLastPublishLogId(log.id ?? null);
      } catch {
        // silent
      }
    };

    void loadLatest();
  }, [record?.id, platformKey, effectivePostType]);

  /* ---- If we don't have provider_post_id yet, keep polling latestLog ---- */
  useEffect(() => {
    if (!record?.id) return;
    if (lastSubmissionId) return;
    if (publishStatus === "posted" || publishStatus === "failed") return;

    let stop = false;
    let t: number | undefined;

    async function pollLatest() {
      try {
        const params = new URLSearchParams({
          content_generation_id: String(record.id),
          platform: platformKey,
          post_type: effectivePostType,
        });
        const js = await api<any>(`/publish/logs/latest?${params.toString()}`);
        const log = js?.data;

        if (stop) return;

        if (log) {
          const finalStatus = String(log.final_status || "").toLowerCase();
          if (finalStatus === "published") {
            setPublishStatus("posted");
            setPublicUrl(log.publicUrl ?? null);
            setPostedOnIso(log.posted_on ?? null);
            setLastPublishLogId(log.id ?? null);
            return;
          }
          if (finalStatus === "failed") {
            setPublishStatus("failed");
            setPostedOnIso(log.posted_on ?? null);
            setLastPublishLogId(log.id ?? null);
            return;
          }

          const st = (log.status as "queued" | "posted" | "failed") ?? "queued";
          setPublishStatus(st);
          setPostedOnIso(log.posted_on ?? null);
          setPublicUrl(log.publicUrl ?? null);
          setLastPublishLogId(log.id ?? null);

          const subId: string | null = log.provider_post_id ?? null;
          if (subId) {
            setLastSubmissionId(subId);
            void fetchStatusOnce(subId);
            return;
          }
        }
      } catch {
        /* ignore */
      }
      const next = Math.min(latestLogPollMs * 1.5, 15000);
      setLatestLogPollMs(next);
      t = window.setTimeout(pollLatest, next);
    }

    t = window.setTimeout(pollLatest, latestLogPollMs);
    return () => {
      stop = true;
      if (t) clearTimeout(t);
    };
  }, [record?.id, lastSubmissionId, publishStatus, platformKey, effectivePostType, latestLogPollMs]);

  /* ------------------ one-shot status fetch (updates UI) ------------------ */
  async function fetchStatusOnce(subId: string) {
    try {
      const js = await api<any>(`/publish/status/${subId}`);
      setLastCheckAt(Date.now());
      setLastStatusRaw(String(js?.status ?? ""));
      const uiStatus = normalizeStatus(js?.status);

      if (uiStatus === "posted") {
        setPublishStatus("posted");
        setPublicUrl(js?.publicUrl || null);
        setPostedOnIso(new Date().toISOString());
      } else if (uiStatus === "failed") {
        setPublishStatus("failed");
      } else {
        setPublishStatus("queued");
      }
    } catch {
      setLastCheckAt(Date.now());
    }
  }

  /* --------------- Adaptive polling against /publish/status --------------- */
  useEffect(() => {
    if (!lastSubmissionId) return;
    if (publishStatus === "posted" || publishStatus === "failed") return;

    let cancelled = false;
    let delay = BASE_POLL_MS;
    let totalElapsed = 0;
    let timeoutId: number | undefined;
    const controller = new AbortController();

    function shouldPollNow() {
      return typeof document !== "undefined" ? document.visibilityState === "visible" : true;
    }

    async function pollOnce(): Promise<boolean> {
      try {
        const js = await api<any>(`/publish/status/${lastSubmissionId}`, { signal: controller.signal });
        setLastCheckAt(Date.now());
        setLastStatusRaw(String(js?.status ?? ""));
        const uiStatus = normalizeStatus(js?.status);

        if (uiStatus === "posted") {
          setPublishStatus("posted");
          setPublicUrl(js?.publicUrl || null);
          setPostedOnIso(new Date().toISOString());
          setNextPollInMs(null);
          return true;
        }
        if (uiStatus === "failed") {
          setPublishStatus("failed");
          setNextPollInMs(null);
          return true;
        }

        setPublishStatus("queued");
        return false;
      } catch {
        setLastCheckAt(Date.now());
        return false;
      }
    }

    async function loop() {
      if (cancelled) return;

      if (!shouldPollNow()) {
        setNextPollInMs(2000);
        timeoutId = window.setTimeout(loop, 2000);
        return;
      }

      const done = await pollOnce();
      if (cancelled || done) return;

      totalElapsed += delay;
      if (totalElapsed >= MAX_TOTAL_MS) {
        setPublishStatus("queued");
        setNextPollInMs(null);
        return;
      }

      delay = nextDelay(delay);
      setNextPollInMs(delay);
      timeoutId = window.setTimeout(loop, delay);
    }

    loop();

    const visHandler = () => {
      if (document.visibilityState === "visible") {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = window.setTimeout(loop, 500);
      }
    };
    document.addEventListener("visibilitychange", visHandler);

    return () => {
      cancelled = true;
      controller.abort();
      if (timeoutId) clearTimeout(timeoutId);
      document.removeEventListener("visibilitychange", visHandler);
    };
  }, [lastSubmissionId, publishStatus]);

  /* ===== flag when current media is NOT hosted on Blotato ===== */
  const nonBlotatoMedia = useMemo(() => {
    const pt = effectivePostType;
    if (pt === "image") {
      const img = (record?.image_url || "").trim();
      return !!img && !isBlotatoHosted(img);
    }
    if (pt === "video") {
      const vid = (videoUrl || record?.video_url || "").trim();
      return !!vid && !isBlotatoHosted(vid);
    }
    return false;
  }, [effectivePostType, record?.image_url, record?.video_url, videoUrl]);

  /* -------------------------- Approve & Publish -------------------------- */
  async function approve(scheduledAtIso?: string) {
    if (!record?.id) return;

    // BLOCK posting if media isn’t on Blotato
    if (nonBlotatoMedia) {
      setApproveStatus("error");
      setApproveError(
        "This image format isn’t supported. Please use the image conversion tool — once it’s done, start using the new URL."
      );
      return;
    }

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

    const post_type_normalized: PostType = selectedPlatform === "Reals" ? "video" : postType;

    const media_payload =
      post_type_normalized === "image"
        ? { image_url: record?.image_url ?? null }
        : post_type_normalized === "video"
        ? { video_url: (videoUrl || record?.video_url || "").trim() || null }
        : {};

    const body: any = {
      content_generation_id: record.id,
      customer_id: customerId,
      platform: platformKey,
      post_type: post_type_normalized,
      posted_media: platformKey,
      title,
      content: description,
      ...media_payload,
    };

    if (scheduledAtIso) {
      body.scheduled_at = scheduledAtIso; // backend interprets as UTC ISO
    }

    try {
      const json = await api<any>("/publish", { method: "POST", body: JSON.stringify(body) });

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
      setShowSchedule(false);
    } catch (err: any) {
      setApproveStatus("error");
      setApproveError(err?.message || "Failed to publish");
    }
  }

  async function refreshNow() {
    if (lastSubmissionId) {
      await fetchStatusOnce(lastSubmissionId);
    } else if (record?.id) {
      const params = new URLSearchParams({
        content_generation_id: String(record.id),
        platform: platformKey,
        post_type: effectivePostType,
      });
      try {
        const js = await api<any>(`/publish/logs/latest?${params.toString()}`);
        const log = js?.data;
        if (log?.provider_post_id) {
          setLastSubmissionId(log.provider_post_id);
          await fetchStatusOnce(log.provider_post_id);
        }
      } catch {}
    }
  }

  /* -------------------------------- Render -------------------------------- */
  if (loading) return <div className="p-6">Loading post…</div>;
  if (loadError) return <div className="p-6 text-red-600">Failed to load: {loadError}</div>;

  return (
    <div className="min-h-screen bg-white flex flex-col items-center py-8 px-4">
      {/* Overlay while we wait for final status (off) */}
      {showStatusOverlay && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px] flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-80 text-center">
            <div className="mx-auto mb-3 h-6 w-6 rounded-full border-2 border-gray-300 border-t-transparent animate-spin" />
            <div className="text-sm text-gray-800 font-medium">Please wait — getting post status from Blotato…</div>
            <div className="text-[11px] text-gray-500 mt-2">This can take 1–3 minutes for video posts.</div>
          </div>
        </div>
      )}

      {/* Header */}
      <h1 className="text-xl font-semibold mb-2">{TITLE_BY_CONTEXT[context]}</h1>

      {/* Back + Refresh */}
      <div className="mb-6 flex items-center gap-3">
        <button
          className="bg-teal-500 text-white px-6 py-2 rounded-md hover:bg-teal-600"
          onClick={() => {
            if (contentId != null) navigate(backUrl);
          }}
        >
          Back
        </button>
        <button
          className="bg-gray-100 text-gray-800 px-4 py-2 rounded-md border border-gray-300 hover:bg-gray-200"
          onClick={() => void refreshNow()}
        >
          Refresh status
        </button>
      </div>

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
      <div className="w-full max-w-4xl mb-2 text-xs min-h-5">
        {savingVideo === "saving" && <span className="text-amber-600">Saving…</span>}
        {savingVideo === "saved" && <span className="text-green-600">Saved</span>}
        {savingVideo === "error" && (
          <span className="text-red-600">Save failed{videoSaveError ? `: ${videoSaveError}` : ""}</span>
        )}
      </div>

      {/* small hint if video is non-Blotato and posting video */}
      {effectivePostType === "video" &&
        (videoUrl || record?.video_url) &&
        !isBlotatoHosted((videoUrl || record?.video_url || "").trim()) && (
          <div className="w-full max-w-4xl mb-4 text-xs text-red-600">
            This image format isn’t supported. Please use the image conversion tool — once it’s done, start using the new URL.{" "}
            {genId && (
              <a href={convertHref} className="underline">
                click here to convert this
              </a>
            )}
          </div>
        )}

      {/* Main content */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl">
        {/* Left: platforms */}
        <div className="space-y-2">
          {visiblePlatforms.length === 0 && (
            <div className="text-sm text-gray-500">
              {settingsLoading ? "Loading settings…" : "No platforms enabled for this customer."}
              {settingsError && <div className="text-xs text-red-600 mt-1">{settingsError}</div>}
            </div>
          )}
          {visiblePlatforms.map((p) => {
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
              {enabled.facebookOn && (
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={reelsPlatform === "facebook"}
                    onChange={() => setReelsPlatform("facebook")}
                  />
                  Facebook
                </label>
              )}
              {enabled.instagramOn && (
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={reelsPlatform === "instagram"}
                    onChange={() => setReelsPlatform("instagram")}
                  />
                  Instagram
                </label>
              )}
              {!enabled.facebookOn && !enabled.instagramOn && (
                <div className="text-xs text-gray-500">No Reels accounts enabled in settings.</div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {allowedPostTypes(selectedPlatform).includes("text") && (
                <label className="flex items-center gap-2">
                  <input type="radio" checked={postType === "text"} onChange={() => setPostType("text")} />
                  Post Text Only
                </label>
              )}
              {allowedPostTypes(selectedPlatform).includes("image") && (
                <label className="flex items-center gap-2">
                  <input type="radio" checked={postType === "image"} onChange={() => setPostType("image")} />
                  Post Text and Image
                </label>
              )}
              {allowedPostTypes(selectedPlatform).includes("video") && (
                <label className="flex items-center gap-2">
                  <input type="radio" checked={postType === "video"} onChange={() => setPostType("video")} />
                  Post Text and Video
                </label>
              )}
            </div>
          )}
        </div>

        {/* Right: actions + STATUS PANEL */}
        <div className="flex flex-col justify-between space-y-4">
          {/* Banner when media is not hosted on Blotato */}
          {nonBlotatoMedia && (
            <div className="w-full rounded-md border border-red-300 bg-red-50 text-red-700 p-3 text-sm">
              This image format isn’t supported. Please use the image conversion tool — once it’s done, start using the new URL.&nbsp;
              {genId && (
                <a href={convertHref} className="underline">
                  click here to convert this
                </a>
              )}
            </div>
          )}

          <button
            className="w-full bg-orange-500 text-white py-2 rounded-md hover:bg-orange-600"
            onClick={() => {
              setScheduleErr(null);
              if (!scheduledAtLocal) {
                const def = roundToNext5Min(new Date(Date.now() + 10 * 60 * 1000));
                setScheduledAtLocal(toLocalInputValue(def));
              }
              setShowSchedule(true);
            }}
          >
            Schedule The Post
          </button>

          <button
            className={`w-full text-white py-2 rounded-md ${
              approveStatus === "posting" || nonBlotatoMedia
                ? "bg-teal-300 cursor-not-allowed"
                : "bg-teal-500 hover:bg-teal-600"
            }`}
            disabled={approveStatus === "posting" || nonBlotatoMedia}
            onClick={() => void approve()}
          >
            {approveStatus === "posting" ? "Submitting…" : "Approve & Publish"}
          </button>

          <div className="rounded-md border border-gray-200 p-3 text-sm bg-gray-50">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Publish status</span>
              <span
                className={`font-medium ${
                  publishStatus === "posted"
                    ? "text-green-600"
                    : publishStatus === "failed"
                    ? "text-red-600"
                    : publishStatus === "queued"
                    ? "text-amber-600"
                    : "text-gray-500"
                }`}
              >
                {publishStatus === "idle"
                  ? "—"
                  : publishStatus === "queued"
                  ? "Queued"
                  : publishStatus === "posted"
                  ? "Published"
                  : "Failed"}
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

            {/* Heartbeat line so you can see it polling */}
            <div className="text-[11px] text-gray-400 mt-1">
              {lastCheckAt && <>Last check: {new Date(lastCheckAt).toLocaleTimeString()} </>}
              {typeof lastStatusRaw === "string" && lastStatusRaw && <>• raw: {lastStatusRaw} </>}
              {nextPollInMs && <>• next in ~{Math.round(nextPollInMs / 1000)}s</>}
              {!lastSubmissionId && <>Waiting for submission id…</>}
            </div>

            <a href={logsUrl} className="text-blue-600 hover:underline">
              View Publish Logs
            </a>
          </div>

          <div className="min-h-5 text-xs">
            {approveStatus === "posted" && <span className="text-green-600">Submitted to Blotato.</span>}
            {approveStatus === "error" && (
              <span className="text-red-600">Publish failed{approveError ? `: ${approveError}` : ""}</span>
            )}
            {publishStatus === "queued" && (
              <span className="text-amber-600">Processing on the platform… video posts may take 1–3 minutes.</span>
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
              {(["sm", "md", "lg"] as const).map((s) => (
                <label key={s} className="flex items-center gap-1 cursor-pointer">
                  <input type="radio" checked={previewSize === s} onChange={() => setPreviewSize(s)} />
                  <span className={previewSize === s ? "font-medium" : ""}>{s.toUpperCase()}</span>
                </label>
              ))}
            </div>
          </div>

          {previewMedia.showVideo ? (
            isPlayableVideo(previewMedia.videoUrl) ? (
              <div
                className={`rounded-md mb-3 border border-gray-200 overflow-hidden flex items-center justify-center bg-black/5 ${mediaBoxClassBySize[previewSize]}`}
              >
                <video key={previewMedia.videoUrl} src={previewMedia.videoUrl} controls className="w-full h-full object-cover" />
              </div>
            ) : (
              <div
                className={`rounded-md mb-3 border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-sm ${mediaBoxClassBySize[previewSize]}`}
              >
                {previewMedia.videoUrl
                  ? "Video URL isn't a direct .mp4/.webm/.mov/.m4v — preview not available"
                  : "No video URL provided"}
              </div>
            )
          ) : previewMedia.showImage ? (
            previewMedia.imageUrl ? (
              <div className={`rounded-md mb-3 border border-gray-200 overflow-hidden bg-gray-50 ${mediaBoxClassBySize[previewSize]}`}>
                <img src={previewMedia.imageUrl} alt="Post image" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div
                className={`rounded-md mb-3 border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-sm ${mediaBoxClassBySize[previewSize]}`}
              >
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

      {/* ====== Schedule Modal ====== */}
      {showSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowSchedule(false)} />
          {/* Dialog */}
          <div className="relative z-10 w-[92vw] max-w-md rounded-xl bg-white shadow-2xl border border-gray-200 p-5">
            <div className="flex items-start justify-between">
              <h2 className="text-lg font-semibold">Schedule this post</h2>
              <button
                className="text-gray-400 hover:text-gray-600"
                onClick={() => setShowSchedule(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <p className="text-sm text-gray-600 mt-2">
              Can you add if you want to post to another time zone just adjust it accordingly.
            </p>

            <div className="mt-4">
              <label className="text-sm font-medium text-gray-700">Date &amp; time</label>
              <input
                type="datetime-local"
                value={scheduledAtLocal}
                onChange={(e) => setScheduledAtLocal(e.target.value)}
                className="mt-1 w-full h-11 border border-gray-300 rounded-md px-3 outline-none focus:ring-2 focus:ring-teal-400"
              />
              {scheduleErr && <div className="text-xs text-red-600 mt-1">{scheduleErr}</div>}
            </div>

            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100"
                onClick={() => setShowSchedule(false)}
              >
                Cancel
              </button>
              <button
                className={`px-4 py-2 rounded-md text-white ${
                  approveStatus === "posting" || nonBlotatoMedia
                    ? "bg-teal-300 cursor-not-allowed"
                    : "bg-teal-600 hover:bg-teal-700"
                }`}
                disabled={approveStatus === "posting" || nonBlotatoMedia}
                onClick={() => {
                  if (nonBlotatoMedia) return; // safety

                  setScheduleErr(null);

                  if (!scheduledAtLocal) {
                    setScheduleErr("Please pick a date & time.");
                    return;
                  }

                  const iso = localInputToISO(scheduledAtLocal);
                  if (!iso) {
                    setScheduleErr("Invalid date/time.");
                    return;
                  }

                  const when = new Date(iso).getTime();
                  if (isNaN(when) || when <= Date.now() + 60 * 1000) {
                    setScheduleErr("Please pick a time at least 1 minute in the future.");
                    return;
                  }

                  setApproveStatus("posting");
                  void approve(iso);
                }}
              >
                {approveStatus === "posting" ? "Posting…" : "Approve & Schedule"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
