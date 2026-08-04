import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Check, MessageCircle, ShoppingBag, Clock, Image as ImageIcon, Store, Users, BarChart3, Truck, BookOpen, PlayCircle, FileText, Sparkles, Zap, Shield } from "lucide-react";
import logo from "@/assets/logo.png";
import storefrontPreview from "@/assets/storefront-mockup.png.asset.json";
import analyticsPreview from "@/assets/analytics-preview.png.asset.json";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "Katalog — Turn WhatsApp into your storefront" },
      { name: "description", content: "Build a product catalog in minutes. Share one link. Receive structured orders straight in WhatsApp." },
    ],
  }),
});

function Landing() {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  return (
    <div className="min-h-screen bg-muted/40 p-3 sm:p-6">

      <div className="relative max-w-7xl mx-auto bg-background rounded-3xl shadow-card overflow-hidden border border-border">
        {/* Nav */}
        <header className="relative z-20 px-5 sm:px-10 h-16 sm:h-20 flex items-center justify-between border-b border-border/60">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="Katalog" className="size-7 sm:size-8 object-contain" />
            <span className="font-display font-bold text-lg sm:text-xl">katalog</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#solutions" className="hover:text-foreground transition-colors">Solutions</a>
            <a href="#resources" className="hover:text-foreground transition-colors">Resources</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link to="/auth" className="hidden sm:block">
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
            <Link to="/auth" search={{ mode: "signup" as const }}>
              <Button size="sm" variant="outline" className="rounded-full px-4 sm:px-5 border-foreground/20 hover:bg-foreground hover:text-background">
                Get started
              </Button>
            </Link>
          </div>
        </header>

        {/* Hero with dotted background */}
        <section
          className="relative overflow-hidden px-6 pt-16 pb-24 sm:pt-24 sm:pb-32 md:pt-28 md:pb-40"
          style={{
            backgroundImage:
              "radial-gradient(circle, oklch(0.85 0.01 95) 1px, transparent 1px)",
            backgroundSize: "18px 18px",
          }}
        >
          {/* Decorative cards — top left: sticky note */}
          <div className="hidden sm:block absolute top-6 left-4 lg:left-10 -rotate-6 z-10">
            <div className="relative w-44 lg:w-52 bg-yellow-100 p-4 shadow-card font-handwritten" style={{ fontFamily: "'Caveat', cursive" }}>
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 size-3 rounded-full bg-destructive shadow" />
              <p className="text-sm lg:text-base leading-snug text-foreground/80">
                Add your products, share the link, watch orders fly in.
              </p>
            </div>
            <div className="absolute -bottom-6 -left-2 size-14 rounded-2xl bg-card shadow-elegant flex items-center justify-center rotate-[8deg]">
              <Check className="size-7 text-primary" strokeWidth={3} />
            </div>
          </div>

          {/* Top right: reminders card */}
          <div className="hidden md:block absolute top-6 right-4 lg:right-10 rotate-3 z-10">
            <div className="w-56 lg:w-64 rounded-2xl bg-card border border-border shadow-card p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="font-display font-semibold text-sm">New order</span>
                <span className="text-[10px] text-muted-foreground">just now</span>
              </div>
              <div className="flex items-center gap-3 mb-3">
                <div className="size-10 rounded-lg bg-accent flex items-center justify-center">
                  <ShoppingBag className="size-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">Ankara Two-Piece</p>
                  <p className="text-[11px] text-muted-foreground">Qty 2 · ₦18,000</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[11px] bg-accent rounded-lg px-2 py-1.5">
                <Clock className="size-3 text-primary" />
                <span className="text-foreground/80">Deliver by 14:30</span>
              </div>
            </div>
            <div className="absolute -top-3 -left-3 size-12 rounded-xl bg-card shadow-elegant flex items-center justify-center">
              <Clock className="size-6 text-primary" />
            </div>
          </div>

          {/* Bottom left: today's orders */}
          <div className="hidden lg:block absolute bottom-6 left-4 lg:left-10 -rotate-3 z-10">
            <div className="w-64 rounded-2xl bg-card border border-border shadow-card p-4">
              <p className="font-display font-semibold text-sm mb-3">Today's orders</p>
              <div className="space-y-3">
                {[
                  { name: "Silk scarf", pct: 60, color: "bg-primary" },
                  { name: "Handbag #4", pct: 95, color: "bg-destructive" },
                ].map((o) => (
                  <div key={o.name} className="flex items-center gap-2">
                    <div className="size-7 rounded-md bg-accent flex items-center justify-center">
                      <ImageIcon className="size-3.5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[11px] font-medium">{o.name}</p>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-1">
                        <div className={`h-full ${o.color}`} style={{ width: `${o.pct}%` }} />
                      </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{o.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom right: integrations */}
          <div className="hidden lg:block absolute bottom-6 right-4 lg:right-10 rotate-3 z-10">
            <div className="w-60 rounded-2xl bg-card border border-border shadow-card p-4">
              <p className="font-display font-semibold text-sm mb-3">One link, anywhere</p>
              <div className="flex gap-2">
                {/* WhatsApp */}
                <button type="button" aria-label="Share on WhatsApp" className="flex-1 aspect-square rounded-xl bg-accent flex items-center justify-center transition-all duration-200 hover:scale-110 hover:shadow-elegant hover:bg-accent/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card active:scale-95">
                  <svg viewBox="0 0 32 32" className="w-3/4 h-3/4" aria-label="WhatsApp">
                    <path fill="#25D366" d="M16 3C8.8 3 3 8.8 3 16c0 2.3.6 4.4 1.7 6.4L3 29l6.8-1.8c1.9 1 4 1.6 6.2 1.6 7.2 0 13-5.8 13-13S23.2 3 16 3z"/>
                    <path fill="#fff" d="M22.5 19.4c-.3-.2-1.9-.9-2.2-1-.3-.1-.5-.2-.7.2-.2.3-.8 1-1 1.2-.2.2-.4.2-.7.1-.3-.2-1.4-.5-2.6-1.6-1-.9-1.6-2-1.8-2.3-.2-.3 0-.5.1-.6.1-.1.3-.4.5-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5 0-.2-.7-1.7-1-2.3-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.7.4-.2.3-.9.9-.9 2.2 0 1.3 1 2.6 1.1 2.7.1.2 1.9 3 4.7 4.2.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.7-.7 1.9-1.3.2-.7.2-1.2.2-1.3-.1-.1-.3-.2-.6-.3z"/>
                  </svg>
                </button>
                {/* Instagram */}
                <button type="button" aria-label="Share on Instagram" className="flex-1 aspect-square rounded-xl bg-accent flex items-center justify-center transition-all duration-200 hover:scale-110 hover:shadow-elegant hover:bg-accent/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card active:scale-95">
                  <svg viewBox="0 0 32 32" className="w-3/4 h-3/4" aria-label="Instagram">
                    <defs>
                      <linearGradient id="igGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#feda75"/>
                        <stop offset="40%" stopColor="#fa7e1e"/>
                        <stop offset="70%" stopColor="#d62976"/>
                        <stop offset="100%" stopColor="#962fbf"/>
                      </linearGradient>
                    </defs>
                    <rect x="3" y="3" width="26" height="26" rx="7" fill="url(#igGrad)"/>
                    <circle cx="16" cy="16" r="5.5" fill="none" stroke="#fff" strokeWidth="2"/>
                    <circle cx="23" cy="9" r="1.5" fill="#fff"/>
                  </svg>
                </button>
                {/* Facebook */}
                <button type="button" aria-label="Share on Facebook" className="flex-1 aspect-square rounded-xl bg-accent flex items-center justify-center transition-all duration-200 hover:scale-110 hover:shadow-elegant hover:bg-accent/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card active:scale-95">
                  <svg viewBox="0 0 32 32" className="w-3/4 h-3/4" aria-label="Facebook">
                    <path fill="#1877F2" d="M29 16c0-7.2-5.8-13-13-13S3 8.8 3 16c0 6.5 4.8 11.9 11 12.8V19.8h-3.3V16H14v-2.9c0-3.3 2-5.1 5-5.1 1.4 0 2.9.3 2.9.3v3.2h-1.6c-1.6 0-2.1 1-2.1 2v2.5h3.6l-.6 3.8H18v9c6.2-.9 11-6.3 11-12.8z"/>
                    <path fill="#fff" d="M21.2 19.8l.6-3.8H18v-2.5c0-1 .5-2 2.1-2h1.6V8.3s-1.5-.3-2.9-.3c-3 0-5 1.8-5 5.1V16h-3.3v3.8H14v9c.7.1 1.3.2 2 .2s1.3-.1 2-.2v-9h3.2z"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Center hero */}
          <div className="relative z-0 max-w-3xl mx-auto text-center pt-8 sm:pt-12">
            <div className="mx-auto mb-8 size-16 sm:size-20 rounded-2xl bg-card shadow-elegant flex items-center justify-center rotate-3">
              <MessageCircle className="size-8 sm:size-10 text-primary" strokeWidth={2.2} />
            </div>
            <h1 className="font-display text-4xl sm:text-6xl md:text-7xl font-bold leading-[1.05] tracking-tight">
              Sell, share, and ship
              <br />
              <span className="text-muted-foreground/70">all from WhatsApp</span>
            </h1>
            <p className="mt-6 text-base sm:text-lg text-muted-foreground max-w-xl mx-auto">
              Build your catalog, send one link, and let every order land neatly in your inbox.
            </p>
            <div className="mt-8 flex justify-center">
              <WaitlistDialog>
                <Button size="lg" className="rounded-full px-8 shadow-elegant">
                  Join waitlist
                </Button>
              </WaitlistDialog>
            </div>

          </div>
        </section>

        {/* Features */}
        <section id="features" className="px-6 sm:px-10 py-20 border-t border-border">
          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {[
              { icon: ShoppingBag, title: "Catalog in minutes", body: "Add products, prices, photos and stock — no code, no setup fees." },
              { icon: ImageIcon, title: "One shareable link", body: "Drop your shop URL in bio, flyers, or stories. It just works." },
              { icon: MessageCircle, title: "Orders in WhatsApp", body: "Every checkout becomes a clean message ready to fulfil." },
            ].map((f, i) => (
              <div key={i} className="p-8 rounded-2xl bg-card border border-border shadow-card hover:shadow-elegant transition-shadow">
                <div className="size-12 rounded-xl bg-accent flex items-center justify-center mb-5">
                  <f.icon className="size-5 text-primary" strokeWidth={2.2} />
                </div>
                <h3 className="font-display text-xl font-semibold mb-2">{f.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Solutions */}
        <section id="solutions" className="px-6 sm:px-10 py-20 border-t border-border bg-muted/30">
          <div className="max-w-6xl mx-auto">
            <div className="max-w-2xl mb-12">
              <span className="text-xs uppercase tracking-widest text-primary font-semibold">Solutions</span>
              <h2 className="font-display text-3xl sm:text-5xl font-bold mt-3 leading-tight">Built for the way you already sell</h2>
              <p className="text-muted-foreground mt-4 text-base sm:text-lg">Whether you're a fashion vendor, a home baker, or a thrift store — Katalog adapts to your hustle.</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                { icon: Store, title: "Fashion & Thrift", body: "Showcase fits, sizes and colours in a swipeable catalog." },
                { icon: ShoppingBag, title: "Food & Bakery", body: "Take pre-orders with delivery slots, no missed messages." },
                { icon: Users, title: "Beauty & Hair", body: "Bookings and product sales from one shareable link." },
                { icon: Truck, title: "Wholesale & Resellers", body: "Bulk price tiers, MOQ rules, and order summaries." },
              ].map((s) => (
                <div key={s.title} className="p-6 rounded-2xl bg-card border border-border hover:shadow-elegant transition-shadow">
                  <div className="size-11 rounded-xl bg-accent flex items-center justify-center mb-4">
                    <s.icon className="size-5 text-primary" strokeWidth={2.2} />
                  </div>
                  <h3 className="font-display font-semibold text-lg mb-1.5">{s.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Public catalog preview */}
        <section className="px-6 sm:px-10 py-20 border-t border-border">
          <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1">
              <span className="text-xs uppercase tracking-widest text-primary font-semibold">Public catalog</span>
              <h2 className="font-display text-3xl sm:text-5xl font-bold mt-3 leading-tight">Your storefront, beautifully simple</h2>
              <p className="text-muted-foreground mt-4 text-base sm:text-lg">A clean, mobile-first storefront your customers will love. Photos, prices, variants and a single tap to order on WhatsApp.</p>
              <ul className="mt-6 space-y-3">
                {["No sign-up required for buyers", "Shareable on Instagram bio, status & flyers", "Looks great on every device"].map((p) => (
                  <li key={p} className="flex items-start gap-3 text-sm">
                    <span className="mt-0.5 size-5 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                      <Check className="size-3 text-primary" strokeWidth={3} />
                    </span>
                    <span className="text-foreground/80">{p}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="order-1 lg:order-2">
              <div className="relative rounded-3xl overflow-hidden bg-accent/40 border border-border shadow-elegant">
                <img src={storefrontPreview.url} alt="Public catalog storefront preview on mobile" loading="lazy" width={1024} height={1024} className="w-full h-auto" />
              </div>
            </div>
          </div>
        </section>

        {/* Analytics preview */}
        <section className="px-6 sm:px-10 py-20 border-t border-border bg-muted/30">
          <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="relative rounded-3xl overflow-hidden bg-card border border-border shadow-elegant">
                <img src={analyticsPreview.url} alt="Customer analytics dashboard preview" loading="lazy" width={1280} height={896} className="w-full h-auto" />
              </div>
            </div>
            <div>
              <span className="text-xs uppercase tracking-widest text-primary font-semibold">Customer analytics</span>
              <h2 className="font-display text-3xl sm:text-5xl font-bold mt-3 leading-tight">Know what sells, who buys, and when</h2>
              <p className="text-muted-foreground mt-4 text-base sm:text-lg">Track revenue, top products and repeat customers in one calm dashboard. No spreadsheets required.</p>
              <div className="mt-6 grid grid-cols-3 gap-4">
                {[
                  { label: "Revenue", value: "+38%" },
                  { label: "Repeat buyers", value: "62%" },
                  { label: "Avg. response", value: "4 min" },
                ].map((k) => (
                  <div key={k.label} className="p-4 rounded-xl bg-card border border-border">
                    <p className="font-display text-2xl font-bold">{k.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{k.label}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
                <BarChart3 className="size-4 text-primary" />
                <span>Real-time insights, updated as orders come in.</span>
              </div>
            </div>
          </div>
        </section>

        {/* How to setup */}
        <section id="setup" className="px-6 sm:px-10 py-20 border-t border-border">
          <div className="max-w-6xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <span className="text-xs uppercase tracking-widest text-primary font-semibold">How to setup</span>
              <h2 className="font-display text-3xl sm:text-5xl font-bold mt-3 leading-tight">Live in under 10 minutes</h2>
              <p className="text-muted-foreground mt-4">Three small steps. No code, no card.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { n: "01", icon: Sparkles, title: "Create your shop", body: "Sign up, add your business name and WhatsApp number." },
                { n: "02", icon: ImageIcon, title: "Upload products", body: "Add photos, prices, variants and stock — drag and drop." },
                { n: "03", icon: Zap, title: "Share your link", body: "Drop your katalog.link/yourshop in bio, status and flyers." },
              ].map((s) => (
                <div key={s.n} className="relative p-7 rounded-2xl bg-card border border-border">
                  <span className="font-display text-5xl font-bold text-accent absolute top-4 right-5">{s.n}</span>
                  <div className="size-11 rounded-xl bg-accent flex items-center justify-center mb-4">
                    <s.icon className="size-5 text-primary" strokeWidth={2.2} />
                  </div>
                  <h3 className="font-display font-semibold text-lg mb-1.5">{s.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="px-6 sm:px-10 py-20 border-t border-border bg-muted/30">
          <div className="max-w-6xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <span className="text-xs uppercase tracking-widest text-primary font-semibold">Pricing</span>
              <h2 className="font-display text-3xl sm:text-5xl font-bold mt-3 leading-tight">Simple, honest pricing</h2>
              <p className="text-muted-foreground mt-4">Start free. Upgrade only when you outgrow it.</p>
              <div className="mt-7 inline-flex items-center gap-1 p-1 rounded-full border border-border bg-card">
                <button
                  type="button"
                  onClick={() => setBilling("monthly")}
                  className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${billing === "monthly" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setBilling("annual")}
                  className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors flex items-center gap-2 ${billing === "annual" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Annual
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${billing === "annual" ? "bg-primary text-primary-foreground" : "bg-primary/15 text-primary"}`}>2 months free</span>
                </button>
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { name: "Starter", monthly: 0, annual: 0, features: ["Up to 5 products", "1 shareable link", "WhatsApp checkout", "Basic analytics"], cta: "Get started", featured: false, badge: null },
                { name: "Hustler", monthly: 990, annual: 9900, features: ["Unlimited products", "1 shareable link", "Advanced analytics", "Order CSV export", "Priority support"], cta: "Get started", featured: true, badge: null },
                { name: "Business", monthly: 12000, annual: 120000, features: ["Multiple staff seats", "Bulk pricing tiers", "API access", "Dedicated success manager"], cta: "Contact sales", featured: false, badge: null },
              ].map((p) => {
                const amount = billing === "monthly" ? p.monthly : p.annual;
                const period = p.monthly === 0 ? "free forever" : billing === "monthly" ? "per month" : "per year";
                const priceLabel = p.monthly === 0 ? "₦0" : `₦${amount.toLocaleString()}`;
                return (
                <div key={p.name} className={`relative p-7 rounded-2xl border ${p.featured ? "bg-foreground text-background border-foreground shadow-elegant" : "bg-card border-border"}`}>
                  {p.featured && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-widest font-semibold px-3 py-1 rounded-full bg-primary text-primary-foreground">Most popular</span>
                  )}
                  <h3 className="font-display text-xl font-semibold">{p.name}</h3>
                  <div className="mt-3 flex items-baseline gap-2 flex-wrap">
                    <span className="font-display text-4xl font-bold">{priceLabel}</span>
                    <span className={`text-sm ${p.featured ? "text-background/60" : "text-muted-foreground"}`}>{period}</span>
                  </div>
                  {p.badge && (
                    <span className="inline-block mt-3 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-primary/15 text-primary-glow">{p.badge}</span>
                  )}
                  <ul className="mt-6 space-y-2.5">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <Check className={`size-4 mt-0.5 flex-shrink-0 ${p.featured ? "text-primary-glow" : "text-primary"}`} strokeWidth={2.5} />
                        <span className={p.featured ? "text-background/90" : "text-foreground/80"}>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link to="/auth" search={{ mode: "signup" as const }} className="block mt-7">
                    <Button variant={p.featured ? "secondary" : "outline"} className="w-full rounded-full">{p.cta}</Button>
                  </Link>
                </div>
                );
              })}

            </div>

          </div>
        </section>

        {/* Resources */}
        <section id="resources" className="px-6 sm:px-10 py-20 border-t border-border">
          <div className="max-w-6xl mx-auto">
            <div className="max-w-2xl mb-12">
              <span className="text-xs uppercase tracking-widest text-primary font-semibold">Resources</span>
              <h2 className="font-display text-3xl sm:text-5xl font-bold mt-3 leading-tight">Learn, grow, sell more</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-5">
              {[
                { icon: BookOpen, tag: "Guide", title: "The vendor's playbook", body: "From first product to first 100 orders — a practical roadmap." },
                { icon: PlayCircle, tag: "Video", title: "Setup in 5 minutes", body: "Watch a real vendor build their shop from scratch." },
                { icon: FileText, tag: "Template", title: "Catalog photo cheatsheet", body: "Free templates for clean, consistent product photos." },
              ].map((r) => (
                <a key={r.title} href="#" className="group p-6 rounded-2xl bg-card border border-border hover:shadow-elegant transition-shadow block">
                  <div className="size-11 rounded-xl bg-accent flex items-center justify-center mb-4">
                    <r.icon className="size-5 text-primary" strokeWidth={2.2} />
                  </div>
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">{r.tag}</span>
                  <h3 className="font-display font-semibold text-lg mt-1 mb-1.5 group-hover:text-primary transition-colors">{r.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{r.body}</p>
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="px-6 sm:px-10 py-20 border-t border-border bg-muted/30">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <span className="text-xs uppercase tracking-widest text-primary font-semibold">FAQ</span>
              <h2 className="font-display text-3xl sm:text-5xl font-bold mt-3 leading-tight">Questions, answered</h2>
            </div>
            <Accordion type="single" collapsible className="space-y-3">
              {[
                { q: "Do I need a website to use Katalog?", a: "Not at all. Katalog gives you a hosted storefront link you can share anywhere — Instagram bio, WhatsApp status, flyers, anywhere." },
                { q: "How do customers pay?", a: "Orders are sent to your WhatsApp as a clean message with all the details. You confirm payment your way — bank transfer, POS, cash on delivery." },
                { q: "Can I use my own domain?", a: "Yes. On the Hustler plan and above, connect your custom domain in a few clicks." },
                { q: "Is there a transaction fee?", a: "No. We don't take a cut of your sales — the price you see is the price you pay." },
                { q: "Can I export my data?", a: "Absolutely. Export orders, customers and products as CSV at any time." },
                { q: "Do you offer support?", a: "Yes — chat support on every plan, with priority response on paid tiers." },
              ].map((item, i) => (
                <AccordionItem key={i} value={`item-${i}`} className="bg-card border border-border rounded-xl px-5">
                  <AccordionTrigger className="font-display font-semibold text-left hover:no-underline">{item.q}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">{item.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* Final CTA */}
        <section className="px-6 sm:px-10 py-20 border-t border-border">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent text-xs font-medium text-primary mb-6">
              <Shield className="size-3.5" /> No card required
            </div>
            <h2 className="font-display text-3xl sm:text-5xl font-bold leading-tight">Your shop. Your link. Today.</h2>
            <p className="text-muted-foreground mt-4 text-base sm:text-lg max-w-xl mx-auto">Join thousands of vendors turning DMs into structured orders.</p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/auth" search={{ mode: "signup" as const }}>
                <Button size="lg" className="rounded-full px-8 shadow-elegant w-full sm:w-auto">Create your shop</Button>
              </Link>
              <a href="#pricing">
                <Button size="lg" variant="outline" className="rounded-full px-8 w-full sm:w-auto">See pricing</Button>
              </a>
            </div>
          </div>
        </section>

        <footer className="border-t border-border px-6 sm:px-10 py-8 text-sm text-muted-foreground flex flex-col sm:flex-row gap-2 sm:justify-between">
          <span>© {new Date().getFullYear()} Katalog</span>
          <span>Built for vendors who hustle.</span>
        </footer>
      </div>
    </div>
  );
}
