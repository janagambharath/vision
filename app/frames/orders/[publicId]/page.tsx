import Link from "next/link";
import { ArrowLeft, CheckCircle2, Circle, ClipboardList, MessageCircle, Package, Truck } from "lucide-react";
import { OrderLookupForm } from "@/components/order-lookup-form";
import { CLINIC_WHATSAPP_NUMBER, ORDER_STATUS_LABELS } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { hasOrderAccess } from "@/lib/order-access";

export const metadata = {
  title: "Order Tracking | Vision Vistara",
  description: "Track your Vision Vistara frame orders from pending to delivered.",
  robots: { index: false, follow: false }
};

const statusFlow = ["PENDING", "CONFIRMED", "PACKED", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"];

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return <div className="flex items-start justify-between gap-4"><dt className="text-slate-500">{label}</dt><dd className={strong ? "font-extrabold text-slate-950 text-right" : "font-bold text-slate-800 text-right"}>{value}</dd></div>;
}

export default async function OrderTrackingPage({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId: rawPublicId } = await params;
  const publicId = rawPublicId.trim().toUpperCase();

  if (["DEMO", "LOOKUP", "START"].includes(publicId)) {
    return (
      <main className="vv-section bg-paper"><div className="vv-container max-w-2xl"><p className="vv-kicker text-retail">Order tracking</p><h1 className="text-4xl font-extrabold">Track your order</h1><OrderLookupForm /></div></main>
    );
  }

  if (!(await hasOrderAccess(publicId, "tracking"))) {
    return (
      <main className="vv-section bg-paper"><div className="vv-container max-w-2xl"><p className="vv-kicker text-retail">Order verification</p><h1 className="text-4xl font-extrabold">Verify to view this order</h1><p className="mt-3 text-slate-600">Enter the full phone number used at checkout. Verification is required before we display order or delivery data.</p><OrderLookupForm initialOrderId={publicId} /></div></main>
    );
  }

  const order = await prisma.order.findUnique({
    where: { publicId },
    include: { items: true, shippingAddress: true, payments: { orderBy: { createdAt: "desc" }, take: 1 } }
  });
  if (!order) {
    return <main className="vv-section bg-paper"><div className="vv-container max-w-2xl"><h1 className="text-3xl font-extrabold">Order not found</h1><Link href="/frames/orders/lookup" className="mt-6 inline-flex font-bold text-retail">Try another order</Link></div></main>;
  }

  const statusIndex = statusFlow.indexOf(order.status);
  const latestPayment = order.payments[0];
  const whatsappText = encodeURIComponent(`Hello Vision Vistara, I need help with order ${order.publicId}.`);

  return (
    <main className="vv-section bg-paper">
      <div className="vv-container">
        <Link href="/frames" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900"><ArrowLeft className="h-4 w-4" />Back to store</Link>
        <p className="vv-kicker text-retail">Order tracking</p>
        <h1 className="text-4xl font-extrabold text-slate-900">Order {order.publicId}</h1>
        <p className="mt-2 text-slate-600">Placed on {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="grid gap-6">
            <section className="vv-card p-6 bg-white border border-slate-100"><h2 className="flex items-center gap-2 text-xl font-extrabold"><Truck className="h-5 w-5 text-retail" />Delivery timeline</h2><div className="mt-6 grid gap-4">{statusFlow.map((status) => { const complete = statusIndex >= statusFlow.indexOf(status); return <div key={status} className={`flex items-center gap-3 ${complete ? "text-slate-900" : "text-slate-400"}`}>{complete ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <Circle className="h-5 w-5" />}<span className={status === order.status ? "font-extrabold text-retail" : "font-bold"}>{ORDER_STATUS_LABELS[status] ?? status}</span></div>; })}</div></section>
            <section className="vv-card p-6 bg-white border border-slate-100"><h2 className="flex items-center gap-2 text-xl font-extrabold"><Package className="h-5 w-5 text-retail" />Order items</h2><div className="mt-5 grid gap-3">{order.items.map((item) => { const snapshot = item.productSnapshot as { name?: string; brand?: string; sku?: string }; const lens = item.lensSnapshot as { name?: string } | null; return <div key={item.id} className="flex justify-between gap-4 rounded-vv border border-slate-200 p-4"><div><strong>{snapshot.brand} {snapshot.name}</strong><p className="mt-1 text-sm text-slate-500">SKU {snapshot.sku} · Qty {item.quantity}</p>{lens?.name ? <p className="mt-1 text-sm font-bold text-retail">Lens: {lens.name}</p> : null}</div><strong className="text-retail">{formatMoney((item.unitPricePaise + item.lensPricePaise) * item.quantity)}</strong></div>; })}</div></section>
          </div>
          <div className="grid gap-6 self-start">
            <aside className="vv-card p-6 bg-white border border-slate-100"><ClipboardList className="h-6 w-6 text-retail" /><h2 className="mt-3 text-xl font-extrabold">Summary</h2><dl className="mt-5 grid gap-3 text-sm"><Row label="Delivery" value={order.deliveryMethod.replace(/_/g, " ")} /><Row label="Payment" value={latestPayment?.status === "PAID" ? "Paid" : "Awaiting confirmation"} /><div className="border-t border-slate-100 pt-3" /><Row label="Subtotal" value={formatMoney(order.subtotalPaise)} /><Row label="Lens add-ons" value={formatMoney(order.lensTotalPaise)} /><Row label="Delivery" value={formatMoney(order.shippingPaise)} /><Row label="GST" value={formatMoney(order.taxPaise)} /><Row label="Grand total" value={formatMoney(order.grandTotalPaise)} strong /></dl></aside>
            {order.shippingAddress ? <aside className="vv-card p-6 bg-white border border-slate-100"><h2 className="text-lg font-extrabold">Delivery address</h2><div className="mt-3 text-sm text-slate-600"><p className="font-bold text-slate-900">{order.shippingAddress.name}</p><p>{order.shippingAddress.line1}</p>{order.shippingAddress.line2 ? <p>{order.shippingAddress.line2}</p> : null}<p>{order.shippingAddress.city}{order.shippingAddress.state ? `, ${order.shippingAddress.state}` : ""} - {order.shippingAddress.pincode}</p></div></aside> : null}
            <a className="vv-button bg-emerald-400 text-ink justify-center" href={`https://wa.me/${CLINIC_WHATSAPP_NUMBER}?text=${whatsappText}`} target="_blank" rel="noopener noreferrer"><MessageCircle className="h-4 w-4" />Need help with this order</a>
          </div>
        </div>
      </div>
    </main>
  );
}
