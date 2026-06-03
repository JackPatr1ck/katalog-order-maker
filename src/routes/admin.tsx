import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2,
  ShieldAlert,
  Users,
  Package,
  ShoppingCart,
  Activity,
  TrendingUp,
  Download,
  Search,
  AlertTriangle,
  Crown,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { toast } from "sonner";
import { formatMoney } from "@/lib/format";

export const Route = createFileRoute("/admin")({
  component: AdminDashboard,
  head: () => ({ meta: [{ title: "Super Admin — Katalog" }] }),
});

const PLAN_OPTIONS = ["free", "starter", "hustler", "business"] as const;
type Plan = (typeof PLAN_OPTIONS)[number];

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent-foreground))",
  "#f59e0b",
  "#10b981",
  "#6366f1",
  "#ec4899",
];

interface VendorRow {
  user_id: string;
  business_name: string;
  whatsapp_number: string;
  slug: string;
  currency: string;
  plan: Plan | string;
  is_suspended: boolean;
  created_at: string;
}

interface OrderRow {
  id: string;
  vendor_id: string;
  total_cents: number;
  created_at: string;
}

interface ProductRow {
  id: string;
  vendor_id: string;
  category_id: string | null;
  created_at: string;
}

interface EventRow {
  vendor_id: string;
  event_type: string;
  created_at: string;
}

