import { createFileRoute, Outlet, useNavigate, Link, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2,
  Menu,
  Search,
  LayoutGrid,
  Package,
  Globe,
  User,
  LogOut,
  ExternalLink,
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
  "/dashboard": "Catalog MVP",
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

  const tabs = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutGrid, exact: true },
    { to: "/dashboard/catalog", label: "Products", icon: Package },
    { to: `/s/${profile.slug}`, label: "Catalog", icon: Globe, external: true },
    { to: "/dashboard/settings", label: "Profile", icon: User },
  ];

  const isActive = (to: string, exact?: boolean) =>
    exact ? location.pathname === to : location.pathname.startsWith(to);

  const storefrontUrl = `${window.location.origin}/s/${profile.slug}`;
  const title = PAGE_TITLES[location.pathname] ?? "Catalog MVP";

  return (
    <div className="min-h-screen bg-subtle pb-24">
      {/* Top app bar */}
      <header className="bg-background border-b border-border sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="-ml-2">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <div className="p-5 border-b border-border">
                <p className="font-display font-bold text-lg leading-tight">
                  {profile.business_name}
                </p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  /{profile.slug}
                </p>
              </div>
              <nav className="p-3 space-y-1">
                {tabs.map((t) =>
                  t.external ? (
                    <a
                      key={t.to}
                      href={t.to}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
                    >
                      <t.icon className="size-4" /> {t.label}
                      <ExternalLink className="size-3 ml-auto" />
                    </a>
                  ) : (
                    <Link
                      key={t.to}
                      to={t.to}
                      onClick={() => setMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        isActive(t.to, t.exact)
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                      }`}
                    >
                      <t.icon className="size-4" /> {t.label}
                    </Link>
                  )
                )}
              </nav>
              <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-border">
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2"
                  onClick={async () => {
                    await signOut();
                    navigate({ to: "/" });
                  }}
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
            <Search className="size-5" />
          </Button>
        </div>
      </header>

      {/* Page content */}
      <div className="max-w-3xl mx-auto px-4 py-5">
        <Outlet />
      </div>

      {/* Bottom tab nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background border-t border-border">
        <div className="max-w-3xl mx-auto grid grid-cols-4">
          {tabs.map((t) => {
            const active = !t.external && isActive(t.to, t.exact);
            const Icon = t.icon;
            const className = `flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
              active
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`;
            return t.external ? (
              <a
                key={t.to}
                href={t.to}
                target="_blank"
                rel="noreferrer"
                className={className}
              >
                <Icon className="size-5" strokeWidth={active ? 2.4 : 2} />
                {t.label}
              </a>
            ) : (
              <Link key={t.to} to={t.to} className={className}>
                <Icon className="size-5" strokeWidth={active ? 2.4 : 2} />
                {t.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

