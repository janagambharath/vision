import Link from "next/link";
import { ArrowLeft, MessageCircle, Package, ShieldCheck, Truck, User } from "lucide-react";
import { redirect, notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { ORDER_STATUS_LABELS } from "@/lib/constants";
import type { OrderStatus } from "@prisma/client";

export const metadata = { title: "Order Details | Admin" };

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { publicId: id },
    include: {
      items: true,
      payments: { orderBy: { createdAt: "desc" } },
      shippingAddress: true,
      tryAtHomeRequest: true,
      prescriptions: true
    }
  });

  if (!order) {
    notFound();
  }

  async function updateOrderStatus(formData: FormData) {
    "use server";
    await requireAdmin();

    const newStatus = String(formData.get("status") ?? order!.status) as OrderStatus;
    const adminNotes = String(formData.get("adminNotes") ?? "").trim();

    await prisma.order.update({
      where: { id: order!.id },
      data: {
        status: newStatus,
        notes: adminNotes || undefined
      }
    });

    // Create Activity Log
    await prisma.activityLog.create({
      data: {
        action: "ORDER_STATUS_UPDATED",
        entityType: "order",
        entityId: order!.id,
        metadata: { from: order!.status, to: newStatus, notes: adminNotes }
      }
    });

    redirect(`/admin/orders/${order!.publicId}`);
  }

  const latestPayment = order.payments[0];

  return (
    <main className="vv-section bg-paper">
      <div className="vv-container">
        <Link href="/admin/orders" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" />
          Back to orders
        </Link>

        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="vv-kicker text-retail">Admin</p>
            <h1 className="text-4xl font-extrabold">Order details</h1>
            <p className="mt-2 text-slate-600">ID: <strong className="text-slate-800">{order.publicId}</strong> · Date: {new Date(order.createdAt).toLocaleString("en-IN")}</p>
          </div>
          <span className={`rounded-full px-4 py-2 text-sm font-extrabold ${
            order.status === "DELIVERED"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : order.status === "CANCELLED" || order.status === "REFUNDED"
              ? "bg-red-50 text-red-700 border border-red-200"
              : "bg-amber-50 text-amber-700 border border-amber-200"
          }`}>
            {ORDER_STATUS_LABELS[order.status] ?? order.status}
          </span>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* Main order info */}
          <div className="grid gap-6">
            {/* Status Update Form */}
            <section className="vv-card p-6 bg-slate-50 border border-slate-200">
              <h2 className="text-xl font-extrabold mb-4">Operations update</h2>
              <form action={updateOrderStatus} className="grid gap-4">
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="grid gap-1 text-sm font-extrabold text-slate-600">
                    Order status
                    <select className="store-input" name="status" defaultValue={order.status}>
                      {Object.entries(ORDER_STATUS_LABELS).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1 text-sm font-extrabold text-slate-600">
                    Staff notes / internal update
                    <input className="store-input" type="text" name="adminNotes" defaultValue={order.notes ?? ""} placeholder="e.g. Lens processed, ready for packing" />
                  </label>
                </div>
                <button className="vv-button-retail justify-self-end inline-flex items-center gap-2" type="submit">
                  Save status
                </button>
              </form>
            </section>

            {/* Items list */}
            <section className="vv-card p-6">
              <h2 className="text-xl font-extrabold mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
                <Package className="h-5 w-5 text-retail" />
                Products ordered
              </h2>
              <div className="grid gap-4">
                {order.items.map((item) => {
                  const snap = item.productSnapshot as { name?: string; brand?: string; sku?: string };
                  const lensSnap = item.lensSnapshot as { name?: string; code?: string } | null;
                  return (
                    <div key={item.id} className="flex flex-wrap justify-between items-center border border-slate-100 rounded-vv p-4">
                      <div>
                        <strong className="text-lg text-slate-800">{snap.brand} {snap.name}</strong>
                        <p className="text-sm text-slate-500">SKU: {snap.sku} · Qty: {item.quantity}</p>
                        {lensSnap ? (
                          <p className="text-sm font-bold text-retail mt-1">Lens: {lensSnap.name}</p>
                        ) : (
                          <p className="text-xs text-slate-400 mt-1">Frame only</p>
                        )}
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

            {/* Prescription Viewer */}
            {order.prescriptions.length > 0 ? (
              <section className="vv-card p-6">
                <h2 className="text-xl font-extrabold mb-4">Patient prescription</h2>
                <div className="grid gap-4">
                  {order.prescriptions.map((presc) => (
                    <div key={presc.id} className="flex justify-between items-center border border-slate-100 p-4 rounded-vv">
                      <div>
                        <p className="font-bold">{presc.fileName ?? "Prescription Upload"}</p>
                        <p className="text-xs text-slate-500">Uploaded: {new Date(presc.createdAt).toLocaleDateString()}</p>
                      </div>
                      <a href={presc.fileUrl} target="_blank" rel="noopener noreferrer" className="vv-button-light text-sm">
                        View file
                      </a>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          {/* Sidebar customer/payment/shipping */}
          <div className="grid gap-6 self-start">
            {/* Customer profile */}
            <aside className="vv-card p-6">
              <h2 className="text-lg font-extrabold mb-3 flex items-center gap-2 border-b border-slate-100 pb-2">
                <User className="h-5 w-5 text-retail" />
                Customer
              </h2>
              <dl className="grid gap-2 text-sm">
                <dt className="text-slate-500">Name</dt>
                <dd className="font-bold">{order.customerName}</dd>
                <dt className="text-slate-500">Phone</dt>
                <dd className="font-bold flex items-center gap-2">
                  {order.phone}
                  <a href={`https://wa.me/${order.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener" className="text-emerald-600 hover:text-emerald-800">
                    <MessageCircle className="h-4 w-4" />
                  </a>
                </dd>
                {order.email ? (
                  <>
                    <dt className="text-slate-500">Email</dt>
                    <dd className="font-bold">{order.email}</dd>
                  </>
                ) : null}
              </dl>
            </aside>

            {/* Payment Summary */}
            <aside className="vv-card p-6">
              <h2 className="text-lg font-extrabold mb-3 flex items-center gap-2 border-b border-slate-100 pb-2">
                <ShieldCheck className="h-5 w-5 text-retail" />
                Payment summary
              </h2>
              <dl className="grid gap-2 text-sm mb-4">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Subtotal</dt>
                  <dd className="font-bold">{formatMoney(order.subtotalPaise)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Lens total</dt>
                  <dd className="font-bold">{formatMoney(order.lensTotalPaise)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Shipping</dt>
                  <dd className="font-bold">{formatMoney(order.shippingPaise)}</dd>
                </div>
                {order.discountPaise > 0 ? (
                  <div className="flex justify-between text-emerald-600 font-bold">
                    <dt>Discount</dt>
                    <dd>-{formatMoney(order.discountPaise)}</dd>
                  </div>
                ) : null}
                <div className="border-t border-slate-100 pt-2 flex justify-between font-extrabold text-base">
                  <dt>Grand total</dt>
                  <dd className="text-retail">{formatMoney(order.grandTotalPaise)}</dd>
                </div>
              </dl>
              <div className="border-t border-slate-100 pt-3 text-xs text-slate-500">
                <p>Method: <strong>{order.paymentMethod}</strong></p>
                <p className="mt-1">Status: <strong className="uppercase text-retail">{latestPayment?.status ?? "PENDING"}</strong></p>
              </div>
            </aside>

            {/* Shipping Address */}
            {order.shippingAddress ? (
              <aside className="vv-card p-6">
                <h2 className="text-lg font-extrabold mb-3 flex items-center gap-2 border-b border-slate-100 pb-2">
                  <Truck className="h-5 w-5 text-retail" />
                  Shipping address
                </h2>
                <div className="text-sm text-slate-600">
                  <p className="font-bold text-slate-800">{order.shippingAddress.name}</p>
                  <p>{order.shippingAddress.line1}</p>
                  {order.shippingAddress.line2 ? <p>{order.shippingAddress.line2}</p> : null}
                  <p>{order.shippingAddress.city}, {order.shippingAddress.state ?? ""} {order.shippingAddress.pincode}</p>
                  <p className="mt-2 text-xs font-bold">Phone: {order.shippingAddress.phone}</p>
                </div>
              </aside>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}
