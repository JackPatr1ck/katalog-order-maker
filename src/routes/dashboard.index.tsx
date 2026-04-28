import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Link as LinkIcon,
  Copy,
  Package2,
  Plus,
  ArrowRight,
  Receipt,
  ChevronRight,
  Inbox,
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
    <div className="space-y-7">
      {/* Greeting */}
      <section>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Hi, {businessName}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Here's what's happening with your catalog today.
        </p>
      </section>

      {/* Public catalog card */}
      <Card className="p-5 shadow-card border-border">
        <p className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
          Your Public Catalog
        </p>
        <a
          href={storefrontUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-2 flex items-center gap-2 text-primary font-medium text-sm break-all hover:underline"
        >
          <LinkIcon className="size-4 shrink-0" />
          <span className="truncate">{shortUrl}</span>
        </a>
        <Button
          variant="secondary"
          size="sm"
          className="mt-4 gap-2 bg-accent text-accent-foreground hover:bg-accent/80"
          onClick={() => {
            navigator.clipboard.writeText(storefrontUrl);
            toast.success("Link copied");
          }}
        >
          <Copy className="size-3.5" /> Copy Link
        </Button>
      </Card>

      {/* Products */}
      <section>
        <div className="flex items-end justify-between border-b border-border pb-2 mb-3">
          <h2 className="font-display text-2xl font-bold">Products</h2>
          <Link
            to="/dashboard/catalog"
            className="text-primary text-sm font-medium inline-flex items-center gap-1 hover:underline"
          >
            View All <ArrowRight className="size-3.5" />
          </Link>
        </div>

        {products.length === 0 ? (
          <Card className="p-8 text-center shadow-card">
            <div className="mx-auto size-14 rounded-2xl bg-accent flex items-center justify-center mb-4">
              <Package2 className="size-6 text-primary" />
            </div>
            <h3 className="font-display text-lg font-semibold">No products yet</h3>
            <p className="text-muted-foreground text-sm mt-1.5 max-w-xs mx-auto">
              Start building your catalog by adding your first product. It only
              takes a few minutes.
            </p>
            <Button asChild className="mt-5 gap-2">
              <Link to="/dashboard/catalog">
                <Plus className="size-4" /> Add Product
              </Link>
            </Button>
          </Card>
        ) : (
          <Card className="shadow-card overflow-hidden">
            <div className="divide-y divide-border">
              {products.map((p) => (
                <Link
                  key={p.id}
                  to="/dashboard/catalog"
                  className="flex items-center gap-3 p-3 hover:bg-accent/30 transition-colors"
                >
                  <div className="size-12 rounded-lg bg-accent overflow-hidden shrink-0 flex items-center justify-center">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="size-full object-cover" />
                    ) : (
                      <Package2 className="size-5 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Stock: {p.stock}
                    </p>
                  </div>
                  <p className="font-semibold text-sm shrink-0">
                    {formatMoney(p.price_cents, currency)}
                  </p>
                </Link>
              ))}
            </div>
          </Card>
        )}
      </section>

      {/* Recent Orders */}
      <section>
        <div className="flex items-end justify-between border-b border-border pb-2 mb-3">
          <h2 className="font-display text-2xl font-bold">Recent Orders</h2>
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
          <Card className="p-10 text-center shadow-card">
            <Receipt className="size-7 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              No recent orders to display.
            </p>
          </Card>
        ) : (
          <Card className="shadow-card overflow-hidden">
            <div className="divide-y divide-border">
              {orders.map((o) => (
                <button
                  key={o.id}
                  onClick={() => openOrder(o)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-accent/30 transition-colors text-left"
                >
                  <div className="size-10 rounded-lg bg-accent flex items-center justify-center shrink-0">
                    <Receipt className="size-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">#{o.order_number}</p>
                      <Badge
                        variant={o.status === "new" ? "default" : "secondary"}
                        className="text-[10px] capitalize px-1.5 py-0"
                      >
                        {o.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {o.customer_name}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-sm">
                      {formatMoney(o.total_cents, currency)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(o.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
          </Card>
        )}
      </section>

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

      <div className="hidden">
        <Inbox />
      </div>
    </div>
  );
}
