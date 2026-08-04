import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';

// Server-authoritative pricing (kobo). Never trust client-sent amounts.
export const PLAN_PRICING = {
  hustler: { monthly: 99000, annual: 990000 }, // ₦990 / ₦9,900
} as const;

export type PaidPlan = keyof typeof PLAN_PRICING;
export type BillingCycle = 'monthly' | 'annual';

const initSchema = z.object({
  plan: z.enum(['hustler']),
  cycle: z.enum(['monthly', 'annual']),
});

export const initPlanCheckout = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => initSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { initializeTransactionPlatform } = await import('./paystack.server');

    const { data: userRow } = await context.supabase.auth.getUser();
    const email = userRow.user?.email;
    if (!email) throw new Error('Email required');

    const amount_kobo = PLAN_PRICING[data.plan][data.cycle];
    const reference = `sub_${data.plan}_${data.cycle}_${context.userId.slice(0, 8)}_${Date.now()}`;

    // Ensure a row exists so vendors can view their (default) plan even before upgrading
    await context.supabase
      .from('vendor_subscriptions')
      .upsert({ user_id: context.userId }, { onConflict: 'user_id', ignoreDuplicates: true });

    const origin =
      process.env.PUBLIC_SITE_URL ??
      process.env.APP_URL ??
      'https://katalog-beta.lovable.app';

    const init = await initializeTransactionPlatform({
      email,
      amount_kobo,
      reference,
      callback_url: `${origin}/dashboard/settings/plan?ref=${reference}`,
      metadata: {
        type: 'subscription',
        user_id: context.userId,
        plan: data.plan,
        cycle: data.cycle,
      },
    });

    return { authorization_url: init.authorization_url, reference };
  });

export const getMySubscription = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from('vendor_subscriptions')
      .select('plan,billing_cycle,status,current_period_start,current_period_end')
      .eq('user_id', context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (
      data ?? {
        plan: 'starter' as const,
        billing_cycle: null,
        status: 'active' as const,
        current_period_start: null,
        current_period_end: null,
      }
    );
  });
