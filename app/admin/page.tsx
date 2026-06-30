import Link from "next/link";
import { AlertTriangle, ArrowRight, Boxes, ClipboardList, Home, Package, ShoppingBag, Tag, TrendingUp, Users } from "lucide-react";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { getStoreProducts } from "@/lib/store-data";
import { formatMoney } from "@/lib/money";
import { ORDER_STATUS_LABELS } from "@/lib/constants";

export const metadata = { title: "Admin Dashboard" };

export default async function AdminDashboardPage() {
  await requireAdmin();

  const products = await getStoreProducts({ includeDrafts: true });
  const [orderCount, leadCount, tryAtHomeCount, totalRevenue, recentOrders, recentLeads] = await Promise.all([
    prisma.order.count().catch(() => 0),
    prisma.lead.count().catch(() => 0),
    prisma.tryAtHomeRequest.count().catch(() => 0),
    prisma.order.aggregate({ _sum: { grandTotalPaise: true }, where: { status: { in: ["CONFIRMED", "PACKED", "SHIPPED", "DELIVERED"] } } }).catch(() => ({ _sum: { grandTotalPaise: 0 } })),
    prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 5 }).catch(() => []),
    prisma.lead.findMany({ orderBy: { createdAt: "desc" }, take: 5 }).catch(() => [])
  ]);

  const draftCount = products.filter((p) => p.status !== "ACTIVE" || p.pricePaise === null).length;
  const lowStockCount = products.filter((p) => p.inventoryStatus === "LOW_STOCK").length;
  const outOfStockCount = products.filter((p) => p.inventoryStatus === "OUT_OF_STOCK").length;

  const navLinks = [
    { href: "/admin/products", label: "Products", icon: ShoppingBag, count: products.length },
    { href: "/admin/orders", label: "Orders", icon: ClipboardList, count: orderCount },
    { href: "/admin/leads", label: "Leads", icon: Users, count: leadCount },
    { href: "/admin/inventory", label: "Inventory", icon: Boxes },
    { href: "/admin/coupons", label: "Coupons", icon: Tag },
    { href: "/admin/promotions", label: "Promotions", icon: TrendingUp }
  ];

  return (
    <main className="vv-section">
      <div className="vv-container">
        <p className="vv-kicker text-retail">Admin</p>
        <h1 className="text-4xl font-extrabold">Dashboard</h1>
        <p className="mt-2 text-slate-600">Manage products, orders, inventory, leads, and store operations.</p>

        {/* Metrics */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric icon={<TrendingUp />} label="Total revenue" value={formatMoney(totalRevenue._sum.grandTotalPaise ?? 0)} accent />
          <Metric icon={<ClipboardList />} label="Orders" value={String(orderCount)} />
          <Metric icon={<ShoppingBag />} label="Products" value={String(products.length)} />
          <Metric icon={<Home />} label="Home trials" value={String(tryAtHomeCount)} />
          <Metric icon={<Users />} label="Leads" value={String(leadCount)} />
          <Metric icon={<AlertTriangle />} label="Draft products" value={String(draftCount)} warn={draftCount > 0} />
          <Metric icon={<Boxes />} label="Low stock" value={String(lowStockCount)} warn={lowStockCount > 0} />
          <Metric icon={<Package />} label="Out of stock" value={String(outOfStockCount)} warn={outOfStockCount > 0} />
        </div>

        {/* Quick Nav */}
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link key={link.href} href={link.href} className="vv-card flex items-center gap-4 p-5 transition hover:-translate-y-0.5 hover:shadow-strong">
                <Icon className="h-6 w-6 shrink-0 text-retail" />
                <div className="flex-1">
                  <strong className="text-lg">{link.label}</strong>
                  {link.count !== undefined ? <p className="text-sm text-slate-500">{link.count} total</p> : null}
                </div>
                <ArrowRight className="h-5 w-5 text-slate-400" />
              </Link>
            );
          })}
        </div>

        {/* Recent Orders & Leads */}
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section className="vv-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-extrabold">Recent orders</h2>
              <Link href="/admin/orders" className="text-sm font-bold text-retail hover:underline">View all</Link>
            </div>
            {recentOrders.length ? (
              <div className="grid gap-2">
                {recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between rounded-vv border border-slate-200 p-3 text-sm">
                    <div>
                      <strong>{order.publicId}</strong>
                      <p className="text-xs text-slate-500">{order.customerName} · {ORDER_STATUS_LABELS[order.status]}</p>
                    </div>
                    <strong className="text-retail">{formatMoney(order.grandTotalPaise)}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No orders yet.</p>
            )}
          </section>

          <section className="vv-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-extrabold">Recent leads</h2>
              <Link href="/admin/leads" className="text-sm font-bold text-retail hover:underline">View all</Link>
            </div>
            {recentLeads.length ? (
              <div className="grid gap-2">
                {recentLeads.map((lead) => (
                  <div key={lead.id} className="flex items-center justify-between rounded-vv border border-slate-200 p-3 text-sm">
                    <div>
                      <strong>{lead.name}</strong>
                      <p className="text-xs text-slate-500">{lead.phone} · {lead.source}</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">{lead.status}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No leads yet.</p>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

function Metric({ icon, label, value, accent = false, warn = false }: { icon: React.ReactNode; label: string; value: string; accent?: boolean; warn?: boolean }) {
  return (
    <article className={`vv-card p-5 ${warn ? "border-amber-200" : ""}`}>
      <div className={`[&_svg]:h-6 [&_svg]:w-6 ${warn ? "text-amber-600" : accent ? "text-retail" : "text-slate-400"}`}>{icon}</div>
      <strong className={`mt-4 block text-2xl font-extrabold ${warn ? "text-amber-700" : ""}`}>{value}</strong>
      <span className="text-sm font-bold text-slate-500">{label}</span>
    </article>
  );
}
