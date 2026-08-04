-- 1. Remove public read access to orders / order_items
DROP POLICY IF EXISTS "Public can view order by payment reference" ON public.orders;
DROP POLICY IF EXISTS "Public can view order items by payment reference" ON public.order_items;

-- 2. Order ticket storage: insert only for a real order, no overwrite
CREATE OR REPLACE FUNCTION public.order_exists(_order_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.orders WHERE id = _order_id)
$$;
REVOKE ALL ON FUNCTION public.order_exists(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.order_exists(uuid) TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Anyone can update order tickets" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload order tickets" ON storage.objects;

CREATE POLICY "Ticket upload for existing order only"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'order-tickets'
  AND name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.png$'
  AND public.order_exists((replace(name, '.png', ''))::uuid)
);

-- 3. Product images: uploads must land in the uploader's own folder
DROP POLICY IF EXISTS "Authenticated upload product images" ON storage.objects;
CREATE POLICY "Owner uploads product images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'product-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 4. Reviews: require the product to have actually been ordered
CREATE OR REPLACE FUNCTION public.product_was_ordered(_product_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.order_items WHERE product_id = _product_id)
$$;
REVOKE ALL ON FUNCTION public.product_was_ordered(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.product_was_ordered(uuid) TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Public can insert reviews" ON public.product_reviews;
CREATE POLICY "Public can insert reviews for ordered products"
ON public.product_reviews FOR INSERT
WITH CHECK (
  rating >= 1 AND rating <= 5
  AND length(trim(customer_name)) > 0
  AND length(trim(customer_name)) <= 100
  AND (comment IS NULL OR length(comment) <= 1000)
  AND EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_reviews.product_id AND p.vendor_id = product_reviews.vendor_id
  )
  AND public.product_was_ordered(product_reviews.product_id)
);

-- 5. Enforce starter-plan product limit server-side
CREATE OR REPLACE FUNCTION public.enforce_product_plan_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan text;
  v_count integer;
BEGIN
  SELECT COALESCE(
    (SELECT s.plan FROM public.vendor_subscriptions s
      WHERE s.user_id = NEW.vendor_id AND s.status = 'active'
        AND (s.current_period_end IS NULL OR s.current_period_end > now())
      LIMIT 1),
    (SELECT p.plan FROM public.vendor_profiles p WHERE p.user_id = NEW.vendor_id),
    'starter'
  ) INTO v_plan;

  IF v_plan IN ('starter', 'free') THEN
    SELECT count(*) INTO v_count FROM public.products WHERE vendor_id = NEW.vendor_id;
    IF v_count >= 5 THEN
      RAISE EXCEPTION 'Product limit reached for the free plan. Upgrade to add more products.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_products_plan_limit ON public.products;
CREATE TRIGGER trg_products_plan_limit
BEFORE INSERT ON public.products
FOR EACH ROW EXECUTE FUNCTION public.enforce_product_plan_limit();

-- 6. Lock down helper functions from anonymous callers
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_product_plan_limit() FROM PUBLIC, anon, authenticated;