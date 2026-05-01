import { supabase } from "@/integrations/supabase/client";

export type TrafficSource =
  | "instagram"
  | "tiktok"
  | "facebook"
  | "whatsapp"
  | "twitter"
  | "youtube"
  | "snapchat"
  | "telegram"
  | "google"
  | "bing"
  | "direct"
  | "other";

export type EventType = "page_view" | "product_click" | "checkout_click";

const SOURCE_PATTERNS: Array<[RegExp, TrafficSource]> = [
  [/instagram|l\.instagram|ig\.me/i, "instagram"],
  [/tiktok|musical\.ly/i, "tiktok"],
  [/facebook|fb\.com|fb\.me|m\.facebook|l\.facebook/i, "facebook"],
  [/whatsapp|wa\.me/i, "whatsapp"],
  [/twitter|t\.co|x\.com/i, "twitter"],
  [/youtube|youtu\.be/i, "youtube"],
  [/snapchat/i, "snapchat"],
  [/telegram|t\.me/i, "telegram"],
  [/google\./i, "google"],
  [/bing\./i, "bing"],
];

const UTM_MAP: Record<string, TrafficSource> = {
  ig: "instagram",
  insta: "instagram",
  instagram: "instagram",
  tiktok: "tiktok",
  tt: "tiktok",
  fb: "facebook",
  facebook: "facebook",
  whatsapp: "whatsapp",
  wa: "whatsapp",
  twitter: "twitter",
  x: "twitter",
  youtube: "youtube",
  yt: "youtube",
  snapchat: "snapchat",
  snap: "snapchat",
  telegram: "telegram",
  tg: "telegram",
  google: "google",
  bing: "bing",
};

export function detectSource(): TrafficSource {
  if (typeof window === "undefined") return "direct";
  try {
    const url = new URL(window.location.href);
    const utm = (url.searchParams.get("utm_source") || url.searchParams.get("src") || "").toLowerCase().trim();
    if (utm && UTM_MAP[utm]) return UTM_MAP[utm];

    const ref = document.referrer;
    if (!ref) return "direct";
    const refHost = new URL(ref).hostname;
    // Same-origin = internal nav, treat as direct
    if (refHost === window.location.hostname) return "direct";
    for (const [re, src] of SOURCE_PATTERNS) {
      if (re.test(refHost)) return src;
    }
    return "other";
  } catch {
    return "direct";
  }
}

const SESSION_KEY = "katalog_session";

function getSessionHash(): string {
  if (typeof window === "undefined") return "ssr";
  try {
    let s = sessionStorage.getItem(SESSION_KEY);
    if (!s) {
      s = Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem(SESSION_KEY, s);
    }
    return s;
  } catch {
    return "anon";
  }
}

interface TrackOptions {
  vendorId: string;
  type: EventType;
  productId?: string;
}

const dedupe = new Set<string>();

export async function trackEvent({ vendorId, type, productId }: TrackOptions) {
  if (typeof window === "undefined") return;
  // Per-tab dedupe for page_view + checkout_click; product_click can repeat per product
  const key = type === "product_click" ? `${type}:${productId ?? ""}` : type;
  if (type !== "product_click" && dedupe.has(key)) return;
  dedupe.add(key);

  try {
    await supabase.from("storefront_events").insert({
      vendor_id: vendorId,
      event_type: type,
      source: detectSource(),
      product_id: productId ?? null,
      session_hash: getSessionHash(),
      path: window.location.pathname,
    });
  } catch {
    /* analytics is best-effort, never throw */
  }
}

export const SOURCE_LABELS: Record<TrafficSource, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  facebook: "Facebook",
  whatsapp: "WhatsApp",
  twitter: "X / Twitter",
  youtube: "YouTube",
  snapchat: "Snapchat",
  telegram: "Telegram",
  google: "Google",
  bing: "Bing",
  direct: "Direct",
  other: "Other",
};
