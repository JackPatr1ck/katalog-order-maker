GRANT SELECT ON public.vendor_profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_profiles TO authenticated;
GRANT ALL ON public.vendor_profiles TO service_role;