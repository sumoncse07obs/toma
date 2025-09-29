// src/components/customer/NewTopicContents.tsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { currentUser } from "@/components/auth";

/* ========= CONFIG: change this once per page copy ========= */
const CONTEXT: "blog" | "youtube" | "topic" | "launch" = "topic";

/* ========= Types ========= */
type GenOutputs = {
  summary?: string | null;
  short_summary?: string | null;
  video_script?: string | null;
  image_url?: string | null;

  threads_title?: string | null;
  threads_content?: string | null;
  threads_video_title?: string | null;
  threads_video_content?: string | null;
};

type StartResponse = {
  id?: number | string;
  message?: string;
  outputs?: GenOutputs;
};

type MakeImageResponse =
  | { image_url?: string; url?: string; data?: { image_url?: string; url?: string } }
  | Record<string, any>;

type MakeVideoResponse =
  | {
      job_id?: string | null;
      status?: string | null;
      video_url?: string | null;
      data?: { video_url?: string | null };
      raw?: any;
    }
  | Record<string, any>;

/* ========= Constants & helpers ========= */
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

function formatDuration(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const mm = String(Math.floor(totalSec / 60)).padStart(2, "0");
  const ss = String(totalSec % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function titleCase(s: string) {
  return s.slice(0, 1).toUpperCase() + s.slice(1);
}

export default function NewTopicContents() {
  // ✅ Topic + Keywords flow
  const [topic, setTopic] = useState("");
  const [keywords, setKeywords] = useState(""); // comma-separated optional

  // media previews
  const [imgSrcUrl, setImgSrcUrl] = useState("");
  const [vidSrcUrl, setVidSrcUrl] = useState("");

  // pipeline state
  const [loading, setLoading] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const timerRef = useRef<number | null>(null);
  const [lastDurationMs, setLastDurationMs] = useState<number | null>(null);

  const [err, setErr] = useState<string | null>(null);
  const [out, setOut] = useState<GenOutputs>({});
  const [genId, setGenId] = useState<number | null>(null);

  // image/video generation states
  const [imgGenLoading, setImgGenLoading] = useState(false);
  const [imgGenErr, setImgGenErr] = useState<string | null>(null);
  const [vidGenLoading, setVidGenLoading] = useState(false);
  const [vidGenErr, setVidGenErr] = useState<string | null>(null);

  const isBusy = loading;
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) {
      const start = Date.now();
      setElapsedMs(0);
      timerRef.current = window.setInterval(() => {
        setElapsedMs(Date.now() - start);
      }, 250) as unknown as number;
      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [loading]);

  /** ========= IMAGE: generate then persist (honors CONTEXT) ========= */
  async function generateImageForId(customerId: number, generationId: number) {
    try {
      setImgGenErr(null);
      setImgGenLoading(true);

      const resp = await fetch(
        `${API_BASE_URL}/customers/${customerId}/contents/${generationId}/make-image`,
        {
          method: "POST",
          headers: { ...baseJsonHeaders, ...authHeader() },
          body: JSON.stringify({ prompt_for: CONTEXT }), // tell backend which PromptSetting row to use
        }
      );

      if (!resp.ok) {
        let msg = "Failed to generate image.";
        try {
          const j = await resp.json();
          msg = (j as any)?.message || msg;
        } catch {
          msg = (await resp.text()) || msg;
        }
        throw new Error(msg);
      }

      const data = (await resp.json()) as MakeImageResponse;

      const newUrl =
        data?.image_url ??
        data?.data?.image_url ??
        data?.url ??
        data?.data?.url ??
        null;

      if (typeof newUrl === "string" && newUrl) {
        setOut((prev) => ({ ...prev, image_url: newUrl }));
        setImgSrcUrl(newUrl);
      }

      if (typeof newUrl === "string" && newUrl && generationId) {
        await fetch(`${API_BASE_URL}/content-generations/${generationId}`, {
          method: "PUT",
          headers: { ...baseJsonHeaders, ...authHeader() },
          body: JSON.stringify({ image_url: newUrl }),
        }).catch(() => {});
      }
    } catch (e: any) {
      setImgGenErr(e?.message || "Image generation failed");
    } finally {
      setImgGenLoading(false);
    }
  }

  /** ========= VIDEO: generate then persist job/status/url ========= */
  async function generateVideoForId(
    customerId: number,
    generationId: number,
    scriptFromStart?: string
  ) {
    try {
      setVidGenErr(null);
      setVidGenLoading(true);

      const resp = await fetch(
        `${API_BASE_URL}/customers/${customerId}/contents/${generationId}/make-video`,
        {
          method: "POST",
          headers: { ...baseJsonHeaders, ...authHeader() },
          body:
            scriptFromStart && scriptFromStart.trim().length
              ? JSON.stringify({ script: scriptFromStart })
              : undefined,
        }
      );

      if (!resp.ok) {
        let msg = "Failed to generate video.";
        try {
          const j = await resp.json();
          msg = (j as any)?.message || msg;
        } catch {
          msg = (await resp.text()) || msg;
        }
        throw new Error(msg);
      }

      const data = (await resp.json()) as MakeVideoResponse;

      const videoUrl = data?.video_url ?? data?.data?.video_url ?? null;
      const jobId = (data as any)?.job_id ?? null;
      const status = (data as any)?.status ?? null;

      if (typeof videoUrl === "string" && videoUrl) {
        setVidSrcUrl(videoUrl);
        setOut((prev) => ({ ...prev }));
      }

      const payload: Record<string, any> = {};
      if (jobId) payload.blotato_video_id = jobId;
      if (status) payload.blotato_video_status = status;
      if (videoUrl) payload.video_url = videoUrl;

      if (Object.keys(payload).length) {
        await fetch(`${API_BASE_URL}/content-generations/${generationId}`, {
          method: "PUT",
          headers: { ...baseJsonHeaders, ...authHeader() },
          body: JSON.stringify(payload),
        }).catch(() => {});
      }
    } catch (e: any) {
      setVidGenErr(e?.message || "Video generation failed");
    } finally {
      setVidGenLoading(false);
    }
  }

  /** ========= Start pipeline: TOPIC + KEYWORDS ========= */
  async function handleStartFromContext() {
    setErr(null);
    setOut({});
    setGenId(null);
    setLastDurationMs(null);
    setLoading(true);

    const startedAt = Date.now();
    try {
      const customer_id = getCustomerIdFromAuth();
      const topicClean = topic.trim();
      const keywordsClean = keywords.trim();

      if (!topicClean) {
        throw new Error("Please enter a topic.");
      }

      const body: any = {
        customer_id,
        prompt_for: CONTEXT,        // 'topic'
        topic: topicClean,
        keywords: keywordsClean || undefined, // optional
        reset: true,
      };

      // Backend endpoint that handles contentless topic/keywords start
      const res = await fetch(`${API_BASE_URL}/generate-contents/topictocontent`, {
        method: "POST",
        headers: { ...baseJsonHeaders, ...authHeader() },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        let msg = "Failed to start generation.";
        try {
          const j = await res.json();
          msg = (j as any)?.message || msg;
        } catch {
          msg = (await res.text()) || msg;
        }
        throw new Error(msg);
      }

      const json = (await res.json()) as StartResponse; // { id, message, outputs }
      setOut(json.outputs || {});

      // capture id
      let newId: number | null = null;
      if (json.id !== undefined && json.id !== null) {
        const n = Number(json.id);
        newId = Number.isNaN(n) ? null : n;
        setGenId(newId);
      }

      // grab the script returned by start (to eliminate timing issues)
      const scriptFromStart = (json.outputs?.video_script ?? "").trim();

      // === 1) Generate Image
      if (newId) {
        await generateImageForId(customer_id, newId);
      }

      // === 2) Immediately Generate Video (only if we have an id and a script)
      if (newId && scriptFromStart.length > 0) {
        await generateVideoForId(customer_id, newId, scriptFromStart);
      }
    } catch (e: any) {
      setErr(e?.message || "Something went wrong.");
    } finally {
      const duration = Date.now() - startedAt;
      setLastDurationMs(duration);
      setLoading(false);
    }
  }

  const handleGoNext = () => {
    if (!genId) return;
    // /customer/topic/view/:id
    navigate(`/customer/${CONTEXT}/view/${genId}`);
  };

  // Shared readiness gate for "Click Here" and "Next"
  const canProceed = !!genId && !loading && !imgGenLoading && !vidGenLoading;

  const titleNoun = titleCase(CONTEXT);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center py-10 px-4">
      {/* Title */}
      <h1 className="text-xl font-semibold mb-6">
        Toma <span className="font-bold">{titleNoun}</span> Automation
      </h1>

      <div className="relative w-full max-w-6xl">
        {isBusy && (
          <div
            className="absolute inset-0 z-10 bg-transparent cursor-not-allowed"
            style={{ pointerEvents: "auto" }}
            aria-hidden="true"
          />
        )}

        <div className={`space-y-6 ${isBusy ? "opacity-60" : ""}`} aria-busy={isBusy}>
          {/* ======= INPUTS: Topic (textarea) + Keywords ======= */}
          <div className="grid md:grid-cols-3 gap-4 items-start">
            <textarea
              placeholder="Enter topic (required)…"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              rows={2}
              className="md:col-span-2 h-40 border border-gray-300 rounded-md px-4 py-3 outline-none focus:ring-2 focus:ring-teal-400 resize-y leading-relaxed"
              spellCheck
            />
            <button
              onClick={handleStartFromContext}
              disabled={loading}
              className="h-12 bg-teal-500 text-white rounded-md hover:bg-teal-600 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    ></path>
                  </svg>
                  <span>Generating… {formatDuration(elapsedMs)}</span>
                </>
              ) : (
                "Start"
              )}
            </button>
          </div>

          <input
            type="text"
            placeholder="Keywords (comma-separated, optional)"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            className="h-12 border border-gray-300 rounded-md px-4 outline-none focus:ring-2 focus:ring-teal-400 w-full"
          />

          {/* chips */}
          <div className="flex flex-wrap items-center gap-3 text-sm">
            {loading && (
              <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                <span className="h-2.5 w-2.5 rounded-full bg-teal-500 animate-pulse" />
                Running • {formatDuration(elapsedMs)}
              </span>
            )}
            {imgGenLoading && (
              <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />
                Generating image…
              </span>
            )}
            {imgGenErr && !imgGenLoading && (
              <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-red-50 text-red-700 border border-red-200">
                Image error: {imgGenErr}
              </span>
            )}
            {vidGenLoading && (
              <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                <span className="h-2.5 w-2.5 rounded-full bg-indigo-500 animate-pulse" />
                Generating video…
              </span>
            )}
            {vidGenErr && !vidGenLoading && (
              <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-red-50 text-red-700 border border-red-200">
                Video error: {vidGenErr}
              </span>
            )}
            {lastDurationMs !== null && !loading && (
              <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-gray-50 text-gray-700 border border-gray-200">
                Last run: {formatDuration(lastDurationMs)}
              </span>
            )}
            {genId && !loading && (
              <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                Created ID: {genId}
              </span>
            )}
            <span className="text-gray-500">Typical: about 2–5 minutes.</span>
          </div>

          {err && (
            <div className="text-red-600 text-sm border border-red-200 bg-red-50 rounded p-3">
              {err}
            </div>
          )}

          {/* layout */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="md:col-span-2 grid sm:grid-cols-2 gap-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg h-64 p-4 overflow-auto">
                <div className="text-xs font-semibold text-gray-500 mb-2">Summary</div>
                <div className="text-sm text-gray-800 whitespace-pre-wrap">
                  {out.summary || "Summary Output Goes Here"}
                </div>
              </div>
              <div className="border-2 border-dashed border-gray-300 rounded-lg h-64 p-4 overflow-auto">
                <div className="text-xs font-semibold text-gray-500 mb-2">Video Script</div>
                <div className="text-sm text-gray-800 whitespace-pre-wrap">
                  {out.video_script || "Video Script Output Goes Here"}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <a
                href={out.image_url || "#"}
                target="_blank"
                rel="noreferrer"
                className="block w-full bg-white border border-gray-300 rounded-md py-3 px-4 text-center shadow-sm hover:bg-gray-50"
              >
                <div className="text-gray-700 font-medium">
                  {out.image_url ? "Open Generated Image" : "Image Output URL Here"}
                </div>
                <div className="text-xs text-blue-600">
                  {out.image_url ? "Click to view/download image" : "Click URL link to see image"}
                </div>
              </a>

              {out.image_url && (
                <div className="w-full border border-gray-200 rounded-md p-2">
                  <img src={out.image_url} alt="Generated preview" className="w-full h-auto rounded" />
                </div>
              )}

              <p className="text-[11px] text-gray-500 pl-1 text-center">
                **it 4 or 5 min to produce the video**
              </p>
            </div>
          </div>

          {/* Action row with clickable "Click Here" */}
          <div className="flex items-center gap-3">
            <p className="text-sm text-gray-800">
              <span className="font-semibold">
                {canProceed ? (
                  <button
                    onClick={handleGoNext}
                    className="text-teal-600 underline hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-teal-400 rounded"
                    role="link"
                  >
                    Click Here
                  </button>
                ) : (
                  <span
                    className="text-gray-400 underline decoration-dotted cursor-not-allowed"
                    aria-disabled="true"
                    title="Generate content first to enable"
                  >
                    Click Here
                  </span>
                )}
              </span>{" "}
              or Click Next to see and edit social media output, while you wait for the video to finish being built.
            </p>

            <button
              onClick={handleGoNext}
              disabled={!canProceed}
              className="ml-auto bg-teal-500 text-white px-8 py-2 rounded-md hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed"
              title={!genId ? "Generate content first to get an ID" : "Go to details"}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {isBusy && (
        <div className="fixed bottom-4 right-4 bg-white border border-teal-200 text-teal-700 px-3 py-2 rounded shadow">
          Running • {formatDuration(elapsedMs)}
        </div>
      )}
    </div>
  );
}
