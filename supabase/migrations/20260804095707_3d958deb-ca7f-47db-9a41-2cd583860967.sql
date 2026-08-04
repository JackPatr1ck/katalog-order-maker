CREATE TABLE public.waitlist_signups (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  business_name text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX waitlist_signups_email_key ON public.waitlist_signups (lower(email));

GRANT INSERT ON public.waitlist_signups TO anon, authenticated;
GRANT ALL ON public.waitlist_signups TO service_role;

ALTER TABLE public.waitlist_signups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can join the waitlist"
ON public.waitlist_signups FOR INSERT
TO anon, authenticated
WITH CHECK (
  length(trim(email)) between 5 and 255
  AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  AND (business_name IS NULL OR length(business_name) <= 120)
);

CREATE POLICY "Admins view waitlist"
ON public.waitlist_signups FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

GRANT SELECT ON public.waitlist_signups TO authenticated;