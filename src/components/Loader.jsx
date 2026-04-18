import { cn } from "@/lib/utils";

const sizeClasses = {
  sm: "h-4 w-4 border-2",
  md: "h-6 w-6 border-2",
  lg: "h-10 w-10 border-[3px]",
};

export default function Loader({
  label = "Loading...",
  centered = false,
  size = "md",
  className,
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 text-current",
        centered && "justify-center",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <span
        className={cn(
          "inline-block animate-spin rounded-full border-current border-t-transparent",
          sizeClasses[size] || sizeClasses.md
        )}
      />
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}
