"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Wrench, FolderOpen, History, Star, BarChart3, Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/jobs", label: "Recent Jobs", icon: History },
  { href: "/dashboard/files", label: "My Files", icon: FolderOpen },
  { href: "/dashboard/favorites", label: "Favorites", icon: Star },
  { href: "/dashboard/usage", label: "Usage", icon: BarChart3 },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
  { href: "/tools", label: "All Tools", icon: Wrench },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <nav aria-label="Dashboard" className="surface rounded-2xl p-2.5 lg:sticky lg:top-20">
      {ITEMS.map((i) => {
        const Icon = i.icon;
        const active = pathname === i.href;
        return (
          <Link
            key={i.href}
            href={i.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition",
              active ? "bg-brand-600 text-white" : "text-muted hover:bg-black/5 hover:text-current dark:hover:bg-white/5"
            )}
          >
            <Icon className="h-4 w-4" aria-hidden /> {i.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function DashboardCard({ title, value, hint }: { title: string; value: string; hint?: string }) {
  return (
    <div className="surface rounded-2xl p-5">
      <p className="text-muted text-xs font-semibold uppercase tracking-wider">{title}</p>
      <p className="mt-1.5 text-2xl font-bold tracking-tight">{value}</p>
      {hint && <p className="text-muted mt-1 text-xs">{hint}</p>}
    </div>
  );
}
