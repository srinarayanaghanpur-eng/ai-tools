"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CornerDownLeft, Search } from "lucide-react";
import { searchTools } from "@/lib/tools";
import { categoryName } from "@/lib/tools";
import { usePalette } from "./providers";
import { useDebounce } from "@/lib/hooks";
import { cn } from "@/lib/utils";

export function CommandPalette() {
  const { open, setOpen } = usePalette();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const debounced = useDebounce(query, 120);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => searchTools(debounced, 10), [debounced]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open ]);

  useEffect(() => setActive(0), [debounced]);

  if (!open) return null;

  const go = (slug: string) => {
    setOpen(false);
    router.push(`/tools/${slug}`);
  };

  return (
    <div className="fixed inset-0 z-[85]" role="dialog" aria-modal="true" aria-label="Search tools">
      <button aria-label="Close search" className="absolute inset-0 bg-black/50 animate-fade-in" onClick={() => setOpen(false)} />
      <div className="mx-auto mt-[12vh] w-[calc(100%-2rem)] max-w-xl animate-fade-up">
        <div className="surface overflow-hidden rounded-2xl shadow-pop">
          <div className="flex items-center gap-2 border-b px-4" style={{ borderColor: "rgb(var(--border))" }}>
            <Search className="text-muted h-4 w-4" aria-hidden />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActive((a) => Math.min(a + 1, results.length - 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActive((a) => Math.max(a - 1, 0));
                } else if (e.key === "Enter" && results[active]) {
                  go(results[active].slug);
                }
              }}
              placeholder='Try "PDF", "image", "compress"…'
              aria-label="Search tools"
              role="combobox"
              aria-expanded="true"
              aria-controls="tool-search-results"
              aria-activedescendant={results[active] ? `tool-${results[active].slug}` : undefined}
              className="w-full bg-transparent py-3.5 text-[15px] outline-none placeholder:text-slate-400"
            />
            <kbd className="surface-soft hidden rounded px-1.5 py-0.5 text-[11px] font-semibold sm:block">ESC</kbd>
          </div>
          <ul id="tool-search-results" role="listbox" aria-label="Matching tools" className="max-h-[50vh] overflow-auto p-2">
            {results.length === 0 && (
              <li className="text-muted px-3 py-8 text-center text-sm">
                {query ? `No tools match "${query}".` : "Type to search by name, category or tag."}
              </li>
            )}
            {results.map((t, i) => {
              const Icon = t.icon;
              return (
                <li key={t.slug} role="option" id={`tool-${t.slug}`} aria-selected={i === active}>
                  <button
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(t.slug)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition",
                      i === active && "bg-black/5 dark:bg-white/10"
                    )}
                  >
                    <span className="surface-soft rounded-lg p-2">
                      <Icon className="h-4 w-4 text-brand-600" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{t.name}</span>
                      <span className="text-muted block truncate text-xs">
                        {categoryName(t.category)} · {t.description}
                      </span>
                    </span>
                    <CornerDownLeft className="text-muted h-4 w-4" aria-hidden />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
