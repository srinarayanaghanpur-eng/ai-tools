"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Download } from "lucide-react";
import { useAuth, useToast } from "@/components/providers";
import { UserAPI, api } from "@/lib/api";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui";
import { formatBytes, timeAgo } from "@/lib/utils";

export default function FilesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { push } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [state, setState] = useState<"loading" | "error" | "done">("loading");

  useEffect(() => {
    if (!loading && !user) router.replace("/login?next=/dashboard/files");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const res: any = await UserAPI.files({ page: 1, limit: 50 });
        setItems(Array.isArray(res) ? res : (res.files ?? res.data ?? []));
        setState("done");
      } catch {
        setState("error");
      }
    })();
  }, [user]);

  const filtered = items.filter((f: any) =>
    !q.trim() || (f.filename ?? f.original_name ?? "").toLowerCase().includes(q.trim().toLowerCase())
  );

  if (loading) return <Skeleton className="h-64" />;

  return (
    <div>
      <h1 className="text-xl font-extrabold tracking-tight">My files</h1>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search files…"
        aria-label="Search files"
        className="surface mt-3 w-full rounded-xl px-4 py-2.5 text-sm outline-none"
      />
      {state === "loading" && <div className="mt-4 space-y-2"><Skeleton className="h-14" /><Skeleton className="h-14" /></div>}
      {state === "error" && <div className="mt-4"><ErrorState title="Could not load files" onRetry={() => window.location.reload()} icon="offline" /></div>}
      {state === "done" && filtered.length === 0 && <div className="mt-4"><EmptyState title="No files" body="Processed outputs will appear here." /></div>}
      {state === "done" && filtered.length > 0 && (
        <ul className="mt-4 space-y-2">
          {filtered.map((f: any) => (
            <li key={f.id} className="surface flex flex-wrap items-center gap-2 rounded-xl px-4 py-3 text-sm">
              <span className="min-w-0 flex-1 truncate font-medium">{f.filename ?? f.original_name ?? f.id}</span>
              <span className="text-muted text-xs">{formatBytes(f.size ?? f.size_bytes)} · {timeAgo(f.createdAt ?? f.created_at)}</span>
              {f.jobId || f.job_id ? (
                <button
                  onClick={async () => {
                    const jobId = f.jobId ?? f.job_id;
                    if (f.kind !== "output") {
                      push({ title: "Only output files can be downloaded", kind: "info" });
                      return;
                    }
                    try {
                      const { blob, filename } = await api.download(jobId, f.id);
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = filename;
                      a.click();
                      setTimeout(() => URL.revokeObjectURL(url), 5000);
                    } catch (e: any) {
                      push({ title: "Download failed", body: e?.message, kind: "error" });
                    }
                  }}
                  className="surface-soft inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium"
                >
                  <Download className="h-3.5 w-3.5" aria-hidden /> Download
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
