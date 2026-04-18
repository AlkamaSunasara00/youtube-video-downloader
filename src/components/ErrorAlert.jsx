import { cn } from "@/lib/utils";

export default function ErrorAlert({ message, className }) {
  if (!message) {
    return null;
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200",
        className
      )}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-500/10 text-red-600 dark:text-red-200">
          !
        </span>
        <p className="leading-6">{message}</p>
      </div>
    </div>
  );
}
