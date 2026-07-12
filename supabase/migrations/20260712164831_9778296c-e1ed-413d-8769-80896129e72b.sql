
CREATE TABLE public.vendor_subscriptions (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'starter' CHECK (plan IN ('starter','hustler','business')),
  billing_cycle text CHECK (billing_cycle IN ('monthly','annual')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','past_due','canceled')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  last_reference text,
  amount_paid_kobo integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.vendor_subscriptions TO authenticated;
GRANT ALL ON public.vendor_subscriptions TO service_role;

ALTER TABLE public.vendor_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendors read own subscription"
  ON public.vendor_subscriptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Vendors insert own subscription"
  ON public.vendor_subscriptions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- No UPDATE/DELETE policy for users; only service role (webhook) can mutate plan/period.

CREATE TRIGGER set_vendor_subscriptions_updated_at
  BEFORE UPDATE ON public.vendor_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
