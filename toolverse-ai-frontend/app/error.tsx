"use client";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <h1 className="text-xl font-bold">Something went wrong</h1>
      <p className="text-muted mt-1.5 text-sm">Please try again. If the backend is offline, check your connection.</p>
      <button onClick={reset} className="mt-5 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white">
        Try Again
      </button>
    </div>
  );
}