function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [dataLoading, setDataLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<VendorRow | null>(null);

  // Auth + role gate
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    void (async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      setIsAdmin(!!data);
      setChecking(false);
    })();
  }, [user, authLoading, navigate]);

  const loadAll = useCallback(async () => {
    setDataLoading(true);
    const [
      { data: v },
      { data: o },
      { data: p },
      { data: e },
      { data: c },
    ] = await Promise.all([
      supabase.from("vendor_profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("orders").select("id, vendor_id, total_cents, created_at"),
      supabase.from("products").select("id, vendor_id, category_id, created_at"),
      supabase.from("storefront_events").select("vendor_id, event_type, created_at"),
      supabase.from("categories").select("id, name"),
    ]);
    setVendors((v ?? []) as VendorRow[]);
    setOrders((o ?? []) as OrderRow[]);
    setProducts((p ?? []) as ProductRow[]);
    setEvents((e ?? []) as EventRow[]);
    setCategories((c ?? []) as { id: string; name: string }[]);
    setDataLoading(false);
  }, []);

  useEffect(() => {
    if (isAdmin) void loadAll();
  }, [isAdmin, loadAll]);

  // ===== Computed metrics =====
  const metrics = useMemo(() => {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const last30 = now - 30 * dayMs;
    const last7 = now - 7 * dayMs;
    const prev7 = now - 14 * dayMs;
    const last14 = now - 14 * dayMs;

    const totalVendors = vendors.length;
    const signupsLast7 = vendors.filter(
      (v) => new Date(v.created_at).getTime() >= last7,
    ).length;
    const signupsPrev7 = vendors.filter((v) => {
      const t = new Date(v.created_at).getTime();
      return t >= prev7 && t < last7;
    }).length;
    const wowGrowth =
      signupsPrev7 === 0
        ? signupsLast7 > 0
          ? 100
          : 0
        : ((signupsLast7 - signupsPrev7) / signupsPrev7) * 100;

    const activeVendorIds = new Set<string>();
    orders.forEach((o) => {
      if (new Date(o.created_at).getTime() >= last30)
        activeVendorIds.add(o.vendor_id);
    });
    events.forEach((ev) => {
      if (new Date(ev.created_at).getTime() >= last30)
        activeVendorIds.add(ev.vendor_id);
    });
    const activeVendors = activeVendorIds.size;

    const totalProducts = products.length;
    const totalCatalogs = totalVendors; // 1 per vendor

    // Activation: vendors with >=5 products
    const productsPerVendor = new Map<string, number>();
    products.forEach((p) =>
      productsPerVendor.set(p.vendor_id, (productsPerVendor.get(p.vendor_id) ?? 0) + 1),
    );
    const activatedVendors = vendors.filter(
      (v) => (productsPerVendor.get(v.user_id) ?? 0) >= 5,
    ).length;
    const activationRate = totalVendors
      ? (activatedVendors / totalVendors) * 100
      : 0;

    // Orders aggregates
    const ordersToday = orders.filter(
      (o) => new Date(o.created_at).getTime() >= now - dayMs,
    ).length;
    const ordersWeek = orders.filter(
      (o) => new Date(o.created_at).getTime() >= last7,
    ).length;
    const ordersMonth = orders.filter(
      (o) => new Date(o.created_at).getTime() >= last30,
    ).length;
    const totalOrders = orders.length;
    const grossRevenueCents = orders.reduce((s, o) => s + o.total_cents, 0);

    // Catalogs shared = vendors with any storefront events
    const sharedVendorIds = new Set(events.map((ev) => ev.vendor_id));
    const catalogsShared = sharedVendorIds.size;

    // At-risk: no order or event in 14+ days
    const recentVendorIds = new Set<string>();
    orders.forEach((o) => {
      if (new Date(o.created_at).getTime() >= last14)
        recentVendorIds.add(o.vendor_id);
    });
    events.forEach((ev) => {
      if (new Date(ev.created_at).getTime() >= last14)
        recentVendorIds.add(ev.vendor_id);
    });
    const atRisk = vendors.filter(
      (v) =>
        !recentVendorIds.has(v.user_id) &&
        new Date(v.created_at).getTime() < last14,
    );

    // Churned = suspended (proxy until billing data exists)
    const churnedVendors = vendors.filter((v) => v.is_suspended).length;

    return {
      totalVendors,
      activeVendors,
      churnedVendors,
      totalProducts,
      totalCatalogs,
      catalogsShared,
      signupsLast7,
      wowGrowth,
      activationRate,
      ordersToday,
      ordersWeek,
      ordersMonth,
      totalOrders,
      grossRevenueCents,
      atRisk,
      avgProductsPerCatalog: totalVendors ? totalProducts / totalVendors : 0,
    };
  }, [vendors, orders, products, events]);

  // Signups per day (last 30 days)
  const signupsSeries = useMemo(() => {
    const dayMs = 24 * 60 * 60 * 1000;
    const buckets = new Map<string, number>();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * dayMs);
      const key = d.toISOString().slice(0, 10);
      buckets.set(key, 0);
    }
    vendors.forEach((v) => {
      const key = new Date(v.created_at).toISOString().slice(0, 10);
      if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
    });
    return Array.from(buckets.entries()).map(([date, count]) => ({
      date: date.slice(5),
      count,
    }));
  }, [vendors]);

  // Orders per day (last 30)
  const ordersSeries = useMemo(() => {
    const dayMs = 24 * 60 * 60 * 1000;
    const buckets = new Map<string, number>();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * dayMs);
      buckets.set(d.toISOString().slice(0, 10), 0);
    }
    orders.forEach((o) => {
      const key = new Date(o.created_at).toISOString().slice(0, 10);
      if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
    });
    return Array.from(buckets.entries()).map(([date, count]) => ({
      date: date.slice(5),
      count,
    }));
  }, [orders]);

  // Plan distribution
  const planDistribution = useMemo(() => {
    const counts = new Map<string, number>();
    vendors.forEach((v) =>
      counts.set(v.plan || "free", (counts.get(v.plan || "free") ?? 0) + 1),
    );
    return Array.from(counts.entries()).map(([name, value]) => ({ name, value }));
  }, [vendors]);

  // Top vendors by order volume
  const topVendors = useMemo(() => {
    const tally = new Map<string, { count: number; revenue: number }>();
    orders.forEach((o) => {
      const t = tally.get(o.vendor_id) ?? { count: 0, revenue: 0 };
      t.count += 1;
      t.revenue += o.total_cents;
      tally.set(o.vendor_id, t);
    });
    return vendors
      .map((v) => ({
        ...v,
        orderCount: tally.get(v.user_id)?.count ?? 0,
        revenue: tally.get(v.user_id)?.revenue ?? 0,
      }))
      .sort((a, b) => b.orderCount - a.orderCount)
      .slice(0, 50);
  }, [vendors, orders]);

  // Most ordered categories
  const topCategories = useMemo(() => {
    // We don't have order_items joined; use products per category as proxy until order_items has category context
    const tally = new Map<string, number>();
    products.forEach((p) => {
      if (!p.category_id) return;
      tally.set(p.category_id, (tally.get(p.category_id) ?? 0) + 1);
    });
    const nameOf = new Map(categories.map((c) => [c.id, c.name]));
    return Array.from(tally.entries())
      .map(([id, count]) => ({ name: nameOf.get(id) ?? "Uncategorized", count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [products, categories]);

  // Time-to-first-order
  const ttfoDays = useMemo(() => {
    const firstOrder = new Map<string, number>();
    orders.forEach((o) => {
      const t = new Date(o.created_at).getTime();
      const cur = firstOrder.get(o.vendor_id);
      if (cur === undefined || t < cur) firstOrder.set(o.vendor_id, t);
    });
    const diffs: number[] = [];
    vendors.forEach((v) => {
      const t = firstOrder.get(v.user_id);
      if (t !== undefined) {
        diffs.push((t - new Date(v.created_at).getTime()) / (24 * 60 * 60 * 1000));
      }
    });
    if (!diffs.length) return null;
    return diffs.reduce((s, d) => s + d, 0) / diffs.length;
  }, [vendors, orders]);

  const filteredVendors = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return vendors;
    return vendors.filter(
      (v) =>
        v.business_name.toLowerCase().includes(q) ||
        v.slug.toLowerCase().includes(q) ||
        v.whatsapp_number.toLowerCase().includes(q),
    );
  }, [vendors, search]);

  // ===== Actions =====
  async function updatePlan(vendorId: string, plan: Plan) {
    const { error } = await supabase
      .from("vendor_profiles")
      .update({ plan })
      .eq("user_id", vendorId);
    if (error) return toast.error(error.message);
    toast.success(`Plan updated to ${plan}`);
    setVendors((prev) =>
      prev.map((v) => (v.user_id === vendorId ? { ...v, plan } : v)),
    );
  }

  async function toggleSuspend(vendor: VendorRow) {
    const next = !vendor.is_suspended;
    const { error } = await supabase
      .from("vendor_profiles")
      .update({ is_suspended: next })
      .eq("user_id", vendor.user_id);
    if (error) return toast.error(error.message);
    toast.success(next ? "Vendor suspended" : "Vendor reactivated");
    setVendors((prev) =>
      prev.map((v) =>
        v.user_id === vendor.user_id ? { ...v, is_suspended: next } : v,
      ),
    );
  }

  async function deleteVendor(vendor: VendorRow) {
    const { error } = await supabase
      .from("vendor_profiles")
      .delete()
      .eq("user_id", vendor.user_id);
    if (error) return toast.error(error.message);
    toast.success("Vendor profile removed");
    setVendors((prev) => prev.filter((v) => v.user_id !== vendor.user_id));
    setConfirmDelete(null);
  }

  function exportVendorsCSV() {
    const headers = [
      "user_id",
      "business_name",
      "slug",
      "whatsapp",
      "currency",
      "plan",
      "suspended",
      "created_at",
    ];
    const rows = vendors.map((v) => [
      v.user_id,
      v.business_name,
      v.slug,
      v.whatsapp_number,
      v.currency,
      v.plan,
      v.is_suspended,
      v.created_at,
    ]);
    downloadCSV("vendors", headers, rows);
  }

  function exportOrdersCSV() {
    const headers = ["order_id", "vendor_id", "total_cents", "created_at"];
    const rows = orders.map((o) => [
      o.id,
      o.vendor_id,
      o.total_cents,
      o.created_at,
    ]);
    downloadCSV("orders", headers, rows);
  }

  // ===== Render guards =====
  if (authLoading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md p-8 text-center space-y-4">
          <ShieldAlert className="size-12 text-destructive mx-auto" />
          <h1 className="font-display text-2xl font-semibold">Access denied</h1>
          <p className="text-muted-foreground text-sm">
            You don't have permission to view the super admin dashboard.
          </p>
          <Button asChild>
            <Link to="/dashboard">Back to dashboard</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/dashboard">
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
            <div className="min-w-0">
              <h1 className="font-display text-lg sm:text-xl font-semibold truncate">
                Super Admin
              </h1>
              <p className="text-xs text-muted-foreground">
                Platform health & operations
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={exportVendorsCSV}>
              <Download className="size-4 mr-1.5" /> Vendors
            </Button>
            <Button size="sm" variant="outline" onClick={exportOrdersCSV}>
              <Download className="size-4 mr-1.5" /> Orders
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-6 lg:py-10">
        {dataLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-primary" />
          </div>
        ) : (
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="revenue">Revenue</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="growth">Growth</TabsTrigger>
              <TabsTrigger value="vendors">Vendors</TabsTrigger>
              <TabsTrigger value="atrisk">At-risk</TabsTrigger>
            </TabsList>

            {/* OVERVIEW */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                <KPI label="Total vendors" value={metrics.totalVendors} icon={Users} sub={`${signFmt(metrics.wowGrowth)}% WoW signups`} />
                <KPI label="Active (30d)" value={metrics.activeVendors} icon={Activity} />
                <KPI label="Churned" value={metrics.churnedVendors} icon={AlertTriangle} />
                <KPI label="Catalogs" value={metrics.totalCatalogs} icon={Package} />
                <KPI label="Total products" value={metrics.totalProducts} icon={Package} />
                <KPI label="Orders today" value={metrics.ordersToday} icon={ShoppingCart} />
                <KPI label="Orders 7d" value={metrics.ordersWeek} icon={ShoppingCart} />
                <KPI label="Orders 30d" value={metrics.ordersMonth} icon={ShoppingCart} />
                <KPI label="Catalogs shared" value={metrics.catalogsShared} icon={TrendingUp} />
                <KPI label="Activation rate" value={`${metrics.activationRate.toFixed(0)}%`} icon={Activity} sub="≥5 products" />
              </div>

              <div className="grid lg:grid-cols-2 gap-4">
                <ChartCard title="Signups (last 30 days)">
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={signupsSeries}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="date" fontSize={10} />
                      <YAxis fontSize={10} allowDecimals={false} />
                      <Tooltip />
                      <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Orders (last 30 days)">
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={ordersSeries}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="date" fontSize={10} />
                      <YAxis fontSize={10} allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
              </div>
            </TabsContent>

            {/* REVENUE — placeholder until billing data exists */}
            <TabsContent value="revenue" className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <KPI label="MRR" value="—" sub="Awaiting billing data" />
                <KPI label="ARR" value="—" sub="Awaiting billing data" />
                <KPI label="New paid this month" value="—" sub="Awaiting billing data" />
                <KPI label="Free→Paid conversion" value="—" sub="Awaiting billing data" />
              </div>

              <ChartCard title="Vendors by plan">
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={planDistribution}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={100}
                      label
                    >
                      {planDistribution.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>

              <Card className="p-4 bg-muted/30 text-sm text-muted-foreground">
                Connect a payment provider to surface MRR, ARR, upgrade/downgrade events, failed payments, and free-to-paid conversions automatically.
              </Card>
            </TabsContent>

            {/* ACTIVITY */}
            <TabsContent value="activity" className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <KPI label="Total orders" value={metrics.totalOrders} icon={ShoppingCart} />
                <KPI label="Gross volume" value={formatMoney(metrics.grossRevenueCents, "USD")} icon={TrendingUp} sub="Across all currencies" />
                <KPI label="Avg products/catalog" value={metrics.avgProductsPerCatalog.toFixed(1)} icon={Package} />
                <KPI label="Avg time-to-first-order" value={ttfoDays === null ? "—" : `${ttfoDays.toFixed(1)}d`} icon={Activity} />
              </div>

              <div className="grid lg:grid-cols-2 gap-4">
                <ChartCard title="Top product categories">
                  {topCategories.length === 0 ? (
                    <EmptyHint text="No categorized products yet." />
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={topCategories} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis type="number" fontSize={10} allowDecimals={false} />
                        <YAxis type="category" dataKey="name" width={100} fontSize={11} />
                        <Tooltip />
                        <Bar dataKey="count" fill="hsl(var(--primary))" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </ChartCard>

                <ChartCard title="Top 10 vendors by orders">
                  {topVendors.length === 0 ? (
                    <EmptyHint text="No orders yet." />
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={topVendors.slice(0, 10)} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis type="number" fontSize={10} allowDecimals={false} />
                        <YAxis type="category" dataKey="business_name" width={120} fontSize={11} />
                        <Tooltip />
                        <Bar dataKey="orderCount" fill="hsl(var(--primary))" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </ChartCard>
              </div>
            </TabsContent>

            {/* GROWTH */}
            <TabsContent value="growth" className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <KPI label="Signups 7d" value={metrics.signupsLast7} icon={TrendingUp} sub={`${signFmt(metrics.wowGrowth)}% vs prev 7d`} />
                <KPI label="Activation rate" value={`${metrics.activationRate.toFixed(0)}%`} sub="≥5 products" />
                <KPI label="Time-to-first-order" value={ttfoDays === null ? "—" : `${ttfoDays.toFixed(1)}d`} />
                <KPI label="Catalogs shared" value={metrics.catalogsShared} sub="With storefront views" />
              </div>
              <ChartCard title="Daily signups (last 30 days)">
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={signupsSeries}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="date" fontSize={10} />
                    <YAxis fontSize={10} allowDecimals={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>
              <Card className="p-4 bg-muted/30 text-sm text-muted-foreground">
                Add a referral / signup-source tracking column on vendor_profiles to surface acquisition channels and referral performance here.
              </Card>
            </TabsContent>

            {/* VENDORS */}
            <TabsContent value="vendors" className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="relative flex-1 max-w-md">
                  <Search className="size-4 absolute left-2.5 top-2.5 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, slug, phone…"
                    className="pl-8"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <span className="text-xs text-muted-foreground">
                  {filteredVendors.length} of {vendors.length}
                </span>
              </div>

              <Card className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Business</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead className="text-right">Products</TableHead>
                      <TableHead className="text-right">Orders</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredVendors.map((v) => {
                      const productCount = products.filter((p) => p.vendor_id === v.user_id).length;
                      const orderCount = orders.filter((o) => o.vendor_id === v.user_id).length;
                      return (
                        <TableRow key={v.user_id}>
                          <TableCell className="min-w-[180px]">
                            <div className="font-medium">{v.business_name}</div>
                            <a
                              href={`/s/${v.slug}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-muted-foreground hover:text-primary"
                            >
                              /s/{v.slug}
                            </a>
                          </TableCell>
                          <TableCell>
                            <Select value={v.plan} onValueChange={(val) => updatePlan(v.user_id, val as Plan)}>
                              <SelectTrigger className="h-8 w-28 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {PLAN_OPTIONS.map((p) => (
                                  <SelectItem key={p} value={p} className="text-xs capitalize">
                                    {p}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-right">{productCount}</TableCell>
                          <TableCell className="text-right">{orderCount}</TableCell>
                          <TableCell>
                            {v.is_suspended ? (
                              <Badge variant="destructive" className="text-[10px]">Suspended</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[10px]">Active</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(v.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right space-x-1 whitespace-nowrap">
                            <Button size="sm" variant="outline" onClick={() => toggleSuspend(v)} className="text-xs h-7">
                              {v.is_suspended ? "Unsuspend" : "Suspend"}
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => setConfirmDelete(v)} className="text-xs h-7">
                              Delete
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filteredVendors.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                          No vendors found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Crown className="size-4 text-amber-500" />
                  <h3 className="font-semibold text-sm">Top 50 vendors by order volume</h3>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">#</TableHead>
                        <TableHead>Business</TableHead>
                        <TableHead className="text-right">Orders</TableHead>
                        <TableHead className="text-right">Volume</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topVendors.filter((v) => v.orderCount > 0).map((v, i) => (
                        <TableRow key={v.user_id}>
                          <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                          <TableCell className="font-medium">{v.business_name}</TableCell>
                          <TableCell className="text-right">{v.orderCount}</TableCell>
                          <TableCell className="text-right">{formatMoney(v.revenue, v.currency)}</TableCell>
                        </TableRow>
                      ))}
                      {topVendors.filter((v) => v.orderCount > 0).length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-6">
                            No orders yet
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </TabsContent>

            {/* AT-RISK */}
            <TabsContent value="atrisk" className="space-y-4">
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="size-4 text-amber-500" />
                  <h3 className="font-semibold text-sm">
                    At-risk vendors ({metrics.atRisk.length}) — no order or storefront activity in 14+ days
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Business</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {metrics.atRisk.map((v) => (
                        <TableRow key={v.user_id}>
                          <TableCell className="font-medium">{v.business_name}</TableCell>
                          <TableCell className="capitalize text-xs">{v.plan}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(v.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <a
                              href={`/s/${v.slug}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-primary hover:underline"
                            >
                              View catalog →
                            </a>
                          </TableCell>
                        </TableRow>
                      ))}
                      {metrics.atRisk.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-6">
                            No at-risk vendors 🎉
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </main>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete vendor profile?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the profile for <strong>{confirmDelete?.business_name}</strong>. The auth user remains. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => confirmDelete && deleteVendor(confirmDelete)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function KPI({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
          {label}
        </p>
        {Icon && <Icon className="size-4 text-muted-foreground" />}
      </div>
      <p className="font-display text-2xl font-semibold mt-1">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>}
    </Card>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-4">
      <h3 className="font-semibold text-sm mb-3">{title}</h3>
      {children}
    </Card>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="h-[240px] flex items-center justify-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}

function signFmt(n: number) {
  const v = Number.isFinite(n) ? n.toFixed(0) : "0";
  return n >= 0 ? `+${v}` : v;
}

function downloadCSV(name: string, headers: string[], rows: (string | number | boolean)[][]) {
  const csv = [headers, ...rows]
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `katalog-${name}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
