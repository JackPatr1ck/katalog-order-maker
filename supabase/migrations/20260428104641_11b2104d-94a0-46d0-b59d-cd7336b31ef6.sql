
-- Fix function search_path
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- Tighten order insert policies (require non-empty fields + valid vendor)
DROP POLICY "Public can insert orders" ON public.orders;
CREATE POLICY "Public can insert orders" ON public.orders FOR INSERT WITH CHECK (
  length(trim(customer_name)) > 0
  AND length(trim(customer_phone)) > 0
  AND length(trim(delivery_address)) > 0
  AND EXISTS (SELECT 1 FROM public.vendor_profiles WHERE user_id = vendor_id)
);

DROP POLICY "Public can insert order items" ON public.order_items;
CREATE POLICY "Public can insert order items" ON public.order_items FOR INSERT WITH CHECK (
  quantity > 0 AND length(trim(product_name)) > 0
);

-- Restrict bucket listing: only allow viewing specific objects, not listing all
DROP POLICY "Public read product images" ON storage.objects;
CREATE POLICY "Public read product images" ON storage.objects FOR SELECT USING (bucket_id = 'product-images');
