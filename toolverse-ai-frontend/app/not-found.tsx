import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <p className="text-6xl font-extrabold tracking-tight">404</p>
      <h1 className="mt-3 text-xl font-bold">Page not found</h1>
      <p className="text-muted mt-1.5 text-sm">The page you’re looking for doesn’t exist or was moved.</p>
      <div className="mt-5 flex justify-center gap-2">
        <Link href="/" className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white">Home</Link>
        <Link href="/tools" className="surface rounded-xl px-5 py-2.5 text-sm font-semibold">All tools</Link>
      </div>
    </div>
  );
}
