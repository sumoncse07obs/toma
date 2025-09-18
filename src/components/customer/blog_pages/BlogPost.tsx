// src/components/user/BlogPost.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { currentUser } from "@/components/auth";

type PostType = "text" | "image" | "video";

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

const API_BASE = "/api";

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

const FIELD_MAP: Record<
  string,
  { text: FieldKeys; image: FieldKeys; video: FieldKeys }
> = {
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
  // "Reals" handled specially with its own radios; map not used directly.
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

// --------- helpers for preview ----------
const isPlayableVideo = (url?: string | null) =>
  !!url && /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(url);

// ----------------------------------------

export default function BlogPost() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [videoUrl, setVideoUrl] = useState("");
  const [title, setTitle] = useState("Title Output Goes Here");
  const [description, setDescription] = useState("Description Output Goes Here");

  const [postType, setPostType] = useState<PostType>("text");
  const [selectedPlatform, setSelectedPlatform] = useState<string>("Facebook");
  const [reelsPlatform, setReelsPlatform] = useState<"facebook" | "instagram">("facebook");

  const [record, setRecord] = useState<ContentGeneration | null>(null);

  // save status for video_url autosave
  const [savingVideo, setSavingVideo] =
    useState<"idle" | "saving" | "saved" | "error">("idle");
  const [videoSaveError, setVideoSaveError] = useState<string | null>(null);

  const customerId = useMemo(() => getCustomerIdFromAuth(), []);
  const platforms = Object.keys(FIELD_MAP);

  // Load record
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        const res = await fetch(`${API_BASE}/content-generations/${id}`, {
          headers: { Accept: "application/json" },
          credentials: "include",
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.message || "Failed to load");

        const data: ContentGeneration = json?.data ?? json;
        if (cancelled) return;

        setRecord(data);
        setVideoUrl(data.video_url ?? "");

        setSelectedPlatform("Facebook");
        setPostType(data.video_url ? "video" : "text");
      } catch (e: any) {
        if (!cancelled) setLoadError(e.message || "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (id) load();
    return () => { cancelled = true; };
  }, [id]);

  // Persist video_url helper
  async function persistVideoUrl(url: string) {
    if (!record?.id) return;
    const trimmed = (url ?? "").trim();
    if (!trimmed) {
      // avoid null/empty if DB has NOT NULL on video_url; remove this guard if you allow clearing
      return;
    }
    try {
      setSavingVideo("saving");
      setVideoSaveError(null);

      const res = await fetch(`${API_BASE}/content-generations/${record.id}/video-url`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        credentials: "include",
        body: JSON.stringify({ video_url: trimmed }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({} as any));
        throw new Error(j?.message || `Failed to save (HTTP ${res.status})`);
      }

      setRecord((prev) => (prev ? { ...prev, video_url: trimmed } : prev));
      setSavingVideo("saved");
      setTimeout(() => setSavingVideo("idle"), 1000);
    } catch (err: any) {
      setSavingVideo("error");
      setVideoSaveError(err?.message || "Failed to save video URL");
    }
  }

  // Debounce save when videoUrl changes
  useEffect(() => {
    if (!record?.id) return;
    const trimmed = (videoUrl ?? "").trim();
    if (!trimmed || trimmed === (record.video_url ?? "").trim()) return;

    const t = setTimeout(() => {
      void persistVideoUrl(trimmed);
    }, 700);

    return () => clearTimeout(t);
  }, [videoUrl, record?.id, record?.video_url]);

  // Apply mapping whenever platform/postType/record OR reelsPlatform changes
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

  const pickPlatform = (p: string) => {
    setSelectedPlatform(p);
    if (p === "Tick Tok" || p === "YouTube Short" || p === "Reals") {
      setPostType("video");
    }
    if (p === "Reals") {
      setReelsPlatform("facebook");
    }
  };

  // ======== preview data =========
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

  if (loading) return <div className="p-6">Loading post…</div>;
  if (loadError) return <div className="p-6 text-red-600">Failed to load: {loadError}</div>;

  return (
    <div className="min-h-screen bg-white flex flex-col items-center py-8 px-4">
      {/* Header */}
      <h1 className="text-xl font-semibold mb-2">
        Toma <span className="font-bold">Blog</span> Automation
      </h1>
      <div className="text-xs text-gray-500 mb-4">
        Customer ID: <span className="font-medium">{customerId}</span> • Content ID:{" "}
        <span className="font-medium">{record?.id}</span>
      </div>

      <button
        className="mb-6 bg-teal-500 text-white px-6 py-2 rounded-md hover:bg-teal-600"
        onClick={() => {
          const target = record?.video_url || videoUrl || record?.image_url || "#";
          if (target && target !== "#") window.open(target, "_blank");
        }}
      >
        Click Here to Goto Blotato and edit the video
      </button>

      {/* Video URL row */}
      <div className="flex gap-3 items-center w-full max-w-4xl mb-1">
        <label className="text-sm font-medium whitespace-nowrap">
          Put New Video Url Here
        </label>
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
          <span className="text-red-600">
            Save failed{videoSaveError ? `: ${videoSaveError}` : ""}
          </span>
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

          {/* Radios:
              - Normal: 3 post-type radios
              - Reels selected: 2 radios (Facebook / Instagram) */}
          {selectedPlatform === "Reals" ? (
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={reelsPlatform === "facebook"}
                  onChange={() => setReelsPlatform("facebook")}
                />
                Facebook
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={reelsPlatform === "instagram"}
                  onChange={() => setReelsPlatform("instagram")}
                />
                Instagram
              </label>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={postType === "text"}
                  onChange={() => setPostType("text")}
                />
                Post Text Only
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={postType === "image"}
                  onChange={() => setPostType("image")}
                />
                Post Text and Image
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={postType === "video"}
                  onChange={() => setPostType("video")}
                />
                Post Text and Video
              </label>
            </div>
          )}
        </div>

        {/* Right: actions */}
        <div className="flex flex-col justify-between space-y-4">
          <button
            className="w-full bg-orange-500 text-white py-2 rounded-md hover:bg-orange-600"
            onClick={() => {
              let keys: FieldKeys;
              if (selectedPlatform === "Reals") {
                keys =
                  reelsPlatform === "facebook"
                    ? { title: "facebook_reels_title", content: "facebook_reels_content" }
                    : { title: "instagram_reels_title", content: "instagram_reels_content" };
              } else {
                keys = FIELD_MAP[selectedPlatform][postType];
              }

              const payload = {
                id: record?.id,
                customer_id: customerId,
                platform:
                  selectedPlatform === "Reals"
                    ? reelsPlatform === "facebook"
                      ? "Facebook Reels"
                      : "Instagram Reels"
                    : selectedPlatform,
                post_type: selectedPlatform === "Reals" ? "video" : postType,
                video_url: videoUrl,
                mapped_title_field: keys.title,
                mapped_content_field: keys.content,
                title,
                content: description,
              };
              console.log("Schedule payload", payload);
              alert("Scheduling stub — wire this to your API.");
            }}
          >
            Schedule The Post
          </button>

          <button
            className="w-full bg-teal-500 text-white py-2 rounded-md hover:bg-teal-600"
            onClick={() => {
              let keys: FieldKeys;
              if (selectedPlatform === "Reals") {
                keys =
                  reelsPlatform === "facebook"
                    ? { title: "facebook_reels_title", content: "facebook_reels_content" }
                    : { title: "instagram_reels_title", content: "instagram_reels_content" };
              } else {
                keys = FIELD_MAP[selectedPlatform][postType];
              }

              const updates: Record<string, any> = { video_url: videoUrl };
              if (keys.title) updates[String(keys.title)] = title;
              if (keys.content) updates[String(keys.content)] = description;

              console.log("Approve/save payload", {
                id: record?.id,
                customer_id: customerId,
                updates,
              });
              alert("Approve stub — send these updates to your backend.");
            }}
          >
            Approve
          </button>
        </div>

        {/* ======= LIVE PREVIEW (spans two columns on desktop) ======= */}
        <div className="md:col-span-2 border border-gray-300 rounded-lg p-4">
          <div className="text-sm font-semibold text-gray-700 mb-3">
            Live Preview ·{" "}
            {selectedPlatform === "Reals"
              ? `Reels · ${reelsPlatform === "facebook" ? "Facebook" : "Instagram"}`
              : `${selectedPlatform} · ${postType.toUpperCase()}`}
          </div>

          {/* Media on top (image OR video) */}
          {previewMedia.showVideo ? (
            isPlayableVideo(previewMedia.videoUrl) ? (
              <video
                key={previewMedia.videoUrl}
                src={previewMedia.videoUrl}
                controls
                className="w-full rounded-md mb-3"
              />
            ) : (
              <div className="w-full h-48 rounded-md mb-3 border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-sm">
                {previewMedia.videoUrl
                  ? "Video URL isn't a direct .mp4/.webm/.mov/.m4v — preview not available"
                  : "No video URL provided"}
              </div>
            )
          ) : previewMedia.showImage ? (
            previewMedia.imageUrl ? (
              <img
                src={previewMedia.imageUrl}
                alt="Post image"
                className="w-full rounded-md mb-3 object-cover"
              />
            ) : (
              <div className="w-full h-48 rounded-md mb-3 border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-sm">
                No image available
              </div>
            )
          ) : null}

          {/* Title */}
          <div className="text-base font-medium text-gray-900 whitespace-pre-wrap">
            {title?.trim() ? title : <span className="text-gray-400">Title will appear here…</span>}
          </div>

          {/* Description */}
          <div className="mt-2 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
            {description?.trim()
              ? description
              : <span className="text-gray-400">Description will appear here…</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
