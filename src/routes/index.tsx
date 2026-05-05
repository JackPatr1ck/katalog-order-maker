import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Check, MessageCircle, ShoppingBag, Clock, Image as ImageIcon } from "lucide-react";
import logo from "@/assets/logo.png";

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
                <div className="flex-1 aspect-square rounded-xl bg-accent flex items-center justify-center">
                  <svg viewBox="0 0 32 32" className="w-3/4 h-3/4" aria-label="WhatsApp">
                    <path fill="#25D366" d="M16 3C8.8 3 3 8.8 3 16c0 2.3.6 4.4 1.7 6.4L3 29l6.8-1.8c1.9 1 4 1.6 6.2 1.6 7.2 0 13-5.8 13-13S23.2 3 16 3z"/>
                    <path fill="#fff" d="M22.5 19.4c-.3-.2-1.9-.9-2.2-1-.3-.1-.5-.2-.7.2-.2.3-.8 1-1 1.2-.2.2-.4.2-.7.1-.3-.2-1.4-.5-2.6-1.6-1-.9-1.6-2-1.8-2.3-.2-.3 0-.5.1-.6.1-.1.3-.4.5-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5 0-.2-.7-1.7-1-2.3-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.7.4-.2.3-.9.9-.9 2.2 0 1.3 1 2.6 1.1 2.7.1.2 1.9 3 4.7 4.2.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.7-.7 1.9-1.3.2-.7.2-1.2.2-1.3-.1-.1-.3-.2-.6-.3z"/>
                  </svg>
                </div>
                {/* Instagram */}
                <div className="flex-1 aspect-square rounded-xl bg-accent flex items-center justify-center">
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
                </div>
                {/* Facebook */}
                <div className="flex-1 aspect-square rounded-xl bg-accent flex items-center justify-center">
                  <svg viewBox="0 0 32 32" className="w-3/4 h-3/4" aria-label="Facebook">
                    <path fill="#1877F2" d="M29 16c0-7.2-5.8-13-13-13S3 8.8 3 16c0 6.5 4.8 11.9 11 12.8V19.8h-3.3V16H14v-2.9c0-3.3 2-5.1 5-5.1 1.4 0 2.9.3 2.9.3v3.2h-1.6c-1.6 0-2.1 1-2.1 2v2.5h3.6l-.6 3.8H18v9c6.2-.9 11-6.3 11-12.8z"/>
                    <path fill="#fff" d="M21.2 19.8l.6-3.8H18v-2.5c0-1 .5-2 2.1-2h1.6V8.3s-1.5-.3-2.9-.3c-3 0-5 1.8-5 5.1V16h-3.3v3.8H14v9c.7.1 1.3.2 2 .2s1.3-.1 2-.2v-9h3.2z"/>
                  </svg>
                </div>
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
              <Link to="/auth" search={{ mode: "signup" as const }}>
                <Button size="lg" className="rounded-full px-8 shadow-elegant">
                  Get free demo
                </Button>
              </Link>
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

        <footer className="border-t border-border px-6 sm:px-10 py-8 text-sm text-muted-foreground flex flex-col sm:flex-row gap-2 sm:justify-between">
          <span>© {new Date().getFullYear()} Katalog</span>
          <span>Built for vendors who hustle.</span>
        </footer>
      </div>
    </div>
  );
}
