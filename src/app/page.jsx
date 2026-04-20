"use client";

import { useEffect, useState } from "react";
import ErrorAlert from "@/components/ErrorAlert";
import Loader from "@/components/Loader";
import UrlInput from "@/components/UrlInput";

const THEME_STORAGE_KEY = "video-downloader-theme";

function downloadBlob(blob, fileName) {
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = href;
  anchor.download = fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(href);
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  
  // Cobalt options
  const [vQuality, setVQuality] = useState("720");
  const [isAudioOnly, setIsAudioOnly] = useState(false);

  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") {
      return "dark";
    }

    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme === "light" || savedTheme === "dark") {
      return savedTheme;
    }

    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  async function handleDownload() {
    if (!url.trim()) {
      setError("Please paste a video URL before downloading.");
      return;
    }

    setError("");
    setIsDownloading(true);
    setDownloadProgress(0);

    try {
      // 1. Get the download URL from our Cobalt API route
      const apiResponse = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          vQuality,
          isAudioOnly,
        }),
      });

      const apiData = await apiResponse.json();

      if (!apiResponse.ok || apiData.error) {
        throw new Error(apiData.error || "Failed to contact download service.");
      }

      if (!apiData.url) {
        throw new Error("No download URL was returned.");
      }

      // 2. Fetch the actual file to show progress
      const fileResponse = await fetch(apiData.url);
      
      if (!fileResponse.ok) {
        throw new Error("Could not download the file from the provided URL.");
      }

      const totalBytes = Number(fileResponse.headers.get("Content-Length")) || 0;
      const fileName = isAudioOnly ? "audio.mp3" : `video-${vQuality}p.mp4`;

      if (!fileResponse.body) {
        const blob = await fileResponse.blob();
        downloadBlob(blob, fileName);
        return;
      }

      const reader = fileResponse.body.getReader();
      const chunks = [];
      let receivedBytes = 0;

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        if (value) {
          chunks.push(value);
          receivedBytes += value.length;

          if (totalBytes > 0) {
            setDownloadProgress(
              Math.min(100, Math.round((receivedBytes / totalBytes) * 100))
            );
          }
        }
      }

      const blob = new Blob(chunks, {
        type: fileResponse.headers.get("Content-Type") || "application/octet-stream",
      });

      downloadBlob(blob, fileName);
      setDownloadProgress(100);
    } catch (downloadError) {
      setError(
        downloadError instanceof Error
          ? downloadError.message
          : "The download could not be started."
      );
    } finally {
      setTimeout(() => {
        setIsDownloading(false);
        setDownloadProgress(0);
      }, 500);
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <div className="mx-auto flex min-h-screen w-full max-w-[900px] flex-col px-4 py-6 sm:px-6 sm:py-8 lg:py-12">
        <div className="mb-6 flex justify-end">
          <button
            type="button"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="inline-flex items-center gap-2 rounded-full border border-slate-300/70 bg-white/80 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-cyan-400 hover:text-slate-950 dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:border-cyan-400 dark:hover:text-white"
          >
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                theme === "dark" ? "bg-cyan-400" : "bg-amber-400"
              }`}
            />
            {theme === "dark" ? "Dark mode" : "Light mode"}
          </button>
        </div>

        <section className="py-6 text-center sm:py-8">
          <p className="mb-3 inline-flex items-center rounded-full border border-cyan-500/15 bg-cyan-500/10 px-3 py-1 text-sm font-medium text-cyan-700 dark:text-cyan-300">
            Powered by Cobalt API
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl dark:text-white">
            Universal Downloader
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg dark:text-slate-300">
            Download from YouTube, Instagram, Twitter/X, TikTok, and more.
          </p>
        </section>

        <section className="rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-[0_20px_70px_-30px_rgba(15,23,42,0.28)] backdrop-blur dark:border-white/10 dark:bg-slate-900/80 dark:shadow-[0_20px_70px_-30px_rgba(14,165,233,0.2)] sm:p-8">
          
          <div className="mb-6 space-y-4">
            <UrlInput
              url={url}
              onUrlChange={setUrl}
              onSubmit={handleDownload}
              loading={isDownloading}
              disabled={isDownloading}
              helperText="Paste your URL here."
            />
            
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={isAudioOnly}
                  onChange={(e) => setIsAudioOnly(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-600 dark:border-gray-600 dark:bg-gray-700"
                />
                Audio Only (MP3)
              </label>

              {!isAudioOnly && (
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                  <span>Quality:</span>
                  <select
                    value={vQuality}
                    onChange={(e) => setVQuality(e.target.value)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-800 dark:focus:border-cyan-500"
                  >
                    <option value="max">Max Quality</option>
                    <option value="1080">1080p</option>
                    <option value="720">720p</option>
                    <option value="480">480p</option>
                    <option value="360">360p</option>
                    <option value="144">144p</option>
                  </select>
                </div>
              )}
            </div>

            <button
              onClick={handleDownload}
              disabled={isDownloading || !url.trim()}
              className="w-full sm:w-auto rounded-xl bg-cyan-600 px-6 py-3 font-semibold text-white shadow-md transition hover:bg-cyan-500 disabled:opacity-50"
            >
              {isDownloading ? `Downloading... ${downloadProgress}%` : "Download"}
            </button>
          </div>

          {error ? <ErrorAlert message={error} className="mt-5" /> : null}

          {isDownloading ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-200/80 bg-slate-50/80 p-8 dark:border-white/10 dark:bg-slate-950/40">
              <Loader
                label={`Downloading media... ${downloadProgress}%`}
                centered
                size="lg"
              />
              <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                <div
                  className="h-full bg-cyan-500 transition-all duration-300"
                  style={{ width: `${downloadProgress}%` }}
                />
              </div>
            </div>
          ) : null}

        </section>
      </div>
    </main>
  );
}
