import { AlertTriangle, Boxes, ClipboardList, Home, ShoppingBag, Users } from "lucide-react";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { getStoreProducts } from "@/lib/store-data";

export default async function AdminDashboardPage() {
  await requireAdmin();

  const products = await getStoreProducts({ includeDrafts: true });
  const [orderCount, leadCount, tryAtHomeCount] = await Promise.all([
    prisma.order.count().catch(() => 0),
    prisma.lead.count().catch(() => 0),
    prisma.tryAtHomeRequest.count().catch(() => 0)
  ]);
  const draftCount = products.filter((product) => product.status !== "ACTIVE" || product.pricePaise === null).length;

  return (
    <main className="vv-section">
      <div className="vv-container">
        <p className="vv-kicker text-retail">Admin dashboard</p>
        <h1 className="text-4xl font-extrabold">Commerce operations</h1>
        <p className="mt-2 text-slate-600">Manage products, categories, inventory, pricing, orders, leads, home trials, coupons, reviews, banners, and follow-up actions.</p>

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <Metric icon={<ShoppingBag />} label="Products" value={products.length} />
          <Metric icon={<AlertTriangle />} label="Draft blockers" value={draftCount} />
          <Metric icon={<ClipboardList />} label="Orders" value={orderCount} />
          <Metric icon={<Home />} label="Home trials" value={tryAtHomeCount} />
          <Metric icon={<Users />} label="Leads" value={leadCount} />
          <Metric icon={<Boxes />} label="Low stock alerts" value={products.filter((product) => product.inventoryStatus === "LOW_STOCK").length} />
        </div>
      </div>
    </main>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <article className="vv-card p-5">
      <div className="text-retail [&_svg]:h-6 [&_svg]:w-6">{icon}</div>
      <strong className="mt-4 block text-3xl font-extrabold">{value}</strong>
      <span className="text-sm font-bold text-slate-500">{label}</span>
    </article>
  );
}
