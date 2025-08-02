"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { FiUpload } from "react-icons/fi";

const mediaList = [
  "https://cdn.fastly.steamstatic.com/steamcommunity/public/images/items/269670/48903f878d401cc8cae3852df7c045667edcb5c3.jpg",
  "https://cdn.fastly.steamstatic.com/steamcommunity/public/images/items/1239690/09c56c4e74c711142f8a4c26a3441c7580c60a43.webm",
];

function getMediaType(url) {
  return url.endsWith(".webm") || url.endsWith(".mp4") ? "video" : "image";
}

export default function SteamCropper() {
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaType, setMediaType] = useState("image");
  const fileInputRef = useRef(null);

  useEffect(() => {
    const random = mediaList[Math.floor(Math.random() * mediaList.length)];
    setMediaUrl(random);
    setMediaType(getMediaType(random));
  }, []);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setMediaUrl(url);
    setMediaType(file.type.startsWith("video") ? "video" : "image");
  };

  return (
    <div className="relative min-h-screen bg-[#0a0a0a] text-white overflow-hidden font-sans">
      <div className="absolute inset-0 z-0">
        {mediaType === "image" ? (
          <Image
            src={mediaUrl}
            alt="bg"
            fill
            className="object-cover opacity-40"
          />
        ) : (
          <video
            src={mediaUrl}
            autoPlay
            muted
            loop
            className="w-full h-full object-cover opacity-40"
          />
        )}
      </div>

      <div className="relative z-10 p-8 flex gap-6 max-w-6xl mx-auto bg-[rgba(0,0,0,0.4)]">
        <div className="flex-1">
          <div className="flex gap-4">
            <div className="bg-transparent h-36 w-36 p-4 rounded  border-2 border-cyan-500"></div>

            <div className="flex-1">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-semibold">Background Cropper</h1>
                  <div className="text-gray-400 text-sm">Ver. 1.1</div>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-4">
                <input
                  className="bg-[#181f2a] border border-[#222c38] text-gray-300 px-3 py-2 rounded w-full"
                  placeholder="Paste image or video URL"
                  value={mediaUrl}
                  onChange={(e) => {
                    setMediaUrl(e.target.value);
                    setMediaType(getMediaType(e.target.value));
                  }}
                />
                <button
                  className="bg-[#181f2a] text-gray-300 px-3 py-3 rounded"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FiUpload />
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>

              <div className="flex gap-2 mb-4">
                <button className="p-2 bg-[#181f2a] border border-[#222c38] text-gray-300 rounded">
                  ▣
                </button>
                <button className="p-2 bg-[#181f2a] border border-[#222c38] text-gray-300 rounded">
                  ▬
                </button>
                <button className="p-2 bg-[#181f2a] border border-[#222c38] text-gray-300 rounded">
                  ▮
                </button>
              </div>
            </div>
          </div>

          <div className=" bg-transparent rounded overflow-hidden border border-cyan-600 w-full max-w-4xl h-[500px] flex items-center justify-center">

            {/* {mediaType === 'image' ? (
              <Image
                src={mediaUrl}
                alt="preview"
                width={960}
                height={540}
                className="object-contain max-h-full max-w-full"
              />
            ) : (
              <video
                src={mediaUrl}
                autoPlay
                loop
                muted
                controls
                className="max-w-full max-h-full object-contain"
              />
            )} */}
          </div>
        </div>

        <div className="w-[320px] flex flex-col gap-4">
          <div className="flex items-center space-x-2">
            <span className="text-white text-3xl">Level</span>
            <div className="bg-cyan-500 rounded-full w-8 h-8 flex items-center justify-center font-bold">
              10
            </div>
          </div>
          <div className="bg-[#181f2a] flex items-center gap-3 p-4 rounded border border-[#222c38]">
            <Image
              src="https://steamartworkhub.com/cdn/img/ah_emblem_1.svg?lBHQ6l%2B0I4T6QNHRylqZP068%2FLoAuYaD"
              alt="badge"
              width={40}
              height={40}
            />
            <div>
              <div className="mt-2 text-white text-sm">Artwork Hub</div>
              <div className="text-gray-300 text-xs">500 XP</div>
            </div>
          </div>

          <div className="flex gap-2">
            <button className="bg-[#222c38] text-gray-300 px-4 py-2 rounded text-md">
              Settings
            </button>
            <button className="bg-[#0ecfff] text-black px-4 py-2 rounded text-md font-bold">
              Export
            </button>
          </div>

          <div className="flex flex-col gap-2 bg-[rgba(0,0,0,0.6)] p-3">
            <button className="bg-[#0ecfff] text-black font-bold py-2 rounded hover:bg-[#0bb8d6]">
              Donate
            </button>
            <button className="bg-[#101822] text-gray-300 py-2 rounded border border-[#222c38]">
              Profile Backgrounds
            </button>
            <button className="bg-[#101822] text-gray-300 py-2 rounded border border-[#222c38]">
              Upload Codes
            </button>
            <button className="bg-[#101822] text-gray-300 py-2 rounded border border-[#222c38]">
              Changelog
            </button>

            <div className="border-2 mt-2 border-cyan-400 rounded overflow-hidden">
              <video
                src="/ver.webm"
                autoPlay
                loop
                muted
                width={320}
                height={350}
                className="object-cover w-full"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
