"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Boxes, Menu, Moon, Search, Sun, X, LayoutDashboard } from "lucide-react";
import { useAuth, usePalette, useTheme } from "./providers";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/tools", label: "Tools" },
  { href: "/blog", label: "Blog" },
];

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className="surface-soft rounded-lg p-2 transition hover:opacity-80"
    >
      {theme === "dark" ? <Sun className="h-4.5 w-4.5 h-5 w-5" aria-hidden /> : <Moon className="h-5 w-5" aria-hidden />}
    </button>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { setOpen } = usePalette();
  const [mobile, setMobile] = useState(false);

  return (
    <header className="glass sticky top-0 z-50 border-b" style={{ borderColor: "rgb(var(--border))" }}>
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5" aria-label="TOOLVERSE AI home">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
            <Boxes className="h-5 w-5" aria-hidden />
          </span>
          <span className="text-[17px] font-bold tracking-tight">
            TOOLVERSE <span className="text-brand-600">AI</span>
          </span>
        </Link>

        <nav className="ml-6 hidden items-center gap-1 md:flex" aria-label="Primary">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium transition",
                pathname?.startsWith(l.href) ? "bg-black/5 dark:bg-white/10" : "text-muted hover:text-current"
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setOpen(true)}
            className="surface-soft hidden items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted transition hover:text-current sm:flex"
            aria-label="Search tools (Ctrl+K)"
          >
            <Search className="h-4 w-4" aria-hidden />
            <span className="hidden lg:inline">Search tools…</span>
            <kbd className="surface hidden rounded px-1.5 py-0.5 text-[11px] font-semibold lg:inline">Ctrl K</kbd>
          </button>
          <ThemeToggle />
          {user ? (
            <>
              <Link
                href="/dashboard"
                className="hidden items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-700 sm:inline-flex"
              >
                <LayoutDashboard className="h-4 w-4" aria-hidden /> Dashboard
              </Link>
              <button
                onClick={logout}
                className="surface-soft hidden rounded-lg px-3 py-2 text-sm font-medium sm:block"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="hidden rounded-lg px-3 py-2 text-sm font-medium text-muted hover:text-current sm:block">
                Sign in
              </Link>
              <Link
                href="/register"
                className="hidden rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-slate-700 dark:bg-white dark:text-slate-900 sm:block"
              >
                Get started
              </Link>
            </>
          )}
          <button
            className="surface-soft rounded-lg p-2 md:hidden"
            aria-label={mobile ? "Close menu" : "Open menu"}
            aria-expanded={mobile}
            onClick={() => setMobile((v) => !v)}
          >
            {mobile ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
          </button>
        </div>
      </div>
      {mobile && (
        <nav className="border-t px-4 py-3 md:hidden" style={{ borderColor: "rgb(var(--border))" }} aria-label="Mobile">
          <div className="flex flex-col gap-1">
            <button
              onClick={() => {
                setMobile(false);
                setOpen(true);
              }}
              className="surface-soft flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm"
            >
              <Search className="h-4 w-4" aria-hidden /> Search tools…
            </button>
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setMobile(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium">
                {l.label}
              </Link>
            ))}
            {user ? (
              <>
                <Link href="/dashboard" onClick={() => setMobile(false)} className="rounded-lg bg-brand-600 px-3 py-2.5 text-sm font-medium text-white">
                  Dashboard
                </Link>
                <button onClick={() => { logout(); setMobile(false); }} className="surface-soft rounded-lg px-3 py-2.5 text-left text-sm">
                  Sign out ({user.email})
                </button>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setMobile(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium">
                  Sign in
                </Link>
                <Link href="/register" onClick={() => setMobile(false)} className="rounded-lg bg-slate-900 px-3 py-2.5 text-sm font-medium text-white dark:bg-white dark:text-slate-900">
                  Get started
                </Link>
              </>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const { setOpen } = usePalette();
  const items = [
    { href: "/", label: "Home" },
    { href: "/tools", label: "Tools" },
    { href: "/dashboard", label: "Saved" },
  ];
  return (
    <nav
      aria-label="Mobile bottom"
      className="glass fixed inset-x-0 bottom-0 z-50 border-t md:hidden"
      style={{ borderColor: "rgb(var(--border))" }}
    >
      <div className="grid grid-cols-4 gap-1 px-2 py-2">
        {items.map((i) => (
          <Link
            key={i.href}
            href={i.href}
            className={cn(
              "rounded-lg py-2 text-center text-xs font-medium",
              pathname === i.href ? "bg-black/5 dark:bg-white/10" : "text-muted"
            )}
          >
            {i.label}
          </Link>
        ))}
        <button onClick={() => setOpen(true)} className="text-muted rounded-lg py-2 text-center text-xs font-medium">
          Search
        </button>
      </div>
    </nav>
  );
}
