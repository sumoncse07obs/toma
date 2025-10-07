// src/components/customer/PublishPost.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
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

type CustomerSettings = {
  facebook_profile_id?: string | null;
  facebook_page_ids?: string[] | string | null;
  instagram_account_id?: string | null;
  x_account_id?: string | null;
  twitter_account_id?: string | null;
  threads_account_id?: string | null;
  tiktok_account_id?: string | null;
  youtube_channel_id?: string | null;
  linkedin_personal_id?: string | null;
  linkedin_page_ids?: string[] | string | null;
};

type SocialConnection = {
  id: number | string;
  provider: string;   // e.g. 'facebook', 'facebook_page', 'instagram', 'x', 'twitter', 'tiktok', 'youtube', 'linkedin_page', 'linkedin_personal', 'threads'
  kind?: string | null;
  meta?: any;
};

/* ========================= API base (robust) ========================= */
const RAW_BASE = String(import.meta.env.VITE_API_BASE || "").replace(/\/+$/g, "");
const API_BASE = RAW_BASE.endsWith("/api") ? RAW_BASE : `${RAW_BASE}/api`;
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
      msg = JSON.parse(text)?.message || msg;
    } catch {}
    throw new Error(`HTTP ${res.status}: ${msg}`);
  }
  const ct = res.headers.get("content-type") || "";
  return (ct.includes("application/json") ? await res.json() : (undefined as any)) as T;
}
function getCustomerIdFromAuth(): number {
  const u: any = currentUser?.() ?? null;
  return u?.customer_id ?? u?.customer?.id ?? u?.profile?.customer_id ?? u?.company?.customer_id ?? 1;
}

/* ===================== Status helpers ===================== */
function normalizeStatus(s: string | null | undefined): "queued" | "posted" | "failed" {
  const v = String(s || "").toLowerCase();
  if (["success", "published", "complete", "completed", "posted"].includes(v)) return "posted";
  if (["fail", "failed", "error"].includes(v)) return "failed";
  return "queued";
}
const BASE_POLL_MS = 4000;
const MAX_POLL_MS  = 20000;
const MAX_TOTAL_MS = 10 * 60 * 1000;
function nextDelay(prev: number) {
  const n = Math.min(Math.round(prev * 1.6), MAX_POLL_MS);
  const jitter = Math.floor(Math.random() * 500);
  return n + jitter;
}

/* =============================== Field map =============================== */
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
  Reals: { text: {}, image: {}, video: {} },
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

const isPlayableVideo = (url?: string | null) => !!url && /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(url);
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
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function localInputToISO(v: string) {
  const dt = new Date(v.replace(" ", "T"));
  return isNaN(dt.getTime()) ? null : dt.toISOString();
}
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

/* ============================ settings helpers ============================ */
function toList(v?: string[] | string | null): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.filter(Boolean);
  const s = String(v).trim();
  if (!s) return [];
  try {
    const parsed = JSON.parse(s);
    if (Array.isArray(parsed)) return parsed.filter(Boolean).map(String);
  } catch {}
  return s.split(",").map((x) => x.trim()).filter(Boolean);
}

// Build enable map from /social/connections (preferred)
function computeFromConnections(conns: SocialConnection[] | null | undefined) {
  const map = {
    Facebook: false,
    Instagram: false,
    Threads: false,
    "Twitter/X": false,
    Reals: false,
    "Tick Tok": false,
    "Linkedin Business": false,
    "Linkedin Personal": false,
    "YouTube Short": false,
  };
  if (!conns?.length) return map;

  let hasFb = false;
  let hasFbPage = false;
  let hasIg = false;

  for (const c of conns) {
    const p = (c.provider || "").toLowerCase();
    if (p.includes("facebook_page")) hasFbPage = true;
    if (p === "facebook" || p.includes("meta_facebook")) hasFb = true;

    if (p.includes("instagram")) hasIg = true;
    if (p === "threads") map["Threads"] = true;

    if (p === "x" || p === "twitter") map["Twitter/X"] = true;
    if (p === "tiktok") map["Tick Tok"] = true;
    if (p.startsWith("youtube")) map["YouTube Short"] = true;

    if (p.includes("linkedin_page")) map["Linkedin Business"] = true;
    if (p.includes("linkedin_personal") || p === "linkedin") map["Linkedin Personal"] = true;
  }

  map["Facebook"] = hasFb || hasFbPage;
  map["Instagram"] = hasIg;
  map["Reals"] = hasFbPage || hasIg; // Reels needs FB Page or IG business

  return map;
}

