import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, Download, Package2, ChevronRight, Inbox } from "lucide-react";
import { formatMoney } from "@/lib/format";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/dashboard/")({
  component: OrdersPage,
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

function OrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [selected, setSelected] = useState<OrderRow | null>(null);
  const [items, setItems] = useState<OrderItemRow[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("vendor_profiles").select("currency").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data) setCurrency(data.currency);
    });
    void load();
  }, [user, from, to]); // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    if (!user) return;
    setLoading(true);
    let q = supabase.from("orders").select("*").eq("vendor_id", user.id).order("created_at", { ascending: false });
    if (from) q = q.gte("created_at", from);
    if (to) q = q.lte("created_at", to + "T23:59:59");
    const { data } = await q;
    setOrders((data ?? []) as OrderRow[]);
    setLoading(false);
  }

  async function openOrder(o: OrderRow) {
    setSelected(o);
    const { data } = await supabase.from("order_items").select("*").eq("order_id", o.id);
    setItems((data ?? []) as OrderItemRow[]);
  }

  function exportCSV() {
    if (!orders.length) return;
    const headers = ["Order #", "Date", "Customer", "Phone", "Address", "Total", "Status", "Note"];
    const rows = orders.map(o => [
      o.order_number,
      new Date(o.created_at).toISOString(),
      o.customer_name,
      o.customer_phone,
      o.delivery_address.replace(/\n/g, " "),
      (o.total_cents / 100).toFixed(2),
      o.status,
      (o.note ?? "").replace(/\n/g, " "),
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `katalog-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Orders</h1>
          <p className="text-muted-foreground text-sm mt-1">Track every order coming in from your shop.</p>
        </div>
        <Button onClick={exportCSV} variant="outline" className="gap-2" disabled={!orders.length}>
          <Download className="size-4" /> Export CSV
        </Button>
      </div>

      <Card className="p-4 shadow-card">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">From</label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">To</label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" /></div>
      ) : orders.length === 0 ? (
        <Card className="p-12 text-center shadow-card">
          <div className="mx-auto size-12 rounded-full bg-accent flex items-center justify-center mb-4">
            <Inbox className="size-6 text-primary" />
          </div>
          <h3 className="font-display text-lg font-semibold">No orders yet</h3>
          <p className="text-muted-foreground text-sm mt-1">Share your shop link to start receiving orders.</p>
        </Card>
      ) : (
        <Card className="shadow-card overflow-hidden">
          <div className="divide-y divide-border">
            {orders.map(o => (
              <button key={o.id} onClick={() => openOrder(o)} className="w-full flex items-center gap-4 p-4 hover:bg-accent/30 transition-colors text-left">
                <div className="size-10 rounded-lg bg-accent flex items-center justify-center shrink-0">
                  <Package2 className="size-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">#{o.order_number}</p>
                    <Badge variant={o.status === "new" ? "default" : "secondary"} className="text-xs capitalize">{o.status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{o.customer_name} · {o.customer_phone}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-semibold">{formatMoney(o.total_cents, currency)}</p>
                  <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</p>
                </div>
                <ChevronRight className="size-4 text-muted-foreground shrink-0" />
              </button>
            ))}
          </div>
        </Card>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display">Order #{selected.order_number}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="text-sm space-y-1">
                  <p><span className="text-muted-foreground">Customer:</span> {selected.customer_name}</p>
                  <p><span className="text-muted-foreground">Phone:</span> {selected.customer_phone}</p>
                  <p><span className="text-muted-foreground">Address:</span> {selected.delivery_address}</p>
                  {selected.note && <p><span className="text-muted-foreground">Note:</span> {selected.note}</p>}
                </div>
                <div className="border-t border-border pt-4">
                  <p className="text-xs font-medium text-muted-foreground mb-2">ITEMS</p>
                  <div className="space-y-2">
                    {items.map(it => (
                      <div key={it.id} className="flex justify-between text-sm">
                        <span>{it.quantity}× {it.product_name}</span>
                        <span className="font-medium">{formatMoney(it.unit_price_cents * it.quantity, currency)}</span>
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
