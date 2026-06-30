import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, Circle, Clock, ClipboardList, MessageCircle, Package, RefreshCw, Search, Truck, ShieldAlert } from "lucide-react";
import { ORDER_STATUS_LABELS, CLINIC_WHATSAPP_NUMBER } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { refundRazorpayPayment } from "@/lib/integrations/razorpay";
import { sendWhatsAppTemplate } from "@/lib/integrations/whatsapp";

export const metadata = {
  title: "Order Tracking | Vision Vistara",
  description: "Track your Vision Vistara frame orders from pending to delivered."
};

const statusFlow = ["PENDING", "CONFIRMED", "PACKED", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"];

function getStatusIndex(status: string) {
  const idx = statusFlow.indexOf(status);
  return idx >= 0 ? idx : -1;
}

export default async function OrderTrackingPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ phone?: string; cancelled?: string; error?: string }>;
}) {
  const { id } = await params;
  const search = (await searchParams) ?? {};

  if (id === "demo" || id === "lookup") {
    return (
      <main className="vv-section bg-paper">
        <div className="vv-container max-w-2xl">
          <p className="vv-kicker text-retail">Order tracking</p>
          <h1 className="text-4xl font-extrabold font-sans text-slate-900">Track your order</h1>
          <p className="mt-3 text-slate-600">Enter your order ID and verification phone number to view the delivery timeline.</p>
          <form className="vv-card mt-8 grid gap-4 p-6 bg-white border border-slate-200" action="/frames/orders/lookup" method="get">
            <label className="grid gap-2 text-sm font-extrabold text-slate-600">
              Order ID
              <input className="store-input" type="text" name="id" placeholder="VV-..." required />
            </label>
            <label className="grid gap-2 text-sm font-extrabold text-slate-600">
              Phone number / Last 4 Digits
              <input className="store-input" type="tel" name="phone" placeholder="e.g. 8316" required />
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
          <p className="mt-3 text-slate-600">We couldn't find an order with ID "{id}". Please check the order ID or contact us on WhatsApp.</p>
          <div className="mt-6 flex justify-center gap-3">
            <Link className="vv-button-retail" href="/frames/orders/demo">Try again</Link>
            <a className="vv-button bg-emerald-400 text-ink" href={`https://wa.me/${CLINIC_WHATSAPP_NUMBER}?text=Hello%20Vision%20Vistara%2C%20I%20need%20help%20tracking%20order%20${id}`} target="_blank" rel="noopener">
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </a>
          </div>
        </div>
      </main>
    );
  }

  // Security Hardening Verification Check (last 4 digits of phone)
  const phoneParam = String(search.phone ?? "").trim();
  const last4 = phoneParam.slice(-4);
  const orderLast4 = order.phone.slice(-4);
  const isVerified = last4 === orderLast4;

  if (!isVerified) {
    return (
      <main className="vv-section bg-paper flex min-h-[60vh] items-center justify-center">
        <div className="vv-container max-w-md text-center">
          <ClipboardList className="mx-auto h-16 w-16 text-slate-300" />
          <h1 className="mt-6 text-3xl font-extrabold text-slate-800">Order Verification</h1>
          <p className="mt-3 text-slate-600 text-sm">For privacy, please enter the phone number associated with order <strong>{order.publicId}</strong>.</p>
          <form className="vv-card mt-6 grid gap-4 p-6 bg-white border border-slate-200" action={`/frames/orders/${order.publicId}`} method="get">
            <label className="grid gap-2 text-sm font-extrabold text-slate-600 text-left">
              Phone number or Last 4 Digits
              <input className="store-input" type="tel" name="phone" placeholder="Enter last 4 digits (e.g. 8316)" required />
            </label>
            <button className="vv-button-retail" type="submit">
              Verify & View Order
            </button>
          </form>
        </div>
      </main>
    );
  }

  const currentStatusIndex = getStatusIndex(order.status);
  const latestPayment = order.payments[0];
  const whatsappText = encodeURIComponent(`Hello Vision Vistara, I have a question about order ${order.publicId}.`);

  const createdTime = new Date(order.createdAt).getTime();
  const isCancellable = order.status === "PENDING" && (Date.now() - createdTime) < 30 * 60 * 1000;

  async function cancelOrderAction() {
    "use server";
    const orderRecord = await prisma.order.findUnique({
      where: { id: order!.id },
      include: { payments: { orderBy: { createdAt: "desc" } } }
    });

    if (!orderRecord) return;
    const diffMin = (Date.now() - new Date(orderRecord.createdAt).getTime()) / (1000 * 60);

    if (orderRecord.status !== "PENDING" || diffMin > 30) {
      redirect(`/frames/orders/${orderRecord.publicId}?phone=${orderLast4}&error=not-eligible`);
    }

    // Mark as CANCELLED
    await prisma.order.update({
      where: { id: orderRecord.id },
      data: { status: "CANCELLED" }
    });

    // Auto-refund payment if paid
    const pmt = orderRecord.payments[0];
    if (pmt && pmt.status === "PAID" && pmt.providerPaymentId) {
      try {
        await refundRazorpayPayment(pmt.providerPaymentId, orderRecord.grandTotalPaise);
        await prisma.payment.update({
          where: { id: pmt.id },
          data: { status: "REFUNDED" }
        });
      } catch (err) {
        console.error("Auto-refund failed during cancellation:", err);
      }
    }

    await prisma.activityLog.create({
      data: {
        action: "CUSTOMER_CANCELLED_ORDER",
        entityType: "order",
        entityId: orderRecord.id
      }
    });

    // WhatsApp Alert
    if (orderRecord.phone) {
      await sendWhatsAppTemplate(orderRecord.phone, "order_cancelled", [
        orderRecord.customerName,
        orderRecord.publicId
      ]);
    }

    redirect(`/frames/orders/${orderRecord.publicId}?phone=${orderLast4}&cancelled=true`);
  }

  return (
    <main className="vv-section bg-paper">
      <div className="vv-container">
        <Link href="/frames" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" />
          Back to store
        </Link>

        {search.cancelled && (
          <div className="mb-6 rounded-vv border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 font-bold">
            ✓ Order cancelled successfully. Refund (if paid) has been initiated.
          </div>
        )}

        {search.error === "not-eligible" && (
          <div className="mb-6 rounded-vv border border-red-200 bg-red-50 p-4 text-sm text-red-800 font-bold flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-red-600" />
            Order is no longer eligible for instant self-cancellation.
          </div>
        )}

        <div className="mb-8">
          <p className="vv-kicker text-retail">Order tracking</p>
          <h1 className="text-4xl font-extrabold text-slate-900 font-sans">Order {order.publicId}</h1>
          <p className="mt-2 text-slate-600">
            Placed on {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          {/* Main Content */}
          <div className="grid gap-6">
            {/* Status Timeline */}
            <section className="vv-card p-6 bg-white border border-slate-100">
              <h2 className="flex items-center gap-2 text-xl font-extrabold text-slate-950">
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
            <section className="vv-card p-6 bg-white border border-slate-100">
              <h2 className="flex items-center gap-2 text-xl font-extrabold text-slate-950">
                <Package className="h-5 w-5 text-retail" />
                Order items
              </h2>
              <div className="mt-5 grid gap-3">
                {order.items.map((item) => {
                  const snapshot = item.productSnapshot as { name?: string; brand?: string; sku?: string; slug?: string };
                  const lensSnap = item.lensSnapshot as { name?: string; code?: string } | null;
                  return (
                    <div key={item.id} className="grid gap-2 rounded-vv border border-slate-200 p-4 sm:grid-cols-[1fr_auto] bg-white">
                      <div>
                        <strong className="text-lg text-slate-900">{snapshot.brand} {snapshot.name}</strong>
                        <p className="mt-1 text-sm text-slate-500">SKU {snapshot.sku} · Qty {item.quantity}</p>
                        {lensSnap ? <p className="mt-1 text-sm text-slate-600 font-bold text-retail">Lens: {lensSnap.name}</p> : null}
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
              <section className="vv-card border-l-4 border-l-retail p-6 bg-white">
                <h2 className="text-xl font-extrabold text-slate-900">Try-at-home request</h2>
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
            {/* Order Summary with 12% GST */}
            <aside className="vv-card p-6 bg-white border border-slate-100">
              <ClipboardList className="h-6 w-6 text-retail" />
              <h2 className="mt-3 text-xl font-extrabold text-slate-950">Summary</h2>
              <dl className="mt-5 grid gap-3 text-sm">
                <Row label="Customer" value={order.customerName} />
                <Row label="Phone" value={order.phone} />
                {order.email ? <Row label="Email" value={order.email} /> : null}
                <Row label="Payment" value={order.paymentMethod.replace(/_/g, " ")} />
                <Row label="Delivery" value={order.deliveryMethod.replace(/_/g, " ")} />
                <div className="border-t border-slate-100 pt-3" />
                <Row label="Subtotal" value={formatMoney(order.subtotalPaise)} />
                <Row label="Lens add-ons" value={formatMoney(order.lensTotalPaise)} />
                <Row label="Delivery" value={formatMoney(order.shippingPaise)} />
                <Row label="GST (12%)" value={formatMoney(order.taxPaise)} />
                {order.discountPaise > 0 ? <Row label="Discount" value={`-${formatMoney(order.discountPaise)}`} /> : null}
                <Row label="Grand total" value={formatMoney(order.grandTotalPaise)} strong />
              </dl>
            </aside>

            {/* Payment Status */}
            {latestPayment ? (
              <aside className="vv-card p-6 bg-white border border-slate-100">
                <h2 className="text-lg font-extrabold text-slate-900">Payment status</h2>
                <div className="mt-3 grid gap-2 text-sm">
                  <Row label="Status" value={latestPayment.status} />
                  <Row label="Provider" value={latestPayment.provider} />
                  {latestPayment.providerPaymentId ? <Row label="Payment ID" value={latestPayment.providerPaymentId} /> : null}
                </div>
              </aside>
            ) : null}

            {/* Shipping Address */}
            {order.shippingAddress ? (
              <aside className="vv-card p-6 bg-white border border-slate-100">
                <h2 className="text-lg font-extrabold text-slate-900">Shipping address</h2>
                <div className="mt-3 text-sm text-slate-600">
                  <p className="font-bold text-slate-900">{order.shippingAddress.name}</p>
                  <p>{order.shippingAddress.line1}</p>
                  {order.shippingAddress.line2 ? <p>{order.shippingAddress.line2}</p> : null}
                  <p>{order.shippingAddress.city}{order.shippingAddress.state ? `, ${order.shippingAddress.state}` : ""} - {order.shippingAddress.pincode}</p>
                  <p className="mt-2 font-bold text-xs text-slate-800">Phone: {order.shippingAddress.phone}</p>
                </div>
              </aside>
            ) : null}

            {/* Self cancellation / WhatsApp helper */}
            <div className="grid gap-2">
              {isCancellable ? (
                <form action={cancelOrderAction} onSubmit={(e) => {
                  if (!confirm("Are you sure you want to cancel this order?")) {
                    e.preventDefault();
                  }
                }}>
                  <button className="vv-button bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-bold text-xs py-3 w-full justify-center flex items-center gap-1.5" type="submit">
                    Cancel Order (30m window)
                  </button>
                </form>
              ) : (
                <div className="rounded-vv border border-slate-200 bg-slate-50/50 p-4 text-[11px] text-slate-500 font-semibold text-center leading-normal">
                  Order is locked. For cancellations, please tap help to text us.
                </div>
              )}

              <a className="vv-button bg-emerald-400 text-ink text-xs font-bold py-3 justify-center" href={`https://wa.me/${CLINIC_WHATSAPP_NUMBER}?text=${whatsappText}`} target="_blank" rel="noopener">
                <MessageCircle className="h-4 w-4" />
                Need help? WhatsApp us
              </a>
              <Link className="vv-button-retail text-xs font-bold py-3 justify-center" href="/frames">
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
    <div className={strong ? "flex justify-between border-t border-slate-200 pt-3 font-extrabold text-base text-retail" : "flex justify-between text-slate-600"}>
      <dt>{label}</dt>
      <dd className="font-bold text-slate-900">{value}</dd>
    </div>
  );
}
