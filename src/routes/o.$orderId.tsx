import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, MessageCircle, ShoppingBag } from "lucide-react";
import { formatMoney, waLink } from "@/lib/format";

export const Route = createFileRoute("/o/$orderId")({
  component: OrderReceipt,
});

interface Order {
  id: string;
  order_number: number;
  vendor_id: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  note: string | null;
  total_cents: number;
  status: string;
  created_at: string;
}
interface Item { id: string; product_name: string; unit_price_cents: number; quantity: number; }
interface Vendor { business_name: string; whatsapp_number: string; slug: string; currency: string; logo_url: string | null; }

function OrderReceipt() {
  const { orderId } = Route.useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: o } = await supabase.from("orders").select("*").eq("id", orderId).maybeSingle();
      if (!o) { setLoading(false); return; }
      setOrder(o as Order);
      const [{ data: its }, { data: v }] = await Promise.all([
        supabase.from("order_items").select("*").eq("order_id", orderId),
        supabase.from("vendor_profiles").select("business_name, whatsapp_number, slug, currency, logo_url").eq("user_id", o.vendor_id).maybeSingle(),
      ]);
      setItems((its ?? []) as Item[]);
      setVendor(v as Vendor);
      setLoading(false);
    })();
  }, [orderId]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;
  if (!order || !vendor) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold">Order not found</h1>
          <Link to="/" className="text-primary hover:underline mt-4 inline-block">Go home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-subtle py-12 px-4">
      <div className="max-w-md mx-auto">
        <Card className="p-6 shadow-elegant text-center">
          <div className="mx-auto size-14 rounded-full bg-success/10 flex items-center justify-center mb-4">
            <CheckCircle2 className="size-8 text-success" />
          </div>
          <h1 className="font-display text-2xl font-bold">Order placed!</h1>
          <p className="text-sm text-muted-foreground mt-1">Order #{order.order_number} from {vendor.business_name}</p>

          <div className="mt-6 text-left text-sm space-y-1.5">
            <p><span className="text-muted-foreground">Name:</span> {order.customer_name}</p>
            <p><span className="text-muted-foreground">Phone:</span> {order.customer_phone}</p>
            <p><span className="text-muted-foreground">Address:</span> {order.delivery_address}</p>
            {order.note && <p><span className="text-muted-foreground">Note:</span> {order.note}</p>}
          </div>

          <div className="border-t border-border mt-5 pt-4 text-left">
            <p className="text-xs font-medium text-muted-foreground mb-2">ITEMS</p>
            <div className="space-y-2">
              {items.map(it => (
                <div key={it.id} className="flex justify-between text-sm">
                  <span>{it.quantity}× {it.product_name}</span>
                  <span className="font-medium">{formatMoney(it.unit_price_cents * it.quantity, vendor.currency)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="border-t border-border mt-4 pt-4 flex justify-between font-semibold">
            <span>Total</span>
            <span>{formatMoney(order.total_cents, vendor.currency)}</span>
          </div>

          <a href={waLink(vendor.whatsapp_number, `Hi, I just placed order #${order.order_number}`)} target="_blank" rel="noreferrer" className="block mt-6">
            <Button className="w-full gap-2 bg-success hover:bg-success/90 text-success-foreground shadow-elegant">
              <MessageCircle className="size-4" /> Message vendor on WhatsApp
            </Button>
          </a>
          <Link to="/s/$slug" params={{ slug: vendor.slug }} className="block mt-2">
            <Button variant="ghost" className="w-full gap-2"><ShoppingBag className="size-4" /> Back to shop</Button>
          </Link>
        </Card>
      </div>
    </div>
  );
}
