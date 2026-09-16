import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How TOOLVERSE AI handles your data, cookies and advertising.",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">Legal</p>
      <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Privacy Policy</h1>
      <p className="text-muted mt-1.5 text-sm">Last updated: {new Date().getFullYear()}</p>

      <div className="prose-tv mt-6">
        <h2>What we collect</h2>
        <p>
          Account details you provide (email, name), files you upload for processing, and basic
          technical logs needed to run the service. Uploaded files are processed by our backend and
          automatically deleted after the retention period.
        </p>
        <h2>Cookies</h2>
        <p>
          We use strictly-necessary cookies for sign-in (refresh token) and a local preference for
          your cookie choice, theme, favorites and recent tools (stored only in your browser).
        </p>
        <h2>Advertising</h2>
        <p>
          TOOLVERSE AI is free thanks to advertising. If you accept cookies, our ad partner Google
          may use cookies to show personalized ads and measure their performance. You can opt out of
          personalized advertising at any time at Google’s Ad Settings
          (https://adssettings.google.com) or by choosing “Decline” on our cookie banner — the site
          keeps working either way.
        </p>
        <h2>What we never do</h2>
        <p>
          We never sell your personal data, never put secret keys in the website code, and never ask
          you to click ads. Please don’t click ads artificially — it violates ad-network policy and
          can get our account banned.
        </p>
        <h2>Contact</h2>
        <p>For privacy questions, contact the site operator via the details on your account page.</p>
      </div>
    </div>
  );
}
