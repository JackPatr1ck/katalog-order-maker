import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Trash2, ImagePlus, Package } from "lucide-react";
import { formatMoney } from "@/lib/format";
import { z } from "zod";

export const Route = createFileRoute("/dashboard/catalog")({
  component: CatalogPage,
});

interface Category { id: string; name: string; position: number; }
interface Product {
  id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price_cents: number;
  image_url: string | null;
  stock: number;
  is_active: boolean;
}

const productSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  description: z.string().max(500).optional().nullable(),
  price_cents: z.number().int().min(0).max(100_000_000),
  stock: z.number().int().min(0).max(1_000_000),
  category_id: z.string().uuid().nullable(),
  is_active: z.boolean(),
  image_url: z.string().url().nullable().optional(),
});

function CatalogPage() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [currency, setCurrency] = useState("USD");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Product | null>(null);
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [newCatName, setNewCatName] = useState("");

  useEffect(() => {
    if (!user) return;
    void load();
  }, [user]);

  async function load() {
    if (!user) return;
    setLoading(true);
    const [{ data: prof }, { data: cats }, { data: prods }] = await Promise.all([
      supabase.from("vendor_profiles").select("currency").eq("user_id", user.id).maybeSingle(),
      supabase.from("categories").select("*").eq("vendor_id", user.id).order("position"),
      supabase.from("products").select("*").eq("vendor_id", user.id).order("created_at", { ascending: false }),
    ]);
    if (prof) setCurrency(prof.currency);
    setCategories((cats ?? []) as Category[]);
    setProducts((prods ?? []) as Product[]);
    setLoading(false);
  }

  async function addCategory() {
    if (!user || !newCatName.trim()) return;
    const { error } = await supabase.from("categories").insert({
      vendor_id: user.id,
      name: newCatName.trim().slice(0, 60),
      position: categories.length,
    });
    if (error) toast.error(error.message);
    else { setNewCatName(""); toast.success("Category added"); void load(); }
  }

  async function deleteCategory(id: string) {
    if (!confirm("Delete this category? Products will keep existing but become uncategorised.")) return;
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); void load(); }
  }

  async function deleteProduct(id: string) {
    if (!confirm("Delete this product?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); void load(); }
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Catalog</h1>
          <p className="text-muted-foreground text-sm mt-1">Build the products customers will see in your shop.</p>
        </div>
        <Button onClick={() => { setEditing(null); setShowProductDialog(true); }} className="gap-2 shadow-elegant">
          <Plus className="size-4" /> New product
        </Button>
      </div>

      {/* Categories */}
      <Card className="p-5 shadow-card">
        <h2 className="font-display font-semibold mb-3">Categories</h2>
        <div className="flex flex-wrap gap-2 mb-3">
          {categories.length === 0 && <p className="text-sm text-muted-foreground">No categories yet — add one to group your products.</p>}
          {categories.map(c => (
            <div key={c.id} className="inline-flex items-center gap-1.5 pl-3 pr-1 py-1 rounded-full bg-accent text-sm">
              {c.name}
              <button onClick={() => deleteCategory(c.id)} className="size-5 rounded-full hover:bg-destructive/20 flex items-center justify-center">
                <Trash2 className="size-3 text-destructive" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Input placeholder="Category name" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addCategory()} />
          <Button onClick={addCategory} variant="outline">Add</Button>
        </div>
      </Card>

      {/* Products */}
      {products.length === 0 ? (
        <Card className="p-12 text-center shadow-card">
          <div className="mx-auto size-12 rounded-full bg-accent flex items-center justify-center mb-4">
            <Package className="size-6 text-primary" />
          </div>
          <h3 className="font-display text-lg font-semibold">No products yet</h3>
          <p className="text-muted-foreground text-sm mt-1 mb-4">Add your first product to start selling.</p>
          <Button onClick={() => { setEditing(null); setShowProductDialog(true); }} className="gap-2"><Plus className="size-4" /> Add product</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map(p => (
            <Card key={p.id} className="overflow-hidden shadow-card hover:shadow-elegant transition-shadow">
              <div className="aspect-[4/3] bg-muted relative">
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <ImagePlus className="size-8" />
                  </div>
                )}
                {!p.is_active && <Badge variant="secondary" className="absolute top-2 left-2">Hidden</Badge>}
                {p.stock === 0 && <Badge variant="destructive" className="absolute top-2 right-2">Out of stock</Badge>}
              </div>
              <div className="p-4">
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold truncate">{p.name}</h3>
                    <p className="text-sm text-muted-foreground">{formatMoney(p.price_cents, currency)} · {p.stock} in stock</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant="outline" className="flex-1 gap-1.5" onClick={() => { setEditing(p); setShowProductDialog(true); }}>
                    <Pencil className="size-3.5" /> Edit
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteProduct(p.id)}>
                    <Trash2 className="size-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ProductDialog
        open={showProductDialog}
        onOpenChange={setShowProductDialog}
        product={editing}
        categories={categories}
        currency={currency}
        userId={user?.id}
        onSaved={() => { setShowProductDialog(false); void load(); }}
      />
    </div>
  );
}

function ProductDialog({ open, onOpenChange, product, categories, currency, userId, onSaved }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  product: Product | null;
  categories: Category[];
  currency: string;
  userId?: string;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("0");
  const [categoryId, setCategoryId] = useState<string>("");
  const [isActive, setIsActive] = useState(true);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setName(product?.name ?? "");
      setDescription(product?.description ?? "");
      setPrice(product ? (product.price_cents / 100).toString() : "");
      setStock(product?.stock.toString() ?? "0");
      setCategoryId(product?.category_id ?? "");
      setIsActive(product?.is_active ?? true);
      setImageUrl(product?.image_url ?? null);
    }
  }, [open, product]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Image too large (max 5MB)"); return; }
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file);
    if (error) { toast.error(error.message); setUploading(false); return; }
    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    setImageUrl(data.publicUrl);
    setUploading(false);
  }

  async function save() {
    if (!userId) return;
    const priceCents = Math.round(parseFloat(price || "0") * 100);
    const payload = productSchema.safeParse({
      name,
      description: description || null,
      price_cents: priceCents,
      stock: parseInt(stock || "0", 10),
      category_id: categoryId || null,
      is_active: isActive,
      image_url: imageUrl,
    });
    if (!payload.success) { toast.error(payload.error.issues[0].message); return; }
    setSubmitting(true);
    const { error } = product
      ? await supabase.from("products").update(payload.data).eq("id", product.id)
      : await supabase.from("products").insert({ vendor_id: userId, ...payload.data });
    setSubmitting(false);
    if (error) toast.error(error.message);
    else { toast.success(product ? "Product updated" : "Product added"); onSaved(); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">{product ? "Edit product" : "New product"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Image</Label>
            <div className="mt-1.5 flex items-center gap-3">
              <div className="size-20 rounded-lg bg-muted overflow-hidden flex items-center justify-center shrink-0">
                {imageUrl ? <img src={imageUrl} alt="" className="w-full h-full object-cover" /> : <ImagePlus className="size-6 text-muted-foreground" />}
              </div>
              <label className="cursor-pointer">
                <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
                <span className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-input bg-background text-sm hover:bg-accent">
                  {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
                  {imageUrl ? "Replace" : "Upload"}
                </span>
              </label>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Red T-Shirt" />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} maxLength={500} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Price ({currency})</Label>
              <Input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Stock</Label>
              <Input type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
              <option value="">— Uncategorised —</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium">Visible in shop</p>
              <p className="text-xs text-muted-foreground">Hidden products won't appear to customers.</p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={submitting} className="shadow-elegant">
            {submitting && <Loader2 className="size-4 animate-spin mr-2" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
