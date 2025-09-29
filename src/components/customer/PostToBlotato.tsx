// src/components/tools/PostToBlotato.tsx
import React, { useState } from "react";
import { useParams } from "react-router-dom";

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
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
    // If you switched to Sanctum cookie auth, also add:
    // credentials: "include",
    ...init,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
  }

  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) return undefined as T;
  return (await res.json()) as T;
}

export default function PostToBlotato() {
  const { id } = useParams(); // /blog/posttoblotato/:id
  const generationId = id ? parseInt(id, 10) : undefined;

  const [imgSrc, setImgSrc] = useState("");
  const [vidSrc, setVidSrc] = useState("");

  const [imgPosting, setImgPosting] = useState(false);
  const [vidPosting, setVidPosting] = useState(false);

  const [imgOut, setImgOut] = useState<string | null>(null);
  const [vidOut, setVidOut] = useState<string | null>(null);

  const [imgErr, setImgErr] = useState<string | null>(null);
  const [vidErr, setVidErr] = useState<string | null>(null);

  async function handleUpload(kind: "image" | "video") {
    const val = (kind === "image" ? imgSrc : vidSrc).trim();
    if (!val || !generationId) return;

    const setPosting = kind === "image" ? setImgPosting : setVidPosting;
    const setOut = kind === "image" ? setImgOut : setVidOut;
    const setErr = kind === "image" ? setImgErr : setVidErr;

    try {
      setPosting(true);
      setOut(null);
      setErr(null);

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
        setErr(json?.message || "No URL returned from server.");
        return;
      }
      setOut(hosted);
    } catch (e: any) {
      setErr(e?.message || "Failed to upload to Blotato.");
    } finally {
      setPosting(false);
    }
  }

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
          <div className="grid grid-cols-3 gap-3">
            <input
              placeholder="Put Source URL (Image) Here"
              className="col-span-2 h-12 border border-gray-300 rounded-md px-4 outline-none focus:ring-2 focus:ring-teal-400"
              type="text"
              value={imgSrc}
              onChange={(e) => setImgSrc(e.target.value)}
            />
            <button
              className="h-12 bg-teal-500 text-white rounded-md hover:bg-teal-600 disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={!imgSrc.trim() || imgPosting || !generationId}
              onClick={() => handleUpload("image")}
              title={!generationId ? "Missing content generation id from URL" : undefined}
            >
              {imgPosting ? "Posting…" : "Start"}
            </button>
          </div>
          {imgErr && <div className="text-xs text-red-600 px-1">{imgErr}</div>}

          <div className="grid grid-cols-3 gap-3">
            <input
              placeholder="Put Source URL (Video) Here"
              className="col-span-2 h-12 border border-gray-300 rounded-md px-4 outline-none focus:ring-2 focus:ring-teal-400"
              type="text"
              value={vidSrc}
              onChange={(e) => setVidSrc(e.target.value)}
            />
            <button
              className="h-12 bg-teal-500 text-white rounded-md hover:bg-teal-600 disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={!vidSrc.trim() || vidPosting || !generationId}
              onClick={() => handleUpload("video")}
              title={!generationId ? "Missing content generation id from URL" : undefined}
            >
              {vidPosting ? "Posting…" : "Start"}
            </button>
          </div>
          {vidErr && <div className="text-xs text-red-600 px-1">{vidErr}</div>}
        </div>

        <div className="space-y-4">
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
            <button className="w-full bg-white border border-gray-300 rounded-md py-1 px-4 text-center shadow-sm hover:bg-gray-50" disabled>
              <div className="text-gray-700 font-medium">Image OutPut Url Here</div>
              <div className="text-xs text-blue-600">Click URL link to see image</div>
            </button>
          )}

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
            <button className="w-full bg-white border border-gray-300 rounded-md py-1 px-4 text-center shadow-sm hover:bg-gray-50" disabled>
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
