import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Copy,
  Package2,
  Plus,
  ArrowRight,
  Receipt,
  Download,
} from "lucide-react";
import { formatMoney } from "@/lib/format";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardHome,
});

interface OrderRow {
  id: string;
  order_number: number;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  note: string | null;
  total_cents: number;
  status: string;
  created_at: string;
}

interface OrderItemRow {
  id: string;
  product_name: string;
  unit_price_cents: number;
  quantity: number;
}

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
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [selected, setSelected] = useState<OrderRow | null>(null);
  const [items, setItems] = useState<OrderItemRow[]>([]);

  useEffect(() => {
    if (!user) return;
    void load();
  }, [user]);

  async function load() {
    if (!user) return;
    setLoading(true);
    const [{ data: profile }, { data: prods }, { data: ords }] =
      await Promise.all([
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
          .limit(4),
        supabase
          .from("orders")
          .select("*")
          .eq("vendor_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);
    if (profile) {
      setBusinessName(profile.business_name);
      setSlug(profile.slug);
      setCurrency(profile.currency);
    }
    setProducts((prods ?? []) as Product[]);
    setOrders((ords ?? []) as OrderRow[]);
    setLoading(false);
  }

  async function openOrder(o: OrderRow) {
    setSelected(o);
    const { data } = await supabase
      .from("order_items")
      .select("*")
      .eq("order_id", o.id);
    setItems((data ?? []) as OrderItemRow[]);
  }

  function exportCSV() {
    if (!orders.length) return;
    const headers = ["Order #", "Date", "Customer", "Phone", "Address", "Total", "Status", "Note"];
    const rows = orders.map((o) => [
      o.order_number,
      new Date(o.created_at).toISOString(),
      o.customer_name,
      o.customer_phone,
      o.delivery_address.replace(/\n/g, " "),
      (o.total_cents / 100).toFixed(2),
      o.status,
      (o.note ?? "").replace(/\n/g, " "),
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `katalog-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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

      {/* Two-column section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
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
            <div className="space-y-4">
              {products.map((p) => (
                <Link
                  key={p.id}
                  to="/dashboard/catalog"
                  className="flex items-center gap-4 group"
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

        {/* Recent Orders */}
        <section>
          <div className="flex items-end justify-between mb-5">
            <h2 className="font-display text-xl font-semibold">
              Recent Orders
            </h2>
            {orders.length > 0 && (
              <button
                onClick={exportCSV}
                className="text-primary text-sm font-medium inline-flex items-center gap-1 hover:underline"
              >
                <Download className="size-3.5" /> Export
              </button>
            )}
          </div>

          {orders.length === 0 ? (
            <Card className="p-10 text-center">
              <Receipt className="size-7 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                No recent orders to display.
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {orders.map((o) => (
                <button
                  key={o.id}
                  onClick={() => openOrder(o)}
                  className="w-full flex items-center justify-between gap-3 text-left group"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm group-hover:text-primary transition-colors">
                      #{o.order_number}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {o.customer_name} · {formatMoney(o.total_cents, currency)}
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className="text-[10px] capitalize shrink-0 bg-accent text-accent-foreground hover:bg-accent"
                  >
                    {o.status}
                  </Badge>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Footer export */}
      {orders.length > 0 && (
        <div className="pt-8 border-t border-border flex justify-end">
          <Button
            variant="outline"
            onClick={exportCSV}
            className="gap-2"
          >
            <Download className="size-4" /> Export Orders to CSV
          </Button>
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display">
                  Order #{selected.order_number}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="text-sm space-y-1">
                  <p>
                    <span className="text-muted-foreground">Customer:</span>{" "}
                    {selected.customer_name}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Phone:</span>{" "}
                    {selected.customer_phone}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Address:</span>{" "}
                    {selected.delivery_address}
                  </p>
                  {selected.note && (
                    <p>
                      <span className="text-muted-foreground">Note:</span>{" "}
                      {selected.note}
                    </p>
                  )}
                </div>
                <div className="border-t border-border pt-4">
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    ITEMS
                  </p>
                  <div className="space-y-2">
                    {items.map((it) => (
                      <div key={it.id} className="flex justify-between text-sm">
                        <span>
                          {it.quantity}× {it.product_name}
                        </span>
                        <span className="font-medium">
                          {formatMoney(it.unit_price_cents * it.quantity, currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="border-t border-border pt-4 flex justify-between font-semibold">
                  <span>Total</span>
                  <span>{formatMoney(selected.total_cents, currency)}</span>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
