"use client";

import Link from "next/link";
import { TOOLS } from "@/lib/tools";
import { ToolGrid } from "@/components/ToolCard";
import { usePrefs } from "@/components/providers";
import { EmptyState } from "@/components/ui";

export default function FavoritesPage() {
  const { favorites } = usePrefs();
  const tools = TOOLS.filter((t) => favorites.includes(t.slug));
  return (
    <div>
      <h1 className="text-xl font-extrabold tracking-tight">Favorites</h1>
      <p className="text-muted mt-1 text-sm">Quick access to the tools you use most.</p>
      <div className="mt-4">
        {tools.length === 0 ? (
          <EmptyState title="No favorites yet" body="Tap the star on any tool to pin it here." />
        ) : (
          <ToolGrid tools={tools} />
        )}
      </div>
      <Link href="/tools" className="mt-4 inline-block text-sm font-semibold text-brand-600">
        Browse all tools
      </Link>
    </div>
  );
}
