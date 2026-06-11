import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Mail } from "lucide-react";
import authIllustration from "@/assets/auth-illustration.png";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
  head: () => ({ meta: [{ title: "Forgot Password — Katalog" }] }),
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Please enter your email");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + "/reset-password",
      });
      if (error) throw error;
      setSent(true);
      toast.success("Reset link sent! Check your email.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const formInner = sent ? (
    <div className="flex flex-col items-center text-center">
      <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
        <Mail className="size-8 text-primary" />
      </div>
      <h1 className="font-display font-bold text-2xl sm:text-3xl tracking-tight text-foreground">
        Check your email
      </h1>
      <p className="mt-3 text-sm text-muted-foreground max-w-sm">
        We sent a password reset link to <strong>{email}</strong>. Click the link in the email to set a new password.
      </p>
      <Button
        variant="outline"
        className="mt-8 rounded-xl"
        onClick={() => setSent(false)}
      >
        <ArrowLeft className="size-4 mr-2" />
        Back to forgot password
      </Button>
    </div>
  ) : (
    <>
      <h1 className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl tracking-tight text-foreground">
        Forgot<br />Password?
      </h1>
      <p className="mt-3 lg:mt-4 text-sm lg:text-base text-muted-foreground">
        No worries. Enter your email and we'll send you a reset link.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 lg:mt-10 space-y-4">
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

        <Button
          type="submit"
          className="h-12 w-full lg:w-auto px-8 rounded-xl shadow-elegant mt-4"
          disabled={submitting}
        >
          {submitting && <Loader2 className="size-4 animate-spin mr-2" />}
          Send Reset Link
        </Button>
      </form>

      <p className="mt-8 lg:mt-12 text-sm text-muted-foreground text-center lg:text-left">
        <Link to="/auth" search={{ mode: "signin" }} className="text-primary font-semibold hover:underline inline-flex items-center gap-1">
          <ArrowLeft className="size-4" />
          Back to Sign In
        </Link>
      </p>
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
