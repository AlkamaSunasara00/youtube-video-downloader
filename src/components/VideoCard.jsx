import Image from "next/image";

export default function VideoCard({
  title,
  duration,
  thumbnail,
  formatCount,
}) {
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-slate-50/80 dark:border-white/10 dark:bg-slate-950/40">
      <div className="flex flex-col md:flex-row">
        <div className="relative aspect-video w-full overflow-hidden bg-slate-200 md:max-w-sm dark:bg-slate-800">
          {thumbnail ? (
            <Image
              src={thumbnail}
              alt={title}
              fill
              sizes="(max-width: 768px) 100vw, 384px"
              className="object-cover"
              referrerPolicy="no-referrer"
              unoptimized
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm font-medium text-slate-500 dark:text-slate-400">
              No preview available
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col justify-between gap-5 p-6">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.12em] text-cyan-700 dark:text-cyan-300">
              Ready to download
            </p>
            <h2 className="mt-2 text-xl font-semibold leading-8 text-slate-950 dark:text-white">
              {title}
            </h2>
          </div>

          <div className="flex flex-wrap gap-3 text-sm text-slate-600 dark:text-slate-300">
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 dark:border-white/10 dark:bg-slate-900">
              Duration: {duration || "Unknown"}
            </span>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 dark:border-white/10 dark:bg-slate-900">
              {formatCount} format{formatCount === 1 ? "" : "s"}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
