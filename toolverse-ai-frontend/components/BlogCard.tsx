import Link from "next/link";
import { CalendarDays, User } from "lucide-react";

export function BlogCard({ post }: { post: any }) {
  const title = post.title ?? post.slug;
  return (
    <Link href={`/blog/${post.slug}`} className="surface card-hover group flex flex-col overflow-hidden rounded-2xl">
      <div className="surface-soft flex h-40 items-center justify-center text-4xl font-bold text-brand-600/40" aria-hidden>
        {(title as string).slice(0, 1).toUpperCase()}
      </div>
      <div className="flex flex-1 flex-col p-5">
        {post.category_slug || post.category_name ? (
          <span className="surface-soft w-fit rounded-full px-2.5 py-0.5 text-xs font-semibold text-brand-700 dark:text-brand-300">
            {post.category_name ?? post.category_slug}
          </span>
        ) : null}
        <h3 className="mt-2.5 font-semibold leading-snug tracking-tight group-hover:text-brand-700">{title}</h3>
        {post.excerpt && <p className="text-muted mt-1.5 line-clamp-2 text-sm leading-relaxed">{post.excerpt}</p>}
        <div className="text-muted mt-auto flex items-center gap-3 pt-4 text-xs">
          <span className="inline-flex items-center gap-1">
            <User className="h-3.5 w-3.5" aria-hidden /> {post.author ?? "TOOLVERSE"}
          </span>
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden />
            {post.published_at ? new Date(post.published_at).toLocaleDateString() : ""}
          </span>
        </div>
      </div>
    </Link>
  );
}
