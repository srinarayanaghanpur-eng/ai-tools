"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, ArrowRight } from "lucide-react";
import { useAuth, usePrefs } from "@/components/providers";
import { UserAPI } from "@/lib/api";
import { TOOLS } from "@/lib/tools";
import { ToolGrid } from "@/components/ToolCard";
import { DashboardCard } from "@/components/Sidebar";
import { StatusPill, Skeleton } from "@/components/ui";
import { formatBytes, timeAgo } from "@/lib/utils";

function normalizeList<T>(res: any): { items: T[]; total: number } {
  if (Array.isArray(res)) return { items: res as T[], total: (res as T[]).length };
  const items = (res?.jobs ?? res?.files ?? res?.data ?? []) as T[];
  const total = res?.meta?.total ?? items.length;
  return { items, total };
}

export default function DashboardHome() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { recent } = usePrefs();
  const [jobs, setJobs] = useState<any[]>([]);
  const [usage, setUsage] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login?next=/dashboard");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const [j, u] = await Promise.all([
          UserAPI.jobs({ page: 1, limit: 5 }),
          UserAPI.usage().catch(() => null),
        ]);
        setJobs(normalizeList(j).items);
        setUsage((u as any)?.usage ?? null);
      } catch (e: any) {
        setErr(e?.message ?? "Could not load dashboard.");
      } finally {
        setBooted(true);
      }
    })();
  }, [user]);

  if (loading || (!user && !booted)) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-3 sm:grid-cols-3">
          <Skeleton className="h-24" /> <Skeleton className="h-24" /> <Skeleton className="h-24" />
        </div>
      </div>
    );
  }
  if (!user) return null;

  const recentTools = recent
    .map((s) => TOOLS.find((t) => t.slug === s))
    .filter(Boolean)
    .slice(0, 4) as typeof TOOLS;
  const active = jobs.filter((j) => j.status === "QUEUED" || j.status === "PROCESSING");
  const totals = usage?.totals ?? {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Welcome back{user.name ? `, ${user.name}` : ""}</h1>
        <p className="text-muted mt-1 text-sm">Search tools, track jobs and pick up where you left off.</p>
        <Link href="/tools" className="surface mt-4 flex items-center gap-2 rounded-xl px-4 py-3 text-sm text-muted">
          <Search className="h-4 w-4" aria-hidden /> Search tools…
        </Link>
      </div>

      {err && <p role="alert" className="text-sm text-amber-600">{err} (backend may be offline)</p>}

      <div className="grid gap-3 sm:grid-cols-3">
        <DashboardCard title="Active jobs" value={String(active.length)} hint="Queued + processing" />
        <DashboardCard title="Recent jobs" value={String(jobs.length)} hint="Last 5 shown below" />
        <DashboardCard
          title="Processed"
          value={formatBytes(totals.bytes ?? totals.bytes_processed ?? 0)}
          hint={`${totals.jobs ?? 0} jobs · ${totals.tokens ?? 0} AI tokens (30d)`}
        />
      </div>

      {active.length > 0 && (
        <section aria-label="Active jobs">
          <h2 className="text-sm font-semibold">Active jobs</h2>
          <ul className="mt-2 space-y-2">
            {active.map((j: any) => (
              <li key={j.id} className="surface flex items-center gap-3 rounded-xl px-4 py-3 text-sm">
                <span className="min-w-0 flex-1 truncate font-medium">{j.tool_slug ?? j.tool_id ?? j.id}</span>
                <StatusPill status={j.status} />
                <Link href="/dashboard/jobs" className="font-semibold text-brand-600">View</Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {recentTools.length > 0 && (
        <section aria-label="Recently used">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Recently used</h2>
            <Link href="/tools" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600">
              All tools <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
          <div className="mt-2.5">
            <ToolGrid tools={recentTools} />
          </div>
        </section>
      )}

      <section aria-label="Completed jobs">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Latest jobs</h2>
          <Link href="/dashboard/jobs" className="text-xs font-semibold text-brand-600">Job history</Link>
        </div>
        {jobs.length === 0 ? (
          <p className="text-muted mt-2 text-sm">{booted ? "No jobs yet — run any tool to see it here." : "Loading…"}</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {jobs.slice(0, 5).map((j: any) => (
              <li key={j.id} className="surface flex flex-wrap items-center gap-2 rounded-xl px-4 py-3 text-sm">
                <span className="min-w-0 flex-1 truncate font-mono text-xs">{j.id}</span>
                <span className="text-muted text-xs">{timeAgo(j.created_at)}</span>
                <StatusPill status={j.status} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
