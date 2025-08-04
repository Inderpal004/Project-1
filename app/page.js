'use client';

import { useEffect, useRef, useState } from "react";
import JSZip from "jszip";
import { FiUpload } from "react-icons/fi";

const mediaList = [
  "https://images.unsplash.com/photo-1526779259212-939e64788e3c?fm=jpg&q=60&w=3000&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8ZnJlZSUyMGltYWdlc3xlbnwwfHwwfHx8MA%3D%3D",
  "https://cdn.fastly.steamstatic.com/steamcommunity/public/images/items/1239690/09c56c4e74c711142f8a4c26a3441c7580c60a43.webm",
];

function getMediaType(url) {
  return url.endsWith(".webm") || url.endsWith(".mp4") ? "video" : "image";
}

export default function SteamCropper() {
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaType, setMediaType] = useState("image");
  const [layout, setLayout] = useState("single");
  const fileInputRef = useRef(null);
  const canvasRefs = useRef([]);
  const mediaRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mediaLoaded, setMediaLoaded] = useState(false);
  const animationFrameRef = useRef(null);

  useEffect(() => {
    const random = mediaList[Math.floor(Math.random() * mediaList.length)];
    setMediaUrl(random);
    setMediaType(getMediaType(random));
  }, []);

  const drawMediaToCanvas = (canvas, sourceX, sourceY, sourceWidth, sourceHeight, destWidth, destHeight) => {
    if (!mediaRef.current || !mediaLoaded) return;
    
    const ctx = canvas.getContext("2d");
    canvas.width = destWidth;
    canvas.height = destHeight;
    ctx.clearRect(0, 0, destWidth, destHeight);
    
    ctx.drawImage(
      mediaRef.current,
      sourceX, sourceY, sourceWidth, sourceHeight,
      0, 0, destWidth, destHeight
    );
  };

  const updateCanvases = () => {
    if (!mediaRef.current || !mediaLoaded) return;

    const mediaWidth = mediaRef.current.videoWidth || mediaRef.current.naturalWidth || mediaRef.current.width;
    const mediaHeight = mediaRef.current.videoHeight || mediaRef.current.naturalHeight || mediaRef.current.height;
    
    if (!mediaWidth || !mediaHeight) return;

    canvasRefs.current.forEach((canvas, i) => {
      if (!canvas) return;

      switch (layout) {
        case "single":
          drawMediaToCanvas(canvas, 0, 0, mediaWidth, mediaHeight, 616, 353);
          break;
          
        case "split":
          if (i === 0) {
            const mainWidth = Math.floor(mediaWidth * 0.8);
            drawMediaToCanvas(canvas, 0, 0, mainWidth, mediaHeight, 493, 353);
          } else if (i === 1) {
            const mainWidth = Math.floor(mediaWidth * 0.8);
            const rightWidth = mediaWidth - mainWidth;
            drawMediaToCanvas(canvas, mainWidth, 0, rightWidth, mediaHeight, 123, 353);
          }
          break;
          
        case "five":
          const sliceWidth = Math.floor(mediaWidth / 5);
          drawMediaToCanvas(
            canvas, 
            sliceWidth * i, 0, sliceWidth, mediaHeight,
            123, 353
          );
          break;
      }
    });

    if (mediaType === "video" && mediaRef.current && !mediaRef.current.paused) {
      animationFrameRef.current = requestAnimationFrame(updateCanvases);
    }
  };

  useEffect(() => {
    if (mediaLoaded) {
      updateCanvases();
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [mediaUrl, layout, mediaType, mediaLoaded]);

  const handleMediaLoad = () => {
    setMediaLoaded(true);
    setIsLoading(false);
    
    if (mediaType === "video" && mediaRef.current) {
      mediaRef.current.play().then(() => {
        setTimeout(updateCanvases, 100);
      }).catch(console.error);
    } else {
      setTimeout(updateCanvases, 100);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    const url = URL.createObjectURL(file);
    setMediaUrl(url);
    setMediaType(file.type.startsWith("video") ? "video" : "image");
    setMediaLoaded(false);
  };

  const handleExport = async () => {
    if (!mediaLoaded || !mediaRef.current) return;
    
    if (mediaType === "video") {
  
      updateCanvases();
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const zip = new JSZip();
    
    const getCanvasCount = () => {
      switch (layout) {
        case "single": return 1;
        case "split": return 2;
        case "five": return 5;
        default: return 1;
      }
    };

    const getFileName = (index) => {
      switch (layout) {
        case "single": return "myworkshop_main.png";
        case "split": return index === 0 ? "myworkshop_main.png" : "myworkshop_right.png";
        case "five": return `myworkshop_row1_col${index + 1}.png`;
        default: return `part_${index + 1}.png`;
      }
    };

    const canvasCount = getCanvasCount();
    
    for (let i = 0; i < canvasCount; i++) {
      const canvas = canvasRefs.current[i];
      if (!canvas) continue;

      const blob = await new Promise((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/png")
      );

      if (blob) {
        zip.file(getFileName(i), blob);
      }
    }

    const content = await zip.generateAsync({ type: "blob" });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = "steam_background_parts.zip";
    link.click();
  };

  const renderCanvases = () => {
    switch (layout) {
      case "single":
        return (
          <canvas
            ref={(el) => (canvasRefs.current[0] = el)}
            className="w-full h-full border border-cyan-500"
          />
        );
      case "split":
        return (
          <div className="flex gap-1 w-full h-full">
            <canvas
              ref={(el) => (canvasRefs.current[0] = el)}
              className="h-full border border-cyan-500"
              style={{ width: "80%" }}
            />
            <canvas
              ref={(el) => (canvasRefs.current[1] = el)}
              className="h-full border border-cyan-500"
              style={{ width: "20%" }}
            />
          </div>
        );
      case "five":
        return (
          <div className="flex gap-1 w-full h-full">
            {[...Array(5)].map((_, i) => (
              <canvas
                key={i}
                ref={(el) => (canvasRefs.current[i] = el)}
                className="h-full border border-cyan-500"
                style={{ width: "20%" }}
              />
            ))}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="relative min-h-screen bg-[#0a0a0a] text-white overflow-hidden font-sans">
      {isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-cyan-400 border-solid"></div>
        </div>
      )}

      {mediaType === "image" ? (
        <img
          ref={mediaRef}
          src={mediaUrl}
          alt=""
          className="hidden"
          onLoad={handleMediaLoad}
          crossOrigin="anonymous"
        />
      ) : (
        <video
          ref={mediaRef}
          src={mediaUrl}
          className="hidden"
          onLoadedData={handleMediaLoad}
          crossOrigin="anonymous"
          muted
          loop
          playsInline
        />
      )}

      <div className="absolute inset-0 z-0">
        {mediaType === "image" ? (
          <div
            className="w-full h-full opacity-40"
            style={{
              backgroundImage: `url(${mediaUrl})`,
              backgroundRepeat: "repeat",
              backgroundSize: "auto"
            }}
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

      <div className="relative z-10 p-8 flex gap-6 max-w-7xl mx-auto bg-[rgba(0,0,0,0.4)]">
        <div className="flex-1">
          <div className="flex gap-4 mb-6">
            <div className="bg-transparent h-44 w-44 p-4 rounded border-2 border-cyan-500"></div>

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
       
                    if (animationFrameRef.current) {
                      cancelAnimationFrame(animationFrameRef.current);
                    }
                    setMediaUrl(e.target.value);
                    setMediaType(getMediaType(e.target.value));
                    setMediaLoaded(false);
                  }}
                />
                <button
                  className="bg-[#181f2a] text-gray-300 px-3 py-3 rounded hover:bg-[#222c38]"
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
                <button
                  className={`p-2 bg-[#181f2a] border border-[#222c38] text-gray-300 rounded hover:bg-[#222c38] ${
                    layout === "single" ? "border-cyan-400" : ""
                  }`}
                  onClick={() => setLayout("single")}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <rect x="6" y="6" width="12" height="12" stroke="currentColor" strokeWidth="2" fill="none" />
                  </svg>
                </button>
                <button
                  className={`p-2 bg-[#181f2a] border border-[#222c38] text-gray-300 rounded hover:bg-[#222c38] ${
                    layout === "split" ? "border-cyan-400" : ""
                  }`}
                  onClick={() => setLayout("split")}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <rect x="5" y="6" width="10" height="12" stroke="currentColor" strokeWidth="2" fill="none" />
                    <rect x="9" y="6" width="10" height="12" stroke="currentColor" strokeWidth="2" fill="none" />
                  </svg>
                </button>
                <button
                  className={`p-2 bg-[#181f2a] border border-[#222c38] text-gray-300 rounded hover:bg-[#222c38] ${
                    layout === "five" ? "border-cyan-400" : ""
                  }`}
                  onClick={() => setLayout("five")}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <rect x="4" y="6" width="2" height="12" fill="currentColor" />
                    <rect x="7" y="6" width="2" height="12" fill="currentColor" />
                    <rect x="10" y="6" width="2" height="12" fill="currentColor" />
                    <rect x="13" y="6" width="2" height="12" fill="currentColor" />
                    <rect x="16" y="6" width="2" height="12" fill="currentColor" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <div className="bg-[rgba(0,0,0,0.3)] backdrop-blur-sm rounded border border-cyan-600 w-full h-[80vh] flex items-center justify-center p-4">
            {renderCanvases()}
          </div>
        </div>

        <div className="w-[320px] flex flex-col gap-4">
          <div className="flex items-center space-x-2">
            <span className="text-white text-3xl">Level</span>
            <div className="bg-cyan-500 rounded-full w-8 h-8 flex items-center justify-center font-bold text-black">
              10
            </div>
          </div>

          <div className="bg-[#181f2a] flex items-center gap-3 p-4 rounded border border-[#222c38]">
             <img
              src="https://steamartworkhub.com/cdn/img/ah_emblem_1.svg?lBHQ6l%2B0I4T6QNHRylqZP068%2FLoAuYaD"
              alt="badge"
              width={40}
              height={40}
            />
            <div>
              <div className="text-white text-sm">Artwork Hub</div>
              <div className="text-gray-300 text-xs">500 XP</div>
            </div>
          </div>

          <div className="flex gap-2">
            <button className="bg-[#222c38] text-gray-300 px-4 py-2 rounded text-sm hover:bg-[#2a3441]">
              Settings
            </button>
            <button
              className="bg-[#0ecfff] text-black px-4 py-2 rounded text-sm font-bold hover:bg-[#0bb8d6] disabled:opacity-50"
              onClick={handleExport}
              disabled={!mediaLoaded}
            >
              Export
            </button>
          </div>

          <div className="flex flex-col gap-2 bg-[rgba(0,0,0,0.6)] p-3 rounded">
            <button className="bg-[#0ecfff] text-black font-bold py-2 rounded hover:bg-[#0bb8d6]">
              Donate
            </button>
            <button className="bg-[#101822] text-gray-300 py-2 rounded border border-[#222c38] hover:bg-[#1a2332]">
              Profile Backgrounds
            </button>
            <button className="bg-[#101822] text-gray-300 py-2 rounded border border-[#222c38] hover:bg-[#1a2332]">
              Upload Codes
            </button>
            <button className="bg-[#101822] text-gray-300 py-2 rounded border border-[#222c38] hover:bg-[#1a2332]">
              Changelog
            </button>

            {/* <div className="border-2 mt-2 border-cyan-400 rounded overflow-hidden">
              <div className="w-full h-48 bg-gradient-to-br from-red-900 to-red-600 flex items-center justify-center">
                <span className="text-white font-bold">Preview Video</span>
              </div>
            </div> */}

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