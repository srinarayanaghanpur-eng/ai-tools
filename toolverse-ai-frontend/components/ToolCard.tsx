"use client";

import Link from "next/link";
import { ArrowUpRight, Star } from "lucide-react";
import type { FrontendTool } from "@/lib/tools";
import { categoryName } from "@/lib/tools";
import { usePrefs } from "./providers";
import { cn } from "@/lib/utils";

export function ToolCard({ tool }: { tool: FrontendTool }) {
  const { isFav, toggleFav } = usePrefs();
  const Icon = tool.icon;
  const fav = isFav(tool.slug);
  return (
    <div className="surface card-hover group relative flex flex-col rounded-2xl p-5">
      <div className="flex items-start justify-between gap-2">
        <span className="surface-soft rounded-xl p-2.5">
          <Icon className="h-5 w-5 text-brand-600" aria-hidden />
        </span>
        <button
          onClick={() => toggleFav(tool.slug)}
          aria-label={fav ? `Remove ${tool.name} from favorites` : `Add ${tool.name} to favorites`}
          aria-pressed={fav}
          className={cn(
            "rounded-lg p-1.5 transition",
            fav ? "text-amber-500" : "text-muted opacity-0 hover:text-current group-hover:opacity-100 focus:opacity-100"
          )}
        >
          <Star className={cn("h-4.5 w-4.5 h-5 w-5", fav && "fill-amber-400 text-amber-400")} aria-hidden />
        </button>
      </div>
      <h3 className="mt-3.5 font-semibold tracking-tight">{tool.name}</h3>
      <p className="text-muted mt-1 line-clamp-2 text-sm leading-relaxed">{tool.description}</p>
      <div className="mt-3 flex items-center justify-between">
        <span className="surface-soft rounded-full px-2.5 py-0.5 text-xs font-medium text-muted">
          {categoryName(tool.category)}
        </span>
        <Link
          href={`/tools/${tool.slug}`}
          className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700"
          aria-label={`Open ${tool.name}`}
        >
          Open <ArrowUpRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </div>
  );
}

export function ToolGrid({ tools, emptyText }: { tools: FrontendTool[]; emptyText?: string }) {
  if (!tools.length) {
    return <p className="text-muted py-10 text-center text-sm">{emptyText ?? "No tools found."}</p>;
  }
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {tools.map((t) => (
        <ToolCard key={t.slug} tool={t} />
      ))}
    </div>
  );
}
