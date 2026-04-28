import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ShoppingBag, Loader2, Eye, EyeOff } from "lucide-react";
import authIllustration from "@/assets/auth-illustration.jpg";

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
    <div className="min-h-screen bg-subtle p-4 lg:p-6">
      <div className="mx-auto max-w-7xl bg-card rounded-3xl shadow-card overflow-hidden grid lg:grid-cols-2 min-h-[calc(100vh-2rem)] lg:min-h-[calc(100vh-3rem)]">
        {/* Left: form */}
        <div className="flex flex-col px-6 py-8 sm:px-10 sm:py-10 lg:px-16 lg:py-12">
          <Link to="/" className="flex items-center gap-2 mb-12 lg:mb-16">
            <div className="size-8 rounded-lg bg-hero shadow-elegant flex items-center justify-center">
              <ShoppingBag className="size-4 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <span className="font-display font-bold text-xl">katalog</span>
          </Link>

          <div className="flex-1 flex flex-col justify-center max-w-md w-full mx-auto lg:mx-0">
            <h1 className="font-display font-bold text-4xl sm:text-5xl tracking-tight text-foreground">
              {isSignup ? (
                <>Hey there,<br />Welcome</>
              ) : (
                <>Holla,<br />Welcome Back</>
              )}
            </h1>
            <p className="mt-4 text-muted-foreground">
              {isSignup ? "Let's set up your shop and start selling on WhatsApp." : "Hey, welcome back to your special place"}
            </p>

            <form onSubmit={handleSubmit} className="mt-10 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="sr-only">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  className="h-12 rounded-xl bg-secondary/50 border-border px-4"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="sr-only">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete={isSignup ? "new-password" : "current-password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className="h-12 rounded-xl bg-secondary/50 border-border px-4 pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute inset-y-0 right-0 z-10 flex items-center px-4 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              {!isSignup && (
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                    <Checkbox id="remember" />
                    <span>Remember me</span>
                  </label>
                  <button type="button" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    Forgot Password?
                  </button>
                </div>
              )}

              <Button
                type="submit"
                className="h-12 px-8 rounded-xl shadow-elegant mt-4"
                disabled={submitting}
              >
                {submitting && <Loader2 className="size-4 animate-spin mr-2" />}
                {isSignup ? "Sign Up" : "Sign In"}
              </Button>
            </form>

            <p className="mt-12 text-sm text-muted-foreground">
              {isSignup ? "Already have an account?" : "Don't have an account?"}{" "}
              <button
                onClick={() => navigate({ to: "/auth", search: { mode: isSignup ? "signin" : "signup" } })}
                className="text-primary font-semibold hover:underline"
              >
                {isSignup ? "Sign In" : "Sign Up"}
              </button>
            </p>
          </div>
        </div>

        {/* Right: illustration */}
        <div className="hidden lg:block relative bg-hero overflow-hidden">
          <img
            src={authIllustration}
            alt="Vendor managing online shop on WhatsApp"
            width={1024}
            height={1280}
            className="absolute inset-0 size-full object-cover"
          />
        </div>
      </div>
    </div>
  );
}
