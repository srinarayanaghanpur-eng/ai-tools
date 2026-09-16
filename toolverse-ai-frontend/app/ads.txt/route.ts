/** ads.txt for ad-network verification (e.g. Google AdSense). */
export function GET() {
  const raw = (process.env.NEXT_PUBLIC_ADSENSE_CLIENT ?? "").trim();
  const id = raw.replace(/^ca-pub-/i, "").replace(/^pub-/i, "");
  const body = id
    ? `google.com, pub-${id}, DIRECT, f08c47fec0942fa0\n`
    : "# ads.txt — set NEXT_PUBLIC_ADSENSE_CLIENT to activate (format: ca-pub-XXXXXXXXXXXXXXXX)\n";
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
