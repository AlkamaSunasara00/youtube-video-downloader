import Loader from "@/components/Loader";

export default function FormatList({
  formats,
  onDownload,
  downloadingId,
  downloadProgress,
  disabled,
}) {
  return (
    <section>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-xl font-semibold text-slate-950 dark:text-white">
            Available formats
          </h3>
          <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
            Pick the resolution and container that fits your download best.
          </p>
        </div>

        {downloadingId ? (
          <div className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-sm font-medium text-cyan-700 dark:text-cyan-200">
            Download in progress
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {formats.map((format) => {
          const isDownloading = downloadingId === format.format_id;

          return (
            <article
              key={`${format.format_id}-${format.quality}-${format.ext}`}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-md dark:border-white/10 dark:bg-slate-900"
            >
              <div className="flex h-full flex-col gap-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-slate-950 dark:text-white">
                      {format.quality}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2 text-sm text-slate-500 dark:text-slate-400">
                      <span className="rounded-full border border-slate-200 px-2.5 py-1 uppercase dark:border-white/10">
                        {format.ext}
                      </span>
                      {format.filesize ? (
                        <span className="rounded-full border border-slate-200 px-2.5 py-1 dark:border-white/10">
                          {format.filesize}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      format.videoOnly
                        ? "bg-amber-500/15 text-amber-700 dark:text-amber-200"
                        : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-200"
                    }`}
                  >
                    {format.videoOnly ? "Merge audio" : "Audio included"}
                  </span>
                </div>

                <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {format.note}
                </p>

                {isDownloading ? (
                  <div className="space-y-3">
                    <Loader label="Preparing your file..." size="sm" />
                    <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full bg-linear-to-r from-cyan-500 to-blue-500 transition-all duration-200"
                        style={{ width: `${Math.max(downloadProgress, 6)}%` }}
                      />
                    </div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      {downloadProgress > 0
                        ? `${downloadProgress}% downloaded`
                        : "Waiting for the stream to begin"}
                    </p>
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={() => onDownload(format)}
                  disabled={disabled}
                  className="mt-auto inline-flex min-h-12 w-full items-center justify-center rounded-2xl border border-slate-200 bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                >
                  Download
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
