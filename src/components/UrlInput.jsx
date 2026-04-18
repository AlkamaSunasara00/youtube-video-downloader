import Loader from "@/components/Loader";

export default function UrlInput({
  url,
  onUrlChange,
  onSubmit,
  loading,
  disabled,
  helperText,
}) {
  function handleSubmit(event) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <form onSubmit={handleSubmit}>
      <label
        htmlFor="video-url"
        className="mb-3 block text-sm font-semibold text-slate-700 dark:text-slate-200"
      >
        Video link
      </label>

      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          id="video-url"
          type="url"
          inputMode="url"
          autoComplete="off"
          value={url}
          onChange={(event) => onUrlChange(event.target.value)}
          placeholder="Paste video URL here..."
          className="min-h-14 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 shadow-sm outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/10 dark:border-white/10 dark:bg-slate-950 dark:text-white"
          disabled={loading || disabled}
        />

        <button
          type="submit"
          className="inline-flex min-h-14 w-full items-center justify-center rounded-2xl bg-linear-to-r from-cyan-500 to-blue-500 px-6 text-base font-semibold text-white shadow-[0_18px_40px_-20px_rgba(6,182,212,0.9)] transition hover:from-cyan-400 hover:to-blue-400 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-44"
          disabled={loading || disabled}
        >
          {loading ? <Loader label="Fetching..." size="sm" /> : "Fetch Video"}
        </button>
      </div>

      <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
        {helperText}
      </p>
    </form>
  );
}
