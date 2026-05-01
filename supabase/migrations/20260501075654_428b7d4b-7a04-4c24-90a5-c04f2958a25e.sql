-- Analytics events table for storefront tracking
CREATE TABLE public.storefront_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('page_view', 'product_click', 'checkout_click')),
  source TEXT NOT NULL DEFAULT 'direct',
  product_id UUID,
  session_hash TEXT,
  path TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for fast vendor + time-range queries
CREATE INDEX idx_storefront_events_vendor_time ON public.storefront_events (vendor_id, created_at DESC);
CREATE INDEX idx_storefront_events_vendor_source ON public.storefront_events (vendor_id, source);
CREATE INDEX idx_storefront_events_vendor_type ON public.storefront_events (vendor_id, event_type);

-- Enable RLS
ALTER TABLE public.storefront_events ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous storefront visitors) can insert events
CREATE POLICY "Public can insert storefront events"
ON public.storefront_events
FOR INSERT
WITH CHECK (
  vendor_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.vendor_profiles WHERE user_id = vendor_id)
);

-- Only the vendor can read their own analytics
CREATE POLICY "Vendor views own analytics"
ON public.storefront_events
FOR SELECT
USING (auth.uid() = vendor_id);
