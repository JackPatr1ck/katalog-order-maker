import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { ShoppingBag, Loader2, Eye, EyeOff } from "lucide-react";

const searchSchema = z.object({
  mode: z.enum(["signin", "signup"]).optional().default("signin"),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  component: AuthPage,
  head: () => ({ meta: [{ title: "Sign in — Katalog" }] }),
});

const credSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(8, "Min 8 characters").max(72),
});

function AuthPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [isSignup, setIsSignup] = useState(mode === "signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => setIsSignup(mode === "signup"), [mode]);

  // If already authenticated, route based on whether profile exists
  useEffect(() => {
    if (authLoading || !user) return;
    (async () => {
      const { data } = await supabase.from("vendor_profiles").select("user_id").eq("user_id", user.id).maybeSingle();
      navigate({ to: data ? "/dashboard" : "/onboarding" });
    })();
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = credSchema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSubmitting(true);
    try {
      if (isSignup) {
        const { error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: { emailRedirectTo: window.location.origin + "/onboarding" },
        });
        if (error) throw error;
        toast.success("Account created! Let's set up your shop.");
      } else {
        const { error } = await supabase.auth.signInWithPassword(parsed.data);
        if (error) throw error;
        toast.success("Welcome back!");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast.error(msg.includes("Invalid login") ? "Wrong email or password" : msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-subtle flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="size-9 rounded-lg bg-hero shadow-elegant flex items-center justify-center">
            <ShoppingBag className="size-4 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <span className="font-display font-bold text-2xl">katalog</span>
        </Link>
        <Card className="shadow-elegant border-border">
          <CardHeader>
            <CardTitle className="font-display text-2xl">
              {isSignup ? "Create your account" : "Welcome back"}
            </CardTitle>
            <CardDescription>
              {isSignup ? "Step 1 of 2 — let's get you in." : "Sign in to manage your shop."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input id="password" type={showPassword ? "text" : "password"} autoComplete={isSignup ? "new-password" : "current-password"} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" className="pr-10" />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute inset-y-0 right-0 z-10 flex items-center px-3 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full shadow-elegant" disabled={submitting}>
                {submitting && <Loader2 className="size-4 animate-spin mr-2" />}
                {isSignup ? "Create account" : "Sign in"}
              </Button>
            </form>
            <p className="mt-6 text-sm text-center text-muted-foreground">
              {isSignup ? "Already have an account?" : "New to Katalog?"}{" "}
              <button
                onClick={() => navigate({ to: "/auth", search: { mode: isSignup ? "signin" : "signup" } })}
                className="text-primary font-medium hover:underline"
              >
                {isSignup ? "Sign in" : "Create one"}
              </button>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
