import type { MetadataRoute } from "next";
import { TOOLS, CATEGORIES } from "@/lib/tools";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const API = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000").replace(/\/$/, "");

async function blogSlugs(): Promise<string[]> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(`${API}/api/blog?page=1&limit=100`, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return [];
    const json = await res.json();
    const items = Array.isArray(json?.data) ? json.data : (json?.data?.posts ?? json?.posts ?? []);
    return items.map((p: any) => p.slug).filter(Boolean);
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticRoutes = ["", "/tools", "/blog", "/privacy", "/login", "/register"].map((r) => ({
    url: `${SITE}${r || "/"}`,
    lastModified: now,
  }));
  const tools = TOOLS.map((t) => ({
    url: `${SITE}/tools/${t.slug}`,
    lastModified: now,
  }));
  const cats = CATEGORIES.map((c) => ({
    url: `${SITE}/categories/${c.slug}`,
    lastModified: now,
  }));
  const posts = (await blogSlugs()).map((s) => ({
    url: `${SITE}/blog/${s}`,
    lastModified: now,
  }));
  return [...staticRoutes, ...tools, ...cats, ...posts];
}
