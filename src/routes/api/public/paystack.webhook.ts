import { createFileRoute } from '@tanstack/react-router';
import { createHmac, timingSafeEqual } from 'crypto';

export const Route = createFileRoute('/api/public/paystack/webhook')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.PAYSTACK_SECRET_KEY;
        if (!secret) return new Response('Not configured', { status: 500 });

        const signature = request.headers.get('x-paystack-signature') ?? '';
        const raw = await request.text();
        const expected = createHmac('sha512', secret).update(raw).digest('hex');
        const sigBuf = Buffer.from(signature);
        const expBuf = Buffer.from(expected);
        if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
          return new Response('Invalid signature', { status: 401 });
        }

        let event: {
          event?: string;
          data?: {
            reference?: string;
            amount?: number;
            paid_at?: string;
            status?: string;
            metadata?: { type?: string; user_id?: string; plan?: string; cycle?: string } | null;
          };
        };
        try {
          event = JSON.parse(raw);
        } catch {
          return new Response('Bad JSON', { status: 400 });
        }

        if (event.event === 'charge.success' && event.data?.reference && event.data.status === 'success') {
          const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
          const meta = event.data.metadata ?? null;

          if (meta?.type === 'subscription' && meta.user_id && meta.plan && meta.cycle) {
            const paidAt = event.data.paid_at ?? new Date().toISOString();
            const start = new Date(paidAt);
            const end = new Date(start);
            if (meta.cycle === 'annual') end.setFullYear(end.getFullYear() + 1);
            else end.setMonth(end.getMonth() + 1);

            await supabaseAdmin
              .from('vendor_subscriptions')
              .upsert(
                {
                  user_id: meta.user_id,
                  plan: meta.plan,
                  billing_cycle: meta.cycle,
                  status: 'active',
                  current_period_start: start.toISOString(),
                  current_period_end: end.toISOString(),
                  last_reference: event.data.reference,
                  amount_paid_kobo: event.data.amount ?? null,
                },
                { onConflict: 'user_id' },
              );
          }

        }

        return new Response('ok');
      },
    },
  },
});
