import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BlogAPI } from "@/lib/api";
import { BlogCard } from "@/components/BlogCard";
import { ReadingArticle } from "@/components/ReadingArticle";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
export const revalidate = 300;

async function getPost(slug: string) {
  try {
    const { post } = await BlogAPI.get(slug);
    return post;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = await getPost(params.slug);
  if (!post) return { title: "Article not found" };
  const title = post.seo_title ?? post.title;
  const description = post.seo_description ?? post.excerpt ?? "TOOLVERSE AI article.";
  return {
    title,
    description,
    alternates: { canonical: `${SITE}/blog/${post.slug}` },
    openGraph: { title, description, url: `${SITE}/blog/${post.slug}`, type: "article" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function ArticlePage({ params }: { params: { slug: string } }) {
  const post = await getPost(params.slug);
  if (!post) notFound();

  let related: any[] = [];
  try {
    const res: any = await BlogAPI.list({ page: 1, limit: 12 });
    const items = Array.isArray(res) ? res : (res.posts ?? res.data ?? []);
    related = items.filter((p: any) => p.slug !== post.slug).slice(0, 3);
  } catch {
    related = [];
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.published_at,
    author: { "@type": "Person", name: post.author ?? "TOOLVERSE" },
    mainEntityOfPage: `${SITE}/blog/${post.slug}`,
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav aria-label="Breadcrumb" className="text-muted text-xs">
        <Link href="/blog" className="hover:text-current">Blog</Link> / <span aria-current="page">{post.title}</span>
      </nav>
      <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-brand-600">
        {post.category_name ?? post.category_slug ?? "Article"}
      </p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">{post.title}</h1>
      {post.excerpt && <p className="text-muted mt-3 text-lg leading-relaxed">{post.excerpt}</p>}
      <p className="text-muted mt-3 text-xs">
        {post.author ?? "TOOLVERSE"} · {post.published_at ? new Date(post.published_at).toLocaleDateString() : ""}
      </p>
      <ReadingArticle post={post} />
      {related.length > 0 && (
        <section className="mt-12" aria-label="Related articles">
          <h2 className="font-bold">Related articles</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            {related.map((p: any) => (
              <BlogCard key={p.slug} post={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
