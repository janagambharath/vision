import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { ORDER_STATUS_LABELS } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";

export default async function AdminOrdersPage() {
  await requireAdmin();
  const orders = await prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 50 }).catch(() => []);

  return (
    <main className="vv-section">
      <div className="vv-container">
        <p className="vv-kicker text-retail">Orders</p>
        <h1 className="text-4xl font-extrabold">Order management</h1>
        <div className="mt-8 grid gap-3">
          {orders.length ? orders.map((order) => (
            <article key={order.id} className="vv-card grid gap-4 p-5 md:grid-cols-[1fr_auto]">
              <div>
                <h2 className="text-xl font-extrabold">{order.publicId}</h2>
                <p className="mt-1 text-sm text-slate-600">{order.customerName} · {order.phone} · {ORDER_STATUS_LABELS[order.status]}</p>
              </div>
              <div className="text-right">
                <strong className="block text-retail">{formatMoney(order.grandTotalPaise)}</strong>
                <Link className="vv-button-light mt-2" href={`/frames/orders/${order.publicId}`}>Track</Link>
              </div>
            </article>
          )) : <p className="vv-card p-6 text-slate-600">No orders yet.</p>}
        </div>
      </div>
    </main>
  );
}
