import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { TOOLS, categoryName, toolBySlug } from "@/lib/tools";
import { ToolRunner, FavoriteButton } from "@/components/ToolRunner";
import { RelatedTools } from "@/components/RelatedTools";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export function generateStaticParams() {
  return TOOLS.map((t) => ({ slug: t.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const tool = toolBySlug(params.slug);
  if (!tool) return { title: "Tool not found" };
  const title = `${tool.name} — Free Online ${categoryName(tool.category)} Tool`;
  const description = `${tool.description} Free, fast and secure with TOOLVERSE AI.`;
  return {
    title,
    description,
    alternates: { canonical: `${SITE}/tools/${tool.slug}` },
    openGraph: { title, description, url: `${SITE}/tools/${tool.slug}`, type: "website" },
    twitter: { card: "summary", title, description },
  };
}

export default function ToolPage({ params }: { params: { slug: string } }) {
  const tool = toolBySlug(params.slug);
  if (!tool) notFound();
  const Icon = tool.icon;
  const related = TOOLS.filter((t) => t.category === tool.category && t.slug !== tool.slug).slice(0, 4);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: tool.name,
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Web",
    description: tool.description,
    url: `${SITE}/tools/${tool.slug}`,
    offers: { "@type": "Offer", price: "0" },
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav aria-label="Breadcrumb" className="text-muted flex items-center gap-1 text-xs">
        <Link href="/" className="hover:text-current">Home</Link>
        <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        <Link href="/tools" className="hover:text-current">Tools</Link>
        <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        <Link href={`/tools?cat=${tool.category}`} className="hover:text-current">{categoryName(tool.category)}</Link>
        <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        <span aria-current="page" className="text-current">{tool.name}</span>
      </nav>

      <header className="mt-5 flex flex-wrap items-start gap-4">
        <span className="surface rounded-2xl p-3.5">
          <Icon className="h-8 w-8 text-brand-600" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{tool.name}</h1>
          <p className="text-muted mt-1 max-w-2xl text-[15px] leading-relaxed">
            {tool.longDescription ?? tool.description}
            {tool.uiType !== "local" && " Processing runs on the TOOLVERSE backend — never faked."}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="surface-soft rounded-full px-2.5 py-0.5 text-xs font-semibold text-muted">
              {categoryName(tool.category)}
            </span>
            {tool.uiType !== "local" && (
              <span className="surface-soft rounded-full px-2.5 py-0.5 text-xs font-medium text-muted">
                Accepts: {tool.accepted.join(", ")}
              </span>
            )}
            {tool.uiType === "local" && (
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                Works offline
              </span>
            )}
            <FavoriteButton slug={tool.slug} name={tool.name} />
          </div>
        </div>
      </header>

      <div className="mt-7">
        <ToolRunner slug={tool.slug} />
      </div>

      <section className="mt-12" aria-label="How it works">
        <h2 className="font-bold">How it works</h2>
        <ol className="text-muted mt-2 grid gap-2 text-sm sm:grid-cols-3">
          {tool.uiType === "local"
            ? ["Enter your input above.", "Everything runs locally in your browser.", "Copy or download the result."].map((s, i) => (
                <li key={i} className="surface rounded-xl p-3.5"><span className="font-bold text-brand-600">{i + 1}. </span>{s}</li>
              ))
            : [`Upload your ${tool.uiType === "text" ? "text" : "file"} above.`, "The backend queues a job and processes it (QUEUED → PROCESSING → COMPLETED).", "Download the result. Failures show honest error states."].map((s, i) => (
                <li key={i} className="surface rounded-xl p-3.5"><span className="font-bold text-brand-600">{i + 1}. </span>{s}</li>
              ))}
        </ol>
      </section>

      {related.length > 0 && (
        <section className="mt-10" aria-label="Related tools">
          <h2 className="font-bold">Related tools</h2>
          <div className="mt-3">
            <RelatedTools slugs={related.map((t) => t.slug)} />
          </div>
        </section>
      )}
    </div>
  );
}
