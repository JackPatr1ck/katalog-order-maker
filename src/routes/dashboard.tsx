import { createFileRoute, Outlet, useNavigate, Link, useLocation } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useMemo, createContext, useContext } from "react";
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
  BarChart3,
  ShieldAlert,
  Bell,
  CheckCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatMoney } from "@/lib/format";
import { toast } from "sonner";
import platformLogo from "@/assets/logo.png";
import storefrontPlaceholder from "@/assets/storefront-placeholder.png";

export interface VendorProfile {
  user_id: string;
  business_name: string;
  whatsapp_number: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
  currency: string;
}

export interface OrderRow {
  id: string;
  order_number: number;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  note: string | null;
  total_cents: number;
  status: string;
  created_at: string;
}

interface OrderItemRow {
  id: string;
  product_name: string;
  unit_price_cents: number;
  quantity: number;
}

export const Route = createFileRoute("/dashboard")({
  component: DashboardLayout,
  head: () => ({ meta: [{ title: "Dashboard — Katalog" }] }),
});

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Overview",
  "/dashboard/catalog": "Products",
  "/dashboard/analytics": "Analytics",
  "/dashboard/settings": "Profile",
};

interface OrderContextValue {
  orders: OrderRow[];
  openOrder: (o: OrderRow) => void;
}

export const DashboardOrderContext = createContext<OrderContextValue | null>(null);
export function useDashboardOrders() {
  const ctx = useContext(DashboardOrderContext);
  if (!ctx) throw new Error("useDashboardOrders must be used within DashboardLayout");
  return ctx;
}

