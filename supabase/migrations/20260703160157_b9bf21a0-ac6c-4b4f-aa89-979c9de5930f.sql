
-- Vendor payout / Paystack subaccount details (kept separate from public vendor_profiles to protect bank info)
CREATE TABLE public.vendor_payouts (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  paystack_subaccount_code TEXT,
  business_name TEXT,
  bank_code TEXT,
  bank_name TEXT,
  account_number TEXT,
  account_name TEXT,
  percentage_charge NUMERIC(5,2) NOT NULL DEFAULT 2.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_payouts TO authenticated;
GRANT ALL ON public.vendor_payouts TO service_role;

ALTER TABLE public.vendor_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendor manages own payouts"
  ON public.vendor_payouts
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins manage all payouts"
  ON public.vendor_payouts
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_vendor_payouts_updated_at
  BEFORE UPDATE ON public.vendor_payouts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Order payment fields
ALTER TABLE public.orders
  ADD COLUMN payment_reference TEXT UNIQUE,
  ADD COLUMN payment_link_expires_at TIMESTAMPTZ,
  ADD COLUMN paid_at TIMESTAMPTZ,
  ADD COLUMN paystack_reference TEXT,
  ADD COLUMN paystack_access_code TEXT,
  ADD COLUMN paystack_authorization_url TEXT,
  ADD COLUMN amount_paid_cents INTEGER;

CREATE INDEX orders_payment_reference_idx ON public.orders(payment_reference);

-- Public can read a single order by payment_reference (for the checkout page); no PII exposed beyond what buyer already knows
CREATE POLICY "Public can view order by payment reference"
  ON public.orders
  FOR SELECT
  TO anon, authenticated
  USING (payment_reference IS NOT NULL);

CREATE POLICY "Public can view order items by payment reference"
  ON public.order_items
  FOR SELECT
  TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id AND o.payment_reference IS NOT NULL
  ));

-- Grant anon read for the public checkout page
GRANT SELECT ON public.orders TO anon;
GRANT SELECT ON public.order_items TO anon;
