"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Share2 } from "lucide-react";

function headingsFromMarkdown(md: string): Array<{ id: string; text: string; level: number }> {
  return md
    .split("\n")
    .filter((l) => /^#{1,3}\s+/.test(l))
    .slice(0, 12)
    .map((l, i) => {
      const level = l.match(/^#+/)?.[0].length ?? 2;
      const text = l.replace(/^#+\s+/, "").trim();
      const id = `h-${i}-${text.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}`;
      return { id, text, level };
    });
}

function renderMarkdown(md: string): string {
  // Minimal safe renderer: escape HTML, then support headings/bold/code/lists/paragraphs.
  const esc = md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const lines = esc.split("\n");
  let html = "";
  let inList = false;
  for (const line of lines) {
    if (/^#{1,3}\s+/.test(line)) {
      if (inList) {
        html += "</ul>";
        inList = false;
      }
      const level = line.match(/^#+/)?.[0].length ?? 2;
      const text = line.replace(/^#+\s+/, "");
      html += `<h${level}>${text}</h${level}>`;
    } else if (/^[-*]\s+/.test(line)) {
      if (!inList) {
        html += "<ul>";
        inList = true;
      }
      html += `<li>${line.replace(/^[-*]\s+/, "")}</li>`;
    } else if (line.trim() === "") {
      if (inList) {
        html += "</ul>";
        inList = false;
      }
    } else {
      if (inList) {
        html += "</ul>";
        inList = false;
      }
      const inline = line
        .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
        .replace(/`([^`]+)`/g, "<code>$1</code>");
      html += `<p>${inline}</p>`;
    }
  }
  if (inList) html += "</ul>";
  return html;
}

export function ReadingArticle({ post }: { post: any }) {
  const [progress, setProgress] = useState(0);
  const headings = useMemo(() => headingsFromMarkdown(post.content ?? ""), [post.content]);
  const html = useMemo(() => renderMarkdown(post.content ?? ""), [post.content]);

  useEffect(() => {
    const onScroll = () => {
      const el = document.getElementById("article-body");
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const total = el.offsetHeight - window.innerHeight + 200;
      const read = Math.min(Math.max(-rect.top + 200, 0), Math.max(total, 1));
      setProgress(Math.round((read / Math.max(total, 1)) * 100));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: post.title, url: window.location.href });
      else await navigator.clipboard.writeText(window.location.href);
    } catch {
      /* ignore */
    }
  };

  return (
    <>
      <div className="fixed inset-x-0 top-16 z-40 h-1 bg-transparent" aria-hidden>
        <div className="h-full bg-brand-600 transition-all" style={{ width: `${progress}%` }} />
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        {(post.tags ?? []).map((t: string) => (
          <span key={t} className="surface-soft rounded-full px-2.5 py-0.5 text-xs font-medium text-muted">#{t}</span>
        ))}
        <button onClick={share} className="surface ml-auto inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium">
          <Share2 className="h-3.5 w-3.5" aria-hidden /> Share
        </button>
      </div>
      {headings.length > 1 && (
        <nav aria-label="Table of contents" className="surface mt-5 rounded-2xl p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">On this page</p>
          <ul className="mt-2 space-y-1 text-sm">
            {headings.map((h) => (
              <li key={h.id} style={{ paddingLeft: (h.level - 1) * 12 }}>
                <span className="text-muted">{h.text}</span>
              </li>
            ))}
          </ul>
        </nav>
      )}
      <article id="article-body" className="prose-tv mt-6" dangerouslySetInnerHTML={{ __html: html }} />
      <p className="mt-8 text-sm">
        <Link href="/blog" className="font-semibold text-brand-600">← Back to blog</Link>
      </p>
    </>
  );
}
