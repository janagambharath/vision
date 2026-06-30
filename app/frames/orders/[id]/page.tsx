import Link from "next/link";
import { ArrowLeft, CheckCircle2, Circle, Clock, ClipboardList, MessageCircle, Package, RefreshCw, Search, Truck } from "lucide-react";
import { ORDER_STATUS_LABELS, CLINIC_WHATSAPP_NUMBER } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";

export const metadata = {
  title: "Order Tracking",
  description: "Track Vision Vistara frame orders from pending to confirmed, packed, shipped, delivered, or try-at-home booked."
};

const statusFlow = ["PENDING", "CONFIRMED", "PACKED", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"];

function getStatusIndex(status: string) {
  const idx = statusFlow.indexOf(status);
  return idx >= 0 ? idx : -1;
}

export default async function OrderTrackingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (id === "demo" || id === "lookup") {
    return (
      <main className="vv-section bg-paper">
        <div className="vv-container max-w-2xl">
          <p className="vv-kicker text-retail">Order tracking</p>
          <h1 className="text-4xl font-extrabold">Track your order.</h1>
          <p className="mt-3 text-slate-600">Enter your order ID to view the current status and delivery timeline.</p>
          <form className="vv-card mt-8 grid gap-4 p-6" action="/frames/orders/lookup" method="get">
            <label className="grid gap-2 text-sm font-extrabold text-slate-600">
              Order ID
              <input className="store-input" type="text" name="id" placeholder="VV-..." required />
            </label>
            <label className="grid gap-2 text-sm font-extrabold text-slate-600">
              Phone number (for verification)
              <input className="store-input" type="tel" name="phone" placeholder="e.g. 9876543210" />
            </label>
            <button className="vv-button-retail" type="submit">
              <Search className="h-4 w-4" />
              Track Order
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
      payments: { orderBy: { createdAt: "desc" } },
      shippingAddress: true,
      tryAtHomeRequest: true,
      prescriptions: true
    }
  }).catch(() => null);

  if (!order) {
    return (
      <main className="vv-section bg-paper">
        <div className="vv-container max-w-2xl text-center">
          <Package className="mx-auto h-16 w-16 text-slate-300" />
          <h1 className="mt-6 text-3xl font-extrabold">Order not found</h1>
          <p className="mt-3 text-slate-600">We couldn&apos;t find an order with ID &quot;{id}&quot;. Please check the order ID or contact us on WhatsApp.</p>
          <div className="mt-6 flex justify-center gap-3">
            <Link className="vv-button-retail" href="/frames/orders/lookup">Try again</Link>
            <a className="vv-button bg-emerald-400 text-ink" href={`https://wa.me/${CLINIC_WHATSAPP_NUMBER}?text=Hello%20Vision%20Vistara%2C%20I%20need%20help%20tracking%20order%20${id}`} target="_blank" rel="noopener">
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </a>
          </div>
        </div>
      </main>
    );
  }

  const currentStatusIndex = getStatusIndex(order.status);
  const latestPayment = order.payments[0];
  const whatsappText = encodeURIComponent(`Hello Vision Vistara, I have a question about order ${order.publicId}.`);

  return (
    <main className="vv-section bg-paper">
      <div className="vv-container">
        <Link href="/frames" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" />
          Back to store
        </Link>

        <div className="mb-8">
          <p className="vv-kicker text-retail">Order tracking</p>
          <h1 className="text-4xl font-extrabold">Order {order.publicId}</h1>
          <p className="mt-2 text-slate-600">
            Placed on {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          {/* Main Content */}
          <div className="grid gap-6">
            {/* Status Timeline */}
            <section className="vv-card p-6">
              <h2 className="flex items-center gap-2 text-xl font-extrabold">
                <Truck className="h-5 w-5 text-retail" />
                Delivery timeline
              </h2>
              <div className="mt-6">
                {statusFlow.map((status, index) => {
                  const isCompleted = currentStatusIndex >= index;
                  const isCurrent = status === order.status;
                  return (
                    <div key={status} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        {isCompleted ? (
                          <CheckCircle2 className={`h-6 w-6 shrink-0 ${isCurrent ? "text-retail" : "text-emerald-500"}`} />
                        ) : (
                          <Circle className="h-6 w-6 shrink-0 text-slate-300" />
                        )}
                        {index < statusFlow.length - 1 ? (
                          <div className={`my-1 w-0.5 flex-1 ${isCompleted ? "bg-emerald-300" : "bg-slate-200"}`} style={{ minHeight: 32 }} />
                        ) : null}
                      </div>
                      <div className={`pb-6 ${isCurrent ? "font-extrabold text-retail" : isCompleted ? "font-bold text-slate-900" : "text-slate-400"}`}>
                        <p>{ORDER_STATUS_LABELS[status] ?? status}</p>
                        {isCurrent ? (
                          <p className="mt-1 text-xs font-normal text-slate-500">Current status</p>
                        ) : null}
                      </div>
                    </div>
                  );
                })}

                {/* Special statuses */}
                {!statusFlow.includes(order.status) ? (
                  <div className="mt-4 flex items-center gap-3 rounded-vv border border-amber-200 bg-amber-50 p-4">
                    <Clock className="h-5 w-5 text-amber-600" />
                    <div>
                      <p className="font-extrabold text-amber-900">{ORDER_STATUS_LABELS[order.status] ?? order.status}</p>
                      <p className="text-sm text-amber-700">This order requires additional processing. Contact us for details.</p>
                    </div>
                  </div>
                ) : null}
              </div>
            </section>

            {/* Order Items */}
            <section className="vv-card p-6">
              <h2 className="flex items-center gap-2 text-xl font-extrabold">
                <Package className="h-5 w-5 text-retail" />
                Order items
              </h2>
              <div className="mt-5 grid gap-3">
                {order.items.map((item) => {
                  const snapshot = item.productSnapshot as { name?: string; brand?: string; sku?: string; slug?: string };
                  const lensSnap = item.lensSnapshot as { name?: string; code?: string } | null;
                  return (
                    <div key={item.id} className="grid gap-2 rounded-vv border border-slate-200 p-4 sm:grid-cols-[1fr_auto]">
                      <div>
                        <strong className="text-lg">{snapshot.brand} {snapshot.name}</strong>
                        <p className="mt-1 text-sm text-slate-500">SKU {snapshot.sku} · Qty {item.quantity}</p>
                        {lensSnap ? <p className="mt-1 text-sm text-slate-600">Lens: {lensSnap.name}</p> : null}
                      </div>
                      <div className="text-right">
                        <strong className="text-retail">{formatMoney(item.unitPricePaise * item.quantity)}</strong>
                        {item.lensPricePaise > 0 ? (
                          <p className="text-xs text-slate-500">+{formatMoney(item.lensPricePaise * item.quantity)} lens</p>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Try at Home Info */}
            {order.tryAtHomeRequest ? (
              <section className="vv-card border-l-4 border-l-retail p-6">
                <h2 className="text-xl font-extrabold">Try-at-home request</h2>
                <div className="mt-3 grid gap-2 text-sm">
                  <Row label="Frames" value={`${order.tryAtHomeRequest.frameCount} frame(s)`} />
                  <Row label="Preferred date" value={new Date(order.tryAtHomeRequest.preferredDate).toLocaleDateString("en-IN")} />
                  <Row label="Time slot" value={order.tryAtHomeRequest.preferredSlot} />
                  <Row label="Service fee" value={formatMoney(order.tryAtHomeRequest.serviceFeePaise)} />
                </div>
              </section>
            ) : null}
          </div>

          {/* Sidebar */}
          <div className="grid gap-6 self-start">
            {/* Order Summary */}
            <aside className="vv-card p-6">
              <ClipboardList className="h-6 w-6 text-retail" />
              <h2 className="mt-3 text-xl font-extrabold">Summary</h2>
              <dl className="mt-5 grid gap-3 text-sm">
                <Row label="Customer" value={order.customerName} />
                <Row label="Phone" value={order.phone} />
                {order.email ? <Row label="Email" value={order.email} /> : null}
                <Row label="Payment" value={order.paymentMethod.replace(/_/g, " ")} />
                <Row label="Delivery" value={order.deliveryMethod.replace(/_/g, " ")} />
                <div className="border-t border-slate-100 pt-3" />
                <Row label="Subtotal" value={formatMoney(order.subtotalPaise)} />
                <Row label="Lens add-ons" value={formatMoney(order.lensTotalPaise)} />
                <Row label="Shipping" value={formatMoney(order.shippingPaise)} />
                {order.discountPaise > 0 ? <Row label="Discount" value={`-${formatMoney(order.discountPaise)}`} /> : null}
                <Row label="Grand total" value={formatMoney(order.grandTotalPaise)} strong />
              </dl>
            </aside>

            {/* Payment Status */}
            {latestPayment ? (
              <aside className="vv-card p-6">
                <h2 className="text-lg font-extrabold">Payment</h2>
                <div className="mt-3 grid gap-2 text-sm">
                  <Row label="Status" value={latestPayment.status} />
                  <Row label="Provider" value={latestPayment.provider} />
                  {latestPayment.providerPaymentId ? <Row label="Payment ID" value={latestPayment.providerPaymentId} /> : null}
                </div>
              </aside>
            ) : null}

            {/* Shipping Address */}
            {order.shippingAddress ? (
              <aside className="vv-card p-6">
                <h2 className="text-lg font-extrabold">Shipping address</h2>
                <div className="mt-3 text-sm text-slate-600">
                  <p className="font-bold text-slate-900">{order.shippingAddress.name}</p>
                  <p>{order.shippingAddress.line1}</p>
                  {order.shippingAddress.line2 ? <p>{order.shippingAddress.line2}</p> : null}
                  <p>{order.shippingAddress.city}{order.shippingAddress.state ? `, ${order.shippingAddress.state}` : ""} - {order.shippingAddress.pincode}</p>
                  <p>{order.shippingAddress.phone}</p>
                </div>
              </aside>
            ) : null}

            {/* Actions */}
            <div className="grid gap-2">
              <a className="vv-button bg-emerald-400 text-ink" href={`https://wa.me/${CLINIC_WHATSAPP_NUMBER}?text=${whatsappText}`} target="_blank" rel="noopener">
                <MessageCircle className="h-4 w-4" />
                Need help? WhatsApp us
              </a>
              <Link className="vv-button-retail" href="/frames">
                <RefreshCw className="h-4 w-4" />
                Order again
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={strong ? "flex justify-between border-t border-slate-200 pt-3 font-extrabold" : "flex justify-between text-slate-600"}>
      <dt>{label}</dt>
      <dd className="font-bold text-slate-900">{value}</dd>
    </div>
  );
}
