CREATE TABLE public.product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  rating integer NOT NULL,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view reviews"
  ON public.product_reviews FOR SELECT
  USING (true);

CREATE POLICY "Public can insert reviews"
  ON public.product_reviews FOR INSERT
  WITH CHECK (
    rating BETWEEN 1 AND 5
    AND length(trim(customer_name)) > 0
    AND length(trim(customer_name)) <= 100
    AND (comment IS NULL OR length(comment) <= 1000)
    AND EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_reviews.product_id
        AND p.vendor_id = product_reviews.vendor_id
    )
  );

CREATE POLICY "Vendor deletes own reviews"
  ON public.product_reviews FOR DELETE
  USING (auth.uid() = vendor_id);

CREATE INDEX idx_product_reviews_product ON public.product_reviews(product_id, created_at DESC);
CREATE INDEX idx_product_reviews_vendor ON public.product_reviews(vendor_id, created_at DESC);