// src/components/tools/PostToBlotato.tsx
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";

const TOKEN_KEY = "toma_token";

// 👉 Set VITE_API_BASE in Vercel (e.g. https://api.yourdomain.com)
const API_HOST = String(import.meta.env.VITE_API_BASE || "").replace(/\/+$/, "");
const API = `${API_HOST}/api`;

function norm(path: string) {
  if (!path.startsWith("/")) path = `/${path}`;
  return `${API}${path}`.replace(/([^:]\/)\/+/g, "$1");
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const url = norm(path);
  const token = localStorage.getItem(TOKEN_KEY);

  const res = await fetch(url, {
    method: init?.method || "GET",
    mode: "cors",                         // make intent explicit
    // credentials: "include",            // uncomment only if you use cookies/Sanctum
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
    ...init,
  });

  // If the request was blocked by CORS, fetch throws before here with TypeError.
  if (!res.ok) {
    // Try to read text for better diagnostics
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText} @ ${url}\n${text}`);
  }

  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    // Support 204, or file responses
    return undefined as T;
  }
  return (await res.json()) as T;
}


export default function PostToBlotato() {
  const { id } = useParams(); // /blog/posttoblotato/:id
  const generationId = id ? parseInt(id, 10) : undefined;

  // Inputs
  const [imgSrc, setImgSrc] = useState("");
  const [vidSrc, setVidSrc] = useState("");

  // Posting flags
  const [imgPosting, setImgPosting] = useState(false);
  const [vidPosting, setVidPosting] = useState(false);

  // Done flags (disable Start after success until input changes)
  const [imgDone, setImgDone] = useState(false);
  const [vidDone, setVidDone] = useState(false);

  // Outputs
  const [imgOut, setImgOut] = useState<string | null>(null);
  const [vidOut, setVidOut] = useState<string | null>(null);

  // Errors
  const [imgErr, setImgErr] = useState<string | null>(null);
  const [vidErr, setVidErr] = useState<string | null>(null);

  // Re-enable Start when user edits input
  useEffect(() => {
    setImgDone(false);
    setImgOut(null);
    setImgErr(null);
  }, [imgSrc]);

  useEffect(() => {
    setVidDone(false);
    setVidOut(null);
    setVidErr(null);
  }, [vidSrc]);

  async function handleUpload(kind: "image" | "video") {
    const val = (kind === "image" ? imgSrc : vidSrc).trim();
    if (!val || !generationId) return;

    const setPosting = kind === "image" ? setImgPosting : setVidPosting;
    const setOut = kind === "image" ? setImgOut : setVidOut;
    const setErr = kind === "image" ? setImgErr : setVidErr;
    const setDone = kind === "image" ? setImgDone : setVidDone;

    try {
      setPosting(true);
      setOut(null);
      setErr(null);
      setDone(false);

      const json = await api<{ url?: string; data?: { url?: string }; message?: string }>(
        "/blotato/media",
        {
          method: "POST",
          body: JSON.stringify({
            url: val,
            kind, // "image" | "video"
            generation_id: generationId,
          }),
        }
      );

      const hosted = json?.url || json?.data?.url;
      if (!hosted) {
        const msg = json?.message || "No URL returned from server.";
        setErr(msg);
        toast.error(msg);
        return;
      }

      setOut(hosted);
      setDone(true);
      toast.success(`${kind === "image" ? "Image" : "Video"} uploaded successfully!`);
    } catch (e: any) {
        const isCorsBlock = e?.name === "TypeError" && /fetch/i.test(String(e?.message || ""));
        const msg = isCorsBlock
          ? "Upload failed due to a CORS block. The API must allow this origin."
          : (e?.message || `Failed to upload ${kind}.`);
        setErr(msg);
        toast.error(msg);
    } finally {
      setPosting(false);
    }
  }

  const imgButtonDisabled =
    !imgSrc.trim() || imgPosting || !generationId || imgDone;
  const vidButtonDisabled =
    !vidSrc.trim() || vidPosting || !generationId || vidDone;

  return (
    <div className="p-4 md:p-6">
      {!generationId && (
        <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-3">
          Missing content generation id in URL. Open this page via <code>/blog/posttoblotato/:id</code>.
        </div>
      )}

      <p className="text-[13px] text-gray-600 text-center max-w-3xl mx-auto leading-snug">
        If You Do Not Like The Image Output, You Can Upload Your Own To Your GoHighlevel account, in the media section.
      </p>

      <div className="grid md:grid-cols-3 gap-4 items-start mt-4">
        <div className="md:col-span-2 flex flex-col gap-4">
          {/* IMAGE */}
          <div className="grid grid-cols-3 gap-3">
            <input
              placeholder="Put Source URL (Image) Here"
              className="col-span-2 h-12 border border-gray-300 rounded-md px-4 outline-none focus:ring-2 focus:ring-teal-400"
              type="text"
              value={imgSrc}
              onChange={(e) => setImgSrc(e.target.value)}
            />
            <button
              className={`h-12 rounded-md text-white ${
                imgButtonDisabled
                  ? "bg-teal-400 opacity-60 cursor-not-allowed"
                  : "bg-teal-500 hover:bg-teal-600"
              }`}
              disabled={imgButtonDisabled}
              onClick={() => handleUpload("image")}
              title={!generationId ? "Missing content generation id from URL" : undefined}
            >
              {imgPosting ? "Posting…" : imgDone ? "Done" : "Start"}
            </button>
          </div>
          {imgErr && <div className="text-xs text-red-600 px-1">{imgErr}</div>}

          {/* VIDEO */}
          <div className="grid grid-cols-3 gap-3">
            <input
              placeholder="Put Source URL (Video) Here"
              className="col-span-2 h-12 border border-gray-300 rounded-md px-4 outline-none focus:ring-2 focus:ring-teal-400"
              type="text"
              value={vidSrc}
              onChange={(e) => setVidSrc(e.target.value)}
            />
            <button
              className={`h-12 rounded-md text-white ${
                vidButtonDisabled
                  ? "bg-teal-400 opacity-60 cursor-not-allowed" // ✅ fixed typo
                  : "bg-teal-500 hover:bg-teal-600"
              }`}
              disabled={vidButtonDisabled}
              onClick={() => handleUpload("video")}
              title={!generationId ? "Missing content generation id from URL" : undefined}
            >
              {vidPosting ? "Posting…" : vidDone ? "Done" : "Start"}
            </button>
          </div>
          {vidErr && <div className="text-xs text-red-600 px-1">{vidErr}</div>}
        </div>

        <div className="space-y-4">
          {/* IMAGE OUTPUT */}
          {imgOut ? (
            <a
              href={imgOut}
              target="_blank"
              rel="noreferrer"
              className="block w-full bg-white border border-gray-300 rounded-md py-1 px-4 text-center shadow-sm hover:bg-gray-50"
              title={imgOut}
            >
              <div className="text-gray-700 font-medium break-all">Image Output Url</div>
              <div className="text-xs text-blue-600">Click URL link to see image</div>
            </a>
          ) : (
            <button className="w-full bg-white border border-gray-300 rounded-md py-1 px-4 text-center shadow-sm" disabled>
              <div className="text-gray-700 font-medium">Image OutPut Url Here</div>
              <div className="text-xs text-blue-600">Click URL link to see image</div>
            </button>
          )}

          {/* VIDEO OUTPUT */}
          {vidOut ? (
            <a
              href={vidOut}
              target="_blank"
              rel="noreferrer"
              className="block w-full bg-white border border-gray-300 rounded-md py-1 px-4 text-center shadow-sm hover:bg-gray-50"
              title={vidOut}
            >
              <div className="text-gray-700 font-medium break-all">Video Output Url</div>
              <div className="text-xs text-blue-600">Click URL link to see video</div>
            </a>
          ) : (
            <button className="w-full bg-white border border-gray-300 rounded-md py-1 px-4 text-center shadow-sm" disabled>
              <div className="text-gray-700 font-medium">Video OutPut Url Here</div>
              <div className="text-xs text-blue-600">Click URL link to see video</div>
            </button>
          )}

          <p className="text-[11px] text-gray-500 pl-1 text-center">**it 4 or 5 min to produce the video**</p>
        </div>
      </div>
    </div>
  );
}
