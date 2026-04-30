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
import { Loader2, Copy, ExternalLink, Upload, Trash2, ImageOff } from "lucide-react";
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
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("vendor_profiles").select("*").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data) {
        setBusinessName(data.business_name);
        setWhatsapp(data.whatsapp_number);
        setSlug(data.slug);
        setDescription(data.description ?? "");
        setCurrency(data.currency);
        setLogoUrl(data.logo_url ?? null);
      }
      setLoading(false);
    });
  }, [user]);

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) { toast.error("Please select an image"); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error("Image must be under 2MB"); return; }

    setUploadingLogo(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${user.id}/logo-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("product-images").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("product-images").getPublicUrl(path);
      const newUrl = pub.publicUrl;
      const { error: dbErr } = await supabase.from("vendor_profiles").update({ logo_url: newUrl }).eq("user_id", user.id);
      if (dbErr) throw dbErr;
      setLogoUrl(newUrl);
      toast.success("Logo updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingLogo(false);
    }
  }

  async function removeLogo() {
    if (!user) return;
    const { error } = await supabase.from("vendor_profiles").update({ logo_url: null }).eq("user_id", user.id);
    if (error) { toast.error(error.message); return; }
    setLogoUrl(null);
    toast.success("Logo removed");
  }

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
          <Label>Business logo</Label>
          <div className="flex items-center gap-4">
            <div className="size-20 rounded-full bg-muted flex items-center justify-center overflow-hidden border border-border shrink-0">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="size-full object-cover" />
              ) : (
                <ImageOff className="size-6 text-muted-foreground" />
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm" disabled={uploadingLogo}>
                <label className="cursor-pointer">
                  {uploadingLogo ? <Loader2 className="size-4 animate-spin mr-2" /> : <Upload className="size-4 mr-2" />}
                  {logoUrl ? "Replace" : "Upload"}
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploadingLogo} />
                </label>
              </Button>
              {logoUrl && (
                <Button variant="ghost" size="sm" onClick={removeLogo} className="text-destructive hover:text-destructive">
                  <Trash2 className="size-4 mr-2" /> Remove
                </Button>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Square image, under 2MB. Shown on your dashboard and public catalog.</p>
        </div>
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
