"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers";
import { UserAPI } from "@/lib/api";
import { DashboardCard } from "@/components/Sidebar";
import { Skeleton, ErrorState } from "@/components/ui";
import { formatBytes } from "@/lib/utils";

export default function UsagePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [usage, setUsage] = useState<any>(null);
  const [state, setState] = useState<"loading" | "error" | "done">("loading");

  useEffect(() => {
    if (!loading && !user) router.replace("/login?next=/dashboard/usage");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    UserAPI.usage()
      .then((u: any) => {
        setUsage(u.usage ?? u);
        setState("done");
      })
      .catch(() => setState("error"));
  }, [user]);

  if (loading || state === "loading") return <Skeleton className="h-48" />;
  if (state === "error") return <ErrorState title="Could not load usage" onRetry={() => window.location.reload()} />;

  const totals = usage?.totals ?? {};
  const daily = usage?.daily ?? [];
  const max = Math.max(1, ...daily.map((d: any) => d.jobs ?? 0));

  return (
    <div>
      <h1 className="text-xl font-extrabold tracking-tight">Usage</h1>
      <p className="text-muted mt-1 text-sm">Last 30 days across all tools.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <DashboardCard title="Jobs" value={String(totals.jobs ?? 0)} />
        <DashboardCard title="Data processed" value={formatBytes(totals.bytes ?? 0)} />
        <DashboardCard title="AI tokens" value={String(totals.tokens ?? 0)} />
      </div>
      <h2 className="mt-6 text-sm font-semibold">Daily activity</h2>
      {daily.length === 0 ? (
        <p className="text-muted mt-2 text-sm">No activity yet.</p>
      ) : (
        <ul className="mt-2 space-y-1.5" aria-label="Daily usage">
          {daily.slice(0, 14).map((d: any) => (
            <li key={d.day} className="flex items-center gap-3 text-xs">
              <span className="w-24 shrink-0 tabular-nums text-muted">{d.day}</span>
              <span className="surface-soft h-2.5 flex-1 overflow-hidden rounded-full">
                <span className="block h-full rounded-full bg-brand-600" style={{ width: `${Math.max(3, ((d.jobs ?? 0) / max) * 100)}%` }} />
              </span>
              <span className="w-16 text-right tabular-nums">{d.jobs} jobs</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
