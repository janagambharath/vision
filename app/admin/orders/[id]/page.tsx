import Link from "next/link";
import { ArrowLeft, MessageCircle, Package, ShieldCheck, Truck, User, CreditCard } from "lucide-react";
import { redirect, notFound } from "next/navigation";
import { requireAdmin, requireOwner, requireManager } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { ORDER_STATUS_LABELS } from "@/lib/constants";
import { refundRazorpayPayment } from "@/lib/integrations/razorpay";
import {
  attemptShiprocketShipment,
  markShipmentForReconciliation,
  reconcileShipmentFromProvider,
  releaseShipmentReconciliationForRetry
} from "@/lib/shipment-fulfillment";
import { getShiprocketOrderReference } from "@/lib/integrations/shiprocket";
import { sendWhatsAppTemplate } from "@/lib/integrations/whatsapp";
import { sendEmail } from "@/lib/integrations/resend";
import { Prisma, type OrderStatus } from "@prisma/client";
import {
  OrderInventoryAllocationError,
  OrderStatusTransitionError,
  updateOrderStatusWithInventory
} from "@/lib/order-status";
import { releaseOrderInventoryReservations } from "@/lib/inventory-reservations";

export const metadata = { title: "Order Details | Admin" };

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  const role = (session.user as { role?: string }).role || "STAFF";

  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { publicId: id },
    include: {
      items: true,
      payments: { orderBy: { createdAt: "desc" } },
      shippingAddress: true,
      tryAtHomeRequest: true,
      prescriptions: true,
      refunds: true,
      shipments: true,
      paymentReconciliations: { include: { refund: true } }
    }
  });

  if (!order) {
    notFound();
  }

  async function updateOrderStatus(formData: FormData) {
    "use server";
    await requireManager();

    const newStatus = String(formData.get("status") ?? order!.status) as OrderStatus;
    const adminNotes = String(formData.get("adminNotes") ?? "").trim();

    try {
      await updateOrderStatusWithInventory({
        orderId: order!.id,
        status: newStatus,
        notes: adminNotes || undefined
      });
    } catch (error) {
      if (error instanceof OrderInventoryAllocationError || error instanceof OrderStatusTransitionError) {
        const reason = error instanceof OrderStatusTransitionError ? "order-transition" : "stock-allocation";
        redirect(`/admin/orders/${order!.publicId}?error=${reason}`);
      }
      throw error;
    }

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

  async function verifyPrescriptionAction(formData: FormData) {
    "use server";
    await requireManager();

    const rxId = String(formData.get("rxId") ?? "");
    if (!rxId) return;

    await prisma.prescription.update({
      where: { id: rxId },
      data: { verified: true }
    });

    // Check if all prescriptions for this order are now verified
    const allRxs = await prisma.prescription.findMany({
      where: { orderId: order!.id }
    });
    const allVerified = allRxs.every((r) => r.verified);

    if (allVerified) {
      try {
        await updateOrderStatusWithInventory({ orderId: order!.id, status: "LENS_IN_PROCESSING" });
      } catch (error) {
        if (error instanceof OrderInventoryAllocationError || error instanceof OrderStatusTransitionError) {
          redirect(`/admin/orders/${order!.publicId}?error=stock-allocation`);
        }
        throw error;
      }
    }

    await prisma.activityLog.create({
      data: {
        action: "PRESCRIPTION_VERIFIED",
        entityType: "prescription",
        entityId: rxId,
        metadata: { orderId: order!.id }
      }
    });

    // Send WhatsApp Alert
    if (order!.phone) {
      await sendWhatsAppTemplate(order!.phone, "prescription_verified", [
        order!.customerName,
        order!.publicId
      ]);
    }

    redirect(`/admin/orders/${order!.publicId}?prescriptionVerified=true`);
  }

  async function issueRefundAction(formData: FormData) {
    "use server";
    await requireOwner();

    const amountRupees = Number(formData.get("amountRupees") ?? 0);
    const reason = String(formData.get("reason") ?? "").trim();
    const amountPaise = Math.round(amountRupees * 100);

    const latestPayment = order!.payments[0];

    if (!latestPayment || !latestPayment.providerPaymentId) {
      redirect(`/admin/orders/${order!.publicId}?error=payment-not-found`);
    }

    if (amountPaise <= 0 || amountPaise > order!.grandTotalPaise) {
      redirect(`/admin/orders/${order!.publicId}?error=invalid-amount`);
    }

    const claimedForManualRefund = await prisma.paymentReconciliation.updateMany({
      where: { paymentId: latestPayment.id, status: "PENDING_REFUND" },
      data: {
        status: "REQUIRES_REVIEW",
        lastError: "An owner is issuing a manual refund."
      }
    });
    const reconciliation = await prisma.paymentReconciliation.findUnique({
      where: { paymentId: latestPayment.id },
      include: { refund: true }
    });
    if (reconciliation?.status === "REFUNDING" || reconciliation?.status === "REFUND_PENDING") {
      redirect(`/admin/orders/${order!.publicId}?error=refund-reconciliation-in-progress`);
    }
    if (reconciliation?.refund && ["initiated", "pending"].includes(reconciliation.refund.status) && claimedForManualRefund.count === 0) {
      redirect(`/admin/orders/${order!.publicId}?error=refund-provider-verification-required`);
    }
    if (reconciliation && amountPaise !== latestPayment.amountPaise) {
      redirect(`/admin/orders/${order!.publicId}?error=reconciliation-requires-full-refund`);
    }

    type RefundAttempt =
      | { kind: "READY"; id: string; fullRefund: boolean }
      | { kind: "PENDING" }
      | { kind: "INVALID_AMOUNT" };

    const refundAttempt = await prisma.$transaction(async (tx): Promise<RefundAttempt> => {
      const pendingRefund = await tx.refund.findFirst({
        where: { paymentId: latestPayment.id, status: { in: ["initiated", "pending"] } },
        select: { id: true }
      });
      if (pendingRefund) return { kind: "PENDING" };

      const completedRefunds = await tx.refund.aggregate({
        where: { paymentId: latestPayment.id, status: "processed" },
        _sum: { amountPaise: true }
      });
      const alreadyRefunded = completedRefunds._sum.amountPaise ?? 0;
      const remainingAmount = latestPayment.amountPaise - alreadyRefunded;
      if (amountPaise > remainingAmount) return { kind: "INVALID_AMOUNT" };

      const refund = reconciliation?.refund
        ? await tx.refund.update({
            where: { id: reconciliation.refund.id },
            data: { amountPaise, reason, providerRefundId: null, status: "initiated" }
          })
        : await tx.refund.create({
            data: {
              orderId: order!.id,
              paymentId: latestPayment.id,
              amountPaise,
              reason,
              reconciliationId: reconciliation?.id,
              status: "initiated"
            }
          });

      return { kind: "READY", id: refund.id, fullRefund: amountPaise === remainingAmount };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    if (refundAttempt.kind === "PENDING") {
      redirect(`/admin/orders/${order!.publicId}?error=refund-reconciliation-in-progress`);
    }
    if (refundAttempt.kind === "INVALID_AMOUNT") {
      redirect(`/admin/orders/${order!.publicId}?error=invalid-amount`);
    }

    let isSuccessful = false;
    let isPending = false;
    try {
      const rzpRefund = await refundRazorpayPayment(
        latestPayment.providerPaymentId,
        amountPaise,
        `vv-refund-${refundAttempt.id}`
      );
      const providerStatus = rzpRefund.status;
      if (providerStatus !== "processed" && providerStatus !== "pending") {
        throw new Error(`Razorpay returned an unresolved refund status: ${String(providerStatus ?? "missing")}.`);
      }

      const localRefundStatus = await prisma.$transaction(async (tx) => {
        const localRefund = await tx.refund.findUnique({ where: { id: refundAttempt.id } });
        if (!localRefund) throw new Error("The local refund attempt no longer exists.");
        if (localRefund.status === "processed" && localRefund.providerRefundId === rzpRefund.id) {
          return "processed" as const;
        }
        if (!["initiated", "pending"].includes(localRefund.status)) {
          throw new Error("The local refund attempt is no longer eligible for completion.");
        }
        await tx.refund.update({
          where: { id: refundAttempt.id },
          data: { providerRefundId: rzpRefund.id, status: providerStatus }
        });

        if (providerStatus === "pending") {
          if (reconciliation) {
            await tx.paymentReconciliation.update({
              where: { id: reconciliation.id },
              data: { status: "REFUND_PENDING", lastError: null }
            });
          }
          await tx.activityLog.create({
            data: {
              action: "REFUND_PENDING",
              entityType: "order",
              entityId: order!.id,
              metadata: { amountPaise, reason, refundId: rzpRefund.id }
            }
          });
          return "pending" as const;
        }

        if (refundAttempt.fullRefund) {
          await releaseOrderInventoryReservations(tx, order!.id);
          await tx.order.update({ where: { id: order!.id }, data: { status: "REFUNDED" } });
          await tx.payment.update({ where: { id: latestPayment.id }, data: { status: "REFUNDED" } });
          if (reconciliation) {
            await tx.paymentReconciliation.update({
              where: { id: reconciliation.id },
              data: { status: "REFUNDED", lastError: null }
            });
          }
        }

        await tx.activityLog.create({
          data: {
            action: "REFUND_ISSUED",
            entityType: "order",
            entityId: order!.id,
            metadata: { amountPaise, reason, refundId: rzpRefund.id, fullRefund: refundAttempt.fullRefund }
          }
        });
        return "processed" as const;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

      isPending = localRefundStatus === "pending";

      // Notify only once Razorpay reports the refund as processed. A pending
      // refund is finalized by the signed refund.processed webhook.
      if (!isPending && order!.email) {
        try {
          await sendEmail(
            order!.email,
            `Refund Processed: ${order!.publicId}`,
            `<h3>Your refund of ${formatMoney(amountPaise)} has been processed.</h3><p>Reason: ${reason}</p>`
          );
        } catch (emailErr) {
          console.error("Failed to send refund email confirmation:", emailErr);
        }
      }

      if (!isPending && order!.phone) {
        try {
          await sendWhatsAppTemplate(order!.phone, "refund_processed", [
            order!.customerName,
            order!.publicId,
            (amountPaise / 100).toFixed(2)
          ]);
        } catch (waErr) {
          console.error("Failed to send refund WhatsApp notification:", waErr);
        }
      }

      isSuccessful = true;
    } catch (err) {
      console.error("Refund trigger failed:", err);
    }

    if (isSuccessful) {
      redirect(`/admin/orders/${order!.publicId}?${isPending ? "refundPending" : "refundSuccess"}=true`);
    } else {
      redirect(`/admin/orders/${order!.publicId}?error=refund-failed`);
    }
  }

  async function createShipmentTrigger() {
    "use server";
    await requireManager();
    const result = await attemptShiprocketShipment(order!.id, "MANUAL");
    if (result.kind === "CREATED") {
      redirect(`/admin/orders/${order!.publicId}?shipmentSuccess=true`);
    }
    if (result.kind === "ALREADY_CREATED") {
      redirect(`/admin/orders/${order!.publicId}?error=shipment-already-created`);
    }
    if (result.kind === "IN_PROGRESS") {
      redirect(`/admin/orders/${order!.publicId}?error=shipment-in-progress`);
    }
    if (result.kind === "RECONCILIATION_REQUIRED") {
      redirect(`/admin/orders/${order!.publicId}?error=shipment-reconciliation-required`);
    }
    redirect(`/admin/orders/${order!.publicId}?error=shipment-not-ready`);
  }

  async function retryShipmentTrigger() {
    "use server";
    await requireManager();
    const result = await attemptShiprocketShipment(order!.id, "MANUAL");
    if (result.kind === "CREATED") {
      redirect(`/admin/orders/${order!.publicId}?shipmentRetrySuccess=true`);
    }
    if (result.kind === "RECONCILIATION_REQUIRED") {
      redirect(`/admin/orders/${order!.publicId}?error=shipment-reconciliation-required`);
    }
    if (result.kind === "IN_PROGRESS") {
      redirect(`/admin/orders/${order!.publicId}?error=shipment-in-progress`);
    }
    redirect(`/admin/orders/${order!.publicId}?error=shipment-retry-failed`);
  }

  async function flagShipmentForReconciliationAction() {
    "use server";
    await requireManager();
    await markShipmentForReconciliation(
      order!.id,
      "Manager requested provider reconciliation before any retry."
    );
    redirect(`/admin/orders/${order!.publicId}?shipmentReconciliation=true`);
  }

  async function reconcileShipmentAction(formData: FormData) {
    "use server";
    await requireManager();
    const providerShipmentId = String(formData.get("providerShipmentId") ?? "");
    const result = await reconcileShipmentFromProvider(order!.id, providerShipmentId);
    if (result.ok) {
      redirect(`/admin/orders/${order!.publicId}?shipmentReconciled=true`);
    }
    redirect(`/admin/orders/${order!.publicId}?error=shipment-reconciliation-failed`);
  }

  async function retryAfterReconciliationAction(formData: FormData) {
    "use server";
    await requireManager();
    if (String(formData.get("providerChecked")) !== "yes") {
      redirect(`/admin/orders/${order!.publicId}?error=provider-check-required`);
    }
    const released = await releaseShipmentReconciliationForRetry(order!.id);
    if (!released) {
      redirect(`/admin/orders/${order!.publicId}?error=shipment-state-changed`);
    }
    const result = await attemptShiprocketShipment(order!.id, "MANUAL");
    if (result.kind === "CREATED") {
      redirect(`/admin/orders/${order!.publicId}?shipmentRetrySuccess=true`);
    }
    if (result.kind === "RECONCILIATION_REQUIRED") {
      redirect(`/admin/orders/${order!.publicId}?error=shipment-reconciliation-required`);
    }
    redirect(`/admin/orders/${order!.publicId}?error=shipment-retry-failed`);
  }

  const latestPayment = order.payments[0];
  const activePaymentReconciliation = order.paymentReconciliations.find((entry) => entry.status !== "REFUNDED");
  const shipment = order.shipments[0] ?? null;
  const canManageFulfillment = ["OWNER", "MANAGER"].includes(role);
  const shipmentCanBeCreated = ["CONFIRMED", "PACKED"].includes(order.status) && !activePaymentReconciliation;
  const shiprocketOrderReference = getShiprocketOrderReference(order.publicId);

  return (
    <main className="vv-section bg-paper">
      <div className="vv-container">
        <Link href="/admin/orders" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" />
          Back to orders
        </Link>

        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="vv-kicker text-retail">Admin · Role: {role}</p>
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
            {/* Operations update (Guarded for Manager/Owner only) */}
            {["OWNER", "MANAGER"].includes(role) ? (
              <section className="vv-card p-6 bg-slate-50 border border-slate-200">
                <h2 className="text-xl font-extrabold mb-4">Operations update</h2>
                <form action={updateOrderStatus} className="grid gap-4">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="grid gap-1 text-sm font-extrabold text-slate-600">
                      Order status
                      <select className="store-input" name="status" defaultValue={order.status}>
                        {Object.entries(ORDER_STATUS_LABELS).filter(([val]) => val !== "REFUNDED").map(([val, label]) => (
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
            ) : null}

            {activePaymentReconciliation ? (
              <section className="vv-card border border-red-300 bg-red-50 p-6">
                <h2 className="text-xl font-extrabold text-red-950">Captured payment reconciliation</h2>
                <p className="mt-2 text-sm text-red-900">
                  This order cannot be fulfilled. Status: <strong>{activePaymentReconciliation.status.replaceAll("_", " ")}</strong>.
                </p>
                <p className="mt-1 text-sm text-red-800">{activePaymentReconciliation.reason}</p>
                {activePaymentReconciliation.lastError ? (
                  <p className="mt-2 text-xs font-bold text-red-800">Provider note: {activePaymentReconciliation.lastError}</p>
                ) : null}
                <p className="mt-3 text-xs text-red-800">
                  Do not create a shipment. An owner must verify any provider outcome before issuing another refund.
                </p>
              </section>
            ) : null}

            {/* Shiprocket Section */}
            <section className="vv-card p-6 border-l-4 border-l-retail">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="font-extrabold text-lg">Shiprocket Fulfillment</h3>
                  <p className="text-sm text-slate-500">
                    A shipment is created once per order. Unknown provider outcomes must be reconciled before they are retried.
                  </p>
                </div>
                {shipment ? (
                  <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${
                    shipment.status === "CREATED"
                      ? "bg-emerald-50 text-emerald-700"
                      : shipment.status === "FAILED" || shipment.status === "RECONCILIATION_REQUIRED"
                      ? "bg-red-50 text-red-700"
                      : "bg-amber-50 text-amber-700"
                  }`}>
                    {shipment.status.replaceAll("_", " ")}
                  </span>
                ) : null}
              </div>

              {shipment ? (
                <div className="mt-4 grid gap-1 rounded-vv bg-slate-50 p-4 text-sm text-slate-600">
                  <p><strong className="text-slate-800">Provider shipment ID:</strong> {shipment.providerShipmentId ?? "Not yet confirmed"}</p>
                  <p><strong className="text-slate-800">Shiprocket order reference:</strong> {shiprocketOrderReference}</p>
                  <p><strong className="text-slate-800">Last update:</strong> {new Date(shipment.updatedAt).toLocaleString("en-IN")}</p>
                  {shipment.error ? <p className="text-red-700"><strong>Action required:</strong> {shipment.error}</p> : null}
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-600">No provider shipment has been requested yet.</p>
              )}

              {canManageFulfillment ? (
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  {!shipment && shipmentCanBeCreated ? (
                    <form action={createShipmentTrigger}>
                      <button className="vv-button-retail" type="submit">Create Shipment</button>
                    </form>
                  ) : null}

                  {shipment?.status === "FAILED" ? (
                    <form action={retryShipmentTrigger}>
                      <button className="vv-button-retail" type="submit">Retry Shiprocket Shipment</button>
                    </form>
                  ) : null}

                  {shipment?.status === "CREATING" ? (
                    <form action={flagShipmentForReconciliationAction}>
                      <button className="vv-button-light" type="submit">Flag for Provider Reconciliation</button>
                    </form>
                  ) : null}

                  {shipment?.status === "RECONCILIATION_REQUIRED" ? (
                    <>
                      <form action={reconcileShipmentAction} className="flex flex-wrap items-end gap-2">
                        <label className="grid gap-1 text-xs font-bold text-slate-600">
                          Verified Shiprocket shipment ID
                          <input className="store-input min-w-52" name="providerShipmentId" required maxLength={80} />
                        </label>
                        <button className="vv-button-retail" type="submit">Record Verified Shipment</button>
                      </form>
                      <form action={retryAfterReconciliationAction} className="flex items-center gap-2 text-xs text-slate-600">
                        <input id="providerChecked" name="providerChecked" type="checkbox" value="yes" required />
                        <label htmlFor="providerChecked">I checked Shiprocket and confirmed no shipment exists.</label>
                        <button className="vv-button-light" type="submit">Retry after check</button>
                      </form>
                    </>
                  ) : null}
                </div>
              ) : (
                <p className="mt-4 text-xs font-bold text-slate-500">Manager or owner permission is required to create, retry, or reconcile shipments.</p>
              )}
            </section>

            {/* Products list */}
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

            {/* Prescription Viewer with verification trigger */}
            {order.prescriptions.length > 0 ? (
              <section className="vv-card p-6">
                <h2 className="text-xl font-extrabold mb-4">Patient prescriptions</h2>
                <div className="grid gap-4">
                  {order.prescriptions.map((presc) => (
                    <div key={presc.id} className="flex flex-wrap justify-between items-center border border-slate-100 p-4 rounded-vv gap-4">
                      <div>
                        <p className="font-bold">{presc.fileName ?? "Prescription Upload"}</p>
                        <p className="text-xs text-slate-500">Uploaded: {new Date(presc.createdAt).toLocaleDateString()}</p>
                        <div className="mt-2 flex items-center gap-1.5">
                          <span className={`inline-block h-2 w-2 rounded-full ${presc.verified ? "bg-emerald-500" : "bg-amber-500"}`} />
                          <span className="text-xs font-bold text-slate-600">{presc.verified ? "Verified" : "Pending Verification"}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <a href={presc.fileUrl} target="_blank" rel="noopener noreferrer" className="vv-button-light text-sm py-2">
                          View prescription file
                        </a>
                        {!presc.verified && ["OWNER", "MANAGER"].includes(role) ? (
                          <form action={verifyPrescriptionAction}>
                            <input type="hidden" name="rxId" value={presc.id} />
                            <button className="vv-button-retail text-sm py-2" type="submit">
                              Mark verified
                            </button>
                          </form>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {/* Refund Panel (OWNER Only) */}
            {role === "OWNER" && order.status !== "REFUNDED" && latestPayment?.status === "PAID" ? (
              <section className="vv-card p-6 bg-red-50/50 border border-red-200">
                <h2 className="text-xl font-extrabold mb-2 text-red-950 flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-red-700" />
                  Refund management (Owner Only)
                </h2>
                <form action={issueRefundAction} className="grid gap-4 mt-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="grid gap-1 text-sm font-extrabold text-slate-700">
                      Refund Amount (₹)
                      <input
                        className="store-input"
                        type="number"
                        name="amountRupees"
                        max={order.grandTotalPaise / 100}
                        step="0.01"
                        placeholder={(order.grandTotalPaise / 100).toFixed(2)}
                        required
                      />
                    </label>
                    <label className="grid gap-1 text-sm font-extrabold text-slate-700">
                      Reason for refund
                      <input className="store-input" type="text" name="reason" required placeholder="e.g. Out of stock / Customer requested" />
                    </label>
                  </div>
                  <button className="vv-button bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded justify-self-end" type="submit">
                    Trigger Razorpay Refund
                  </button>
                </form>
              </section>
            ) : null}
          </div>

          {/* Sidebar */}
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

            {/* Payment Summary with 12% GST */}
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
                <div className="flex justify-between text-slate-600">
                  <dt>GST (12%)</dt>
                  <dd className="font-bold">{formatMoney(order.taxPaise)}</dd>
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
