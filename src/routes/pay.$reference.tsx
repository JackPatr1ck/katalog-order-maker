import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ShieldCheck, CheckCircle2, Clock, ShoppingBag } from 'lucide-react';
import { formatMoney } from '@/lib/format';
import { toast } from 'sonner';
import { z } from 'zod';

export const Route = createFileRoute('/pay/$reference')({
  component: PayPage,
  head: () => ({ meta: [{ title: 'Complete payment — Katalog' }] }),
});

interface Order {
  id: string;
  order_number: number;
  vendor_id: string;
  customer_name: string;
  total_cents: number;
  status: string;
  paid_at: string | null;
  payment_link_expires_at: string | null;
  delivery_address: string;
}
interface Item { id: string; product_name: string; unit_price_cents: number; quantity: number; }
interface Vendor { business_name: string; slug: string; logo_url: string | null; currency: string; }

const emailSchema = z.string().email().max(200);

function PayPage() {
  const { reference } = Route.useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: o } = await supabase
        .from('orders')
        .select('*')
        .eq('payment_reference', reference)
        .maybeSingle();
      if (!o) { setLoading(false); return; }
      setOrder(o as Order);
      const [{ data: its }, { data: v }] = await Promise.all([
        supabase.from('order_items').select('*').eq('order_id', o.id),
        supabase.from('vendor_profiles').select('business_name, slug, logo_url, currency').eq('user_id', o.vendor_id).maybeSingle(),
      ]);
      setItems((its ?? []) as Item[]);
      setVendor(v as Vendor);
      setLoading(false);
    })();
  }, [reference]);

  // Poll for payment confirmation after user returns (webhook may lag)
  useEffect(() => {
    if (!order || order.paid_at) return;
    const ch = supabase
      .channel(`order-pay-${order.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${order.id}` }, (p) => {
        const n = p.new as Order;
        if (n.paid_at) setOrder(n);
      })
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [order?.id, order?.paid_at]);

  async function pay() {
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) { toast.error('Enter a valid email for your receipt'); return; }
    setPaying(true);
    try {
      const res = await fetch(`/api/public/pay/${reference}/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: parsed.data }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Could not start payment');
      window.location.href = json.authorization_url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Payment failed to start');
      setPaying(false);
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;
  if (!order || !vendor) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold">Payment link not found</h1>
          <p className="text-sm text-muted-foreground mt-1">This link may have expired or been revoked.</p>
          <Link to="/" className="text-primary hover:underline mt-4 inline-block">Go home</Link>
        </div>
      </div>
    );
  }

  const expired = !order.paid_at && order.payment_link_expires_at && new Date(order.payment_link_expires_at) < new Date();
  const paid = !!order.paid_at;

  return (
    <div className="min-h-screen bg-subtle py-8 px-4">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          {vendor.logo_url ? (
            <img src={vendor.logo_url} alt="" className="size-11 rounded-full object-cover" />
          ) : (
            <div className="size-11 rounded-full bg-hero flex items-center justify-center"><ShoppingBag className="size-5 text-primary-foreground" /></div>
          )}
          <div className="min-w-0">
            <p className="font-display font-bold text-lg leading-tight truncate">{vendor.business_name}</p>
            <p className="text-xs text-muted-foreground">Order #{order.order_number}</p>
          </div>
        </div>

        <Card className="p-6 shadow-elegant">
          {paid ? (
            <div className="text-center">
              <div className="mx-auto size-14 rounded-full bg-success/10 flex items-center justify-center mb-3">
                <CheckCircle2 className="size-8 text-success" />
              </div>
              <h1 className="font-display text-xl font-bold">Payment received</h1>
              <p className="text-sm text-muted-foreground mt-1">Ref: {reference}</p>
            </div>
          ) : expired ? (
            <div className="text-center">
              <div className="mx-auto size-14 rounded-full bg-destructive/10 flex items-center justify-center mb-3">
                <Clock className="size-8 text-destructive" />
              </div>
              <h1 className="font-display text-xl font-bold">Link expired</h1>
              <p className="text-sm text-muted-foreground mt-1">Ask {vendor.business_name} to generate a fresh payment link.</p>
            </div>
          ) : (
            <>
              <h1 className="font-display text-xl font-bold">Complete payment</h1>
              <p className="text-xs text-muted-foreground mt-1">Reference: {reference}</p>
            </>
          )}

          <div className="mt-5 border-t border-border pt-4">
            <p className="text-xs font-medium text-muted-foreground mb-2">ITEMS</p>
            <div className="space-y-2">
              {items.map((it) => (
                <div key={it.id} className="flex justify-between text-sm">
                  <span>{it.quantity}× {it.product_name}</span>
                  <span className="font-medium">{formatMoney(it.unit_price_cents * it.quantity, vendor.currency)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-border mt-3 pt-3 flex justify-between font-semibold">
              <span>Total</span>
              <span>{formatMoney(order.total_cents, vendor.currency)}</span>
            </div>
          </div>

          {!paid && !expired && (
            <div className="mt-6 space-y-3">
              <div className="space-y-1.5">
                <Label>Email for receipt</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
              </div>
              <Button onClick={pay} disabled={paying} className="w-full shadow-elegant gap-2">
                {paying ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
                Pay {formatMoney(order.total_cents, vendor.currency)} securely
              </Button>
              <p className="text-[11px] text-muted-foreground text-center">
                Payments processed by Paystack. Card, bank transfer & USSD accepted.
              </p>
            </div>
          )}

          {paid && (
            <Link to="/o/$orderId" params={{ orderId: order.id }} className="block mt-6">
              <Button variant="outline" className="w-full">View order receipt</Button>
            </Link>
          )}
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Powered by <Link to="/" className="font-medium text-foreground hover:underline">katalog</Link>
        </p>
      </div>
    </div>
  );
}