function DashboardLayout() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [selected, setSelected] = useState<OrderRow | null>(null);
  const [items, setItems] = useState<OrderItemRow[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);


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

  const loadOrders = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("orders")
      .select("*")
      .eq("vendor_id", user.id)
      .order("created_at", { ascending: false })
      .limit(8);
    setOrders((data ?? []) as OrderRow[]);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    void loadOrders();
    void supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));

    const channel = supabase
      .channel(`orders-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `vendor_id=eq.${user.id}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new as OrderRow;
            setOrders((cur) => [row, ...cur.filter((o) => o.id !== row.id)].slice(0, 8));
            toast.success(`New order #${row.order_number} from ${row.customer_name}`);
          } else if (payload.eventType === "UPDATE") {
            const row = payload.new as OrderRow;
            setOrders((cur) => cur.map((o) => (o.id === row.id ? row : o)));
          }
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, loadOrders]);

  const lastSeenKey = user ? `katalog-notifs-lastseen-${user.id}` : "";
  const [lastSeen, setLastSeen] = useState<string>(() => {
    if (typeof window === "undefined" || !user) return "";
    return localStorage.getItem(`katalog-notifs-lastseen-${user.id}`) ?? "";
  });
  useEffect(() => {
    if (typeof window === "undefined" || !user) return;
    setLastSeen(localStorage.getItem(`katalog-notifs-lastseen-${user.id}`) ?? "");
  }, [user]);

  const unreadCount = useMemo(() => {
    if (!lastSeen) return orders.length;
    return orders.filter((o) => o.created_at > lastSeen).length;
  }, [orders, lastSeen]);

  const markAllRead = () => {
    const latest = orders[0]?.created_at ?? new Date().toISOString();
    if (typeof window !== "undefined" && lastSeenKey) {
      localStorage.setItem(lastSeenKey, latest);
    }
    setLastSeen(latest);
  };


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
    { to: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
    { to: `/s/${profile.slug}`, label: "Catalog Link", icon: Globe, external: true },
    { to: "/dashboard/settings", label: "Profile", icon: User },
    ...(isAdmin ? [{ to: "/admin", label: "Super Admin", icon: ShieldAlert }] : []),
  ];


  const isActive = (to: string, exact?: boolean) =>
    exact ? location.pathname === to : location.pathname.startsWith(to);

  const storefrontUrl = `${window.location.origin}/s/${profile.slug}`;
  const title = PAGE_TITLES[location.pathname] ?? "Dashboard";

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  async function openOrder(o: OrderRow) {
    setSelected(o);
    const { data } = await supabase
      .from("order_items")
      .select("*")
      .eq("order_id", o.id);
    setItems((data ?? []) as OrderItemRow[]);
  }

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
        <div className="px-6 xl:px-7 py-6 xl:py-7 border-b border-border">
          <div className="flex items-center gap-3">
            <img
              src={profile.logo_url || storefrontPlaceholder}
              alt={profile.business_name}
              className="size-10 xl:size-12 object-contain shrink-0 rounded-md"
            />
            <div className="min-w-0">
              <h1 className="font-display text-base xl:text-lg font-semibold text-primary tracking-tight leading-tight truncate">
                {profile.business_name}
              </h1>
              <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                Vendor workspace
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 px-5 py-7 overflow-y-auto space-y-7">
          <div>
            <p className="px-3 text-[10px] font-semibold tracking-[0.15em] uppercase text-muted-foreground mb-3">
              Workspace
            </p>
            <NavList />
          </div>
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
              <div className="px-5 py-5 border-b border-border flex items-center gap-3">
                <img
                  src={profile.logo_url || storefrontPlaceholder}
                  alt={profile.business_name}
                  className="size-9 object-contain shrink-0 rounded-md"
                />
                <div className="min-w-0">
                  <h1 className="font-display text-[15px] font-semibold text-primary leading-tight truncate">
                    {profile.business_name}
                  </h1>
                  <p className="text-[11px] text-muted-foreground truncate">
                    Vendor workspace
                  </p>
                </div>
              </div>
              <div className="flex-1 px-4 py-5 overflow-y-auto space-y-6">
                <div>
                  <p className="px-3 text-[10px] font-semibold tracking-[0.15em] uppercase text-muted-foreground mb-3">
                    Workspace
                  </p>
                  <NavList onNavigate={() => setMenuOpen(false)} />
                </div>
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

          <div className="flex-1 flex items-center justify-center gap-2 min-w-0">
            <img
              src={platformLogo}
              alt="Katalog"
              className="size-7 object-contain shrink-0 rounded-md"
            />
            <h1 className="font-display font-semibold text-base truncate">
              Katalog
            </h1>
          </div>

          <div className="flex items-center gap-1">
            <NotificationBell
              orders={orders}
              currency={profile.currency}
              unreadCount={unreadCount}
              onOpen={(o) => void openOrder(o)}
              onMarkRead={markAllRead}
            />
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
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 lg:ml-72 min-w-0">
        {/* Desktop main header */}
        <header className="hidden lg:flex items-center justify-between gap-4 px-8 lg:px-12 py-5 border-b border-border bg-background sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={platformLogo}
              alt="Katalog"
              className="size-9 object-contain shrink-0 rounded-md"
            />
            <div className="min-w-0">
              <h2 className="font-display font-semibold text-base truncate">
                Katalog
              </h2>
              <p className="text-[11px] text-muted-foreground truncate">{title}</p>
            </div>
          </div>
          <NotificationBell
            orders={orders}
            currency={profile.currency}
            unreadCount={unreadCount}
            onOpen={(o) => void openOrder(o)}
            onMarkRead={markAllRead}
          />
        </header>


        <div className="max-w-5xl mx-auto px-4 sm:px-8 lg:px-12 py-6 lg:py-12">
          <DashboardOrderContext.Provider value={{ orders, openOrder }}>
            <Outlet />
          </DashboardOrderContext.Provider>
        </div>
      </main>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display">
                  Order #{selected.order_number}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="text-sm space-y-1">
                  <p>
                    <span className="text-muted-foreground">Customer:</span>{" "}
                    {selected.customer_name}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Phone:</span>{" "}
                    {selected.customer_phone}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Address:</span>{" "}
                    {selected.delivery_address}
                  </p>
                  {selected.note && (
                    <p>
                      <span className="text-muted-foreground">Note:</span>{" "}
                      {selected.note}
                    </p>
                  )}
                </div>
                <div className="border-t border-border pt-4">
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    ITEMS
                  </p>
                  <div className="space-y-2">
                    {items.map((it) => (
                      <div key={it.id} className="flex justify-between text-sm">
                        <span>
                          {it.quantity}× {it.product_name}
                        </span>
                        <span className="font-medium">
                          {formatMoney(it.unit_price_cents * it.quantity, profile.currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="border-t border-border pt-4 flex justify-between font-semibold">
                  <span>Total</span>
                  <span>{formatMoney(selected.total_cents, profile.currency)}</span>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function NotificationBell({
  orders,
  currency,
  unreadCount,
  onOpen,
  onMarkRead,
}: {
  orders: OrderRow[];
  currency: string;
  unreadCount: number;
  onOpen: (o: OrderRow) => void;
  onMarkRead: () => void;
}) {
  const [open, setOpen] = useState(false);

  function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    return `${d}d ago`;
  }

  return (
    <Popover
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v && unreadCount > 0) onMarkRead();
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="size-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <p className="text-sm font-semibold">Notifications</p>
          {orders.length > 0 && (
            <button
              onClick={onMarkRead}
              className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              <CheckCheck className="size-3" /> Mark read
            </button>
          )}
        </div>
        {orders.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <Bell className="size-5 text-muted-foreground mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">No notifications yet</p>
          </div>
        ) : (
          <ul className="max-h-80 overflow-y-auto">
            {orders.map((o) => (
              <li key={o.id}>
                <button
                  onClick={() => {
                    onOpen(o);
                    setOpen(false);
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-accent/40 transition-colors border-b border-border last:border-0"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">
                        New order #{o.order_number}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                        {o.customer_name} · {formatMoney(o.total_cents, currency)}
                      </p>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {timeAgo(o.created_at)}
                    </span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}

