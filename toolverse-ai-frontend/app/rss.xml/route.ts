/** RSS feed for the blog — helps search engines discover new articles. */
export const revalidate = 3600;

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const API = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000").replace(/\/$/, "");

function esc(s: string): string {
  return (s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function GET() {
  let posts: any[] = [];
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(`${API}/api/blog?page=1&limit=30`, { signal: ctrl.signal });
    clearTimeout(t);
    if (res.ok) {
      const json = await res.json();
      posts = Array.isArray(json?.data) ? json.data : (json?.data?.posts ?? json?.posts ?? []);
    }
  } catch {
    posts = [];
  }

  const items = posts
    .map(
      (p) => `    <item>
      <title>${esc(p.title ?? p.slug)}</title>
      <link>${SITE}/blog/${esc(p.slug)}</link>
      <guid>${SITE}/blog/${esc(p.slug)}</guid>
      ${p.published_at ? `<pubDate>${new Date(p.published_at).toUTCString()}</pubDate>` : ""}
      <description>${esc(p.excerpt ?? "")}</description>
    </item>`
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>TOOLVERSE AI Blog</title>
    <link>${SITE}/blog</link>
    <description>AI, productivity, PDF and converter guides from TOOLVERSE AI.</description>
    <language>en</language>
${items}
  </channel>
</rss>
`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
