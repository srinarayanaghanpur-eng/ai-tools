"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CloudUpload, File as FileIcon, X } from "lucide-react";
import { formatBytes, cn } from "@/lib/utils";

/** Object URLs for image files so the user sees what they picked while it works. */
export function useImagePreviewUrls(files: File[]): Record<string, string> {
  const [urls, setUrls] = useState<Record<string, string>>({});
  useEffect(() => {
    const next: Record<string, string> = {};
    files.forEach((f, i) => {
      const isImage =
        f.type.startsWith("image/") || /\.(png|jpe?g|webp|gif|bmp|avif|svg)$/i.test(f.name);
      if (isImage) {
        try {
          next[`${f.name}-${f.size}-${i}`] = URL.createObjectURL(f);
        } catch {
          /* ignore */
        }
      }
    });
    setUrls(next);
    return () => {
      Object.values(next).forEach((u) => {
        try {
          URL.revokeObjectURL(u);
        } catch {
          /* ignore */
        }
      });
    };
  }, [files]);
  return urls;
}

export function UploadZone({
  accepted,
  multiple,
  files,
  onFiles,
  disabled,
}: {
  accepted: string[];
  multiple?: boolean;
  files: File[];
  onFiles: (files: File[]) => void;
  disabled?: boolean;
}) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const acceptAttr = accepted.includes("text") ? undefined : accepted.join(",");

  const addFiles = useCallback(
    (list: FileList | File[]) => {
      const arr = Array.from(list);
      if (!multiple) onFiles(arr.slice(0, 1));
      else onFiles([...files, ...arr].slice(0, 10));
    },
    [files, multiple, onFiles]
  );

  return (
    <div>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={files.length ? "Add more files or replace file" : "Drop your file here or choose a file"}
        aria-disabled={disabled}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !disabled) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          if (disabled) return;
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          if (disabled) return;
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition",
          dragging ? "border-brand-500 bg-brand-50 dark:bg-brand-950/30" : "surface-soft hover:border-slate-400"
        )}
        style={{ borderColor: dragging ? undefined : "rgb(var(--border))" }}
      >
        <span className="surface rounded-full p-3.5">
          <CloudUpload className="h-7 w-7 text-brand-600" aria-hidden />
        </span>
        <p className="mt-4 font-semibold">{files.length ? "Add more files" : "Drop your file here"}</p>
        <p className="text-muted mt-1 text-sm">
          or <span className="font-semibold text-brand-600">Choose File</span>
          {accepted.includes("text") ? "" : ` · ${accepted.join(", ")}`}
        </p>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={acceptAttr}
          multiple={multiple}
          disabled={disabled}
          onChange={(e) => {
            if (e.target.files?.length) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
      {files.length > 0 && (
        <FileList files={files} onFiles={disabled ? undefined : onFiles} />
      )}
    </div>
  );
}

export function FileList({ files, onFiles }: { files: File[]; onFiles?: (files: File[]) => void }) {
  const previews = useImagePreviewUrls(files);
  return (
    <ul className="mt-3 space-y-2" aria-label="Selected files">
      {files.map((f, i) => {
        const thumb = previews[`${f.name}-${f.size}-${i}`];
        return (
          <li key={`${f.name}-${i}`} className="surface flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm">
            {thumb ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={thumb}
                alt={`Preview of ${f.name}`}
                className="h-12 w-12 shrink-0 rounded-lg border object-cover"
                style={{ borderColor: "rgb(var(--border))" }}
              />
            ) : (
              <FileIcon className="text-muted h-4 w-4 shrink-0" aria-hidden />
            )}
            <span className="min-w-0 flex-1 truncate font-medium">{f.name}</span>
            <span className="text-muted shrink-0 text-xs">{formatBytes(f.size)}</span>
            {onFiles && (
              <button
                onClick={() => onFiles(files.filter((_, j) => j !== i))}
                aria-label={`Remove ${f.name}`}
                className="text-muted rounded p-1 hover:text-current"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function ProgressBar({ value, label }: { value: number; label?: string }) {
  return (
    <div role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100} aria-label={label ?? "Progress"}>
      <div className="surface-soft h-2.5 overflow-hidden rounded-full">
        <div
          className="h-full rounded-full bg-brand-600 transition-all duration-500"
          style={{ width: `${Math.max(2, Math.min(100, value))}%` }}
        />
      </div>
      {label && <p className="text-muted mt-1.5 text-xs">{label}</p>}
    </div>
  );
}
