import type { MetadataRoute } from "next";
import { TOOLS } from "@/lib/tools";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const staticRoutes = ["", "/tools", "/blog", "/login", "/register"].map((r) => ({
    url: `${SITE}${r || "/"}`,
    lastModified: now,
  }));
  const tools = TOOLS.map((t) => ({
    url: `${SITE}/tools/${t.slug}`,
    lastModified: now,
  }));
  return [...staticRoutes, ...tools];
}
