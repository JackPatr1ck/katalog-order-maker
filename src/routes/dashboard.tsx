import { createFileRoute, Outlet, useNavigate, Link, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Package, ShoppingBag, Settings, LogOut, ExternalLink, ListOrdered } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export interface VendorProfile {
  user_id: string;
  business_name: string;
  whatsapp_number: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
  currency: string;
}

export const Route = createFileRoute("/dashboard")({
  component: DashboardLayout,
  head: () => ({ meta: [{ title: "Dashboard — Katalog" }] }),
});

function DashboardLayout() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate({ to: "/auth" }); return; }
    supabase.from("vendor_profiles").select("*").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (!data) { navigate({ to: "/onboarding" }); return; }
      setProfile(data as VendorProfile);
      setProfileLoading(false);
    });
  }, [user, loading, navigate]);

  if (loading || profileLoading || !profile) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;
  }

  const nav: Array<{ to: string; label: string; icon: typeof Package; exact?: boolean }> = [
    { to: "/dashboard", label: "Orders", icon: ListOrdered, exact: true },
    { to: "/dashboard/catalog", label: "Catalog", icon: Package },
    { to: "/dashboard/settings", label: "Settings", icon: Settings },
  ];

  const isActive = (to: string, exact?: boolean) =>
    exact ? location.pathname === to : location.pathname.startsWith(to);

  const storefrontUrl = `${window.location.origin}/s/${profile.slug}`;

  return (
    <div className="min-h-screen bg-subtle">
      {/* Top bar */}
      <header className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-hero shadow-elegant flex items-center justify-center">
              <ShoppingBag className="size-4 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <span className="font-display font-bold text-lg">katalog</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={() => { navigator.clipboard.writeText(storefrontUrl); toast.success("Shop link copied"); }}>
              <ExternalLink className="size-3.5" /> <span className="hidden sm:inline">Share shop</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={async () => { await signOut(); navigate({ to: "/" }); }} className="gap-2">
              <LogOut className="size-4" /> <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 grid md:grid-cols-[220px_1fr] gap-6">
        <aside>
          <div className="mb-4 px-3">
            <p className="font-display font-semibold text-lg leading-tight">{profile.business_name}</p>
            <p className="text-xs text-muted-foreground truncate">/{profile.slug}</p>
          </div>
          <nav className="flex md:flex-col gap-1 overflow-x-auto">
            {nav.map(item => {
              const active = isActive(item.to, item.exact);
              return (
                <Link key={item.to} to={item.to} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"}`}>
                  <item.icon className="size-4" /> {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
