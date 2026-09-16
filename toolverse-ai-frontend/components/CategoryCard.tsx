"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CATEGORIES, TOOLS } from "@/lib/tools";

export function CategoryGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {CATEGORIES.map((c) => {
        const count = TOOLS.filter((t) => t.category === c.slug).length;
        const Icon = c.icon;
        return (
          <Link
            key={c.slug}
            href={`/tools?cat=${c.slug}`}
            className="surface card-hover group rounded-2xl p-5"
            aria-label={`${c.name} tools`}
          >
            <div className="flex items-center justify-between">
              <span className="surface-soft rounded-xl p-2.5">
                <Icon className="h-5 w-5 text-brand-600" aria-hidden />
              </span>
              <ArrowRight className="text-muted h-4 w-4 transition group-hover:translate-x-1 group-hover:text-current" aria-hidden />
            </div>
            <h3 className="mt-3 font-semibold">{c.name}</h3>
            <p className="text-muted mt-0.5 text-sm">
              {c.tagline} · {count} tools
            </p>
          </Link>
        );
      })}
    </div>
  );
}
