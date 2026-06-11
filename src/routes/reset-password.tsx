import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, CheckCircle } from "lucide-react";
import authIllustration from "@/assets/auth-illustration.png";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
  head: () => ({ meta: [{ title: "Reset Password — Katalog" }] }),
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [done, setDone] = useState(false);
  const [checkingHash, setCheckingHash] = useState(true);
  const [validHash, setValidHash] = useState(false);

  useEffect(() => {
    // Check if the URL contains a recovery token (type=recovery in hash)
    const hash = window.location.hash;
    if (hash.includes("type=recovery") || hash.includes("access_token")) {
      setValidHash(true);
    }
    setCheckingHash(false);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
      toast.success("Password updated successfully!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (checkingHash) {
    return (
      <div className="min-h-screen bg-subtle flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  const formInner = done ? (
    <div className="flex flex-col items-center text-center">
      <div className="size-16 rounded-full bg-green-500/10 flex items-center justify-center mb-6">
        <CheckCircle className="size-8 text-green-500" />
      </div>
      <h1 className="font-display font-bold text-2xl sm:text-3xl tracking-tight text-foreground">
        Password Updated!
      </h1>
      <p className="mt-3 text-sm text-muted-foreground max-w-sm">
        Your password has been reset. You can now sign in with your new password.
      </p>
      <Button
        className="mt-8 h-12 px-8 rounded-xl shadow-elegant"
        onClick={() => navigate({ to: "/auth", search: { mode: "signin" } })}
      >
        Sign In
      </Button>
    </div>
  ) : !validHash ? (
    <div className="flex flex-col items-center text-center">
      <h1 className="font-display font-bold text-2xl sm:text-3xl tracking-tight text-foreground">
        Invalid or Expired Link
      </h1>
      <p className="mt-3 text-sm text-muted-foreground max-w-sm">
        This reset link is invalid or has expired. Please request a new one.
      </p>
      <Button
        className="mt-8 h-12 px-8 rounded-xl shadow-elegant"
        onClick={() => navigate({ to: "/forgot-password" })}
      >
        Request New Link
      </Button>
    </div>
  ) : (
    <>
      <h1 className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl tracking-tight text-foreground">
        Reset<br />Password
      </h1>
      <p className="mt-3 lg:mt-4 text-sm lg:text-base text-muted-foreground">
        Enter your new password below.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 lg:mt-10 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="password" className="sr-only">New Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New Password"
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

        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword" className="sr-only">Confirm Password</Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirm ? "text" : "password"}
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm New Password"
              className="h-12 rounded-xl bg-secondary/50 border-border px-4 pr-12"
            />
            <button
              type="button"
              onClick={() => setShowConfirm((s) => !s)}
              className="absolute inset-y-0 right-0 z-10 flex items-center px-4 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              aria-label={showConfirm ? "Hide password" : "Show password"}
              tabIndex={-1}
            >
              {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          className="h-12 w-full lg:w-auto px-8 rounded-xl shadow-elegant mt-4"
          disabled={submitting}
        >
          {submitting && <Loader2 className="size-4 animate-spin mr-2" />}
          Update Password
        </Button>
      </form>
    </>
  );

  return (
    <>
      {/* Mobile layout */}
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

      {/* Desktop layout */}
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
