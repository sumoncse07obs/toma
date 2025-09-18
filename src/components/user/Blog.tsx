import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Blog() {
  const [blogUrl, setBlogUrl] = useState("");
  const [imgSrcUrl, setImgSrcUrl] = useState("");
  const [vidSrcUrl, setVidSrcUrl] = useState("");

  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white flex flex-col items-center py-10 px-4">
      {/* Title */}
      <h1 className="text-xl font-semibold mb-6">
        Toma <span className="font-bold">Blog</span> Automation
      </h1>

      <div className="w-full max-w-6xl space-y-6">
        {/* ROW 1: Blog URL (left 2 cols) + Start (right 1 col) */}
        <div className="grid md:grid-cols-3 gap-4 items-stretch">
          <input
            type="text"
            placeholder="Put Blog Url Here"
            value={blogUrl}
            onChange={(e) => setBlogUrl(e.target.value)}
            className="md:col-span-2 h-12 border border-gray-300 rounded-md px-4 outline-none focus:ring-2 focus:ring-teal-400"
          />
          <button className="h-12 bg-teal-500 text-white rounded-md hover:bg-teal-600">
            Start
          </button>
        </div>

        {/* ROW 2: Left two dashed boxes, right output links + note */}
        <div className="grid md:grid-cols-3 gap-4">
          {/* left 2 cols = two dashed cards */}
          <div className="md:col-span-2 grid sm:grid-cols-2 gap-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg h-64 flex items-center justify-center text-gray-500">
              Summary Out Put Goes Here
            </div>
            <div className="border-2 border-dashed border-gray-300 rounded-lg h-64 flex items-center justify-center text-gray-500">
              Video Script Out Put Goes Here
            </div>
          </div>

          {/* right column */}
          <div className="space-y-4">
            <button className="w-full bg-white border border-gray-300 rounded-md py-3 px-4 text-center shadow-sm hover:bg-gray-50">
              <div className="text-gray-700 font-medium">Image OutPut Url Here</div>
              <div className="text-xs text-blue-600">Click URL link to see image</div>
            </button>
            <button className="w-full bg-white border border-gray-300 rounded-md py-3 px-4 text-center shadow-sm hover:bg-gray-50">
              <div className="text-gray-700 font-medium">Video OutPut Url Here</div>
              <div className="text-xs text-blue-600">Click URL link to see video</div>
            </button>
            <p className="text-[11px] text-gray-500 pl-1 text-center">
              **it 4 or 5 min to produce the video**
            </p>
          </div>
        </div>

        {/* ROW 3: centered note */}
        <p className="text-[13px] text-gray-600 text-center max-w-3xl mx-auto leading-snug">
          If You Do Not Like The Image Output, You Can Upload Your Own To Your GoHighlevel account,
          in the media section.
        </p>

        {/* ROW 4: Left two inputs+Start; right output links + note */}
        <div className="grid md:grid-cols-3 gap-4 items-start">
          {/* left side */}
          <div className="md:col-span-2 flex flex-col gap-4">
            {/* image source */}
            <div className="grid grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="Put Source URL (Image) Here"
                value={imgSrcUrl}
                onChange={(e) => setImgSrcUrl(e.target.value)}
                className="col-span-2 h-12 border border-gray-300 rounded-md px-4 outline-none focus:ring-2 focus:ring-teal-400"
              />
              <button className="h-12 bg-teal-500 text-white rounded-md hover:bg-teal-600">
                Start
              </button>
            </div>

            {/* video source */}
            <div className="grid grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="Put Source URL (Video) Here"
                value={vidSrcUrl}
                onChange={(e) => setVidSrcUrl(e.target.value)}
                className="col-span-2 h-12 border border-gray-300 rounded-md px-4 outline-none focus:ring-2 focus:ring-teal-400"
              />
              <button className="h-12 bg-teal-500 text-white rounded-md hover:bg-teal-600">
                Start
              </button>
            </div>
          </div>

          {/* right side */}
          <div className="space-y-4">
            <button className="w-full bg-white border border-gray-300 rounded-md py-1 px-4 text-center shadow-sm hover:bg-gray-50">
              <div className="text-gray-700 font-medium">Image OutPut Url Here</div>
              <div className="text-xs text-blue-600">Click URL link to see image</div>
            </button>
            <button className="w-full bg-white border border-gray-300 rounded-md py-1 px-4 text-center shadow-sm hover:bg-gray-50">
              <div className="text-gray-700 font-medium">Video OutPut Url Here</div>
              <div className="text-xs text-blue-600">Click URL link to see video</div>
            </button>
            <p className="text-[11px] text-gray-500 pl-1 text-center">
              **it 4 or 5 min to produce the video**
            </p>
          </div>
        </div>

        {/* ROW 5: Next button aligned right */}
        <div className="flex">
          <button
            onClick={() => navigate("/dashboard/blog/post")}
            className="ml-auto bg-teal-500 text-white px-8 py-2 rounded-md hover:bg-teal-600"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
