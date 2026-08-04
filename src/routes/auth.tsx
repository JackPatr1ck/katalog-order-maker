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
import { Loader2, Eye, EyeOff } from "lucide-react";
import { COUNTRIES, currencyForCountry } from "@/lib/countries";
import authIllustration from "@/assets/auth-illustration.png";
import logo from "@/assets/logo.png";

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

const signupSchema = credSchema.extend({
  full_name: z.string().trim().min(2, "Enter your full name").max(100),
  country: z.string().trim().length(2, "Select your country"),
});

function AuthPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [isSignup, setIsSignup] = useState(mode === "signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [country, setCountry] = useState("NG");
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
    setSubmitting(true);
    try {
      if (isSignup) {
        const parsed = signupSchema.safeParse({ email, password, full_name: fullName, country });
        if (!parsed.success) {
          toast.error(parsed.error.issues[0].message);
          return;
        }
        const { error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            emailRedirectTo: window.location.origin + "/onboarding",
            data: {
              full_name: parsed.data.full_name,
              country: parsed.data.country,
              currency: currencyForCountry(parsed.data.country),
            },
          },
        });
        if (error) throw error;
        toast.success("Account created! Let's set up your shop.");
      } else {
        const parsed = credSchema.safeParse({ email, password });
        if (!parsed.success) {
          toast.error(parsed.error.issues[0].message);
          return;
        }
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

  const formInner = (
    <>
      {isSignup && (
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-primary">Step 1 of 2 — Your details</p>
      )}
      <h1 className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl tracking-tight text-foreground">
        {isSignup ? (
          <>Hey there,<br />Welcome</>
        ) : (
          <>Holla,<br />Welcome Back</>
        )}
      </h1>
      <p className="mt-3 lg:mt-4 text-sm lg:text-base text-muted-foreground">
        {isSignup ? "Tell us about you — next step is your business info." : "Hey, welcome back to your special place"}
      </p>

      <form onSubmit={handleSubmit} className="mt-8 lg:mt-10 space-y-4">
        {isSignup && (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="fullName" className="sr-only">Full name</Label>
              <Input
                id="fullName"
                autoComplete="name"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                maxLength={100}
                className="h-12 rounded-xl bg-secondary/50 border-border px-4"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="country" className="sr-only">Country</Label>
              <select
                id="country"
                required
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="h-12 w-full rounded-xl bg-secondary/50 border border-border px-4 text-sm text-foreground"
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </select>
              <p className="px-1 text-xs text-muted-foreground">
                Billing currency: <span className="font-medium text-foreground">{currencyForCountry(country)}</span>
              </p>
            </div>
          </>
        )}
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
            <button
              type="button"
              onClick={() => navigate({ to: "/forgot-password" })}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Forgot Password?
            </button>
          </div>
        )}

        <Button
          type="submit"
          className="h-12 w-full lg:w-auto px-8 rounded-xl shadow-elegant mt-4"
          disabled={submitting}
        >
          {submitting && <Loader2 className="size-4 animate-spin mr-2" />}
          {isSignup ? "Sign Up" : "Sign In"}
        </Button>
      </form>

      <p className="mt-8 lg:mt-12 text-sm text-muted-foreground text-center lg:text-left">
        {isSignup ? "Already have an account?" : "Don't have an account?"}{" "}
        <button
          onClick={() => navigate({ to: "/auth", search: { mode: isSignup ? "signin" : "signup" } })}
          className="text-primary font-semibold hover:underline"
        >
          {isSignup ? "Sign In" : "Sign Up"}
        </button>
      </p>
    </>
  );

  return (
    <>
      {/* Mobile layout: full-bleed with illustration banner on top */}
      <div className="lg:hidden min-h-screen bg-card flex flex-col">
        <div className="relative h-56 sm:h-64 bg-hero overflow-hidden flex-shrink-0">
          <img
            src={authIllustration}
            alt="Vendors celebrating a successful sale"
            className="absolute inset-0 size-full object-contain p-6"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-card/40 pointer-events-none" />
          <Link to="/" className="absolute top-4 left-4 flex items-center gap-2">
            <div className="size-8 rounded-lg bg-card/95 backdrop-blur shadow-elegant flex items-center justify-center p-1">
              <img src={logo} alt="Katalog" className="size-full object-contain" />
            </div>
            <span className="font-display font-bold text-lg text-card drop-shadow-md">katalog</span>
          </Link>
        </div>
        <div className="flex-1 -mt-6 bg-card rounded-t-3xl px-6 pt-8 pb-10 relative z-10">
          {formInner}
        </div>
      </div>

      {/* Desktop layout: split-screen card */}
      <div className="hidden lg:block min-h-screen bg-subtle p-6">
        <div className="mx-auto max-w-7xl bg-card rounded-3xl shadow-card overflow-hidden grid lg:grid-cols-2 min-h-[calc(100vh-3rem)]">
          <div className="flex flex-col px-16 py-12">
            <Link to="/" className="flex items-center gap-2 mb-16">
              <img src={logo} alt="Katalog" className="size-8 object-contain" />
              <span className="font-display font-bold text-xl">katalog</span>
            </Link>
            <div className="flex-1 flex flex-col justify-center max-w-md w-full">
              {formInner}
            </div>
          </div>
          <div className="relative bg-card overflow-hidden">
            <img
              src={authIllustration}
              alt="Vendors celebrating a successful sale"
              className="absolute inset-0 size-full object-contain p-12"
            />
          </div>
        </div>
      </div>
    </>
  );
}
