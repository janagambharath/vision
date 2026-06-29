import Link from "next/link";
import { ClipboardList, Package, Search, Truck } from "lucide-react";
import { ORDER_STATUS_LABELS } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";

export const metadata = {
  title: "Order Tracking",
  description: "Track Vision Vistara frame orders from pending to confirmed, packed, shipped, delivered, or try-at-home booked."
};

export default async function OrderTrackingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (id === "demo") {
    return (
      <main className="vv-section bg-paper">
        <div className="vv-container max-w-2xl">
          <p className="vv-kicker text-retail">Order tracking</p>
          <h1 className="text-4xl font-extrabold">Track an order.</h1>
          <form className="vv-card mt-8 grid gap-4 p-6" action="/frames/orders/lookup" method="get">
            <label className="grid gap-2 text-sm font-extrabold text-slate-600">
              Order ID
              <input className="store-input" type="text" name="id" placeholder="VV-..." />
            </label>
            <button className="vv-button-retail" type="submit">
              <Search className="h-4 w-4" />
              Track
            </button>
          </form>
        </div>
      </main>
    );
  }

  const order = await prisma.order.findUnique({
    where: { publicId: id },
    include: {
      items: true,
      payments: true,
      shippingAddress: true,
      tryAtHomeRequest: true
    }
  }).catch(() => null);

  if (!order) {
    return (
      <main className="vv-section bg-paper">
        <div className="vv-container">
          <h1 className="text-3xl font-extrabold">Order not found</h1>
          <p className="mt-2 text-slate-600">Check the order ID or contact Vision Vistara on WhatsApp.</p>
          <Link className="vv-button-retail mt-5" href="/frames">Back to frames</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="vv-section bg-paper">
      <div className="vv-container">
        <div className="mb-8">
          <p className="vv-kicker text-retail">Order tracking</p>
          <h1 className="text-4xl font-extrabold">Order {order.publicId}</h1>
          <p className="mt-2 text-slate-600">Current status: <strong>{ORDER_STATUS_LABELS[order.status]}</strong></p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <section className="vv-card p-6">
            <h2 className="flex items-center gap-2 text-2xl font-extrabold">
              <Truck className="h-6 w-6 text-retail" />
              Fulfilment timeline
            </h2>
            <div className="mt-6 grid gap-3">
              {Object.entries(ORDER_STATUS_LABELS).slice(0, 6).map(([status, label]) => (
                <div key={status} className={status === order.status ? "rounded-vv border border-teal-200 bg-teal-50 p-4 font-extrabold text-retail" : "rounded-vv border border-slate-200 bg-white p-4 text-slate-500"}>
                  {label}
                </div>
              ))}
            </div>
          </section>

          <aside className="vv-card p-6">
            <ClipboardList className="h-8 w-8 text-retail" />
            <h2 className="mt-4 text-2xl font-extrabold">Summary</h2>
            <dl className="mt-5 grid gap-3 text-sm">
              <Row label="Customer" value={order.customerName} />
              <Row label="Phone" value={order.phone} />
              <Row label="Payment" value={order.paymentMethod.replace(/_/g, " ")} />
              <Row label="Delivery" value={order.deliveryMethod.replace(/_/g, " ")} />
              <Row label="Total" value={formatMoney(order.grandTotalPaise)} strong />
            </dl>
          </aside>
        </div>

        <section className="vv-card mt-6 p-6">
          <h2 className="flex items-center gap-2 text-2xl font-extrabold">
            <Package className="h-6 w-6 text-retail" />
            Items
          </h2>
          <div className="mt-5 grid gap-3">
            {order.items.map((item) => {
              const snapshot = item.productSnapshot as { name?: string; brand?: string; sku?: string };
              return (
                <div key={item.id} className="rounded-vv border border-slate-200 p-4">
                  <strong>{snapshot.brand} {snapshot.name}</strong>
                  <p className="text-sm text-slate-500">SKU {snapshot.sku} · Qty {item.quantity}</p>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={strong ? "flex justify-between border-t border-slate-200 pt-3 font-extrabold" : "flex justify-between text-slate-600"}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
