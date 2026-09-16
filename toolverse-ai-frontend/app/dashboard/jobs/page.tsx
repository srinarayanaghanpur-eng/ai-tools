"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Download, RefreshCw } from "lucide-react";
import { useAuth, useToast } from "@/components/providers";
import { JobsAPI, UserAPI, api } from "@/lib/api";
import { StatusPill, EmptyState, ErrorState, Skeleton } from "@/components/ui";
import { timeAgo } from "@/lib/utils";

export default function JobsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { push } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("");
  const [state, setState] = useState<"loading" | "error" | "done">("loading");
  const limit = 12;

  useEffect(() => {
    if (!loading && !user) router.replace("/login?next=/dashboard/jobs");
  }, [loading, user, router]);

  const load = async (p = page, s = status) => {
    setState("loading");
    try {
      const res: any = await UserAPI.jobs({ page: p, limit, status: s || undefined });
      const list = Array.isArray(res) ? res : (res.jobs ?? res.data ?? []);
      setItems(list);
      setTotal(res?.meta?.total ?? list.length);
      setState("done");
    } catch (e: any) {
      setState("error");
    }
  };

  useEffect(() => {
    if (user) load(1, status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (loading) return <Skeleton className="h-64" />;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-extrabold tracking-tight">Recent jobs</h1>
        <button onClick={() => load(page, status)} aria-label="Refresh jobs" className="surface-soft rounded-lg p-2">
          <RefreshCw className="h-4 w-4" aria-hidden />
        </button>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
            load(1, e.target.value);
          }}
          aria-label="Filter by status"
          className="surface-soft ml-auto rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          {["QUEUED", "PROCESSING", "COMPLETED", "FAILED", "CANCELLED"].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {state === "loading" && <div className="mt-4 space-y-2"><Skeleton className="h-14" /><Skeleton className="h-14" /><Skeleton className="h-14" /></div>}
      {state === "error" && <div className="mt-4"><ErrorState title="Could not load jobs" body="The backend may be offline." onRetry={() => load(page, status)} icon="offline" /></div>}
      {state === "done" && items.length === 0 && <div className="mt-4"><EmptyState title="No jobs yet" body="Run any tool and it will appear here." /></div>}

      {state === "done" && items.length > 0 && (
        <>
          <ul className="mt-4 space-y-2">
            {items.map((j: any) => (
              <li key={j.id} className="surface rounded-xl px-4 py-3">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-semibold">{j.tool_slug ?? j.tool_id ?? "Job"}</span>
                  <StatusPill status={j.status} />
                  <span className="text-muted ml-auto text-xs">{timeAgo(j.created_at)}</span>
                </div>
                <p className="mt-1 truncate font-mono text-xs text-muted">{j.id}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(j.output_files ?? []).map((f: any) => (
                    <button
                      key={f.fileId}
                      onClick={async () => {
                        try {
                          const { blob, filename } = await api.download(j.id, f.fileId);
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
                      <Download className="h-3.5 w-3.5" aria-hidden /> {f.filename ?? "Download"}
                    </button>
                  ))}
                  {(j.status === "QUEUED" || j.status === "PROCESSING") && (
                    <button
                      onClick={async () => {
                        try {
                          await JobsAPI.cancel(j.id);
                          load(page, status);
                        } catch (e: any) {
                          push({ title: "Cancel failed", body: e?.message, kind: "error" });
                        }
                      }}
                      className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-600"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-center gap-2 text-sm">
            <button disabled={page <= 1} onClick={() => { const p = page - 1; setPage(p); load(p, status); }} className="surface-soft rounded-lg px-3 py-1.5 disabled:opacity-50">Prev</button>
            <span className="text-muted text-xs" role="status">Page {page}{total ? ` · ${total} total` : ""}</span>
            <button onClick={() => { const p = page + 1; setPage(p); load(p, status); }} className="surface-soft rounded-lg px-3 py-1.5">Next</button>
            <Link href="/tools" className="ml-auto font-semibold text-brand-600">Run a tool</Link>
          </div>
        </>
      )}
    </div>
  );
}
