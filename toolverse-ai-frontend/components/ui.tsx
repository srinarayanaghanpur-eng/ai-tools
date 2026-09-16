"use client";

import { useEffect } from "react";
import { AlertTriangle, FileWarning, WifiOff, RefreshCw, Inbox } from "lucide-react";
import { useToast } from "./providers";
import { cn } from "@/lib/utils";

export function ToastHost() {
  const { toasts } = useToast();
  return (
    <div aria-live="polite" className="pointer-events-none fixed bottom-20 z-[90] flex w-full flex-col items-center gap-2 px-4 md:bottom-6 md:items-end md:pr-6">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={cn(
            "glass surface pointer-events-auto w-full max-w-sm rounded-xl p-3.5 shadow-pop animate-fade-up",
            t.kind === "error" && "border-red-300 dark:border-red-900",
            t.kind === "success" && "border-emerald-300 dark:border-emerald-900"
          )}
        >
          <p className="text-sm font-semibold">{t.title}</p>
          {t.body && <p className="text-muted mt-0.5 text-sm">{t.body}</p>}
        </div>
      ))}
    </div>
  );
}

export function ErrorState({
  title,
  body,
  onRetry,
  icon = "warn",
}: {
  title: string;
  body?: string;
  onRetry?: () => void;
  icon?: "warn" | "file" | "offline";
}) {
  const Icon = icon === "file" ? FileWarning : icon === "offline" ? WifiOff : AlertTriangle;
  return (
    <div className="surface mx-auto flex max-w-md flex-col items-center rounded-2xl px-8 py-10 text-center">
      <span className="surface-soft rounded-full p-3">
        <Icon className="h-6 w-6 text-amber-500" aria-hidden />
      </span>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      {body && <p className="text-muted mt-1.5 text-sm leading-relaxed">{body}</p>}
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          <RefreshCw className="h-4 w-4" aria-hidden /> Try Again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, body }: { title: string; body?: string }) {
  return (
    <div className="surface-soft mx-auto flex max-w-md flex-col items-center rounded-2xl px-8 py-10 text-center">
      <Inbox className="text-muted h-8 w-8" aria-hidden />
      <h3 className="mt-3 font-semibold">{title}</h3>
      {body && <p className="text-muted mt-1 text-sm">{body}</p>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("skeleton rounded-lg", className ?? "h-24 w-full")} />;
}

export function ToolGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-label="Loading tools">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="surface rounded-2xl p-5">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <Skeleton className="mt-4 h-4 w-2/3" />
          <Skeleton className="mt-2 h-3 w-full" />
          <Skeleton className="mt-2 h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  QUEUED: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  PROCESSING: "bg-brand-100 text-brand-800 dark:bg-brand-900/40 dark:text-brand-200",
  COMPLETED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  FAILED: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  CANCELLED: "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  published: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  draft: "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

export function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide",
        STATUS_STYLES[status] ?? STATUS_STYLES.CANCELLED
      )}
    >
      <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {status}
    </span>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <button aria-label="Close dialog" onClick={onClose} className="absolute inset-0 bg-black/50" />
      <div className="surface relative max-h-[85vh] w-full max-w-lg overflow-auto rounded-t-2xl p-6 shadow-pop animate-fade-up sm:rounded-2xl">
        <h2 className="text-lg font-semibold">{title}</h2>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  );
}
