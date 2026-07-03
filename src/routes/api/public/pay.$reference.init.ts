import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

const bodySchema = z.object({ email: z.string().email().max(200) });

export const Route = createFileRoute('/api/public/pay/$reference/init')({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const raw = await request.json().catch(() => ({}));
        const parsed = bodySchema.safeParse(raw);
        if (!parsed.success) {
          return Response.json({ error: 'Invalid email' }, { status: 400 });
        }
        const reference = params.reference;
        if (!/^KTL-\d+-[A-Z0-9]{4,10}$/.test(reference)) {
          return Response.json({ error: 'Invalid reference' }, { status: 400 });
        }

        const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
        const { data: order, error } = await supabaseAdmin
          .from('orders')
          .select('id, total_cents, vendor_id, paid_at, payment_link_expires_at, status')
          .eq('payment_reference', reference)
          .maybeSingle();
        if (error || !order) return Response.json({ error: 'Order not found' }, { status: 404 });
        if (order.paid_at) return Response.json({ error: 'Already paid' }, { status: 409 });
        if (order.payment_link_expires_at && new Date(order.payment_link_expires_at) < new Date()) {
          return Response.json({ error: 'Payment link expired' }, { status: 410 });
        }

        const { data: payout } = await supabaseAdmin
          .from('vendor_payouts')
          .select('paystack_subaccount_code')
          .eq('user_id', order.vendor_id)
          .maybeSingle();
        if (!payout?.paystack_subaccount_code) {
          return Response.json({ error: 'Vendor has not configured payouts' }, { status: 400 });
        }

        const { initializeTransaction } = await import('@/lib/paystack.server');
        const origin = new URL(request.url).origin;
        try {
          const init = await initializeTransaction({
            email: parsed.data.email,
            amount_kobo: order.total_cents, // NGN kobo
            reference,
            subaccount: payout.paystack_subaccount_code,
            callback_url: `${origin}/pay/${reference}/success`,
            metadata: { order_id: order.id },
          });
          await supabaseAdmin
            .from('orders')
            .update({
              paystack_reference: init.reference,
              paystack_access_code: init.access_code,
              paystack_authorization_url: init.authorization_url,
              status: 'awaiting_payment',
            })
            .eq('id', order.id);
          return Response.json({ authorization_url: init.authorization_url });
        } catch (e) {
          return Response.json({ error: e instanceof Error ? e.message : 'Init failed' }, { status: 502 });
        }
      },
    },
  },
});
