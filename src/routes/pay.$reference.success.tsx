import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2 } from 'lucide-react';

export const Route = createFileRoute('/pay/$reference/success')({
  component: PaySuccess,
  head: () => ({ meta: [{ title: 'Payment complete — Katalog' }] }),
});

function PaySuccess() {
  const { reference } = Route.useParams();
  const navigate = useNavigate();
  const [orderId, setOrderId] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let tries = 0;
    async function poll() {
      const { data } = await supabase.from('orders').select('id, paid_at').eq('payment_reference', reference).maybeSingle();
      if (cancelled) return;
      if (data?.paid_at) { setOrderId(data.id); setChecking(false); return; }
      if (tries++ < 8) setTimeout(poll, 1500);
      else setChecking(false);
    }
    void poll();
    return () => { cancelled = true; };
  }, [reference]);

  return (
    <div className="min-h-screen bg-subtle flex items-center justify-center px-4">
      <Card className="p-8 max-w-md w-full text-center shadow-elegant">
        {checking ? (
          <>
            <Loader2 className="size-8 animate-spin text-primary mx-auto" />
            <p className="mt-4 text-sm text-muted-foreground">Confirming your payment…</p>
          </>
        ) : (
          <>
            <div className="mx-auto size-14 rounded-full bg-success/10 flex items-center justify-center mb-3">
              <CheckCircle2 className="size-8 text-success" />
            </div>
            <h1 className="font-display text-2xl font-bold">Payment complete</h1>
            <p className="text-sm text-muted-foreground mt-1">Reference: {reference}</p>
            {orderId ? (
              <Button className="w-full mt-6" onClick={() => navigate({ to: '/o/$orderId', params: { orderId } })}>
                View your ticket
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground mt-4">If your ticket doesn't appear shortly, contact the vendor with the reference above.</p>
            )}
            <Link to="/" className="text-primary hover:underline text-sm mt-4 inline-block">Back to Katalog</Link>
          </>
        )}
      </Card>
    </div>
  );
}
