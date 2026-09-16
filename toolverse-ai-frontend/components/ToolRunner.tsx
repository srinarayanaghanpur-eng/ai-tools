"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Star } from "lucide-react";
import { ApiClientError, JobsAPI, ToolsAPI, api } from "@/lib/api";
import { toolBySlug } from "@/lib/tools";
import { useAuth, usePrefs, useToast } from "@/components/providers";
import { UploadZone, useImagePreviewUrls } from "@/components/UploadZone";
import { JobStatusView, ResultPanel } from "@/components/JobStatus";
import { ErrorState } from "@/components/ui";
import type { Job } from "@/lib/api";
import { LocalTool } from "./LocalTool";

type Phase = "idle" | "uploading" | "processing" | "done" | "error";

export function ToolRunner({ slug }: { slug: string }) {
  const tool = toolBySlug(slug)!;
  const { token } = useAuth();
  const { push } = useToast();
  const { touchRecent } = usePrefs();
  const [files, setFiles] = useState<File[]>([]);
  const [params, setParams] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const p of tool.params ?? []) {
      if (p.defaultValue !== undefined) init[p.key] = String(p.defaultValue);
    }
    return init;
  });
  const [phase, setPhase] = useState<Phase>("idle");
  const [job, setJob] = useState<Job | null>(null);
  const [uploadPct, setUploadPct] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [validation, setValidation] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [resultUrls, setResultUrls] = useState<Record<string, string>>({});
  const [previewLoading, setPreviewLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Source image preview (stays visible while uploading/processing/done)
  const inputPreviews = useImagePreviewUrls(files);
  const sourceEntry = files
    .map((f, i) => ({ f, url: inputPreviews[`${f.name}-${f.size}-${i}`] }))
    .find((e) => e.url);
  const sourceUrl = sourceEntry?.url ?? null;
  const sourceName = sourceEntry?.f.name ?? null;

  // Auto-load visual previews for image results once the job completes.
  useEffect(() => {
    if (phase !== "done" || !job) return;
    let cancelled = false;
    const imageOutputs = (job.output_files ?? []).filter(
      (o) =>
        o.mime?.startsWith("image/") || /\.(png|jpe?g|webp|gif|bmp|avif)$/i.test(o.filename ?? "")
    );
    if (!imageOutputs.length) return;
    setPreviewLoading(true);
    (async () => {
      const entries: Record<string, string> = {};
      for (const o of imageOutputs) {
        try {
          const { blob } = await api.download(job.id, o.fileId);
          if (cancelled) return;
          entries[o.fileId] = URL.createObjectURL(blob);
        } catch {
          /* preview is best-effort; download button still works */
        }
      }
      if (!cancelled) {
        setResultUrls(entries);
        setPreviewLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [phase, job]);

  const revokeResults = useCallback(() => {
    setResultUrls((prev) => {
      Object.values(prev).forEach((u) => {
        try {
          URL.revokeObjectURL(u);
        } catch {
          /* ignore */
        }
      });
      return {};
    });
  }, []);

  useEffect(() => {
    touchRecent(tool.slug);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool.slug]);

  useEffect(() => () => abortRef.current?.abort(), []);
  useEffect(() => () => revokeResults(), [revokeResults]);

  const setParam = (key: string, value: string) =>
    setParams((prev) => ({ ...prev, [key]: value }));

  const validate = useCallback((): string | null => {
    if (tool.uiType === "file" || tool.uiType === "files") {
      if (!files.length) return "Please choose a file first.";
      const maxFiles = tool.uiType === "files" ? 10 : 1;
      if (files.length > maxFiles) return `Too many files (max ${maxFiles}).`;
      for (const f of files) {
        const ext = "." + (f.name.split(".").pop() ?? "").toLowerCase();
        if (!tool.accepted.map((a) => a.toLowerCase()).includes(ext)) {
          return `Unsupported file format "${ext}" for ${tool.name}. Accepted: ${tool.accepted.join(", ")}.`;
        }
        if (f.size === 0) return `"${f.name}" is empty.`;
      }
    }
    if (tool.uiType === "text") {
      const textParam = tool.params?.find((p) => p.type === "textarea" || p.key === "text" || p.key === "prompt");
      if (tool.slug !== "uuid-generator") {
        const v = textParam ? (params[textParam.key] ?? "") : "";
        if (!v.trim()) return "Please enter some text first.";
      }
    }
    return null;
  }, [files, params, tool]);

  const start = useCallback(async () => {
    const v = validate();
    setValidation(v);
    if (v) return;
    setError(null);
    setJob(null);
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      if (tool.uiType === "file" || tool.uiType === "files") {
        setPhase("uploading");
        setUploadPct(15);
        const fields: Record<string, string> = {};
        for (const [k, val] of Object.entries(params)) {
          if (val !== "") fields[k] = val;
        }
        const data = await ToolsAPI.processFiles(tool.slug, files, fields, setUploadPct);
        setPhase("processing");
        const finalJob = await JobsAPI.poll(
          data.jobId,
          (j) => {
            if (!ctrl.signal.aborted) setJob(j);
          },
          ctrl.signal
        );
        if (ctrl.signal.aborted) return;
        setJob(finalJob);
        if (finalJob.status === "COMPLETED") setPhase("done");
        else if (finalJob.status === "CANCELLED") {
          setPhase("error");
          setError("Job was cancelled.");
        } else {
          setPhase("error");
          setError(finalJob.error_message || "Processing failed. Please try again.");
        }
      } else {
        // text tools → JSON body
        setPhase("processing");
        setJob({ id: "", tool_id: tool.id, status: "QUEUED", progress: 5, input_files: [], output_files: [], created_at: new Date().toISOString() } as Job);
        const body: Record<string, unknown> = {};
        const textParam = tool.params?.find((p) => p.type === "textarea" || p.key === "text" || p.key === "prompt");
        if (textParam) body.text = params[textParam.key] ?? "";
        for (const [k, val] of Object.entries(params)) {
          if (textParam && k === textParam.key) continue;
          if (val === "") continue;
          const num = Number(val);
          body[k] = val !== "" && !Number.isNaN(num) && /^-?\d+(\.\d+)?$/.test(val) ? num : val;
        }
        const data = await ToolsAPI.processJson(tool.slug, body);
        const finalJob = await JobsAPI.poll(
          data.jobId,
          (j) => {
            if (!ctrl.signal.aborted) setJob(j);
          },
          ctrl.signal
        );
        if (ctrl.signal.aborted) return;
        setJob(finalJob);
        if (finalJob.status === "COMPLETED") setPhase("done");
        else {
          setPhase("error");
          setError(finalJob.error_message || "Processing failed. Please try again.");
        }
      }
    } catch (e: any) {
      if (e?.name === "AbortError") return;
      const msg =
        e instanceof ApiClientError
          ? e.message
          : "Connection lost. Check your network and that the backend is running.";
      setPhase("error");
      setError(msg);
      push({ title: "Processing failed", body: msg, kind: "error" });
    }
  }, [files, params, tool, validate, push]);

  const cancel = useCallback(async () => {
    abortRef.current?.abort();
    if (job?.id) {
      try {
        await JobsAPI.cancel(job.id);
      } catch {
        /* best effort */
      }
    }
    setPhase("idle");
  }, [job]);

  const download = useCallback(
    async (fileId: string) => {
      if (!job) return;
      setDownloading(fileId);
      try {
        const { blob, filename } = await api.download(job.id, fileId);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      } catch (e: any) {
        push({
          title: "Download failed",
          body: e?.message ?? "Could not download the file.",
          kind: "error",
        });
      } finally {
        setDownloading(null);
      }
    },
    [job, push]
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    revokeResults();
    setPreviewLoading(false);
    setFiles([]);
    setJob(null);
    setError(null);
    setValidation(null);
    setUploadPct(0);
    setPhase("idle");
  }, [revokeResults]);

  if (tool.uiType === "local") {
    return <LocalTool tool={tool} />;
  }

  const busy = phase === "uploading" || phase === "processing";

  return (
    <div className="space-y-4">
      {/* Params */}
      {tool.params && tool.params.length > 0 && (
        <div className="surface grid gap-3 rounded-2xl p-4 sm:grid-cols-2">
          {tool.params.map((p) => (
            <label key={p.key} className="block">
              <span className="mb-1 block text-xs font-semibold">{p.label}</span>
              {p.type === "select" ? (
                <select
                  value={params[p.key] ?? ""}
                  onChange={(e) => setParam(p.key, e.target.value)}
                  disabled={busy}
                  className="surface-soft w-full rounded-lg px-3 py-2 text-sm outline-none"
                >
                  {(p.options ?? []).map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : p.type === "textarea" ? (
                <textarea
                  value={params[p.key] ?? ""}
                  onChange={(e) => setParam(p.key, e.target.value)}
                  placeholder={p.placeholder}
                  disabled={busy}
                  rows={6}
                  className="surface-soft w-full rounded-lg px-3 py-2 text-sm outline-none sm:col-span-2"
                />
              ) : p.type === "number" ? (
                <input
                  type="number"
                  value={params[p.key] ?? ""}
                  onChange={(e) => setParam(p.key, e.target.value)}
                  placeholder={p.placeholder}
                  disabled={busy}
                  className="surface-soft w-full rounded-lg px-3 py-2 text-sm outline-none"
                />
              ) : (
                <input
                  type="text"
                  value={params[p.key] ?? ""}
                  onChange={(e) => setParam(p.key, e.target.value)}
                  placeholder={p.placeholder}
                  disabled={busy}
                  className="surface-soft w-full rounded-lg px-3 py-2 text-sm outline-none"
                />
              )}
              {p.hint && <span className="text-muted mt-0.5 block text-xs">{p.hint}</span>}
            </label>
          ))}
        </div>
      )}

      {/* Upload (file tools) */}
      {(tool.uiType === "file" || tool.uiType === "files") && (
        <UploadZone
          accepted={tool.accepted}
          multiple={tool.uiType === "files"}
          files={files}
          onFiles={setFiles}
          disabled={busy}
        />
      )}

      {validation && (
        <p role="alert" className="flex items-center gap-1.5 text-sm font-medium text-amber-600 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4" aria-hidden /> {validation}
        </p>
      )}

      {phase === "idle" || phase === "error" ? (
        <button
          onClick={start}
          disabled={busy}
          className="w-full rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60 sm:w-auto sm:px-8"
        >
          {tool.uiType === "text" ? "Run tool" : `Process ${files.length > 1 ? `${files.length} files` : "file"}`}
        </button>
      ) : null}

      {phase !== "idle" && (
        <JobStatusView phase={phase} job={job} uploadPct={uploadPct} error={error} onCancel={cancel} />
      )}

      {phase === "error" && (
        <div className="flex gap-2">
          <button
            onClick={start}
            className="rounded-xl border px-5 py-2.5 text-sm font-semibold"
            style={{ borderColor: "rgb(var(--border))" }}
          >
            Try Again
          </button>
          <button onClick={reset} className="surface-soft rounded-xl px-5 py-2.5 text-sm font-medium">
            Reset
          </button>
        </div>
      )}

      {phase === "done" && job && (
        <ResultPanel
          job={job}
          onDownload={download}
          downloading={downloading}
          onReset={reset}
          sourceUrl={sourceUrl}
          sourceName={sourceName}
          resultUrls={resultUrls}
          previewLoading={previewLoading}
        />
      )}

      {phase === "error" && !error && <ErrorState title="Something went wrong" onRetry={start} />}
    </div>
  );
}

export function FavoriteButton({ slug, name }: { slug: string; name: string }) {
  const { isFav, toggleFav } = usePrefs();
  const fav = isFav(slug);
  return (
    <button
      onClick={() => toggleFav(slug)}
      aria-pressed={fav}
      aria-label={fav ? `Remove ${name} from favorites` : `Save ${name} to favorites`}
      className="surface inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium"
    >
      <Star className={fav ? "h-4 w-4 fill-amber-400 text-amber-400" : "h-4 w-4"} aria-hidden />
      {fav ? "Saved" : "Save"}
    </button>
  );
}
