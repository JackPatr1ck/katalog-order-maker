import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Minus, Plus, MessageCircle, ImageOff, ShoppingBag, ArrowLeft } from "lucide-react";
import { formatMoney, waLink, effectivePriceCents } from "@/lib/format";
import { trackEvent } from "@/lib/analytics";
import { generateTicketBlob, uploadTicket } from "@/lib/ticket";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/s/$slug/p/$productId")({
  component: SingleProductPage,
});

interface Vendor { user_id: string; business_name: string; whatsapp_number: string; slug: string; logo_url: string | null; description: string | null; currency: string; }
interface Product { id: string; vendor_id: string; name: string; description: string | null; price_cents: number; image_url: string | null; stock: number; is_active: boolean; discount_percent: number; }

const checkoutSchema = z.object({
  customer_name: z.string().trim().min(1).max(100),
  customer_phone: z.string().trim().regex(/^\+?[1-9]\d{6,14}$/, "Use international format e.g. +234..."),
  delivery_address: z.string().trim().min(5).max(500),
  note: z.string().max(500).optional(),
});

function SingleProductPage() {
  const { slug, productId } = Route.useParams();
  const navigate = useNavigate();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [qty, setQty] = useState(1);
  const [checkout, setCheckout] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: v } = await supabase.from("vendor_profiles").select("*").eq("slug", slug).maybeSingle();
      if (cancelled) return;
      if (!v) { setNotFound(true); setLoading(false); return; }
      const { data: p } = await supabase
        .from("products")
        .select("*")
        .eq("id", productId)
        .eq("vendor_id", v.user_id)
        .eq("is_active", true)
        .maybeSingle();
      if (cancelled) return;
      if (!p) { setVendor(v as Vendor); setNotFound(true); setLoading(false); return; }
      setVendor(v as Vendor);
      setProduct(p as Product);
      setLoading(false);
      void trackEvent({ vendorId: v.user_id, type: "product_click", productId: p.id });
    })();
    return () => { cancelled = true; };
  }, [slug, productId]);

  async function submit() {
    if (!vendor || !product) return;
    const parsed = checkoutSchema.safeParse({ customer_name: name, customer_phone: phone, delivery_address: address, note });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    const unit = effectivePriceCents(product.price_cents, product.discount_percent);
    const total = unit * qty;
    setSubmitting(true);
    try {
      const { data: order, error: orderErr } = await supabase.from("orders").insert({
        vendor_id: vendor.user_id,
        customer_name: parsed.data.customer_name,
        customer_phone: parsed.data.customer_phone,
        delivery_address: parsed.data.delivery_address,
        note: parsed.data.note ?? null,
        total_cents: total,
        status: "new",
      }).select("id, order_number").single();
      if (orderErr) throw orderErr;

      const { error: itemsErr } = await supabase.from("order_items").insert([{
        order_id: order.id,
        product_id: product.id,
        product_name: product.name,
        unit_price_cents: unit,
        quantity: qty,
      }]);
      if (itemsErr) throw itemsErr;

      let ticketUrl = "";
      try {
        const blob = await generateTicketBlob({
          orderNumber: order.order_number,
          businessName: vendor.business_name,
          customerName: parsed.data.customer_name,
          customerPhone: parsed.data.customer_phone,
          address: parsed.data.delivery_address,
          note: parsed.data.note ?? null,
          items: [{ name: product.name, quantity: qty, price_cents: unit }],
          totalCents: total,
          currency: vendor.currency,
        });
        ticketUrl = await uploadTicket(order.id, blob);
      } catch (err) {
        console.error("Ticket generation failed", err);
      }

      const lines = [
        `Hello ${vendor.business_name},`,
        ``,
        `I'd like to place a new order (#${order.order_number}).`,
        ``,
        `Name: ${parsed.data.customer_name}`,
        `Phone: ${parsed.data.customer_phone}`,
        `Address: ${parsed.data.delivery_address}`,
        ``,
        `Items:`,
        `• ${qty} × ${product.name}`,
        ``,
        `Total: ${formatMoney(total, vendor.currency)}`,
        ...(parsed.data.note ? [``, `Note: ${parsed.data.note}`] : []),
        ``,
        ticketUrl ? `Order ticket: ${ticketUrl}` : `View order: ${window.location.origin}/o/${order.id}`,
      ];
      void trackEvent({ vendorId: vendor.user_id, type: "checkout_click" });
      window.open(waLink(vendor.whatsapp_number, lines.join("\n")), "_blank");
      toast.success("Order placed! Sending to WhatsApp...");
      navigate({ to: "/o/$orderId", params: { orderId: order.id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not place order");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;
  if (notFound || !product || !vendor) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="font-display text-3xl font-bold">Product not available</h1>
          <p className="text-muted-foreground mt-2">This product may have been removed or is no longer available.</p>
          {vendor && (
            <Link to="/s/$slug" params={{ slug }} className="mt-4 inline-block text-primary hover:underline">
              Visit {vendor.business_name}
            </Link>
          )}
        </div>
      </div>
    );
  }

  const total = product.price_cents * qty;

  return (
    <div className="min-h-screen bg-subtle pb-12">
      <header className="bg-background border-b border-border sticky top-0 z-30 backdrop-blur-md bg-background/85">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link to="/s/$slug" params={{ slug }} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> Shop
          </Link>
          <div className="flex-1" />
          <div className="flex items-center gap-2 min-w-0">
            {vendor.logo_url ? (
              <img src={vendor.logo_url} alt="" className="size-8 rounded-full object-cover" />
            ) : (
              <div className="size-8 rounded-full bg-hero flex items-center justify-center shrink-0">
                <ShoppingBag className="size-4 text-primary-foreground" />
              </div>
            )}
            <span className="font-display font-semibold text-sm truncate">{vendor.business_name}</span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <Card className="overflow-hidden shadow-card">
          <div className="grid md:grid-cols-2">
            <div className="aspect-square bg-muted">
              {product.image_url ? (
                <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center"><ImageOff className="size-10 text-muted-foreground" /></div>
              )}
            </div>
            <div className="p-6 space-y-4">
              <h1 className="font-display text-2xl font-bold">{product.name}</h1>
              <p className="text-3xl font-bold font-display">{formatMoney(product.price_cents, vendor.currency)}</p>
              {product.stock === 0 ? (
                <Badge variant="destructive">Sold out</Badge>
              ) : (
                <p className="text-xs text-muted-foreground">{product.stock} in stock</p>
              )}
              {product.description && (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{product.description}</p>
              )}

              {!checkout ? (
                <>
                  <div className="flex items-center gap-3 pt-2">
                    <span className="text-sm font-medium">Quantity</span>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="outline" className="size-8" disabled={qty <= 1} onClick={() => setQty(q => Math.max(1, q - 1))}><Minus className="size-3.5" /></Button>
                      <span className="w-8 text-center font-medium">{qty}</span>
                      <Button size="icon" variant="outline" className="size-8" disabled={qty >= product.stock} onClick={() => setQty(q => Math.min(product.stock, q + 1))}><Plus className="size-3.5" /></Button>
                    </div>
                  </div>
                  <Button
                    className="w-full gap-2 shadow-elegant"
                    disabled={product.stock === 0}
                    onClick={() => setCheckout(true)}
                  >
                    Buy now · {formatMoney(total, vendor.currency)}
                  </Button>
                </>
              ) : (
                <div className="space-y-3 pt-2">
                  <div className="space-y-2">
                    <Label>Your name</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone (with country code)</Label>
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+234 801 234 5678" />
                  </div>
                  <div className="space-y-2">
                    <Label>Delivery address</Label>
                    <Textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={3} placeholder="Street, area, landmark, city" />
                  </div>
                  <div className="space-y-2">
                    <Label>Note (optional)</Label>
                    <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={500} />
                  </div>
                  <div className="flex justify-between font-semibold pt-1">
                    <span>Total</span>
                    <span>{formatMoney(total, vendor.currency)}</span>
                  </div>
                  <Button onClick={submit} disabled={submitting} className="w-full shadow-elegant gap-2 bg-success hover:bg-success/90 text-success-foreground">
                    {submitting ? <Loader2 className="size-4 animate-spin" /> : <MessageCircle className="size-4" />}
                    Place order & send via WhatsApp
                  </Button>
                  <Button variant="ghost" onClick={() => setCheckout(false)} className="w-full">Back</Button>
                </div>
              )}
            </div>
          </div>
        </Card>

        <footer className="text-center pt-8 text-xs text-muted-foreground">
          Powered by <Link to="/" className="font-medium text-foreground hover:underline">katalog</Link>
        </footer>
      </main>
    </div>
  );
}
