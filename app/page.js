"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Upload,
  Download,
  Settings,
  DownloadCloud,
  ChevronDown,
  X,
  Minus,
  Square,
  Star,
} from "lucide-react";
import JSZip from "jszip";

const mediaList = [
  "https://images.unsplash.com/photo-1446776877081-d282a0f896e2?fm=jpg&q=60&w=3000&ixlib=rb-4.1.0",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
];

function getMediaType(url) {
  return url.match(/\.(mp4|webm|mov|avi)$/i) ? "video" : "image";
}

export default function SteamCropper() {
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaType, setMediaType] = useState("image");
  const [layout, setLayout] = useState("single");
  const [isLoading, setIsLoading] = useState(true);
  const [mediaLoaded, setMediaLoaded] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const [settings, setSettings] = useState({
    singleHeight: 353,
    splitMainHeight: 353,
    splitRightHeight: 353,
    fiveRowHeight: 353,
    rowCount: 1,
    row1Height: 646,
    row2Height: 122,
    row3Height: 122,
    displayTitle: true,
    displayStatistics: true,
    matchBackgroundHeight: false,
  });

  const fileInputRef = useRef(null);
  const canvasRefs = useRef([]);
  const mediaRef = useRef(null);
  const backgroundVideoRef = useRef(null);
  const animationFrameRef = useRef(null);

  useEffect(() => {
    const random = mediaList[Math.floor(Math.random() * mediaList.length)];
    setMediaUrl(random);
    setMediaType(getMediaType(random));
  }, []);

  const drawMediaToCanvas = (canvas, sx, sy, sw, sh, dw, dh) => {
    if (!mediaRef.current || !mediaLoaded) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = dw;
    canvas.height = dh;

    ctx.clearRect(0, 0, dw, dh);

    try {
      ctx.drawImage(mediaRef.current, sx, sy, sw, sh, 0, 0, dw, dh);
    } catch (e) {
      console.error("Draw failed", e);
    }
  };

  const updateCanvases = () => {
    if (!mediaRef.current || !mediaLoaded) return;

    const w = mediaRef.current.videoWidth || mediaRef.current.naturalWidth;
    const h = mediaRef.current.videoHeight || mediaRef.current.naturalHeight;
    if (!w || !h) return;

    canvasRefs.current.forEach((canvas, i) => {
      if (!canvas) return;
      switch (layout) {
        case "single":
          drawMediaToCanvas(canvas, 0, 0, w, h, 616, settings.singleHeight);
          break;
        case "split":
          if (i === 0) {
            const mw = Math.floor(w * 0.8);
            drawMediaToCanvas(
              canvas,
              0,
              0,
              mw,
              h,
              493,
              settings.splitMainHeight
            );
          } else {
            const mw = Math.floor(w * 0.8);
            const rw = w - mw;
            drawMediaToCanvas(
              canvas,
              mw,
              0,
              rw,
              h,
              123,
              settings.splitRightHeight
            );
          }
          break;
        case "five":
          const slice = Math.floor(w / 5);
          drawMediaToCanvas(
            canvas,
            i * slice,
            0,
            slice,
            h,
            123,
            settings.fiveRowHeight
          );
          break;
      }
    });

    if (mediaType === "video" && !mediaRef.current.paused) {
      animationFrameRef.current = requestAnimationFrame(updateCanvases);
    }
  };

  useEffect(() => {
    if (mediaLoaded) updateCanvases();
    return () => {
      if (animationFrameRef.current)
        cancelAnimationFrame(animationFrameRef.current);
    };
  }, [mediaUrl, layout, mediaType, mediaLoaded, settings]);

  const handleMediaLoad = () => {
    setMediaLoaded(true);
    setIsLoading(false);

    if (mediaType === "video") {
      const video = mediaRef.current;
      video.currentTime = 0;
      video
        .play()
        .then(() => {
          setTimeout(() => {
            updateCanvases();
            const animate = () => {
              updateCanvases();
              if (!video.paused && !video.ended) {
                animationFrameRef.current = requestAnimationFrame(animate);
              }
            };
            animate();
          }, 100);
        })
        .catch(console.error);
    } else {
      setTimeout(updateCanvases, 100);
    }
  };

  const handleMediaError = () => {
    console.error("Media failed to load");
    setIsLoading(false);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (animationFrameRef.current)
      cancelAnimationFrame(animationFrameRef.current);
    const url = URL.createObjectURL(file);
    setMediaUrl(url);
    setMediaType(file.type.startsWith("video") ? "video" : "image");
    setMediaLoaded(false);
    setIsLoading(true);
  };

  const handleUrlChange = (url) => {
    if (animationFrameRef.current)
      cancelAnimationFrame(animationFrameRef.current);
    setMediaUrl(url);
    setMediaType(getMediaType(url));
    setMediaLoaded(false);
    setIsLoading(true);
  };

  const handleSettingChange = (key, value) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const matchBackgroundHeight = () => {
    if (!mediaRef.current || !mediaLoaded) return;
    const h = mediaRef.current.videoHeight || mediaRef.current.naturalHeight;
    if (!h) return;

    const w = mediaRef.current.videoWidth || mediaRef.current.naturalWidth;
    const aspectRatio = h / w;

    const singleHeight = Math.round(616 * aspectRatio);
    const splitMainHeight = Math.round(493 * aspectRatio);
    const splitRightHeight = Math.round(123 * aspectRatio);
    const fiveHeight = Math.round(123 * aspectRatio);

    setSettings((prev) => ({
      ...prev,
      singleHeight: singleHeight,
      splitMainHeight: splitMainHeight,
      splitRightHeight: splitRightHeight,
      fiveRowHeight: fiveHeight,
      row1Height: singleHeight,
      row2Height: Math.round(singleHeight * 0.2),
      row3Height: Math.round(singleHeight * 0.2),
    }));
  };

  const recordCanvasToVideo = (canvas, duration = 5000, fps = 30) => {
    return new Promise((resolve, reject) => {
      const stream = canvas.captureStream(fps);
      const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
      const chunks = [];

      recorder.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
      recorder.onstop = () => resolve(new Blob(chunks, { type: "video/webm" }));
      recorder.onerror = (e) => reject(e);

      recorder.start();
      setTimeout(() => recorder.stop(), duration);
    });
  };

  const getFileName = (i, ext) => {
    if (layout === "single") return `myworkshop_main.${ext}`;
    if (layout === "split")
      return i === 0 ? `myworkshop_main.${ext}` : `myworkshop_right.${ext}`;
    if (layout === "five") return `myworkshop_row1_col${i + 1}.${ext}`;
    return `output_${i + 1}.${ext}`;
  };

  const handleExport = async () => {
    if (!mediaLoaded || !mediaRef.current) return;
    setIsExporting(true);

    try {
      const canvasCount = layout === "split" ? 2 : layout === "five" ? 5 : 1;
      const zip = new JSZip();

      for (let i = 0; i < canvasCount; i++) {
        const canvas = canvasRefs.current[i];
        if (!canvas) continue;

        if (mediaType === "image") {
          await new Promise((resolve) => {
            canvas.toBlob((blob) => {
              if (blob) {
                zip.file(getFileName(i, "png"), blob);
              }
              resolve();
            }, "image/png");
          });
        } else {
          const duration = mediaRef.current.duration * 1000;
          const blob = await recordCanvasToVideo(canvas, duration);
          zip.file(getFileName(i, "webm"), blob);
        }
        await new Promise((res) => setTimeout(res, 300));
      }

      const content = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(content);
      a.download = "steam_crop_export.zip";
      a.click();
    } catch (err) {
      console.error("Export failed", err);
    } finally {
      setIsExporting(false);
    }
  };

  const renderCanvases = () => {
    switch (layout) {
      case "single":
        return (
          <canvas
            ref={(el) => (canvasRefs.current[0] = el)}
            className="w-full h-full"
          />
        );
      case "split":
        return (
          <div className="flex gap-1 w-full h-full">
            <canvas
              ref={(el) => (canvasRefs.current[0] = el)}
              className="h-full"
              style={{ width: "80%" }}
            />
            <canvas
              ref={(el) => (canvasRefs.current[1] = el)}
              className="h-full"
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
                className="h-full"
                style={{ width: "20%" }}
              />
            ))}
          </div>
        );
    }
  };

  const renderSettingsModal = () => {
    if (!showSettings) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80">
        <div className="bg-[#1a1a1a] border border-gray-600 rounded-lg p-6 w-[400px] max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Settings</h3>
            <button
              onClick={() => setShowSettings(false)}
              className="text-gray-400 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>

          {layout === "single" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-2">
                  Height (in pixels)
                </label>
                <input
                  type="number"
                  value={settings.singleHeight}
                  onChange={(e) =>
                    handleSettingChange(
                      "singleHeight",
                      parseInt(e.target.value) || 353
                    )
                  }
                  className="w-full bg-[#2a2a2a] border border-gray-600 text-white px-3 py-2 rounded"
                />
              </div>
              <button
                onClick={() => {
                  matchBackgroundHeight();
                }}
                className="w-full bg-[#2a2a2a] border border-gray-600 text-gray-300 py-2 rounded hover:bg-[#333]"
              >
                Match Background Height
              </button>
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={settings.displayTitle}
                    onChange={(e) =>
                      handleSettingChange("displayTitle", e.target.checked)
                    }
                    className="rounded"
                  />
                  <span className="text-gray-300">Display Title</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={settings.displayStatistics}
                    onChange={(e) =>
                      handleSettingChange("displayStatistics", e.target.checked)
                    }
                    className="rounded"
                  />
                  <span className="text-gray-300">Display Statistics</span>
                </label>
              </div>
            </div>
          )}

          {layout === "split" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-2">
                  Main Height (in pixels)
                </label>
                <input
                  type="number"
                  value={settings.splitMainHeight}
                  onChange={(e) =>
                    handleSettingChange(
                      "splitMainHeight",
                      parseInt(e.target.value) || 353
                    )
                  }
                  className="w-full bg-[#2a2a2a] border border-gray-600 text-white px-3 py-2 rounded"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-2">
                  Right Panel Height (in pixels)
                </label>
                <input
                  type="number"
                  value={settings.splitRightHeight}
                  onChange={(e) =>
                    handleSettingChange(
                      "splitRightHeight",
                      parseInt(e.target.value) || 353
                    )
                  }
                  className="w-full bg-[#2a2a2a] border border-gray-600 text-white px-3 py-2 rounded"
                />
              </div>
              <button
                onClick={() => {
                  matchBackgroundHeight();
                }}
                className="w-full bg-[#2a2a2a] border border-gray-600 text-gray-300 py-2 rounded hover:bg-[#333]"
              >
                Match Background Height
              </button>
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={settings.displayTitle}
                    onChange={(e) =>
                      handleSettingChange("displayTitle", e.target.checked)
                    }
                    className="rounded"
                  />
                  <span className="text-gray-300">Display Title</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={settings.displayStatistics}
                    onChange={(e) =>
                      handleSettingChange("displayStatistics", e.target.checked)
                    }
                    className="rounded"
                  />
                  <span className="text-gray-300">Display Statistics</span>
                </label>
              </div>
            </div>
          )}

          {layout === "five" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-2">
                  Row Count
                </label>
                <select
                  value={settings.rowCount}
                  onChange={(e) =>
                    handleSettingChange("rowCount", parseInt(e.target.value))
                  }
                  className="w-full bg-[#2a2a2a] border border-gray-600 text-white px-3 py-2 rounded"
                >
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-2">
                  1st Row's Height (in pixels)
                </label>
                <input
                  type="number"
                  value={settings.row1Height}
                  onChange={(e) =>
                    handleSettingChange(
                      "row1Height",
                      parseInt(e.target.value) || 646
                    )
                  }
                  className="w-full bg-[#2a2a2a] border border-gray-600 text-white px-3 py-2 rounded"
                />
              </div>

              {settings.rowCount >= 2 && (
                <div>
                  <label className="block text-sm text-gray-300 mb-2">
                    2nd Row's Height (in pixels)
                  </label>
                  <input
                    type="number"
                    value={settings.row2Height}
                    onChange={(e) =>
                      handleSettingChange(
                        "row2Height",
                        parseInt(e.target.value) || 122
                      )
                    }
                    className="w-full bg-[#2a2a2a] border border-gray-600 text-white px-3 py-2 rounded"
                  />
                </div>
              )}

              {settings.rowCount >= 3 && (
                <div>
                  <label className="block text-sm text-gray-300 mb-2">
                    3rd Row's Height (in pixels)
                  </label>
                  <input
                    type="number"
                    value={settings.row3Height}
                    onChange={(e) =>
                      handleSettingChange(
                        "row3Height",
                        parseInt(e.target.value) || 122
                      )
                    }
                    className="w-full bg-[#2a2a2a] border border-gray-600 text-white px-3 py-2 rounded"
                  />
                </div>
              )}

              <button
                onClick={() => {
                  matchBackgroundHeight();
                }}
                className="w-full bg-[#2a2a2a] border border-gray-600 text-gray-300 py-2 rounded hover:bg-[#333]"
              >
                Match Background Height
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      className="relative min-h-screen text-white overflow-hidden"
      style={{ backgroundColor: "#0a0a0a" }}
    >
      <div className="absolute inset-0 z-0">
        {mediaType === "image" ? (
          <div
            className="w-full h-full opacity-40"
            style={{
              backgroundImage: `url(${mediaUrl})`,
              backgroundRepeat: "repeat",
              backgroundSize: "auto",
            }}
          />
        ) : (
          <video
            ref={backgroundVideoRef}
            src={mediaUrl}
            autoPlay
            muted
            loop
            playsInline
            className="w-full h-full object-cover opacity-40"
          />
        )}
      </div>

      {(isLoading || isExporting) && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black bg-opacity-80">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-cyan-400 mb-4"></div>
          <div className="text-cyan-400 text-lg font-semibold">
            {isExporting ? "Exporting..." : "Loading Media..."}
          </div>
        </div>
      )}
      {renderSettingsModal()}

      {mediaType === "image" ? (
        <img
          ref={mediaRef}
          src={mediaUrl}
          className="hidden"
          onLoad={handleMediaLoad}
          onError={handleMediaError}
          crossOrigin="anonymous"
        />
      ) : (
        <video
          ref={mediaRef}
          src={mediaUrl}
          className="hidden"
          onLoadedData={handleMediaLoad}
          onError={handleMediaError}
          crossOrigin="anonymous"
          muted
          loop
          playsInline
        />
      )}

      <div
        className="relative z-10 p-8 flex gap-6 max-w-7xl mx-auto"
        style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
      >
        <div className="flex-1">
          <div className="flex gap-4 mb-6">
            <div className="bg-transparent h-48 w-48 p-4 rounded border-2 border-cyan-500"></div>

            <div className="flex-1">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-semibold">Background Cropper</h1>
                  <div className="text-gray-400 text-sm">Ver. 1.1</div>
                </div>
              </div>

              <div className="text-gray-300 text-sm mb-2">
                Paste your background link or upload your background below.
              </div>

              <div className="flex items-center gap-2 mb-3">
                <input
                  className="bg-[#181f2a] border border-[#222c38] text-gray-300 px-3 py-2 rounded w-full"
                  placeholder="https://cdn.fastly.steamstatic.com/steamcommunity/public/images/items/..."
                  value={mediaUrl}
                  onChange={(e) => handleUrlChange(e.target.value)}
                />
                <button
                  className="bg-[#181f2a] text-gray-300 px-3 py-3 rounded hover:bg-[#222c38]"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <DownloadCloud size={16} />
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>

              <div className="flex gap-2 mb-2">
                <button
                  className={`p-2 bg-[#181f2a] border border-[#222c38] text-gray-300 rounded hover:bg-[#222c38] ${
                    layout === "single" ? "border-cyan-400" : ""
                  }`}
                  onClick={() => setLayout("single")}
                >
                  <Square size={24} />
                </button>
                <button
                  className={`p-2 bg-[#181f2a] border border-[#222c38] text-gray-300 rounded hover:bg-[#222c38] ${
                    layout === "split" ? "border-cyan-400" : ""
                  }`}
                  onClick={() => setLayout("split")}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <rect
                      x="5"
                      y="6"
                      width="8"
                      height="12"
                      stroke="currentColor"
                      strokeWidth="2"
                      fill="none"
                    />
                    <rect
                      x="15"
                      y="6"
                      width="4"
                      height="12"
                      stroke="currentColor"
                      strokeWidth="2"
                      fill="none"
                    />
                  </svg>
                </button>
                <button
                  className={`p-2 bg-[#181f2a] border border-[#222c38] text-gray-300 rounded hover:bg-[#222c38] ${
                    layout === "five" ? "border-cyan-400" : ""
                  }`}
                  onClick={() => setLayout("five")}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <rect
                      x="4"
                      y="6"
                      width="2"
                      height="12"
                      fill="currentColor"
                    />
                    <rect
                      x="7"
                      y="6"
                      width="2"
                      height="12"
                      fill="currentColor"
                    />
                    <rect
                      x="10"
                      y="6"
                      width="2"
                      height="12"
                      fill="currentColor"
                    />
                    <rect
                      x="13"
                      y="6"
                      width="2"
                      height="12"
                      fill="currentColor"
                    />
                    <rect
                      x="16"
                      y="6"
                      width="2"
                      height="12"
                      fill="currentColor"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <div className="bg-[rgba(0,0,0,0.3)] backdrop-blur-sm rounded border border-cyan-600 w-full h-[80vh] flex flex-col">
            <div className="flex items-center justify-between bg-[#1a1a1a] px-4 py-2 border-b border-gray-600">
              <div className="flex items-center gap-2">
                <span className="text-gray-300 text-lg">
                  My Workshop Showcase
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button className="text-gray-400 hover:text-white">
                  <DownloadCloud size={18} />
                </button>
                <button className="text-gray-400 hover:text-white">
                  <ChevronDown size={18} />
                </button>
                <button
                  className="text-gray-400 hover:text-white"
                  onClick={() => setShowSettings(true)}
                >
                  <Settings size={18} />
                </button>
                <button className="text-gray-400 hover:text-white">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 p-4 flex items-center justify-center bg-[#0a0f1a]">
              <div className="w-full h-full flex flex-col">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 p-2 bg-cyan-500 rounded flex items-center justify-center">
                    <img
                      src="https://steamartworkhub.com/cdn/img/ah_emblem_1.svg?lBHQ6l%2B0I4T6QNHRylqZP068%2FLoAuYaD"
                      alt="badge"
                      width={40}
                      height={40}
                      className="rounded"
                    />
                  </div>
                  <span className="text-gray-300 text-4xl">Your Workshop</span>
                </div>

                {mediaLoaded ? (
                  <div className="flex-1">{renderCanvases()}</div>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-gray-400 text-center">
                      <div>Canvas Preview</div>
                      <div className="text-sm">Load media to see preview</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
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
              className="rounded"
            />
            <div>
              <div className="text-white text-sm">Artwork Hub</div>
              <div className="text-gray-300 text-xs">500 XP</div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              className="bg-[#222c38] text-gray-300 px-4 py-2 rounded text-sm hover:bg-[#2a3441]"
              onClick={() => setShowSettings(true)}
            >
              Settings
            </button>
            <button
              className="bg-[#0ecfff] text-black px-4 py-2 rounded text-sm font-bold hover:bg-[#0bb8d6] disabled:opacity-50"
              onClick={handleExport}
              disabled={!mediaLoaded || isExporting}
            >
              {isExporting ? "Exporting..." : "Export"}
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
