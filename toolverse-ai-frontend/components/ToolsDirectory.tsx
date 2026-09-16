"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search, Star, History } from "lucide-react";
import { CATEGORIES, TOOLS } from "@/lib/tools";
import { AdSlot } from "@/components/ads";
import { ToolGrid } from "@/components/ToolCard";
import { usePrefs } from "@/components/providers";
import { useDebounce } from "@/lib/hooks";
import { cn } from "@/lib/utils";

function DirectoryInner() {
  const params = useSearchParams();
  const initialCat = params.get("cat") ?? "all";
  const [cat, setCat] = useState(initialCat);
  const [q, setQ] = useState("");
  const [favOnly, setFavOnly] = useState(false);
  const debounced = useDebounce(q, 150);
  const { favorites, recent, isFav } = usePrefs();

  const filtered = useMemo(() => {
    const query = debounced.trim().toLowerCase();
    return TOOLS.filter((t) => {
      if (cat !== "all" && t.category !== cat) return false;
      if (favOnly && !favorites.includes(t.slug)) return false;
      if (!query) return true;
      return `${t.name} ${t.description} ${t.category} ${t.tags.join(" ")}`.toLowerCase().includes(query);
    });
  }, [cat, debounced, favOnly, favorites]);

  const recentTools = useMemo(
    () => recent.map((s) => TOOLS.find((t) => t.slug === s)).filter(Boolean) as typeof TOOLS,
    [recent]
  );
  const favTools = useMemo(() => TOOLS.filter((t) => isFav(t.slug)), [isFav]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-extrabold tracking-tight">All tools</h1>
      <p className="text-muted mt-1.5 text-sm">Search, filter and open any of the {TOOLS.length} tools.</p>

      <div className="surface mt-6 flex items-center gap-2 rounded-2xl p-2 pl-4">
        <Search className="text-muted h-5 w-5" aria-hidden />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder='Search — try "PDF", "image", "compress"…'
          aria-label="Search tools"
          className="w-full bg-transparent py-2 text-[15px] outline-none placeholder:text-slate-400"
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Filter by category">
        {[{ slug: "all", name: "All" }, ...CATEGORIES.map((c) => ({ slug: c.slug, name: c.name }))].map((c) => (
          <button
            key={c.slug}
            onClick={() => setCat(c.slug)}
            aria-pressed={cat === c.slug}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-xs font-semibold transition",
              cat === c.slug ? "bg-brand-600 text-white" : "surface-soft text-muted hover:text-current"
            )}
          >
            {c.name}
          </button>
        ))}
        <button
          onClick={() => setFavOnly((v) => !v)}
          aria-pressed={favOnly}
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-3.5 py-1.5 text-xs font-semibold transition",
            favOnly ? "bg-amber-400 text-slate-900" : "surface-soft text-muted hover:text-current"
          )}
        >
          <Star className="h-3.5 w-3.5" aria-hidden /> Favorites
        </button>
      </div>

      {(recentTools.length > 0 || favTools.length > 0) && !q && cat === "all" && !favOnly && (
        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          {recentTools.length > 0 && (
            <section aria-label="Recently used">
              <h2 className="flex items-center gap-1.5 text-sm font-semibold">
                <History className="h-4 w-4" aria-hidden /> Recently used
              </h2>
              <div className="mt-3">
                <ToolGrid tools={recentTools.slice(0, 4)} />
              </div>
            </section>
          )}
          {favTools.length > 0 && (
            <section aria-label="Favorite tools">
              <h2 className="flex items-center gap-1.5 text-sm font-semibold">
                <Star className="h-4 w-4" aria-hidden /> Favorites
              </h2>
              <div className="mt-3">
                <ToolGrid tools={favTools.slice(0, 4)} />
              </div>
            </section>
          )}
        </div>
      )}

      <div className="mt-8">
        <p className="text-muted mb-3 text-xs font-semibold uppercase tracking-wider" role="status">
          {filtered.length} result{filtered.length === 1 ? "" : "s"}
        </p>
        <ToolGrid tools={filtered} emptyText="No tools match your search. Try another keyword or category." />
      </div>

      <div className="mt-10">
        <AdSlot placement="tools-bottom" />
      </div>
    </div>
  );
}

export function ToolsDirectory() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-10">Loading…</div>}>
      <DirectoryInner />
    </Suspense>
  );
}
