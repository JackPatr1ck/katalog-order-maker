import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';

// List Nigerian banks (public info, but auth-gated to prevent abuse of our Paystack key)
export const listPaystackBanks = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { listBanks } = await import('./paystack.server');
    const banks = await listBanks('nigeria');
    return banks.map((b) => ({ name: b.name, code: b.code }));
  });

const payoutSchema = z.object({
  bank_code: z.string().min(2).max(10),
  bank_name: z.string().min(1).max(100),
  account_number: z.string().regex(/^\d{10}$/, 'Enter the 10-digit account number'),
});

// Save vendor bank details + create or update Paystack subaccount
export const saveVendorPayout = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => payoutSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { resolveAccount, createSubaccount, updateSubaccount } = await import('./paystack.server');

    // 1. Verify account name with Paystack
    const resolved = await resolveAccount(data.account_number, data.bank_code);

    // 2. Get vendor business name for subaccount label
    const { data: profile, error: profErr } = await context.supabase
      .from('vendor_profiles')
      .select('business_name')
      .eq('user_id', context.userId)
      .maybeSingle();
    if (profErr || !profile) throw new Error('Vendor profile not found');

    // 3. Load existing payout row (if any)
    const { data: existing } = await context.supabase
      .from('vendor_payouts')
      .select('paystack_subaccount_code, percentage_charge')
      .eq('user_id', context.userId)
      .maybeSingle();

    const percentage_charge = Number(existing?.percentage_charge ?? 2);

    let subaccountCode = existing?.paystack_subaccount_code ?? null;
    if (subaccountCode) {
      await updateSubaccount(subaccountCode, {
        business_name: profile.business_name,
        bank_code: data.bank_code,
        account_number: data.account_number,
        percentage_charge,
      });
    } else {
      const created = await createSubaccount({
        business_name: profile.business_name,
        bank_code: data.bank_code,
        account_number: data.account_number,
        percentage_charge,
      });
      subaccountCode = created.subaccount_code;
    }

    // 4. Upsert payout row
    const { error: upErr } = await context.supabase
      .from('vendor_payouts')
      .upsert({
        user_id: context.userId,
        paystack_subaccount_code: subaccountCode,
        business_name: profile.business_name,
        bank_code: data.bank_code,
        bank_name: data.bank_name,
        account_number: data.account_number,
        account_name: resolved.account_name,
        percentage_charge,
      });
    if (upErr) throw new Error(upErr.message);

    return { account_name: resolved.account_name, subaccount_code: subaccountCode };
  });

// Fetch current payout details for the signed-in vendor
export const getVendorPayout = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from('vendor_payouts')
      .select('bank_code, bank_name, account_number, account_name, paystack_subaccount_code, percentage_charge')
      .eq('user_id', context.userId)
      .maybeSingle();
    return data;
  });

const genLinkSchema = z.object({ order_id: z.string().uuid() });

// Vendor generates a payment link for one of their orders
export const generatePaymentLink = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => genLinkSchema.parse(input))
  .handler(async ({ data, context }) => {
    // 1. Vendor must have a subaccount configured
    const { data: payout } = await context.supabase
      .from('vendor_payouts')
      .select('paystack_subaccount_code')
      .eq('user_id', context.userId)
      .maybeSingle();
    if (!payout?.paystack_subaccount_code) {
      throw new Error('Set up your payout bank account first (Settings → Payouts).');
    }

    // 2. Fetch order (RLS ensures it belongs to this vendor)
    const { data: order, error: oErr } = await context.supabase
      .from('orders')
      .select('id, order_number, total_cents, status, payment_reference, payment_link_expires_at, paid_at, vendor_id')
      .eq('id', data.order_id)
      .eq('vendor_id', context.userId)
      .maybeSingle();
    if (oErr || !order) throw new Error('Order not found');
    if (order.paid_at) throw new Error('This order is already paid');

    // 3. Generate a fresh reference if none or if expired
    const now = Date.now();
    const stillValid = order.payment_reference
      && order.payment_link_expires_at
      && new Date(order.payment_link_expires_at).getTime() > now;

    let reference = order.payment_reference as string | null;
    if (!stillValid) {
      const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
      reference = `KTL-${order.order_number}-${rand}`;
      const expires = new Date(now + 24 * 60 * 60 * 1000).toISOString();
      const { error: uErr } = await context.supabase
        .from('orders')
        .update({
          payment_reference: reference,
          payment_link_expires_at: expires,
          status: 'awaiting_payment',
          paystack_reference: null,
          paystack_access_code: null,
          paystack_authorization_url: null,
        })
        .eq('id', order.id);
      if (uErr) throw new Error(uErr.message);
    }

    return { reference, expires_in_hours: 24 };
  });
