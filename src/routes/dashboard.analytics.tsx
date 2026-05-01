import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Eye, MousePointerClick, MessageCircle, TrendingUp, Info, Copy } from "lucide-react";
import { SOURCE_LABELS, type TrafficSource } from "@/lib/analytics";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/analytics")({
  component: AnalyticsPage,
  head: () => ({ meta: [{ title: "Analytics — Katalog" }] }),
});

interface EventRow {
  id: string;
  event_type: "page_view" | "product_click" | "checkout_click";
  source: string;
  product_id: string | null;
  session_hash: string | null;
  created_at: string;
}

interface ProductLite { id: string; name: string; }

type Range = "7d" | "all";

function startOfRange(range: Range): string | null {
  if (range === "all") return null;
  const d = new Date();
  d.setDate(d.getDate() - 7);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function AnalyticsPage() {
  const { user } = useAuth();
  const [range, setRange] = useState<Range>("7d");
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [products, setProducts] = useState<ProductLite[]>([]);
  const [slug, setSlug] = useState<string>("");

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const since = startOfRange(range);
      let q = supabase
        .from("storefront_events")
        .select("id,event_type,source,product_id,session_hash,created_at")
        .eq("vendor_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5000);
      if (since) q = q.gte("created_at", since);
      const [{ data: evs }, { data: prods }, { data: profile }] = await Promise.all([
        q,
        supabase.from("products").select("id,name").eq("vendor_id", user.id),
        supabase.from("vendor_profiles").select("slug").eq("user_id", user.id).maybeSingle(),
      ]);
      if (cancelled) return;
      setEvents((evs ?? []) as EventRow[]);
      setProducts((prods ?? []) as ProductLite[]);
      setSlug(profile?.slug ?? "");
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user, range]);

  const stats = useMemo(() => {
    const views = events.filter(e => e.event_type === "page_view");
    const productClicks = events.filter(e => e.event_type === "product_click");
    const checkouts = events.filter(e => e.event_type === "checkout_click");
    const uniqueVisitors = new Set(views.map(v => v.session_hash).filter(Boolean)).size;
    const conversion = views.length > 0 ? (checkouts.length / views.length) * 100 : 0;
    return {
      views: views.length,
      uniqueVisitors,
      productClicks: productClicks.length,
      checkouts: checkouts.length,
      conversion,
    };
  }, [events]);

  const sources = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of events) {
      if (e.event_type !== "page_view") continue;
      counts.set(e.source, (counts.get(e.source) ?? 0) + 1);
    }
    const total = Array.from(counts.values()).reduce((a, b) => a + b, 0);
    return Array.from(counts.entries())
      .map(([key, count]) => ({
        key: key as TrafficSource,
        label: SOURCE_LABELS[key as TrafficSource] ?? key,
        count,
        pct: total > 0 ? (count / total) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [events]);

  const topProducts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of events) {
      if (e.event_type !== "product_click" || !e.product_id) continue;
      counts.set(e.product_id, (counts.get(e.product_id) ?? 0) + 1);
    }
    const nameMap = new Map(products.map(p => [p.id, p.name]));
    return Array.from(counts.entries())
      .map(([id, count]) => ({ id, name: nameMap.get(id) ?? "Deleted product", count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [events, products]);

  const dailySeries = useMemo(() => {
    if (range !== "7d") return [];
    const days: { label: string; date: string; views: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      days.push({
        label: d.toLocaleDateString(undefined, { weekday: "short" }),
        date: d.toISOString().slice(0, 10),
        views: 0,
      });
    }
    for (const e of events) {
      if (e.event_type !== "page_view") continue;
      const day = e.created_at.slice(0, 10);
      const slot = days.find(d => d.date === day);
      if (slot) slot.views++;
    }
    return days;
  }, [events, range]);

  const maxDaily = Math.max(1, ...dailySeries.map(d => d.views));

  function copyTrackedLink(platform: TrafficSource) {
    if (!slug) return;
    const url = `${window.location.origin}/s/${slug}?utm_source=${platform}`;
    navigator.clipboard.writeText(url);
    toast.success(`${SOURCE_LABELS[platform]} link copied`);
  }

  if (!user) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">See how your storefront is performing.</p>
        </div>
        <div className="inline-flex rounded-lg border border-border bg-background p-1">
          <button
            onClick={() => setRange("7d")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${range === "7d" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            Last 7 days
          </button>
          <button
            onClick={() => setRange("all")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${range === "all" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            All time
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-primary" /></div>
      ) : events.length === 0 ? (
        <Card className="p-10 text-center shadow-card">
          <Info className="size-8 text-muted-foreground mx-auto mb-3" />
          <h2 className="font-display text-lg font-semibold">No data yet</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
            Share your shop link on Instagram, TikTok, WhatsApp, or anywhere else — visits and clicks will appear here.
          </p>
          {slug && (
            <Button asChild variant="outline" className="mt-4">
              <Link to="/s/$slug" params={{ slug }} target="_blank">View your shop</Link>
            </Button>
          )}
        </Card>
      ) : (
        <>
          {/* KPI grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            <KpiCard icon={Eye} label="Page views" value={stats.views} sub={`${stats.uniqueVisitors} unique`} />
            <KpiCard icon={MousePointerClick} label="Product clicks" value={stats.productClicks} />
            <KpiCard icon={MessageCircle} label="Checkouts" value={stats.checkouts} sub="WhatsApp sent" />
            <KpiCard icon={TrendingUp} label="Conversion" value={`${stats.conversion.toFixed(1)}%`} sub="views → checkout" />
          </div>

          {/* Daily views (only on 7d) */}
          {range === "7d" && (
            <Card className="p-5 shadow-card">
              <h2 className="font-display font-semibold text-base mb-4">Visits this week</h2>
              <div className="flex items-end justify-between gap-2 h-36">
                {dailySeries.map(d => (
                  <div key={d.date} className="flex-1 flex flex-col items-center gap-2 min-w-0">
                    <div className="w-full flex items-end h-28">
                      <div
                        className="w-full bg-primary rounded-t-md transition-all"
                        style={{ height: `${(d.views / maxDaily) * 100}%`, minHeight: d.views > 0 ? 4 : 0 }}
                        title={`${d.views} views`}
                      />
                    </div>
                    <div className="text-[10px] text-muted-foreground font-medium">{d.label}</div>
                    <div className="text-[10px] font-semibold">{d.views}</div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Traffic sources */}
          <Card className="p-5 shadow-card">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h2 className="font-display font-semibold text-base">Where visitors come from</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Based on referrer & UTM tags</p>
              </div>
            </div>
            {sources.length === 0 ? (
              <p className="text-sm text-muted-foreground">No visits yet.</p>
            ) : (
              <div className="space-y-3">
                {sources.map(s => (
                  <div key={s.key}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium">{s.label}</span>
                      <span className="text-muted-foreground text-xs tabular-nums">
                        {s.count} · {s.pct.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.max(s.pct, 2)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Top products */}
          <Card className="p-5 shadow-card">
            <h2 className="font-display font-semibold text-base mb-4">Most-clicked products</h2>
            {topProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No product clicks yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {topProducts.map((p, i) => (
                  <li key={p.id} className="flex items-center justify-between py-2.5 text-sm">
                    <span className="flex items-center gap-3 min-w-0">
                      <span className="text-xs text-muted-foreground tabular-nums w-5">#{i + 1}</span>
                      <span className="truncate">{p.name}</span>
                    </span>
                    <Badge variant="secondary" className="shrink-0 tabular-nums">{p.count} clicks</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Trackable links */}
          {slug && (
            <Card className="p-5 shadow-card">
              <h2 className="font-display font-semibold text-base">Trackable share links</h2>
              <p className="text-xs text-muted-foreground mt-0.5 mb-4">
                Use these instead of your plain link to track exactly which platform sends each visit.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {(["instagram", "tiktok", "facebook", "whatsapp", "twitter", "youtube"] as TrafficSource[]).map(p => (
                  <button
                    key={p}
                    onClick={() => copyTrackedLink(p)}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-border hover:bg-accent/40 transition-colors text-sm"
                  >
                    <span className="font-medium">{SOURCE_LABELS[p]}</span>
                    <Copy className="size-3.5 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <Card className="p-4 shadow-card">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-3.5" />
        <span className="text-[11px] font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className="font-display text-2xl font-bold mt-2 tabular-nums">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </Card>
  );
}
