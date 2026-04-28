import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Copy, ExternalLink } from "lucide-react";
import { z } from "zod";
import { normalizeWhatsApp, slugify } from "@/lib/format";

export const Route = createFileRoute("/dashboard/settings")({
  component: SettingsPage,
});

const CURRENCIES = ["USD", "EUR", "GBP", "NGN", "KES", "GHS", "ZAR", "INR", "BRL", "MXN"];

const schema = z.object({
  business_name: z.string().trim().min(2).max(100),
  whatsapp_number: z.string().regex(/^\+?[1-9]\d{6,14}$/, "Use international format"),
  slug: z.string().regex(/^[a-z0-9-]{3,50}$/),
  description: z.string().max(280).nullable(),
  currency: z.string().length(3),
});

function SettingsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [currency, setCurrency] = useState("USD");

  useEffect(() => {
    if (!user) return;
    supabase.from("vendor_profiles").select("*").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data) {
        setBusinessName(data.business_name);
        setWhatsapp(data.whatsapp_number);
        setSlug(data.slug);
        setDescription(data.description ?? "");
        setCurrency(data.currency);
      }
      setLoading(false);
    });
  }, [user]);

  async function save() {
    if (!user) return;
    const parsed = schema.safeParse({
      business_name: businessName,
      whatsapp_number: normalizeWhatsApp(whatsapp),
      slug,
      description: description || null,
      currency,
    });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setSaving(true);
    const { error } = await supabase.from("vendor_profiles").update(parsed.data).eq("user_id", user.id);
    setSaving(false);
    if (error) toast.error(error.code === "23505" ? "That URL is taken" : error.message);
    else toast.success("Saved");
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" /></div>;

  const url = `${window.location.origin}/s/${slug}`;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="font-display text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Update your shop details.</p>
      </div>

      <Card className="p-5 shadow-card">
        <p className="text-xs font-medium text-muted-foreground mb-2">YOUR SHOP LINK</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 px-3 py-2 bg-muted rounded-md text-sm truncate">{url}</code>
          <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(url); toast.success("Copied"); }}><Copy className="size-4" /></Button>
          <a href={url} target="_blank" rel="noreferrer"><Button variant="outline" size="icon"><ExternalLink className="size-4" /></Button></a>
        </div>
      </Card>

      <Card className="p-5 shadow-card space-y-4">
        <div className="space-y-2">
          <Label>Business name</Label>
          <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>WhatsApp number</Label>
          <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="+234 801 234 5678" />
        </div>
        <div className="space-y-2">
          <Label>Shop URL slug</Label>
          <Input value={slug} onChange={(e) => setSlug(slugify(e.target.value))} />
        </div>
        <div className="space-y-2">
          <Label>Currency</Label>
          <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={280} />
        </div>
        <Button onClick={save} disabled={saving} className="shadow-elegant">
          {saving && <Loader2 className="size-4 animate-spin mr-2" />}
          Save changes
        </Button>
      </Card>
    </div>
  );
}
