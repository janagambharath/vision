import Link from "next/link";
import { ArrowRight, Boxes, ClipboardList, Home, ShoppingBag, TrendingUp, Users, Calendar, ShieldAlert, Star } from "lucide-react";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { getStoreProducts } from "@/lib/store-data";
import { formatMoney } from "@/lib/money";

export const metadata = { title: "Admin Dashboard | Vision Vistara" };

export default async function AdminDashboardPage() {
  await requireAdmin();

  const products = await getStoreProducts({ includeDrafts: true });
  
  // Calculate Date Ranges
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [
    leadCount,
    totalRevenue,
    chartOrders,
    orderStatusGroups,
    tryAtHomeGroups,
    pendingReviewsCount,
    todaysTrials
  ] = await Promise.all([
    prisma.lead.count().catch(() => 0),
    prisma.order.aggregate({ _sum: { grandTotalPaise: true }, where: { status: { in: ["CONFIRMED", "PACKED", "SHIPPED", "DELIVERED"] } } }).catch(() => ({ _sum: { grandTotalPaise: 0 } })),
    // Chart Orders
    prisma.order.findMany({
      where: {
        status: { in: ["CONFIRMED", "PACKED", "SHIPPED", "DELIVERED"] },
        createdAt: { gte: thirtyDaysAgo }
      },
      select: { createdAt: true, grandTotalPaise: true }
    }).catch(() => []),
    // Group Order Statuses
    prisma.order.groupBy({
      by: ["status"],
      _count: true
    }).catch(() => []),
    // Group TryAtHome Statuses
    prisma.tryAtHomeRequest.groupBy({
      by: ["status"],
      _count: true
    }).catch(() => []),
    // Action Items Counts
    prisma.review.count({ where: { approved: false } }).catch(() => 0),
    // Today's Trials Schedule
    prisma.tryAtHomeRequest.findMany({
      where: {
        preferredDate: {
          gte: today,
          lt: tomorrow
        }
      },
      orderBy: { preferredSlot: "asc" }
    }).catch(() => [])
  ]);

  type GroupStatus = { status: string; _count: number };
  const orderCount = orderStatusGroups.reduce((acc: number, group: GroupStatus) => acc + group._count, 0);
  const confirmedOrdersCount = orderStatusGroups
    .filter((g: GroupStatus) => ["CONFIRMED", "PACKED", "SHIPPED", "DELIVERED"].includes(g.status))
    .reduce((acc: number, group: GroupStatus) => acc + group._count, 0);
  const deliveredOrdersCount = orderStatusGroups.find((g: GroupStatus) => g.status === "DELIVERED")?._count || 0;
  const awaitingPrescriptionCount = orderStatusGroups.find((g: GroupStatus) => g.status === "AWAITING_PRESCRIPTION")?._count || 0;

  const tryAtHomeCount = tryAtHomeGroups.reduce((acc: number, group: GroupStatus) => acc + group._count, 0);
  const pendingTryAtHomeCount = tryAtHomeGroups.find((g: GroupStatus) => g.status === "TRY_AT_HOME_BOOKED")?._count || 0;

  // Process 30-day Chart Data
  const revenueByDate: Record<string, number> = {};
  for (let i = 0; i < 7; i++) { // Render last 7 active revenue days for cleaner SVG columns
    const d = new Date();
    d.setDate(d.getDate() - i);
    revenueByDate[d.toDateString()] = 0;
  }
  chartOrders.forEach((o) => {
    const dateStr = new Date(o.createdAt).toDateString();
    if (revenueByDate[dateStr] !== undefined) {
      revenueByDate[dateStr] += o.grandTotalPaise;
    }
  });

  const chartData = Object.entries(revenueByDate)
    .reverse()
    .map(([date, val]) => ({
      label: new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
      amount: val / 100
    }));

  const maxAmount = Math.max(...chartData.map((d) => d.amount), 1000);

  const navLinks = [
    { href: "/admin/products", label: "Products Catalog", icon: ShoppingBag, count: products.length },
    { href: "/admin/orders", label: "Orders Fulfillment", icon: ClipboardList, count: orderCount },
    { href: "/admin/leads", label: "Leads Generation", icon: Users, count: leadCount },
    { href: "/admin/inventory", label: "Inventory Stock", icon: Boxes },
    { href: "/admin/try-at-home", label: "Try-at-Home Visits", icon: Calendar },
    { href: "/admin/reviews", label: "Customer Reviews", icon: Star }
  ];

  return (
    <main className="vv-section bg-paper min-h-screen">
      <div className="vv-container">
        <p className="vv-kicker text-retail">Operations</p>
        <h1 className="text-4xl font-extrabold text-slate-900 font-sans">Business Dashboard</h1>
        <p className="mt-2 text-slate-600">Overview of clinic, storefront conversions, and dispatch schedules.</p>

        {/* Metrics Grid */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric icon={<TrendingUp />} label="Total Confirmed Sales" value={formatMoney(totalRevenue._sum.grandTotalPaise ?? 0)} accent />
          <Metric icon={<ClipboardList />} label="Orders Placed" value={String(orderCount)} />
          <Metric icon={<Home />} label="Home Trial Requests" value={String(tryAtHomeCount)} />
          <Metric icon={<Users />} label="Patient Leads" value={String(leadCount)} />
        </div>

        {/* Pending Action Items Section */}
        <section className="mt-8 vv-card p-6 bg-slate-50 border border-slate-200">
          <h2 className="text-lg font-extrabold text-slate-800 flex items-center gap-1.5 mb-4">
            <ShieldAlert className="h-5 w-5 text-amber-500" />
            Restock & Moderate Actions Needed
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <Link href="/admin/orders?status=AWAITING_PRESCRIPTION" className="bg-white border border-slate-200 p-4 rounded hover:border-retail transition flex justify-between items-center">
              <div>
                <span className="text-xs text-slate-500 font-bold block uppercase">Awaiting Prescription</span>
                <strong className="text-2xl text-slate-800">{awaitingPrescriptionCount} orders</strong>
              </div>
              <ArrowRight className="h-5 w-5 text-slate-400" />
            </Link>
            <Link href="/admin/try-at-home" className="bg-white border border-slate-200 p-4 rounded hover:border-retail transition flex justify-between items-center">
              <div>
                <span className="text-xs text-slate-500 font-bold block uppercase">Trial bookings pending</span>
                <strong className="text-2xl text-slate-800">{pendingTryAtHomeCount} visits</strong>
              </div>
              <ArrowRight className="h-5 w-5 text-slate-400" />
            </Link>
            <Link href="/admin/reviews" className="bg-white border border-slate-200 p-4 rounded hover:border-retail transition flex justify-between items-center">
              <div>
                <span className="text-xs text-slate-500 font-bold block uppercase">Reviews Pending</span>
                <strong className="text-2xl text-slate-800">{pendingReviewsCount} reviews</strong>
              </div>
              <ArrowRight className="h-5 w-5 text-slate-400" />
            </Link>
          </div>
        </section>

        {/* Schedule & SVG Chart Split */}
        <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          
          {/* Revenue Chart */}
          <section className="vv-card p-6 bg-white border border-slate-100 flex flex-col justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-slate-800">Weekly Revenue Timeline</h2>
              <p className="text-xs text-slate-500 mt-1">Confirmed sales figures represented via clean SVG vectors.</p>
            </div>
            
            {/* SVG Vector Chart */}
            <div className="mt-6 flex items-end justify-between h-48 border-b border-slate-200 pb-2">
              {chartData.map((d, i) => {
                const heightPct = Math.max(10, (d.amount / maxAmount) * 100);
                return (
                  <div key={i} className="flex flex-col items-center flex-1 group">
                    <span className="opacity-0 group-hover:opacity-100 bg-slate-800 text-white text-[10px] rounded px-1.5 py-0.5 mb-1 transition duration-150">
                      ₹{d.amount.toFixed(0)}
                    </span>
                    <div
                      style={{ height: `${heightPct}%` }}
                      className="w-8 bg-teal-600 rounded-t group-hover:bg-teal-700 transition-all duration-300"
                    />
                    <span className="text-[10px] text-slate-500 font-bold mt-2">{d.label}</span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Today's Schedule */}
          <section className="vv-card p-6 bg-white border border-slate-100">
            <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-1.5">
              <Calendar className="h-5 w-5 text-retail" />
              Today's Visits Schedule ({todaysTrials.length})
            </h2>
            <div className="mt-4 grid gap-3 max-h-[220px] overflow-y-auto pr-1">
              {todaysTrials.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-6 text-center">No try-at-home trials scheduled for today.</p>
              ) : (
                todaysTrials.map((t) => (
                  <div key={t.id} className="p-3 border border-slate-100 rounded text-xs flex justify-between items-center bg-slate-50/50">
                    <div>
                      <strong className="block text-slate-800">{t.name}</strong>
                      <span className="text-slate-500 mt-0.5 block">{t.address}</span>
                    </div>
                    <span className="font-extrabold text-retail bg-teal-50 px-2 py-0.5 rounded shrink-0">{t.preferredSlot}</span>
                  </div>
                ))
              )}
            </div>
          </section>

        </div>

        {/* Funnel & Alerts */}
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
          
          {/* Conversion Funnel */}
          <section className="vv-card p-6 bg-white border border-slate-100">
            <h2 className="text-xl font-extrabold text-slate-800 mb-4">Storefront Conversion Funnel</h2>
            <div className="grid gap-3 text-xs">
              <FunnelRow label="Patient Leads" count={leadCount} total={leadCount} />
              <FunnelRow label="Try-at-Home Booked" count={tryAtHomeCount} total={leadCount} />
              <FunnelRow label="Orders Placed" count={orderCount} total={leadCount} />
              <FunnelRow label="Orders Confirmed" count={confirmedOrdersCount} total={leadCount} />
              <FunnelRow label="Orders Delivered" count={deliveredOrdersCount} total={leadCount} />
            </div>
          </section>

          {/* Quick Nav Links */}
          <div className="grid gap-3 self-start">
            <h3 className="font-bold text-slate-500 text-xs uppercase pl-1">Management Portal</h3>
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link key={link.href} href={link.href} className="vv-card flex items-center gap-3 p-4 hover:shadow-md transition">
                  <Icon className="h-5 w-5 text-retail" />
                  <div className="flex-grow text-sm font-bold text-slate-700">{link.label}</div>
                  {link.count !== undefined && <span className="bg-slate-100 text-slate-600 rounded px-1.5 py-0.5 text-xs font-bold">{link.count}</span>}
                </Link>
              );
            })}
          </div>

        </div>

      </div>
    </main>
  );
}

function Metric({ icon, label, value, accent = false }: { icon: React.ReactNode; label: string; value: string; accent?: boolean }) {
  return (
    <article className="vv-card p-5 bg-white border border-slate-100 flex flex-col">
      <div className={`[&_svg]:h-6 [&_svg]:w-6 ${accent ? "text-retail" : "text-slate-400"}`}>{icon}</div>
      <strong className="mt-4 block text-2xl font-extrabold text-slate-900">{value}</strong>
      <span className="text-xs font-extrabold text-slate-500 uppercase mt-1">{label}</span>
    </article>
  );
}

function FunnelRow({ label, count, total }: { label: string; count: number; total: number }) {
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="grid gap-1">
      <div className="flex justify-between font-bold text-slate-700">
        <span>{label} ({count})</span>
        <span>{percentage}%</span>
      </div>
      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
        <div style={{ width: `${percentage}%` }} className="h-full bg-retail rounded-full" />
      </div>
    </div>
  );
}
