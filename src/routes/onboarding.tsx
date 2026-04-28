import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, ShoppingBag } from "lucide-react";
import { slugify, normalizeWhatsApp } from "@/lib/format";

export const Route = createFileRoute("/onboarding")({
  component: Onboarding,
  head: () => ({ meta: [{ title: "Set up your shop — Katalog" }] }),
});

const profileSchema = z.object({
  business_name: z.string().trim().min(2, "Business name is required").max(100),
  whatsapp_number: z.string().trim().regex(/^\+?[1-9]\d{6,14}$/, "Use full international format, e.g. +2348012345678"),
  slug: z.string().trim().regex(/^[a-z0-9-]{3,50}$/, "3-50 chars: lowercase letters, numbers, hyphens"),
  description: z.string().max(280).optional(),
  currency: z.string().length(3),
});

const CURRENCIES = ["USD", "EUR", "GBP", "NGN", "KES", "GHS", "ZAR", "INR", "BRL", "MXN"];

function Onboarding() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [businessName, setBusinessName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [slugTouched, setSlugTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    // If profile exists, go to dashboard
    supabase.from("vendor_profiles").select("user_id").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data) navigate({ to: "/dashboard" });
    });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!slugTouched) setSlug(slugify(businessName));
  }, [businessName, slugTouched]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const parsed = profileSchema.safeParse({
      business_name: businessName,
      whatsapp_number: normalizeWhatsApp(whatsapp),
      slug,
      description,
      currency,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("vendor_profiles").insert({
        user_id: user.id,
        ...parsed.data,
      });
      if (error) {
        if (error.code === "23505") throw new Error("That shop URL is taken — try another");
        throw error;
      }
      toast.success("Shop created! 🎉");
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save profile");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-subtle flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="size-9 rounded-lg bg-hero shadow-elegant flex items-center justify-center">
            <ShoppingBag className="size-4 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <span className="font-display font-bold text-2xl">katalog</span>
        </div>
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="font-display text-2xl">Tell us about your shop</CardTitle>
            <CardDescription>Step 2 of 2 — almost there.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="biz">Business name</Label>
                <Input id="biz" required value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Mama's Kitchen" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wa">WhatsApp number</Label>
                <Input id="wa" required value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="+234 801 234 5678" />
                <p className="text-xs text-muted-foreground">Include country code. Orders will land here.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Shop URL</Label>
                <div className="flex items-center rounded-md border border-input bg-background overflow-hidden focus-within:ring-2 focus-within:ring-ring">
                  <span className="px-3 text-sm text-muted-foreground bg-muted py-2 border-r border-input">katalog/s/</span>
                  <input id="slug" required value={slug} onChange={(e) => { setSlug(slugify(e.target.value)); setSlugTouched(true); }} className="flex-1 bg-transparent px-3 py-2 text-sm outline-none" placeholder="mamas-kitchen" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cur">Currency</Label>
                  <select id="cur" value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="desc">Short description (optional)</Label>
                <Textarea id="desc" maxLength={280} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Fresh meals delivered daily across Lagos." rows={3} />
              </div>
              <Button type="submit" className="w-full shadow-elegant" disabled={submitting}>
                {submitting && <Loader2 className="size-4 animate-spin mr-2" />}
                Open my shop
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
