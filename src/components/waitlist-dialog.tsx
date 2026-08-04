import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Check, Loader2 } from "lucide-react";

const schema = z.object({
  email: z.string().trim().email({ message: "Enter a valid email address" }).max(255),
  business_name: z.string().trim().max(120, { message: "Keep it under 120 characters" }).optional(),
});

export function WaitlistDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ email, business_name: businessName || undefined });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check your details");
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("waitlist_signups").insert({
      email: parsed.data.email.toLowerCase(),
      business_name: parsed.data.business_name ?? null,
    });
    setLoading(false);
    if (error) {
      if (error.code === "23505" || error.code === "23514" || error.message.includes("duplicate")) {
        setDone(true);
        return;
      }
      toast.error("Could not join the waitlist. Please try again.");
      return;
    }
    setDone(true);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) {
          setDone(false);
          setEmail("");
          setBusinessName("");
        }
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {done ? (
          <div className="py-6 text-center">
            <div className="mx-auto mb-4 size-12 rounded-full bg-accent flex items-center justify-center">
              <Check className="size-6 text-primary" strokeWidth={3} />
            </div>
            <DialogTitle className="font-display text-xl">You're on the list</DialogTitle>
            <DialogDescription className="mt-2">
              We'll email you as soon as your spot opens up.
            </DialogDescription>
            <Button className="mt-6 rounded-full px-6" onClick={() => setOpen(false)}>
              Done
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-xl">Join the waitlist</DialogTitle>
              <DialogDescription>
                Get early access to Katalog and be first to launch your Online storefront.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={submit} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="waitlist-email">Email address</Label>
                <Input
                  id="waitlist-email"
                  type="email"
                  required
                  maxLength={255}
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="waitlist-business">Business name (optional)</Label>
                <Input
                  id="waitlist-business"
                  maxLength={120}
                  placeholder="K-Gadgets"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full rounded-full" disabled={loading}>
                {loading && <Loader2 className="size-4 animate-spin" />}
                Join waitlist
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
