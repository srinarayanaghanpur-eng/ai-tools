import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { CATEGORIES, categoryName } from "@/lib/tools";
import { CATEGORY_SEO } from "@/lib/seo";
import type { ToolCategorySlug } from "@/lib/tools";
import { RelatedTools } from "@/components/RelatedTools";
import { TOOLS } from "@/lib/tools";
import { AdSlot } from "@/components/ads";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ slug: c.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const seo = CATEGORY_SEO[params.slug as ToolCategorySlug];
  if (!seo) return { title: "Category not found" };
  return {
    title: `${seo.title} · TOOLVERSE AI`,
    description: seo.description,
    alternates: { canonical: `${SITE}/categories/${params.slug}` },
    openGraph: {
      title: `${seo.title} · TOOLVERSE AI`,
      description: seo.description,
      url: `${SITE}/categories/${params.slug}`,
      type: "website",
    },
    twitter: { card: "summary", title: `${seo.title} · TOOLVERSE AI`, description: seo.description },
  };
}

export default function CategoryPage({ params }: { params: { slug: string } }) {
  const cat = CATEGORIES.find((c) => c.slug === params.slug);
  const seo = CATEGORY_SEO[params.slug as ToolCategorySlug];
  if (!cat || !seo) notFound();
  const Icon = cat.icon;
  const slugs = TOOLS.filter((t) => t.category === cat.slug).map((t) => t.slug);
  const others = CATEGORIES.filter((c) => c.slug !== cat.slug);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: seo.title,
    description: seo.description,
    url: `${SITE}/categories/${cat.slug}`,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: slugs.slice(0, 12).map((s, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${SITE}/tools/${s}`,
      })),
    },
  };
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: seo.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <nav aria-label="Breadcrumb" className="text-muted flex items-center gap-1 text-xs">
        <Link href="/" className="hover:text-current">Home</Link>
        <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        <Link href="/tools" className="hover:text-current">Tools</Link>
        <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        <span aria-current="page" className="text-current">{cat.name}</span>
      </nav>

      <header className="mt-5 flex items-start gap-4">
        <span className="surface rounded-2xl p-3.5">
          <Icon className="h-8 w-8 text-brand-600" aria-hidden />
        </span>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{cat.name}</h1>
          <p className="text-muted mt-1 text-[15px]">{seo.description}</p>
        </div>
      </header>

      <div className="prose-tv mt-6 max-w-3xl">
        {seo.intro.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>

      <h2 className="mt-8 text-lg font-bold">
        {slugs.length} {cat.name.toLowerCase()} — pick a tool
      </h2>
      <div className="mt-3">
        <RelatedTools slugs={slugs} />
      </div>

      <div className="mt-10">
        <AdSlot placement="tools-bottom" />
      </div>

      <section aria-label="Frequently asked questions" className="mt-10 max-w-3xl">
        <h2 className="text-lg font-bold">Frequently asked questions</h2>
        <div className="mt-3 space-y-2.5">
          {seo.faqs.map((f) => (
            <details key={f.q} className="surface rounded-xl px-4 py-3">
              <summary className="cursor-pointer text-sm font-semibold">{f.q}</summary>
              <p className="text-muted mt-1.5 text-sm leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <nav aria-label="Other categories" className="mt-10">
        <h2 className="text-sm font-semibold">Explore other categories</h2>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {others.map((c) => (
            <Link key={c.slug} href={`/categories/${c.slug}`} className="surface-soft rounded-full px-3.5 py-1.5 text-xs font-semibold">
              {c.name}
            </Link>
          ))}
        </div>
      </nav>

      <p className="mt-8 text-sm">
        <Link href="/tools" className="font-semibold text-brand-600">
          ← Browse all {TOOLS.length} tools
        </Link>
        {" · "}
        <Link href={`/tools?cat=${cat.slug}`} className="text-muted hover:text-current">
          Filter: {categoryName(cat.slug)}
        </Link>
      </p>
    </div>
  );
}
