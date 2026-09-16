"use client";

import { CheckCircle2, Download, Loader2, RefreshCw, Share2, XCircle } from "lucide-react";
import type { Job } from "@/lib/api";
import { StatusPill } from "./ui";
import { ProgressBar } from "./UploadZone";
import { formatBytes } from "@/lib/utils";

export function JobStatusView({
  phase,
  job,
  uploadPct,
  error,
  onCancel,
}: {
  phase: "idle" | "uploading" | "processing" | "done" | "error";
  job: Job | null;
  uploadPct: number;
  error: string | null;
  onCancel?: () => void;
}) {
  if (phase === "idle") return null;
  if (phase === "uploading") {
    return (
      <div className="surface rounded-2xl p-5" aria-live="polite">
        <div className="flex items-center gap-2.5 text-sm font-semibold">
          <Loader2 className="h-4 w-4 animate-spin text-brand-600" aria-hidden /> Uploading…
        </div>
        <div className="mt-3">
          <ProgressBar value={uploadPct} label="Sending file to TOOLVERSE backend" />
        </div>
      </div>
    );
  }
  if (phase === "processing") {
    return (
      <div className="surface rounded-2xl p-5" aria-live="polite">
        <div className="flex flex-wrap items-center gap-2.5">
          <Loader2 className="h-4 w-4 animate-spin text-brand-600" aria-hidden />
          <p className="text-sm font-semibold">Processing…</p>
          {job && <StatusPill status={job.status} />}
          <span className="text-muted ml-auto text-xs tabular-nums">{Math.round(job?.progress ?? 5)}%</span>
        </div>
        <div className="mt-3">
          <ProgressBar value={job?.progress ?? 5} label="The backend is working on your file. You can wait or come back." />
        </div>
        {onCancel && job && (job.status === "QUEUED" || job.status === "PROCESSING") && (
          <button onClick={onCancel} className="surface-soft mt-3 rounded-lg px-3 py-1.5 text-xs font-medium">
            Cancel job
          </button>
        )}
      </div>
    );
  }
  if (phase === "error") {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5 dark:border-red-900 dark:bg-red-950/30" role="alert">
        <div className="flex items-center gap-2 text-sm font-semibold text-red-800 dark:text-red-200">
          <XCircle className="h-4 w-4" aria-hidden /> Processing failed
        </div>
        <p className="mt-1 text-sm text-red-700 dark:text-red-300">{error ?? "Something went wrong."}</p>
      </div>
    );
  }
  return null;
}

export function ResultPanel({
  job,
  onDownload,
  downloading,
  onReset,
  sourceUrl,
  sourceName,
  resultUrls,
  previewLoading,
}: {
  job: Job;
  onDownload: (fileId: string) => void;
  downloading: string | null;
  onReset: () => void;
  sourceUrl?: string | null;
  sourceName?: string | null;
  resultUrls?: Record<string, string>;
  previewLoading?: boolean;
}) {
  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: document.title, url });
      else {
        await navigator.clipboard.writeText(url);
      }
    } catch {
      /* user cancelled */
    }
  };
  const imageOutputs = (job.output_files ?? []).filter((f) => resultUrls?.[f.fileId]);
  const otherOutputs = (job.output_files ?? []).filter((f) => !resultUrls?.[f.fileId]);
  const showCompare = Boolean(sourceUrl && imageOutputs.length > 0);
  return (
    <div className="surface rounded-2xl border-emerald-200 p-5 dark:border-emerald-900" aria-live="polite">
      <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
        <CheckCircle2 className="h-4 w-4" aria-hidden /> Completed
      </div>

      {previewLoading && imageOutputs.length === 0 && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2" aria-label="Loading previews">
          <div className="skeleton h-48 rounded-xl" />
          <div className="skeleton hidden h-48 rounded-xl sm:block" />
        </div>
      )}

      {(showCompare || imageOutputs.length > 0) && (
        <div className={`mt-4 grid gap-3 ${showCompare || imageOutputs.length > 1 ? "sm:grid-cols-2" : ""}`}>
          {showCompare && sourceUrl && (
            <figure className="surface-soft overflow-hidden rounded-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={sourceUrl} alt={`Original: ${sourceName ?? "uploaded image"}`} className="max-h-72 w-full object-contain bg-black/5 dark:bg-white/5" />
              <figcaption className="text-muted px-3 py-2 text-xs font-semibold uppercase tracking-wider">
                Original{sourceName ? ` · ${sourceName}` : ""}
              </figcaption>
            </figure>
          )}
          {imageOutputs.map((f) => (
            <figure key={f.fileId} className="surface-soft overflow-hidden rounded-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={resultUrls![f.fileId]}
                alt={`Result: ${f.filename}`}
                className="max-h-72 w-full object-contain bg-black/5 dark:bg-white/5"
                style={
                  f.filename.toLowerCase().endsWith(".png")
                    ? {
                        backgroundImage:
                          "linear-gradient(45deg, rgb(148 163 184 / 0.35) 25%, transparent 25%, transparent 75%, rgb(148 163 184 / 0.35) 75%), linear-gradient(45deg, rgb(148 163 184 / 0.35) 25%, transparent 25%, transparent 75%, rgb(148 163 184 / 0.35) 75%)",
                        backgroundSize: "16px 16px",
                        backgroundPosition: "0 0, 8px 8px",
                      }
                    : undefined
                }
              />
              <figcaption className="flex items-center gap-2 px-3 py-2">
                <span className="min-w-0 flex-1 truncate text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                  Result · {f.filename}
                </span>
                <button
                  onClick={() => onDownload(f.fileId)}
                  disabled={downloading === f.fileId}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
                >
                  {downloading === f.fileId ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  ) : (
                    <Download className="h-3.5 w-3.5" aria-hidden />
                  )}
                  Download
                </button>
              </figcaption>
            </figure>
          ))}
        </div>
      )}

      {otherOutputs.length > 0 && (
        <ul className="mt-3 space-y-2">
          {otherOutputs.map((f) => (
            <li key={f.fileId} className="surface-soft flex flex-wrap items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm">
              <span className="min-w-0 flex-1 truncate font-medium">{f.filename}</span>
              {f.size ? <span className="text-muted text-xs">{formatBytes(f.size)}</span> : null}
              <button
                onClick={() => onDownload(f.fileId)}
                disabled={downloading === f.fileId}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {downloading === f.fileId ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                ) : (
                  <Download className="h-3.5 w-3.5" aria-hidden />
                )}
                Download
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={onReset}
          className="inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-sm font-medium"
          style={{ borderColor: "rgb(var(--border))" }}
        >
          <RefreshCw className="h-4 w-4" aria-hidden /> Process Another
        </button>
        <button onClick={share} className="surface-soft inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium">
          <Share2 className="h-4 w-4" aria-hidden /> Share
        </button>
      </div>
    </div>
  );
}
