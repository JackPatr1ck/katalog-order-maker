import { createFileRoute, Outlet, useNavigate, Link, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2,
  Menu,
  LayoutGrid,
  Package,
  Globe,
  User,
  LogOut,
  ExternalLink,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
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

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Overview",
  "/dashboard/catalog": "Products",
  "/dashboard/settings": "Profile",
};

function DashboardLayout() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    supabase
      .from("vendor_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) {
          navigate({ to: "/onboarding" });
          return;
        }
        setProfile(data as VendorProfile);
        setProfileLoading(false);
      });
  }, [user, loading, navigate]);

  if (loading || profileLoading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" />
      </div>
    );
  }

  const navItems = [
    { to: "/dashboard", label: "Overview", icon: LayoutGrid, exact: true },
    { to: "/dashboard/catalog", label: "Products", icon: Package },
    { to: `/s/${profile.slug}`, label: "Catalog Link", icon: Globe, external: true },
    { to: "/dashboard/settings", label: "Profile", icon: User },
  ];

  const isActive = (to: string, exact?: boolean) =>
    exact ? location.pathname === to : location.pathname.startsWith(to);

  const storefrontUrl = `${window.location.origin}/s/${profile.slug}`;
  const title = PAGE_TITLES[location.pathname] ?? "Dashboard";

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  const NavList = ({ onNavigate }: { onNavigate?: () => void }) => (
    <nav className="space-y-1">
      {navItems.map((item) => {
        const active = !item.external && isActive(item.to, item.exact);
        const Icon = item.icon;
        const baseCls =
          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors";
        const stateCls = active
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:bg-accent/40 hover:text-foreground";
        return item.external ? (
          <a
            key={item.to}
            href={item.to}
            target="_blank"
            rel="noreferrer"
            onClick={onNavigate}
            className={`${baseCls} ${stateCls}`}
          >
            <Icon className="size-4" />
            <span className="flex-1">{item.label}</span>
            <ExternalLink className="size-3.5 opacity-60" />
          </a>
        ) : (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={`${baseCls} ${stateCls}`}
          >
            <Icon className="size-4" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-72 lg:fixed lg:inset-y-0 lg:left-0 border-r border-border bg-background">
        <div className="px-7 py-7 border-b border-border">
          <Link to="/dashboard" className="block">
            <h1 className="font-display text-2xl font-semibold text-primary tracking-tight">
              Katalog
            </h1>
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {profile.business_name}
            </p>
          </Link>
        </div>

        <div className="flex-1 px-5 py-7 overflow-y-auto">
          <p className="px-3 text-[10px] font-semibold tracking-[0.15em] uppercase text-muted-foreground mb-3">
            Workspace
          </p>
          <NavList />
        </div>

        <div className="p-5 border-t border-border space-y-2">
          <button
            onClick={() => {
              navigator.clipboard.writeText(storefrontUrl);
              toast.success("Shop link copied");
            }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:bg-accent/40 hover:text-foreground transition-colors"
          >
            <Copy className="size-3.5 shrink-0" />
            <span className="truncate">/{profile.slug}</span>
          </button>
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-muted-foreground"
            onClick={handleSignOut}
          >
            <LogOut className="size-4" /> Sign out
          </Button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="lg:hidden bg-background border-b border-border sticky top-0 z-40">
        <div className="px-4 h-14 flex items-center justify-between gap-3">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="-ml-2">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 flex flex-col">
              <div className="px-6 py-6 border-b border-border">
                <h1 className="font-display text-xl font-semibold text-primary">
                  Katalog
                </h1>
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {profile.business_name}
                </p>
              </div>
              <div className="flex-1 px-4 py-5 overflow-y-auto">
                <p className="px-3 text-[10px] font-semibold tracking-[0.15em] uppercase text-muted-foreground mb-3">
                  Workspace
                </p>
                <NavList onNavigate={() => setMenuOpen(false)} />
              </div>
              <div className="p-4 border-t border-border">
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2 text-muted-foreground"
                  onClick={handleSignOut}
                >
                  <LogOut className="size-4" /> Sign out
                </Button>
              </div>
            </SheetContent>
          </Sheet>

          <h1 className="font-display font-semibold text-base flex-1 text-center truncate">
            {title}
          </h1>

          <Button
            variant="ghost"
            size="icon"
            className="-mr-2"
            onClick={() => {
              navigator.clipboard.writeText(storefrontUrl);
              toast.success("Shop link copied");
            }}
            aria-label="Copy shop link"
          >
            <Copy className="size-5" />
          </Button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 lg:ml-72 min-w-0">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 lg:px-12 py-6 lg:py-12">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
