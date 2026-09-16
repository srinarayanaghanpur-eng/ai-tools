"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Search, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { TOOLS, CATEGORIES } from "@/lib/tools";
import { ToolGrid } from "@/components/ToolCard";
import { CategoryGrid } from "@/components/CategoryCard";
import { usePalette } from "@/components/providers";
import { useReveal } from "@/lib/hooks";

export default function HomePage() {
  const { setOpen } = usePalette();
  const [q, setQ] = useState("");
  const revealRef = useReveal();

  const popular = useMemo(() => TOOLS.filter((t) => t.popular).slice(0, 8), []);
  const preview = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return [];
    return TOOLS.filter((t) =>
      `${t.name} ${t.description} ${t.category} ${t.tags.join(" ")}`.toLowerCase().includes(query)
    ).slice(0, 5);
  }, [q]);

  return (
    <div ref={revealRef}>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(600px 300px at 20% 0%, rgb(59 99 246 / 0.10), transparent), radial-gradient(600px 300px at 80% 10%, rgb(59 99 246 / 0.07), transparent)",
          }}
        />
        <div className="relative mx-auto max-w-7xl px-4 pb-10 pt-14 sm:px-6 sm:pt-20">
          <div className="reveal mx-auto max-w-3xl text-center">
            <span className="surface inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-brand-700 dark:text-brand-300">
              <Sparkles className="h-3.5 w-3.5" aria-hidden /> 40+ tools · AI + converters + PDF
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
              EVERY TOOL.
              <br />
              ONE PLACE.
            </h1>
            <p className="text-muted mx-auto mt-4 max-w-xl text-base leading-relaxed sm:text-lg">
              Powerful AI tools, converters, PDF utilities and productivity tools built for everyday work.
            </p>
            {/* Search */}
            <div className="relative mx-auto mt-7 max-w-xl">
              <div className="surface flex items-center gap-2 rounded-2xl p-2 pl-4 shadow-card">
                <Search className="text-muted h-5 w-5 shrink-0" aria-hidden />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onFocus={() => {}}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && preview[0]) {
                      window.location.href = `/tools/${preview[0].slug}`;
                    }
                  }}
                  placeholder="Search for a tool…"
                  aria-label="Search for a tool"
                  className="w-full bg-transparent py-2.5 text-[15px] outline-none placeholder:text-slate-400"
                />
                <button
                  onClick={() => setOpen(true)}
                  className="surface-soft hidden rounded-xl px-2.5 py-1.5 text-xs font-semibold sm:block"
                >
                  Ctrl K
                </button>
                <Link
                  href="/tools"
                  className="shrink-0 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
                >
                  Explore Tools
                </Link>
              </div>
              {q.trim() && (
                <ul className="surface absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-2xl p-1.5 text-left shadow-pop" aria-label="Quick matches">
                  {preview.length === 0 && (
                    <li className="text-muted px-3 py-4 text-center text-sm">No matches — try “PDF”, “image” or “compress”.</li>
                  )}
                  {preview.map((t) => (
                    <li key={t.slug}>
                      <Link href={`/tools/${t.slug}`} className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-black/5 dark:hover:bg-white/5">
                        <t.icon className="h-4 w-4 text-brand-600" aria-hidden />
                        <span>
                          <span className="block text-sm font-semibold">{t.name}</span>
                          <span className="text-muted block text-xs">{t.description}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
              <Link
                href="/tools"
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 dark:bg-white dark:text-slate-900"
              >
                Explore Tools <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link
                href="#popular"
                className="surface inline-flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-semibold"
              >
                <Zap className="h-4 w-4 text-brand-600" aria-hidden /> Popular Tools
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Popular */}
      <section id="popular" className="mx-auto max-w-7xl scroll-mt-20 px-4 sm:px-6">
        <div className="reveal flex items-end justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight sm:text-2xl">Popular tools</h2>
            <p className="text-muted mt-1 text-sm">Most used across TOOLVERSE AI.</p>
          </div>
          <Link href="/tools" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600">
            View all <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
        <div className="reveal mt-5">
          <ToolGrid tools={popular} />
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto mt-14 max-w-7xl px-4 sm:px-6">
        <div className="reveal">
          <h2 className="text-xl font-bold tracking-tight sm:text-2xl">Browse by category</h2>
          <p className="text-muted mt-1 text-sm">AI, documents, media, developer utilities and more.</p>
        </div>
        <div className="reveal mt-5">
          <CategoryGrid />
        </div>
        <div className="reveal mt-4 flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <Link key={c.slug} href={`/tools?cat=${c.slug}`} className="surface-soft rounded-full px-3.5 py-1.5 text-xs font-semibold">
              {c.name}
            </Link>
          ))}
        </div>
      </section>

      {/* Trust strip */}
      <section className="mx-auto mt-14 max-w-7xl px-4 sm:px-6">
        <div className="reveal surface-soft grid gap-4 rounded-2xl p-6 sm:grid-cols-3">
          {[
            { icon: ShieldCheck, title: "Private by design", body: "Files are processed by the backend API and served via signed, expiring downloads." },
            { icon: Zap, title: "Fast job pipeline", body: "Upload returns a job ID instantly. Poll QUEUED → PROCESSING → COMPLETED." },
            { icon: Sparkles, title: "Real processing", body: "No fake results. Failures surface honest backend error states." },
          ].map((f) => (
            <div key={f.title} className="flex gap-3">
              <span className="surface h-fit rounded-xl p-2.5">
                <f.icon className="h-5 w-5 text-brand-600" aria-hidden />
              </span>
              <span>
                <span className="block text-sm font-semibold">{f.title}</span>
                <span className="text-muted mt-0.5 block text-sm leading-relaxed">{f.body}</span>
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