// Fallback from /settings fields
function computeFromSettings(s: CustomerSettings | null) {
  const fbPages = toList(s?.facebook_page_ids);
  const hasFacebookAny = !!(s?.facebook_profile_id || fbPages.length > 0);
  const hasFacebookPages = fbPages.length > 0;

  const hasInstagram   = !!s?.instagram_account_id;
  const hasX           = !!(s?.x_account_id || s?.twitter_account_id);
  const hasThreads     = !!s?.threads_account_id;
  const hasTikTok      = !!s?.tiktok_account_id;
  const hasYouTube     = !!s?.youtube_channel_id;
  const liPages        = toList(s?.linkedin_page_ids);
  const hasLiBusiness  = liPages.length > 0;
  const hasLiPersonal  = !!s?.linkedin_personal_id;

  return {
    Facebook: hasFacebookAny,
    Instagram: hasInstagram,
    Threads: hasThreads,
    "Twitter/X": hasX,
    Reals: hasFacebookPages || hasInstagram,
    "Tick Tok": hasTikTok,
    "Linkedin Business": hasLiBusiness,
    "Linkedin Personal": hasLiPersonal,
    "YouTube Short": hasYouTube,
  };
}

// Final enable map (optimistic while loading; OR of connections + settings)
function computeEnabledPlatforms(
  loaded: boolean,
  connMap: ReturnType<typeof computeFromConnections>,
  setMap: ReturnType<typeof computeFromSettings>
) {
  if (!loaded) {
    // optimistic: everything enabled while loading
    return {
      Facebook: true,
      Instagram: true,
      Threads: true,
      "Twitter/X": true,
      Reals: true,
      "Tick Tok": true,
      "Linkedin Business": true,
      "Linkedin Personal": true,
      "YouTube Short": true,
    };
  }
  // Merge: if connections say it's on OR settings have the id => enabled
  const out: any = {};
  for (const k of Object.keys(setMap) as (keyof typeof setMap)[]) {
    out[k] = Boolean((connMap as any)[k] || (setMap as any)[k]);
  }
  return out as typeof setMap;
}

/* =============================== Component =============================== */
export default function PublishPost() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const context = useMemo<"blog" | "youtube" | "topic" | "launch">(() => {
    const p = pathname.toLowerCase();
    if (p.includes("/customer/youtube/") || p.includes("/youtube/")) return "youtube";
    if (p.includes("/customer/topic/")   || p.includes("/topic/"))   return "topic";
    if (p.includes("/customer/launch/")  || p.includes("/launch/"))  return "launch";
    return "blog";
  }, [pathname]);

  const TITLE_BY_CONTEXT: Record<"blog" | "youtube" | "topic" | "launch", string> = {
    blog: "Toma Blog Automation",
    youtube: "Toma YouTube Automation",
    topic: "Toma Topic Automation",
    launch: "Toma Launch Automation",
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

  const [lastSubmissionId, setLastSubmissionId] = useState<string | null>(null);
  const [lastPublishLogId, setLastPublishLogId] = useState<number | null>(null);
  const [publishStatus, setPublishStatus] = useState<"idle" | "queued" | "posted" | "failed">("idle");
  const [postedOnIso, setPostedOnIso] = useState<string | null>(null);
  const [publicUrl, setPublicUrl] = useState<string | null>(null);

  const showStatusOverlay = false;

  const [lastCheckAt, setLastCheckAt] = useState<number | null>(null);
  const [lastStatusRaw, setLastStatusRaw] = useState<string | null>(null);
  const [nextPollInMs, setNextPollInMs] = useState<number | null>(null);
  const [latestLogPollMs, setLatestLogPollMs] = useState<number>(5000);

  // Settings & connections
  const [settings, setSettings] = useState<CustomerSettings | null>(null);
  const [connections, setConnections] = useState<SocialConnection[] | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsLoading, setSettingsLoading] = useState<boolean>(true);

  const setMap = useMemo(() => computeFromSettings(settings), [settings]);
  const connMap = useMemo(() => computeFromConnections(connections), [connections]);
  const enabledMap = useMemo(
    () => computeEnabledPlatforms(!settingsLoading, connMap, setMap),
    [settingsLoading, connMap, setMap]
  );

  const customerId = useMemo(() => getCustomerIdFromAuth(), []);
  const platforms = Object.keys(FIELD_MAP);

  const platformKey = useMemo(
    () => normalizePlatform(selectedPlatform, reelsPlatform),
    [selectedPlatform, reelsPlatform]
  );
  const effectivePostType: PostType = selectedPlatform === "Reals" ? "video" : postType;

  const contentId = record?.id ?? (id ? parseInt(id, 10) : null);
  const backUrl = useMemo(
    () => (contentId != null ? `/customer/${context}/view/${contentId}` : "/customer"),
    [context, contentId]
  );
  const logsUrl = useMemo(
    () => (contentId != null ? `/customer/${context}/log/${contentId}` : "#"),
    [context, contentId]
  );

  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduledAtLocal, setScheduledAtLocal] = useState<string>("");
  const [scheduleErr, setScheduleErr] = useState<string | null>(null);

  const [nowUtcIso, setNowUtcIso] = useState<string>(nowUtcIsoSeconds());
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

        const def = roundToNext5Min(new Date(Date.now() + 10 * 60 * 1000));
        setScheduledAtLocal(toLocalInputValue(def));
      } catch (e: any) {
        if (!cancelled) setLoadError(e.message || "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (id) load();
    return () => { cancelled = true; };
  }, [id]);

  /* ------------------------ load settings + connections ------------------------ */
