"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import Script from "next/script";
import Link from "next/link";
import { ADS, isAdsConfigured, type AdPlacement } from "@/lib/ads";
import { cn } from "@/lib/utils";

// ---------- Consent ----------

type Consent = "unknown" | "accepted" | "declined";
const KEY = "tv-ad-consent";

const ConsentCtx = createContext<{ consent: Consent; accept: () => void; decline: () => void }>({
  consent: "unknown",
  accept: () => {},
  decline: () => {},
});

export function ConsentProvider({ children }: { children: React.ReactNode }) {
  const [consent, setConsent] = useState<Consent>("unknown");
  useEffect(() => {
    try {
      const v = localStorage.getItem(KEY);
      if (v === "accepted" || v === "declined") setConsent(v);
    } catch {
      /* ignore */
    }
  }, []);
  const save = useCallback((v: Consent) => {
    setConsent(v);
    try {
      localStorage.setItem(KEY, v);
    } catch {
      /* ignore */
    }
  }, []);
  const accept = useCallback(() => save("accepted"), [save]);
  const decline = useCallback(() => save("declined"), [save]);
  return <ConsentCtx.Provider value={{ consent, accept, decline }}>{children}</ConsentCtx.Provider>;
}

export const useConsent = () => useContext(ConsentCtx);

export function ConsentBanner() {
  const { consent, accept, decline } = useConsent();
  if (consent !== "unknown") return null;
  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie and ad consent"
      className="glass fixed inset-x-0 bottom-16 z-[70] mx-auto mb-3 w-[calc(100%-2rem)] max-w-2xl rounded-2xl border p-4 shadow-pop md:bottom-6"
      style={{ borderColor: "rgb(var(--border))" }}
    >
      <p className="text-sm font-semibold">We use cookies & ads to keep tools free</p>
      <p className="text-muted mt-1 text-xs leading-relaxed">
        TOOLVERSE AI is free thanks to advertising. Accept to allow personalized ads, or decline for
        ad-free browsing of content pages. See our <Link href="/privacy" className="underline">Privacy Policy</Link>.
      </p>
      <div className="mt-3 flex gap-2">
        <button onClick={accept} className="rounded-lg bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-700">
          Accept
        </button>
        <button onClick={decline} className="surface-soft rounded-lg px-4 py-2 text-xs font-medium">
          Decline
        </button>
      </div>
    </div>
  );
}

// ---------- AdSense script (loads only after consent) ----------

export function AdSenseScript() {
  const { consent } = useConsent();
  if (!isAdsConfigured || consent !== "accepted") return null;
  return (
    <Script
      id="adsense"
      strategy="lazyOnload"
      crossOrigin="anonymous"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADS.client}`}
    />
  );
}

// ---------- Ad slot ----------

export function AdSlot({ placement, className }: { placement: AdPlacement; className?: string }) {
  const { consent } = useConsent();
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const slot = ADS.slots[placement];

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "300px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || consent !== "accepted" || !isAdsConfigured || !slot) return;
    try {
      ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
    } catch {
      /* ad blockers throw here — fail silently */
    }
  }, [visible, consent, slot]);

  if (!ADS.enabled) return null;

  // Not configured yet: helpful placeholder in dev, nothing in production.
  if (!isAdsConfigured || !slot) {
    if (process.env.NODE_ENV === "production") return null;
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-2xl border border-dashed px-4 py-8 text-center",
          className
        )}
        style={{ borderColor: "rgb(var(--border))" }}
        aria-hidden
      >
        <p className="text-muted text-xs">
          Ad slot “{placement}” — set <code>NEXT_PUBLIC_ADSENSE_CLIENT</code> + slot ID to enable
        </p>
      </div>
    );
  }

  return (
    <div ref={ref} className={cn("mx-auto w-full max-w-3xl", className)} role="complementary" aria-label="Advertisement">
      {consent === "accepted" && visible ? (
        <>
          <p className="text-muted mb-1 text-center text-[10px] uppercase tracking-widest">Advertisement</p>
          <ins
            className="adsbygoogle"
            style={{ display: "block" }}
            data-ad-client={ADS.client}
            data-ad-slot={slot}
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        </>
      ) : (
        <div className="surface-soft h-24 rounded-2xl" aria-hidden />
      )}
    </div>
  );
}
