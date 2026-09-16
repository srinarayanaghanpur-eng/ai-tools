import type { Metadata } from "next";
import { BlogAPI } from "@/lib/api";
import { BlogCard } from "@/components/BlogCard";
import { AdSlot } from "@/components/ads";

export const metadata: Metadata = {
  title: "Blog",
  description: "AI, productivity, PDF and converter guides from TOOLVERSE AI.",
};
export const revalidate = 300;

async function getPosts() {
  try {
    const res: any = await BlogAPI.list({ page: 1, limit: 24 });
    const items = Array.isArray(res) ? res : (res.posts ?? res.data ?? []);
    return items;
  } catch {
    return null;
  }
}

export default async function BlogPage() {
  const posts = await getPosts();
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">Blog</p>
      <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Guides & tutorials</h1>
      <p className="text-muted mt-1.5 max-w-xl text-sm leading-relaxed">
        AI, technology, productivity, PDF workflows and developer how-tos — served live from the TOOLVERSE backend.
      </p>
      {posts === null ? (
        <div className="surface mt-6 rounded-2xl p-8 text-center" role="alert">
          <p className="font-semibold">Blog is unreachable</p>
          <p className="text-muted mt-1 text-sm">The backend API may be offline. Please try again later.</p>
        </div>
      ) : posts.length === 0 ? (
        <p className="text-muted mt-6 text-sm">No articles yet.</p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((p: any) => (
            <BlogCard key={p.slug ?? p.id} post={p} />
          ))}
        </div>
      )}
      <div className="mt-10">
        <AdSlot placement="blog-top" />
      </div>
    </div>
  );
}
