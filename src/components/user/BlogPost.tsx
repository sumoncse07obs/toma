// src/components/user/BlogPost.tsx
import React, { useState } from "react";

export default function BlogPost() {
  const [videoUrl, setVideoUrl] = useState("");
  const [title, setTitle] = useState("Title Output Goes Here");
  const [description, setDescription] = useState("Description Output Goes Here");
  const [postType, setPostType] = useState("text");

  const platforms = [
    "Facebook",
    "Instagram",
    "Threads",
    "Twitter/X",
    "Reals",
    "Tick Tok",
    "Linkedin Business",
    "YouTube Short",
    "Linkedin Personal",
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col items-center py-8 px-4">
      {/* Header */}
      <h1 className="text-xl font-semibold mb-4">
        Toma <span className="font-bold">Blog</span> Automation
      </h1>

      <button className="mb-6 bg-teal-500 text-white px-6 py-2 rounded-md hover:bg-teal-600">
        Click Here to Goto Blotato and edit the video
      </button>

      {/* Video URL row */}
      <div className="flex gap-3 items-center w-full max-w-4xl mb-6">
        <label className="text-sm font-medium whitespace-nowrap">
          Put New Video Url Here
        </label>
        <input
          type="text"
          placeholder="Put Updated Video Url Here From Blotato"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          className="flex-1 h-11 border border-gray-300 rounded-md px-4 outline-none focus:ring-2 focus:ring-teal-400"
        />
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl">
        {/* Left: platforms */}
        <div className="space-y-2">
          {platforms.map((p) => (
            <button
              key={p}
              className={`w-full py-2 rounded-md border ${
                p === "Facebook"
                  ? "bg-blue-100 border-blue-400 text-blue-600 font-medium"
                  : "bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Center: Title + Description */}
        <div className="border border-gray-300 rounded-lg p-4 space-y-4">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border-b border-gray-300 text-lg font-semibold outline-none"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={6}
            className="w-full border border-gray-300 rounded-md p-2 text-sm outline-none resize-none"
          />
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
        </div>

        {/* Right: actions */}
        <div className="flex flex-col justify-between space-y-4">
          <button className="w-full bg-orange-500 text-white py-2 rounded-md hover:bg-orange-600">
            Schedule The Post
          </button>
          <button className="w-full bg-teal-500 text-white py-2 rounded-md hover:bg-teal-600">
            Approve
          </button>
        </div>
      </div>
    </div>
  );
}
