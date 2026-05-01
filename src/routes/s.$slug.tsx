import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Loader2, Minus, Plus, ShoppingCart, MessageCircle, ImageOff, ShoppingBag } from "lucide-react";
import { formatMoney, waLink } from "@/lib/format";
import { trackEvent } from "@/lib/analytics";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/s/$slug")({
  component: Storefront,
});

interface Vendor { user_id: string; business_name: string; whatsapp_number: string; slug: string; logo_url: string | null; description: string | null; currency: string; }
interface Category { id: string; name: string; position: number; }
interface Product { id: string; category_id: string | null; name: string; description: string | null; price_cents: number; image_url: string | null; stock: number; }

interface CartItem { product_id: string; name: string; price_cents: number; quantity: number; max: number; }

const checkoutSchema = z.object({
  customer_name: z.string().trim().min(1).max(100),
  customer_phone: z.string().trim().regex(/^\+?[1-9]\d{6,14}$/, "Use international format e.g. +234..."),
  delivery_address: z.string().trim().min(5).max(500),
  note: z.string().max(500).optional(),
});

function Storefront() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);

  const cartKey = `katalog_cart_${slug}`;

  useEffect(() => {
    let cancelled = false;
    let vendorChannel: ReturnType<typeof supabase.channel> | null = null;
    let dataChannels: ReturnType<typeof supabase.channel>[] = [];

    async function loadShopData(vendorUserId: string) {
      const [{ data: cats }, { data: prods }] = await Promise.all([
        supabase.from("categories").select("*").eq("vendor_id", vendorUserId).order("position"),
        supabase.from("products").select("*").eq("vendor_id", vendorUserId).eq("is_active", true).order("created_at", { ascending: false }),
      ]);
      if (cancelled) return;
      setCategories((cats ?? []) as Category[]);
      setProducts((prods ?? []) as Product[]);
    }

    async function refetchVendor() {
      const { data: v } = await supabase.from("vendor_profiles").select("*").eq("slug", slug).maybeSingle();
      if (cancelled) return;
      if (!v) { setVendor(null); setNotFound(true); return; }
      setNotFound(false);
      setVendor(v as Vendor);
      return v as Vendor;
    }

    (async () => {
      setLoading(true);
      setNotFound(false);
      const { data: v } = await supabase.from("vendor_profiles").select("*").eq("slug", slug).maybeSingle();
      if (cancelled) return;
      if (!v) { setNotFound(true); setLoading(false); return; }
      setVendor(v as Vendor);
      await loadShopData(v.user_id);
      setLoading(false);
      // Track storefront page view (best-effort, deduped per tab)
      void trackEvent({ vendorId: v.user_id, type: "page_view" });

      // Realtime: listen for vendor profile changes (any slug update, logo, name, etc.)
      vendorChannel = supabase
        .channel(`vendor-profile-${slug}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "vendor_profiles" }, async (payload) => {
          const newRow = payload.new as Partial<Vendor> | undefined;
          const oldRow = payload.old as Partial<Vendor> | undefined;
          if (newRow?.slug === slug || oldRow?.slug === slug) {
            await refetchVendor();
          }
        })
        .subscribe();

      // Realtime: listen for products & categories changes for this vendor
      const filter = `vendor_id=eq.${v.user_id}`;
      dataChannels = [
        supabase.channel(`products-${v.user_id}`)
          .on("postgres_changes", { event: "*", schema: "public", table: "products", filter }, () => loadShopData(v.user_id))
          .subscribe(),
        supabase.channel(`categories-${v.user_id}`)
          .on("postgres_changes", { event: "*", schema: "public", table: "categories", filter }, () => loadShopData(v.user_id))
          .subscribe(),
      ];
    })();

    return () => {
      cancelled = true;
      if (vendorChannel) supabase.removeChannel(vendorChannel);
      dataChannels.forEach(ch => supabase.removeChannel(ch));
    };
  }, [slug]);

  // Load cart from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(cartKey);
      if (raw) setCart(JSON.parse(raw));
    } catch { /* ignore */ }
  }, [cartKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(cartKey, JSON.stringify(cart));
  }, [cart, cartKey]);

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);
  const cartTotal = cart.reduce((s, i) => s + i.price_cents * i.quantity, 0);

  const grouped = useMemo(() => {
    const map = new Map<string | null, Product[]>();
    for (const p of products) {
      const k = p.category_id;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(p);
    }
    return map;
  }, [products]);

  function addToCart(p: Product) {
    if (p.stock === 0) return;
    setCart(prev => {
      const existing = prev.find(c => c.product_id === p.id);
      if (existing) {
        if (existing.quantity >= p.stock) { toast.error("Not enough stock"); return prev; }
        return prev.map(c => c.product_id === p.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { product_id: p.id, name: p.name, price_cents: p.price_cents, quantity: 1, max: p.stock }];
    });
  }

  function updateQty(id: string, delta: number) {
    setCart(prev => prev.flatMap(c => {
      if (c.product_id !== id) return [c];
      const next = c.quantity + delta;
      if (next <= 0) return [];
      if (next > c.max) { toast.error("Not enough stock"); return [c]; }
      return [{ ...c, quantity: next }];
    }));
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;
  if (notFound || !vendor) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="font-display text-3xl font-bold">Shop not found</h1>
          <p className="text-muted-foreground mt-2">The shop you're looking for doesn't exist.</p>
          <Link to="/" className="mt-4 inline-block text-primary hover:underline">Visit Katalog</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-subtle pb-24">
      {/* Header */}
      <header className="bg-background border-b border-border sticky top-0 z-30 backdrop-blur-md bg-background/85">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {vendor.logo_url ? (
              <img src={vendor.logo_url} alt="" className="size-11 rounded-full object-cover" />
            ) : (
              <div className="size-11 rounded-full bg-hero flex items-center justify-center shrink-0">
                <ShoppingBag className="size-5 text-primary-foreground" />
              </div>
            )}
            <div className="min-w-0">
              <h1 className="font-display font-bold text-lg leading-tight truncate">{vendor.business_name}</h1>
              {vendor.description && <p className="text-xs text-muted-foreground truncate">{vendor.description}</p>}
            </div>
          </div>
          <Sheet open={cartOpen} onOpenChange={setCartOpen}>
            <SheetTrigger asChild>
              <Button className="relative gap-2 shadow-elegant" disabled={cartCount === 0}>
                <ShoppingCart className="size-4" />
                <span className="hidden sm:inline">Cart</span>
                {cartCount > 0 && <Badge className="ml-1 bg-primary-foreground text-primary">{cartCount}</Badge>}
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-md flex flex-col">
              <SheetHeader>
                <SheetTitle className="font-display">Your order</SheetTitle>
              </SheetHeader>
              <CartView
                cart={cart}
                vendor={vendor}
                total={cartTotal}
                onQty={updateQty}
                onClose={() => setCartOpen(false)}
                onSuccess={(orderId) => { setCart([]); localStorage.removeItem(cartKey); navigate({ to: "/o/$orderId", params: { orderId } }); }}
              />
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-10">
        {products.length === 0 && (
          <div className="text-center py-16">
            <p className="text-muted-foreground">This shop hasn't added any products yet.</p>
          </div>
        )}
        {[...categories, { id: null as unknown as string, name: "Other", position: 999 } as Category]
          .filter(c => grouped.has(c.id === undefined ? null : c.id) || (c.id === null && grouped.has(null)))
          .map(cat => {
            const items = grouped.get(cat.id) ?? [];
            if (!items.length) return null;
            return (
              <section key={cat.id ?? "uncat"}>
                <h2 className="font-display text-2xl font-bold mb-4">{cat.name}</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {items.map(p => (
                    <Card key={p.id} className={`overflow-hidden shadow-card ${p.stock === 0 ? "opacity-60" : "hover:shadow-elegant"} transition-shadow`}>
                      <div className="aspect-square bg-muted relative">
                        {p.image_url ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><ImageOff className="size-8 text-muted-foreground" /></div>}
                        {p.stock === 0 && <div className="absolute inset-0 bg-background/60 flex items-center justify-center"><Badge variant="destructive">Sold out</Badge></div>}
                      </div>
                      <div className="p-3">
                        <h3 className="font-medium text-sm leading-tight line-clamp-2">{p.name}</h3>
                        {p.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.description}</p>}
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <span className="font-semibold text-sm">{formatMoney(p.price_cents, vendor.currency)}</span>
                          <Button size="sm" variant="outline" disabled={p.stock === 0} onClick={() => addToCart(p)} className="h-8 px-2.5">
                            <Plus className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </section>
            );
          })}
      </main>

      {/* Floating cart bar (mobile-friendly) */}
      {cartCount > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40">
          <Button size="lg" className="shadow-elegant gap-2 rounded-full" onClick={() => setCartOpen(true)}>
            <ShoppingCart className="size-4" />
            View cart · {cartCount} item{cartCount > 1 ? "s" : ""} · {formatMoney(cartTotal, vendor.currency)}
          </Button>
        </div>
      )}

      <footer className="text-center pt-8 text-xs text-muted-foreground">
        Powered by <Link to="/" className="font-medium text-foreground hover:underline">katalog</Link>
      </footer>
    </div>
  );
}

function CartView({ cart, vendor, total, onQty, onClose, onSuccess }: {
  cart: CartItem[];
  vendor: Vendor;
  total: number;
  onQty: (id: string, d: number) => void;
  onClose: () => void;
  onSuccess: (orderId: string) => void;
}) {
  const [step, setStep] = useState<"cart" | "checkout">("cart");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    const parsed = checkoutSchema.safeParse({ customer_name: name, customer_phone: phone, delivery_address: address, note });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    if (cart.length === 0) return;

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

      const items = cart.map(c => ({
        order_id: order.id,
        product_id: c.product_id,
        product_name: c.name,
        unit_price_cents: c.price_cents,
        quantity: c.quantity,
      }));
      const { error: itemsErr } = await supabase.from("order_items").insert(items);
      if (itemsErr) throw itemsErr;

      // Build WhatsApp message and open wa.me
      const lines = [
        `🛍️ *New Katalog order #${order.order_number}*`,
        `*Customer:* ${parsed.data.customer_name}`,
        `*Phone:* ${parsed.data.customer_phone}`,
        `*Address:* ${parsed.data.delivery_address}`,
        ``,
        `*Items:*`,
        ...cart.map(c => `• ${c.quantity}× ${c.name} — ${formatMoney(c.price_cents * c.quantity, vendor.currency)}`),
        ``,
        `*Total: ${formatMoney(total, vendor.currency)}*`,
        ...(parsed.data.note ? [``, `*Note:* ${parsed.data.note}`] : []),
        ``,
        `View: ${window.location.origin}/o/${order.id}`,
      ];
      const link = waLink(vendor.whatsapp_number, lines.join("\n"));
      window.open(link, "_blank");
      toast.success("Order placed! Sending to WhatsApp...");
      onClose();
      onSuccess(order.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not place order");
    } finally {
      setSubmitting(false);
    }
  }

  if (cart.length === 0) {
    return <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Your cart is empty.</div>;
  }

  return (
    <div className="flex-1 flex flex-col gap-4 mt-4 overflow-hidden">
      {step === "cart" ? (
        <>
          <div className="flex-1 overflow-y-auto space-y-3 -mx-1 px-1">
            {cart.map(c => (
              <div key={c.product_id} className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{formatMoney(c.price_cents, vendor.currency)} each</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="outline" className="size-7" onClick={() => onQty(c.product_id, -1)}><Minus className="size-3" /></Button>
                  <span className="w-7 text-center text-sm font-medium">{c.quantity}</span>
                  <Button size="icon" variant="outline" className="size-7" onClick={() => onQty(c.product_id, 1)}><Plus className="size-3" /></Button>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-border pt-4 space-y-3">
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span>{formatMoney(total, vendor.currency)}</span>
            </div>
            <Button onClick={() => setStep("checkout")} className="w-full shadow-elegant gap-2">
              Continue to checkout
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto space-y-3 -mx-1 px-1">
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
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={500} placeholder="Anything the vendor should know" />
            </div>
          </div>
          <div className="border-t border-border pt-4 space-y-3">
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span>{formatMoney(total, vendor.currency)}</span>
            </div>
            <Button onClick={submit} disabled={submitting} className="w-full shadow-elegant gap-2 bg-success hover:bg-success/90 text-success-foreground">
              {submitting ? <Loader2 className="size-4 animate-spin" /> : <MessageCircle className="size-4" />}
              Place order & send via WhatsApp
            </Button>
            <Button variant="ghost" onClick={() => setStep("cart")} className="w-full">Back</Button>
          </div>
        </>
      )}
    </div>
  );
}
