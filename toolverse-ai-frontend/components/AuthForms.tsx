"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Boxes } from "lucide-react";
import { useAuth } from "@/components/providers";
import { ApiClientError } from "@/lib/api";

function Shell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-14 sm:px-6">
      <Link href="/" className="mx-auto flex items-center gap-2" aria-label="TOOLVERSE AI home">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white">
          <Boxes className="h-5 w-5" aria-hidden />
        </span>
      </Link>
      <h1 className="mt-5 text-center text-2xl font-extrabold tracking-tight">{title}</h1>
      {subtitle && <p className="text-muted mt-1.5 text-center text-sm">{subtitle}</p>}
      <div className="surface mt-6 rounded-2xl p-6">{children}</div>
    </div>
  );
}

const inputCls = "surface-soft w-full rounded-lg px-3.5 py-2.5 text-sm outline-none";

export function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const search = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const next = search.get("next") ?? "/dashboard";

  return (
    <Shell title="Welcome back" subtitle="Sign in to access jobs, files and usage.">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          setBusy(true);
          try {
            await login(email.trim(), password);
            router.push(next);
          } catch (err: any) {
            setError(err instanceof ApiClientError ? err.message : "Sign in failed. Please try again.");
          } finally {
            setBusy(false);
          }
        }}
        className="space-y-3"
      >
        <label className="block text-xs font-semibold">
          Email
          <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={`${inputCls} mt-1`} />
        </label>
        <label className="block text-xs font-semibold">
          Password
          <input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={`${inputCls} mt-1`} />
        </label>
        {error && <p role="alert" className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>}
        <button disabled={busy} className="w-full rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <div className="text-muted mt-4 flex justify-between text-xs">
        <Link href="/forgot-password" className="hover:text-current">Forgot password?</Link>
        <Link href="/register" className="hover:text-current">Create account</Link>
      </div>
    </Shell>
  );
}

export function RegisterForm() {
  const { login } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <Shell title="Create your account" subtitle="Free. Track jobs, files and favorites.">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          setBusy(true);
          try {
            const { AuthAPI } = await import("@/lib/api");
            await AuthAPI.register({ email: email.trim(), password, name: name.trim() || undefined });
            await login(email.trim(), password);
            router.push("/dashboard");
          } catch (err: any) {
            setError(err instanceof ApiClientError ? err.message : "Registration failed.");
          } finally {
            setBusy(false);
          }
        }}
        className="space-y-3"
      >
        <label className="block text-xs font-semibold">
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className={`${inputCls} mt-1`} />
        </label>
        <label className="block text-xs font-semibold">
          Email
          <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={`${inputCls} mt-1`} />
        </label>
        <label className="block text-xs font-semibold">
          Password (min 8 characters)
          <input type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={`${inputCls} mt-1`} />
        </label>
        {error && <p role="alert" className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>}
        <button disabled={busy} className="w-full rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
          {busy ? "Creating…" : "Create account"}
        </button>
      </form>
      <p className="text-muted mt-4 text-center text-xs">
        Already have an account? <Link href="/login" className="font-semibold text-brand-600">Sign in</Link>
      </p>
    </Shell>
  );
}

export function ForgotForm() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <Shell title="Reset password" subtitle="We'll email you a reset link if the account exists.">
      {done ? (
        <p role="status" className="text-sm leading-relaxed">{done}</p>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            setBusy(true);
            try {
              const { AuthAPI } = await import("@/lib/api");
              const res = await AuthAPI.forgotPassword(email.trim());
              setDone(res.resetToken ? `Dev mode reset token: ${res.resetToken}` : "If the email exists, a reset link was sent.");
            } catch (err: any) {
              setError("Please try again later.");
            } finally {
              setBusy(false);
            }
          }}
          className="space-y-3"
        >
          <label className="block text-xs font-semibold">
            Email
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={`${inputCls} mt-1`} />
          </label>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <button disabled={busy} className="w-full rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
            {busy ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}
    </Shell>
  );
}

export function ResetForm() {
  const search = useSearchParams();
  const router = useRouter();
  const [token, setToken] = useState(search.get("token") ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <Shell title="Choose a new password">
      {done ? (
        <div className="text-sm">
          <p role="status">Password updated.</p>
          <Link href="/login" className="mt-2 inline-block font-semibold text-brand-600">Sign in</Link>
        </div>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            setBusy(true);
            try {
              const { AuthAPI } = await import("@/lib/api");
              await AuthAPI.resetPassword(token.trim(), password);
              setDone(true);
            } catch (err: any) {
              setError(err?.message ?? "Reset failed. The link may have expired.");
            } finally {
              setBusy(false);
            }
          }}
          className="space-y-3"
        >
          <label className="block text-xs font-semibold">
            Reset token
            <input required value={token} onChange={(e) => setToken(e.target.value)} className={`${inputCls} mt-1 font-mono`} />
          </label>
          <label className="block text-xs font-semibold">
            New password
            <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" className={`${inputCls} mt-1`} />
          </label>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <button disabled={busy} className="w-full rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
            {busy ? "Updating…" : "Update password"}
          </button>
        </form>
      )}
    </Shell>
  );
}
