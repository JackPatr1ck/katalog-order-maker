ALTER PUBLICATION supabase_realtime ADD TABLE public.vendor_profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
ALTER PUBLICATION supabase_realtime ADD TABLE public.categories;
ALTER TABLE public.vendor_profiles REPLICA IDENTITY FULL;
ALTER TABLE public.products REPLICA IDENTITY FULL;
ALTER TABLE public.categories REPLICA IDENTITY FULL;