// Load settings + connections (authenticated)
useEffect(() => {
  let cancelled = false;
  async function loadAll() {
    setSettingsLoading(true);
    setSettingsError(null);
    try {
      const [s, c] = await Promise.allSettled([
        api<any>("/settings"),            // ✅ correct route
        api<any>("/social/connections"),  // ✅ optional, but useful
      ]);
      if (!cancelled) {
        if (s.status === "fulfilled") setSettings(s.value?.data ?? s.value ?? null);
        if (c.status === "fulfilled") setConnections(c.value?.data ?? c.value ?? null);
      }
    } catch (e: any) {
      if (!cancelled) setSettingsError(e?.message || "Failed to load settings");
    } finally {
      if (!cancelled) setSettingsLoading(false);
    }
  }
  loadAll();
  return () => { cancelled = true; };
}, []);


  // After settings load, if current platform is disabled, jump to first enabled
  useEffect(() => {
    if (settingsLoading) return;
    const enabledPlatforms = Object.entries(enabledMap).filter(([, v]) => v).map(([k]) => k);
    if (!enabledPlatforms.length) return;
    if (!enabledMap[selectedPlatform]) {
      setSelectedPlatform(enabledPlatforms[0]);
      if (enabledPlatforms[0] === "Reals") {
        const fbOk = connMap["Facebook"] && (connections || []).some(c => (c.provider||"").toLowerCase().includes("facebook_page"));
        const igOk = connMap["Instagram"];
        setReelsPlatform(fbOk ? "facebook" : igOk ? "instagram" : "facebook");
      }
    }
  }, [enabledMap, settingsLoading, selectedPlatform, connMap, connections]);

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
    if (!trimmed || trimmed === (record?.video_url ?? "").trim()) return;
    const t = setTimeout(() => { void persistVideoUrl(trimmed); }, 700);
    return () => clearTimeout(t);
  }, [videoUrl, record?.id, record?.video_url]);

  /* --------------------- map fields -> title/description --------------------- */
  useEffect(() => {
    if (!record) return;
    let keys: FieldKeys | undefined;
    if (selectedPlatform === "Reals") {
      keys = reelsPlatform === "facebook"
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

  const pickPlatform = (p: string) => {
    setSelectedPlatform(p);
    if (p === "Reals") {
      const hasFbPage = (connections || []).some(c => (c.provider||"").toLowerCase().includes("facebook_page"));
      setReelsPlatform(hasFbPage ? "facebook" : "instagram");
    }
    const allowed = allowedPostTypes(p);
    setPostType((prev) => (allowed.includes(prev) ? prev : allowed[0]));
  };

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

  /* -------------- latest log -------------- */
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
          setPublishStatus("idle"); setPostedOnIso(null); setPublicUrl(null);
          setLastSubmissionId(null); setLastPublishLogId(null);
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
      } catch {/* ignore */}
    };
    void loadLatest();
  }, [record?.id, platformKey, effectivePostType]);

  /* ---- poll latest until submission id appears ---- */
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
      } catch {/* ignore */}
      const next = Math.min(latestLogPollMs * 1.5, 15000);
      setLatestLogPollMs(next);
      t = window.setTimeout(pollLatest, next);
    }

    t = window.setTimeout(pollLatest, latestLogPollMs);
    return () => { stop = true; if (t) clearTimeout(t); };
  }, [record?.id, lastSubmissionId, publishStatus, platformKey, effectivePostType, latestLogPollMs]);

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

  /* -------------------------- Approve & Publish -------------------------- */
  async function approve(scheduledAtIso?: string) {
    if (!record?.id) return;

    if (!enabledMap[selectedPlatform]) {
      setApproveStatus("error");
      setApproveError("This platform is not connected. Connect it in Settings first.");
      return;
    }
    if (selectedPlatform === "Reals") {
      const hasFbPage = (connections || []).some(c => (c.provider||"").toLowerCase().includes("facebook_page"));
      const hasIg = connMap["Instagram"];
      if ((reelsPlatform === "facebook" && !hasFbPage) || (reelsPlatform === "instagram" && !hasIg)) {
        setApproveStatus("error");
        setApproveError(`The selected Reels destination (${reelsPlatform}) is not connected.`);
        return;
      }
    }

    setApproveStatus("posting");
    setApproveError(null);

    let keys: FieldKeys;
    if (selectedPlatform === "Reals") {
      keys = reelsPlatform === "facebook"
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

  const reelsFbEnabled = (connections || []).some(c => (c.provider||"").toLowerCase().includes("facebook_page"));
  const reelsIgEnabled = enabledMap["Instagram"];

  return (
    <div className="min-h-screen bg-white flex flex-col items-center py-8 px-4">
      <h1 className="text-xl font-semibold mb-2">{TITLE_BY_CONTEXT[context]}</h1>

      <div className="mb-6 flex items-center gap-3">
        <button
          className="bg-teal-500 text-white px-6 py-2 rounded-md hover:bg-teal-600"
          onClick={() => { if (contentId != null) navigate(backUrl); }}
        >
          Back
        </button>
        <button
          className="bg-gray-100 text-gray-800 px-4 py-2 rounded-md border border-gray-300 hover:bg-gray-200"
          onClick={() => void refreshNow()}
        >
          Refresh status
        </button>
        {settingsLoading && <span className="text-xs text-gray-500">Loading connections…</span>}
        {settingsError && <span className="text-xs text-red-600">Settings error: {settingsError}</span>}
      </div>

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

      <div className="w-full max-w-4xl mb-6 text-xs min-h-5">
        {savingVideo === "saving" && <span className="text-amber-600">Saving…</span>}
        {savingVideo === "saved" && <span className="text-green-600">Saved</span>}
        {savingVideo === "error" && (
          <span className="text-red-600">Save failed{videoSaveError ? `: ${videoSaveError}` : ""}</span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl">
        {/* Left: platforms */}
        <div className="space-y-2">
          {platforms.map((p) => {
            const active = p === selectedPlatform;
            const enabled = enabledMap[p];
            return (
              <button
                key={p}
                onClick={() => enabled && setSelectedPlatform(p)}
                disabled={!enabled}
                className={`w-full py-2 rounded-md border relative ${
                  enabled
                    ? active
                      ? "bg-blue-100 border-blue-400 text-blue-600 font-medium"
                      : "bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200"
                    : "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed"
                }`}
                title={enabled ? "" : "Connect this platform in Settings to enable"}
              >
                {p}
                {!enabled && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">
                    Connect in Settings
                  </span>
                )}
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

          {selectedPlatform === "Reals" ? (
            <div className="space-y-2">
              <label className={`flex items-center gap-2 ${reelsFbEnabled ? "" : "opacity-50"}`}>
                <input
                  type="radio"
                  checked={reelsPlatform === "facebook"}
                  onChange={() => reelsFbEnabled && setReelsPlatform("facebook")}
                  disabled={!reelsFbEnabled}
                />
                Facebook (Reels)
                {!reelsFbEnabled && <span className="text-[10px] text-gray-400">(connect FB Page)</span>}
              </label>
              <label className={`flex items-center gap-2 ${reelsIgEnabled ? "" : "opacity-50"}`}>
                <input
                  type="radio"
                  checked={reelsPlatform === "instagram"}
                  onChange={() => reelsIgEnabled && setReelsPlatform("instagram")}
                  disabled={!reelsIgEnabled}
                />
                Instagram (Reels)
                {!reelsIgEnabled && <span className="text-[10px] text-gray-400">(connect IG Account)</span>}
              </label>
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
          <button
            className="w-full bg-orange-500 text-white py-2 rounded-md hover:bg-orange-600 disabled:opacity-60"
            disabled={!enabledMap[selectedPlatform]}
            onClick={() => {
              setScheduleErr(null);
              if (!enabledMap[selectedPlatform]) return;
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
              approveStatus === "posting" ? "bg-teal-300" : "bg-teal-500 hover:bg-teal-600"
            } disabled:opacity-60`}
            disabled={approveStatus === "posting" || !enabledMap[selectedPlatform]}
            onClick={() => void approve()}
            title={enabledMap[selectedPlatform] ? "" : "Connect this platform in Settings to enable"}
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
                {publishStatus === "idle" ? "—" : publishStatus === "queued" ? "Queued" : publishStatus === "posted" ? "Published" : "Failed"}
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

            <div className="text-[11px] text-gray-400 mt-1">
              {lastCheckAt && <>Last check: {new Date(lastCheckAt).toLocaleTimeString()} </>}
              {typeof lastStatusRaw === "string" && lastStatusRaw && <>• raw: {lastStatusRaw} </>}
              {nextPollInMs && <>• next in ~{Math.round(nextPollInMs / 1000)}s</>}
              {!lastSubmissionId && <>Waiting for submission id…</>}
            </div>

            <a href={logsUrl} className="text-blue-600 hover:underline">View Publish Logs</a>
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
              {(["sm","md","lg"] as const).map((s) => (
                <label key={s} className="flex items-center gap-1 cursor-pointer">
                  <input type="radio" checked={previewSize === s} onChange={() => setPreviewSize(s)} />
                  <span className={previewSize === s ? "font-medium" : ""}>{s.toUpperCase()}</span>
                </label>
              ))}
            </div>
          </div>

          {(() => {
            const showVid = previewMedia.showVideo;
            if (showVid) {
              return isPlayableVideo(previewMedia.videoUrl) ? (
                <div className={`rounded-md mb-3 border border-gray-200 overflow-hidden flex items-center justify-center bg-black/5 ${mediaBoxClassBySize[previewSize]}`}>
                  <video key={previewMedia.videoUrl} src={previewMedia.videoUrl} controls className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className={`rounded-md mb-3 border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-sm ${mediaBoxClassBySize[previewSize]}`}>
                  {previewMedia.videoUrl ? "Video URL isn't a direct .mp4/.webm/.mov/.m4v — preview not available" : "No video URL provided"}
                </div>
              );
            }
            if (previewMedia.showImage) {
              return previewMedia.imageUrl ? (
                <div className={`rounded-md mb-3 border border-gray-200 overflow-hidden bg-gray-50 ${mediaBoxClassBySize[previewSize]}`}>
                  <img src={previewMedia.imageUrl} alt="Post image" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className={`rounded-md mb-3 border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-sm ${mediaBoxClassBySize[previewSize]}`}>
                  No image available
                </div>
              );
            }
            return null;
          })()}

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
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowSchedule(false)} />
          <div className="relative z-10 w-[92vw] max-w-md rounded-xl bg-white shadow-2xl border border-gray-200 p-5">
            <div className="flex items-start justify-between">
              <h2 className="text-lg font-semibold">Schedule this post</h2>
              <button className="text-gray-400 hover:text-gray-600" onClick={() => setShowSchedule(false)} aria-label="Close">✕</button>
            </div>

            <p className="text-center mt-2">Can you add if you want to post to another time zone just adjust it accordingly.</p>
            
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
              <button className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100" onClick={() => setShowSchedule(false)}>
                Cancel
              </button>
              <button
                className={`px-4 py-2 rounded-md text-white ${approveStatus === "posting" ? "bg-teal-300 cursor-not-allowed" : "bg-teal-600 hover:bg-teal-700"}`}
                disabled={approveStatus === "posting"}
                onClick={() => {
                  setScheduleErr(null);
                  if (!enabledMap[selectedPlatform]) { setScheduleErr("This platform is not connected."); return; }
                  if (selectedPlatform === "Reals") {
                    if (reelsPlatform === "facebook" && !reelsFbEnabled) { setScheduleErr("Facebook Reels is not connected."); return; }
                    if (reelsPlatform === "instagram" && !reelsIgEnabled) { setScheduleErr("Instagram Reels is not connected."); return; }
                  }
                  if (!scheduledAtLocal) { setScheduleErr("Please pick a date & time."); return; }
                  const iso = localInputToISO(scheduledAtLocal);
                  if (!iso) { setScheduleErr("Invalid date/time."); return; }
                  const when = new Date(iso).getTime();
                  if (isNaN(when) || when <= Date.now() + 60 * 1000) { setScheduleErr("Please pick a time at least 1 minute in the future."); return; }
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
