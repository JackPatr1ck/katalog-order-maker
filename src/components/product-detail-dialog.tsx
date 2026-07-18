import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ImageOff, Loader2, Plus, Star } from "lucide-react";
import { toast } from "sonner";
import { formatMoney, effectivePriceCents } from "@/lib/format";
import { z } from "zod";

export interface ProductDetailProduct {
  id: string;
  vendor_id?: string;
  name: string;
  description: string | null;
  price_cents: number;
  image_url: string | null;
  stock: number;
  discount_percent?: number;
}

interface Review {
  id: string;
  customer_name: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

const reviewSchema = z.object({
  customer_name: z.string().trim().min(1, "Name is required").max(100),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional(),
});

export function ProductDetailDialog({
  open,
  onOpenChange,
  product,
  vendorId,
  currency,
  onAddToCart,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  product: ProductDetailProduct | null;
  vendorId: string;
  currency: string;
  onAddToCart: (p: ProductDetailProduct) => void;
}) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !product) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("product_reviews")
        .select("id,customer_name,rating,comment,created_at")
        .eq("product_id", product.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (cancelled) return;
      setReviews((data ?? []) as Review[]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [open, product]);

  async function submitReview() {
    if (!product) return;
    const parsed = reviewSchema.safeParse({ customer_name: name, rating, comment });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.from("product_reviews").insert({
        vendor_id: vendorId,
        product_id: product.id,
        customer_name: parsed.data.customer_name,
        rating: parsed.data.rating,
        comment: parsed.data.comment || null,
      }).select("id,customer_name,rating,comment,created_at").single();
      if (error) throw error;
      setReviews(prev => [data as Review, ...prev]);
      setName(""); setComment(""); setRating(5);
      toast.success("Thanks for your review!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not post review");
    } finally {
      setSubmitting(false);
    }
  }

  if (!product) return null;
  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{product.name}</DialogTitle>
        </DialogHeader>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="aspect-square bg-muted rounded-lg overflow-hidden">
            {product.image_url ? (
              <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center"><ImageOff className="size-10 text-muted-foreground" /></div>
            )}
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <StarRow value={Math.round(avg)} />
              <span className="text-xs text-muted-foreground">
                {reviews.length ? `${avg.toFixed(1)} · ${reviews.length} review${reviews.length > 1 ? "s" : ""}` : "No reviews yet"}
              </span>
            </div>
            <div className="flex items-baseline gap-2 flex-wrap">
              <p className="text-2xl font-bold font-display">{formatMoney(effectivePriceCents(product.price_cents, product.discount_percent), currency)}</p>
              {product.discount_percent && product.discount_percent > 0 ? (
                <>
                  <span className="text-sm text-muted-foreground line-through">{formatMoney(product.price_cents, currency)}</span>
                  <Badge className="bg-success text-success-foreground">-{product.discount_percent}%</Badge>
                </>
              ) : null}
            </div>
            {product.stock === 0 ? (
              <Badge variant="destructive">Sold out</Badge>
            ) : (
              <p className="text-xs text-muted-foreground">{product.stock} in stock</p>
            )}
            {product.description && (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{product.description}</p>
            )}
            <Button
              className="w-full gap-2 shadow-elegant"
              disabled={product.stock === 0}
              onClick={() => { onAddToCart(product); }}
            >
              <Plus className="size-4" /> Add to cart
            </Button>
          </div>
        </div>

        <Separator className="my-4" />

        <div className="space-y-4">
          <h3 className="font-display font-semibold">Reviews</h3>
          {loading ? (
            <div className="flex justify-center py-6"><Loader2 className="animate-spin text-primary size-5" /></div>
          ) : reviews.length === 0 ? (
            <p className="text-sm text-muted-foreground">Be the first to review this product.</p>
          ) : (
            <ul className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {reviews.map(r => (
                <li key={r.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm">{r.customer_name}</span>
                    <StarRow value={r.rating} />
                  </div>
                  {r.comment && <p className="text-sm text-muted-foreground mt-1.5 whitespace-pre-wrap">{r.comment}</p>}
                  <p className="text-[10px] text-muted-foreground mt-1.5">{new Date(r.created_at).toLocaleDateString()}</p>
                </li>
              ))}
            </ul>
          )}

          <div className="rounded-lg border border-border p-3 space-y-3 bg-muted/30">
            <h4 className="font-medium text-sm">Leave a review</h4>
            <div className="space-y-2">
              <Label className="text-xs">Your name</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Jane Doe" maxLength={100} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Rating</Label>
              <StarRow value={rating} interactive onChange={setRating} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Comment (optional)</Label>
              <Textarea value={comment} onChange={e => setComment(e.target.value)} rows={3} maxLength={1000} placeholder="Share your experience..." />
            </div>
            <Button onClick={submitReview} disabled={submitting} className="w-full">
              {submitting ? <Loader2 className="size-4 animate-spin" /> : "Post review"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StarRow({ value, interactive, onChange }: { value: number; interactive?: boolean; onChange?: (n: number) => void }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          disabled={!interactive}
          onClick={() => onChange?.(n)}
          className={interactive ? "cursor-pointer" : "cursor-default"}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
        >
          <Star className={`size-4 ${n <= value ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
        </button>
      ))}
    </div>
  );
}
