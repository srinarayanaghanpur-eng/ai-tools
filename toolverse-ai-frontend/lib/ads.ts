/**
 * Ad configuration. Everything comes from env — no IDs hardcoded.
 * Until NEXT_PUBLIC_ADSENSE_CLIENT (+ slot IDs) are set, slots render
 * nothing in production (a labeled placeholder in dev only).
 */
export type AdPlacement =
  | "homepage-top"
  | "homepage-bottom"
  | "tools-bottom"
  | "toolpage-below-runner"
  | "blog-top"
  | "article-bottom";

const client = (process.env.NEXT_PUBLIC_ADSENSE_CLIENT ?? "").trim();

function slot(env: string | undefined): string {
  return (env ?? "").trim();
}

export const ADS = {
  enabled: process.env.NEXT_PUBLIC_ADS_ENABLED !== "false",
  client,
  slots: {
    "homepage-top": slot(process.env.NEXT_PUBLIC_AD_SLOT_HOMEPAGE_TOP),
    "homepage-bottom": slot(process.env.NEXT_PUBLIC_AD_SLOT_HOMEPAGE_BOTTOM),
    "tools-bottom": slot(process.env.NEXT_PUBLIC_AD_SLOT_TOOLS_BOTTOM),
    "toolpage-below-runner": slot(process.env.NEXT_PUBLIC_AD_SLOT_TOOLPAGE),
    "blog-top": slot(process.env.NEXT_PUBLIC_AD_SLOT_BLOG_TOP),
    "article-bottom": slot(process.env.NEXT_PUBLIC_AD_SLOT_ARTICLE_BOTTOM),
  } as Record<AdPlacement, string>,
};

export const isAdsConfigured = Boolean(ADS.enabled && ADS.client);
