import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ArrowRight, MessageCircle, Package, Zap } from "lucide-react";
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
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="Katalog" className="size-8 object-contain" />
            <span className="font-display font-bold text-xl">katalog</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/auth">
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
            <Link to="/auth" search={{ mode: "signup" as const }}>
              <Button size="sm" className="shadow-elegant">Start free</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-subtle" />
        <div className="relative max-w-6xl mx-auto px-6 pt-20 pb-24 md:pt-32 md:pb-40">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent text-accent-foreground text-xs font-medium mb-6">
              <span className="size-1.5 rounded-full bg-primary animate-pulse" />
              Now shipping orders via WhatsApp
            </div>
            <h1 className="font-display text-5xl md:text-7xl font-bold leading-[1.05] tracking-tight">
              Your shop.<br />
              <span className="bg-hero bg-clip-text text-transparent">In a WhatsApp message.</span>
            </h1>
            <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed">
              Build a product catalog in minutes. Share one link with your customers. Every order
              lands in your WhatsApp — clean, structured, ready to fulfil.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-3">
              <Link to="/auth" search={{ mode: "signup" as const }}>
                <Button size="lg" className="shadow-elegant gap-2 w-full sm:w-auto">
                  Create your catalog <ArrowRight className="size-4" />
                </Button>
              </Link>
              <Link to="/auth">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  I already have one
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: Package, title: "Catalog in minutes", body: "Add products, prices, photos, stock and categories. No code, no setup fees." },
            { icon: Zap, title: "One shareable link", body: "Each shop gets its own URL — drop it in your bio, on a flyer, anywhere." },
            { icon: MessageCircle, title: "Orders in WhatsApp", body: "Customers check out, you get a structured WhatsApp message with everything you need." },
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

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="rounded-3xl bg-hero p-12 md:p-16 text-center shadow-elegant">
          <h2 className="font-display text-3xl md:text-5xl font-bold text-primary-foreground">
            Ready to ship orders today?
          </h2>
          <p className="mt-4 text-primary-foreground/85 text-lg max-w-xl mx-auto">
            Free to start. No credit card. Live in five minutes.
          </p>
          <div className="mt-8">
            <Link to="/auth" search={{ mode: "signup" as const }}>
              <Button size="lg" variant="secondary" className="gap-2 shadow-card">
                Get started <ArrowRight className="size-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-8 text-sm text-muted-foreground flex justify-between">
          <span>© {new Date().getFullYear()} Katalog</span>
          <span>Built for vendors who hustle.</span>
        </div>
      </footer>
    </div>
  );
}
