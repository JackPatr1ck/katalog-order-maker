import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Check, Loader2, ArrowLeft, Sparkles, ExternalLink } from "lucide-react";
import { getMySubscription, initPlanCheckout } from "@/lib/subscription.functions";

export const Route = createFileRoute("/dashboard/settings/plan")({
  component: PlanPage,
});

type Cycle = "monthly" | "annual";

const PLANS = [
  {
    id: "starter" as const,
    name: "Starter",
    monthly: 0,
    annual: 0,
    features: ["Up to 5 products", "1 shareable link", "WhatsApp checkout", "Basic analytics"],
    cta: "Current plan",
    featured: false,
    badge: null,
    contact: false,
  },
  {
    id: "hustler" as const,
    name: "Hustler",
    monthly: 1047,
    annual: 10470,
    originalMonthly: 3490,
    originalAnnual: 34900,
    features: ["Unlimited products", "Advanced analytics", "Order CSV export", "Priority support"],
    cta: "Upgrade",
    featured: true,
    badge: "70% off — first 1,000 vendors",
    contact: false,
  },
  {
    id: "business" as const,
    name: "Business",
    monthly: 12000,
    annual: 120000,
    features: ["Multiple staff seats", "Bulk pricing tiers", "API access", "Dedicated success manager"],
    cta: "Contact sales",
    featured: false,
    badge: null,
    contact: true,
  },
];

function PlanPage() {
  const router = useRouter();
  const [cycle, setCycle] = useState<Cycle>("monthly");
  const [current, setCurrent] = useState<Awaited<ReturnType<typeof getMySubscription>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<string | null>(null);

  const load = useServerFn(getMySubscription);
  const startCheckout = useServerFn(initPlanCheckout);

  useEffect(() => {
    load().then((s) => { setCurrent(s); setLoading(false); }).catch(() => setLoading(false));
    // Refresh once after Paystack callback so status flips as soon as webhook lands.
    const url = new URL(window.location.href);
    if (url.searchParams.get("ref")) {
      toast.success("Payment received — activating your plan…");
      setTimeout(() => load().then((s) => setCurrent(s)), 2500);
      url.searchParams.delete("ref");
      window.history.replaceState({}, "", url.toString());
    }
  }, [load]);

  async function upgrade(plan: "hustler") {
    setStarting(plan);
    try {
      const res = await startCheckout({ data: { plan, cycle } });
      window.location.href = res.authorization_url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start checkout");
      setStarting(null);
    }
  }

  const activePlan = current?.plan ?? "starter";

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <Link to="/dashboard/settings" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <ArrowLeft className="size-3" /> Back to settings
        </Link>
        <h1 className="font-display text-3xl font-bold mt-2">Your plan</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {loading ? "Loading…" : (
            <>
              You're on the <span className="font-semibold text-foreground capitalize">{activePlan}</span> plan
              {current?.current_period_end && activePlan !== "starter" && (
                <> · renews {new Date(current.current_period_end).toLocaleDateString()}</>
              )}
              .
            </>
          )}
        </p>
      </div>

      <div className="flex justify-center">
        <div className="inline-flex items-center gap-1 p-1 rounded-full bg-muted">
          <button
            onClick={() => setCycle("monthly")}
            className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${cycle === "monthly" ? "bg-foreground text-background" : "text-muted-foreground"}`}
          >Monthly</button>
          <button
            onClick={() => setCycle("annual")}
            className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors flex items-center gap-1.5 ${cycle === "annual" ? "bg-foreground text-background" : "text-muted-foreground"}`}
          >
            Annual
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${cycle === "annual" ? "bg-primary text-primary-foreground" : "bg-primary/15 text-primary"}`}>2 months free</span>
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {PLANS.map((p) => {
          const amount = cycle === "monthly" ? p.monthly : p.annual;
          const original = cycle === "monthly" ? (p as any).originalMonthly : (p as any).originalAnnual;
          const isCurrent = activePlan === p.id && (p.id === "starter" || current?.billing_cycle === cycle);
          const period = amount === 0 ? "free forever" : cycle === "monthly" ? "per month" : "per year";
          return (
            <Card key={p.id} className={`p-6 shadow-card relative ${p.featured ? "border-primary border-2 shadow-elegant" : ""}`}>
              {p.badge && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 gap-1"><Sparkles className="size-3" />{p.badge}</Badge>
              )}
              <div className="space-y-1">
                <h3 className="font-display text-xl font-bold">{p.name}</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold">₦{amount.toLocaleString()}</span>
                  {original && <span className="text-sm text-muted-foreground line-through">₦{original.toLocaleString()}</span>}
                </div>
                <p className="text-xs text-muted-foreground">{period}</p>
              </div>
              <ul className="mt-5 space-y-2">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="size-4 text-primary shrink-0 mt-0.5" /> {f}
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                {isCurrent ? (
                  <Button disabled className="w-full" variant="outline">Current plan</Button>
                ) : p.contact ? (
                  <Button asChild variant="outline" className="w-full">
                    <a href="mailto:hello@katalog.app?subject=Business%20plan%20enquiry">
                      Contact sales <ExternalLink className="size-3.5 ml-1.5" />
                    </a>
                  </Button>
                ) : p.id === "starter" ? (
                  <Button disabled variant="outline" className="w-full">Free tier</Button>
                ) : (
                  <Button onClick={() => upgrade("hustler")} disabled={starting !== null} className="w-full shadow-elegant">
                    {starting === p.id && <Loader2 className="size-4 animate-spin mr-2" />}
                    Upgrade with Paystack
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Payments are securely processed by Paystack. You can cancel anytime — access continues until the end of your paid period.
      </p>
    </div>
  );
}
