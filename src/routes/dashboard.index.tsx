import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Copy, Package2, Plus, ArrowRight } from "lucide-react";
import { formatMoney } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardHome,
});

interface Product {
  id: string;
  name: string;
  price_cents: number;
  image_url: string | null;
  stock: number;
}

function DashboardHome() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [businessName, setBusinessName] = useState("");
  const [slug, setSlug] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    if (!user) return;
    void load();
  }, [user]);

  async function load() {
    if (!user) return;
    setLoading(true);
    const [{ data: profile }, { data: prods }] = await Promise.all([
      supabase
        .from("vendor_profiles")
        .select("business_name,slug,currency")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("products")
        .select("id,name,price_cents,image_url,stock")
        .eq("vendor_id", user.id)
        .order("created_at", { ascending: false })
        .limit(6),
    ]);
    if (profile) {
      setBusinessName(profile.business_name);
      setSlug(profile.slug);
      setCurrency(profile.currency);
    }
    setProducts((prods ?? []) as Product[]);
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="animate-spin text-primary" />
      </div>
    );
  }

  const storefrontUrl = `${window.location.origin}/s/${slug}`;
  const shortUrl = `${window.location.host}/s/${slug}`;

  return (
    <div className="space-y-12">
      {/* Greeting */}
      <section>
        <p className="text-xs font-semibold tracking-[0.18em] uppercase text-muted-foreground mb-3">
          Dashboard
        </p>
        <h1 className="font-display text-3xl lg:text-4xl font-semibold text-primary tracking-tight">
          Welcome, {businessName}
        </h1>
        <p className="text-muted-foreground text-base mt-2 max-w-xl">
          Curate your offerings with precision.
        </p>
      </section>

      {/* Public catalog card */}
      <Card className="p-6 lg:p-8 border-border shadow-lg shadow-accent/30 bg-background">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground">
              Your Public Catalog Link
            </p>
            <a
              href={storefrontUrl}
              target="_blank"
              rel="noreferrer"
              className="font-display text-base lg:text-lg truncate font-medium text-primary hover:underline mt-1 block"
            >
              {shortUrl}
            </a>
          </div>
          <Button
            className="shrink-0 gap-2"
            onClick={() => {
              navigator.clipboard.writeText(storefrontUrl);
              toast.success("Link copied");
            }}
          >
            <Copy className="size-4" /> Copy Link
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          Share this link to let customers browse your catalog.
        </p>
      </Card>

      {/* Products */}
      <section>
        <div className="flex items-end justify-between mb-5">
          <h2 className="font-display text-xl font-semibold">
            Recent Products
          </h2>
          <Link
            to="/dashboard/catalog"
            className="text-primary text-sm font-medium inline-flex items-center gap-1 hover:underline"
          >
            View All <ArrowRight className="size-3.5" />
          </Link>
        </div>

        {products.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="mx-auto size-12 rounded-2xl bg-accent flex items-center justify-center mb-4">
              <Package2 className="size-5 text-primary" />
            </div>
            <h3 className="font-display text-base font-semibold">
              No products yet
            </h3>
            <p className="text-muted-foreground text-sm mt-1.5 max-w-xs mx-auto">
              Start building your catalog by adding your first product.
            </p>
            <Button asChild className="mt-5 gap-2" size="sm">
              <Link to="/dashboard/catalog">
                <Plus className="size-4" /> Add Product
              </Link>
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {products.map((p) => (
              <Link
                key={p.id}
                to="/dashboard/catalog"
                className="flex items-center gap-4 group p-3 rounded-lg hover:bg-accent/30 transition-colors"
              >
                <div className="size-16 rounded-lg bg-accent overflow-hidden shrink-0 flex items-center justify-center">
                  {p.image_url ? (
                    <img
                      src={p.image_url}
                      alt={p.name}
                      className="size-full object-cover"
                    />
                  ) : (
                    <Package2 className="size-5 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                    {p.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatMoney(p.price_cents, currency)}
                  </p>
                </div>
                <span
                  className={`shrink-0 text-[11px] px-2.5 py-0.5 rounded-full font-medium ${
                    p.stock <= 5
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-accent text-accent-foreground"
                  }`}
                >
                  {p.stock <= 0
                    ? "Out"
                    : p.stock <= 5
                    ? `Low · ${p.stock}`
                    : `${p.stock} in stock`}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
