import Link from "next/link";
import { Boxes } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-20 border-t" style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--bg-soft))" }}>
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
              <Boxes className="h-5 w-5" aria-hidden />
            </span>
            <span className="font-bold tracking-tight">
              TOOLVERSE <span className="text-brand-600">AI</span>
            </span>
          </div>
          <p className="text-muted mt-3 max-w-xs text-sm leading-relaxed">
            Every tool. One place. AI writing, converters, PDF utilities and productivity tools for everyday work.
          </p>
        </div>
        <nav aria-label="Tools">
          <h3 className="text-sm font-semibold">Tools</h3>
          <ul className="text-muted mt-3 space-y-2 text-sm">
            <li><Link href="/tools?cat=ai" className="hover:text-current">AI tools</Link></li>
            <li><Link href="/tools?cat=pdf" className="hover:text-current">PDF tools</Link></li>
            <li><Link href="/tools?cat=image" className="hover:text-current">Image tools</Link></li>
            <li><Link href="/tools?cat=developer" className="hover:text-current">Developer tools</Link></li>
          </ul>
        </nav>
        <nav aria-label="Company">
          <h3 className="text-sm font-semibold">Product</h3>
          <ul className="text-muted mt-3 space-y-2 text-sm">
            <li><Link href="/tools" className="hover:text-current">All tools</Link></li>
            <li><Link href="/blog" className="hover:text-current">Blog</Link></li>
            <li><Link href="/dashboard" className="hover:text-current">Dashboard</Link></li>
          </ul>
        </nav>
        <nav aria-label="Account">
          <h3 className="text-sm font-semibold">Account</h3>
          <ul className="text-muted mt-3 space-y-2 text-sm">
            <li><Link href="/login" className="hover:text-current">Sign in</Link></li>
            <li><Link href="/register" className="hover:text-current">Create account</Link></li>
            <li><Link href="/forgot-password" className="hover:text-current">Reset password</Link></li>
          </ul>
        </nav>
      </div>
      <div className="border-t py-5" style={{ borderColor: "rgb(var(--border))" }}>
        <p className="text-muted mx-auto max-w-7xl px-4 text-xs sm:px-6">
          © {new Date().getFullYear()} TOOLVERSE AI. Processing by the TOOLVERSE backend API.
        </p>
      </div>
    </footer>
  );
}
