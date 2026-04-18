"use client";

import { useEffect, useMemo, useState } from "react";
import ErrorAlert from "@/components/ErrorAlert";
import FormatList from "@/components/FormatList";
import Loader from "@/components/Loader";
import UrlInput from "@/components/UrlInput";
import VideoCard from "@/components/VideoCard";
import { parseContentDispositionFilename } from "@/lib/utils";

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

async function parseApiError(response, fallbackMessage) {
  try {
    const payload = await response.json();

    if (typeof payload?.error === "string" && payload.error.trim()) {
      return payload.error;
    }
  } catch {
    return fallbackMessage;
  }

  return fallbackMessage;
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [video, setVideo] = useState(null);
  const [error, setError] = useState("");
  const [isFetching, setIsFetching] = useState(false);
  const [downloadingId, setDownloadingId] = useState("");
  const [downloadProgress, setDownloadProgress] = useState(0);
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

  const isBusy = isFetching || Boolean(downloadingId);
  const helperText = useMemo(() => {
    if (!video) {
      return "Paste a public video link to inspect available download formats.";
    }

    return `${video.formats.length} download option${
      video.formats.length === 1 ? "" : "s"
    } ready.`;
  }, [video]);

  async function handleFetchVideo() {
    if (!url.trim()) {
      setError("Please paste a video URL before fetching.");
      return;
    }

    setError("");
    setIsFetching(true);
    setVideo(null);

    try {
      const response = await fetch("/api/fetch-video", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        throw new Error(
          await parseApiError(
            response,
            "We couldn't fetch that video right now."
          )
        );
      }

      const payload = await response.json();
      setVideo(payload);
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "We couldn't fetch that video right now."
      );
    } finally {
      setIsFetching(false);
    }
  }

  async function handleDownload(format) {
    setError("");
    setDownloadingId(format.format_id);
    setDownloadProgress(0);

    try {
      const response = await fetch("/api/download", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url,
          format_id: format.format_id,
          ext: format.ext,
        }),
      });

      if (!response.ok) {
        throw new Error(
          await parseApiError(response, "The download could not be started.")
        );
      }

      const totalBytes = Number(response.headers.get("Content-Length")) || 0;
      const disposition = response.headers.get("Content-Disposition");
      const fallbackName = `${video?.title || "video-download"}.${
        format.ext || "mp4"
      }`;
      const fileName =
        parseContentDispositionFilename(disposition) || fallbackName;

      if (!response.body) {
        const blob = await response.blob();
        downloadBlob(blob, fileName);
        return;
      }

      const reader = response.body.getReader();
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
        type: response.headers.get("Content-Type") || "application/octet-stream",
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
        setDownloadingId("");
        setDownloadProgress(0);
      }, 300);
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
            Fast downloads, tidy formats
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl dark:text-white">
            Video Downloader
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg dark:text-slate-300">
            Paste your link and download in any resolution.
          </p>
        </section>

        <section className="rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-[0_20px_70px_-30px_rgba(15,23,42,0.28)] backdrop-blur dark:border-white/10 dark:bg-slate-900/80 dark:shadow-[0_20px_70px_-30px_rgba(14,165,233,0.2)] sm:p-8">
          <UrlInput
            url={url}
            onUrlChange={setUrl}
            onSubmit={handleFetchVideo}
            loading={isFetching}
            disabled={Boolean(downloadingId)}
            helperText={helperText}
          />

          {error ? <ErrorAlert message={error} className="mt-5" /> : null}

          {isFetching ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-200/80 bg-slate-50/80 p-8 dark:border-white/10 dark:bg-slate-950/40">
              <Loader
                label="Fetching formats and video details..."
                centered
                size="lg"
              />
            </div>
          ) : null}

          {video ? (
            <div className="mt-6 space-y-6">
              <VideoCard
                title={video.title}
                duration={video.duration}
                thumbnail={video.thumbnail}
                formatCount={video.formats.length}
              />

              <FormatList
                formats={video.formats}
                onDownload={handleDownload}
                downloadingId={downloadingId}
                downloadProgress={downloadProgress}
                disabled={isBusy}
              />
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
