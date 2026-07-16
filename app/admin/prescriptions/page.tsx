import Link from "next/link";
import { revalidatePath } from "next/cache";
import { FileCheck2, FileText } from "lucide-react";
import { requireManager } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { updateOrderStatusWithInventory } from "@/lib/order-status";

const statuses = ["WAITING", "NEEDS_REVIEW", "VERIFIED", "INVALID"] as const;

function describeManualPrescription(rx: {
  rightSphere: number | null; rightCylinder: number | null; rightAxis: number | null;
  leftSphere: number | null; leftCylinder: number | null; leftAxis: number | null;
}) {
  const eye = (name: string, sphere: number | null, cylinder: number | null, axis: number | null) =>
    [name, sphere !== null ? `SPH ${sphere}` : null, cylinder !== null ? `CYL ${cylinder}` : null, axis !== null ? `AXIS ${axis}` : null].filter(Boolean).join(" · ");
  return `${eye("OD", rx.rightSphere, rx.rightCylinder, rx.rightAxis)} | ${eye("OS", rx.leftSphere, rx.leftCylinder, rx.leftAxis)}`;
}

export const metadata = { title: "Prescriptions | Admin" };

export default async function AdminPrescriptionsPage() {
  await requireManager();
  const prescriptions = await prisma.prescription.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { order: { select: { publicId: true, customerName: true, phone: true } }, user: { select: { name: true, phone: true } } }
  });

  async function updateStatus(formData: FormData) {
    "use server";
    const manager = await requireManager();
    const id = String(formData.get("id") ?? "");
    const status = String(formData.get("status") ?? "");
    if (!id || !statuses.includes(status as typeof statuses[number])) return;
    const prescription = await prisma.prescription.update({
      where: { id },
      data: { status: status as typeof statuses[number], verified: status === "VERIFIED" },
      select: { id: true, orderId: true }
    });
    if (status === "VERIFIED" && prescription.orderId) {
      const remaining = await prisma.prescription.count({
        where: { orderId: prescription.orderId, status: { not: "VERIFIED" } }
      });
      if (remaining === 0) await updateOrderStatusWithInventory({ orderId: prescription.orderId, status: "LENS_IN_PROCESSING" });
    }
    await prisma.activityLog.create({
      data: {
        adminUserId: manager.user?.id,
        action: "PRESCRIPTION_STATUS_UPDATED",
        entityType: "prescription",
        entityId: prescription.id,
        metadata: { status }
      }
    });
    revalidatePath("/admin/prescriptions");
  }

  return (
    <main className="vv-section">
      <div className="vv-container">
        <p className="vv-kicker text-retail">Clinical workflow</p>
        <h1 className="text-4xl font-extrabold">Prescription review</h1>
        <p className="mt-2 text-slate-600">Review private uploads and manual values before lens processing. File links are short-lived, signed deliveries.</p>
        <div className="mt-8 grid gap-4">
          {prescriptions.length ? prescriptions.map((rx) => (
            <article key={rx.id} className="vv-card grid gap-4 p-5 lg:grid-cols-[1fr_auto]">
              <div>
                <div className="flex flex-wrap items-center gap-2"><FileText className="h-5 w-5 text-retail" /><h2 className="text-lg font-extrabold">{rx.type.replaceAll("_", " ")}</h2><span className={`rounded-full px-2 py-1 text-xs font-bold ${rx.status === "VERIFIED" ? "bg-emerald-50 text-emerald-700" : rx.status === "INVALID" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>{rx.status.replaceAll("_", " ")}</span></div>
                <p className="mt-2 text-sm text-slate-700">{rx.order ? <Link className="font-bold text-retail hover:underline" href={`/admin/orders/${rx.order.publicId}`}>{rx.order.publicId}</Link> : "No linked order"} · {rx.order?.customerName ?? rx.user?.name ?? "Customer"} · {rx.order?.phone ?? rx.user?.phone ?? "No phone"}</p>
                <p className="mt-1 text-xs text-slate-500">Submitted {new Date(rx.createdAt).toLocaleString("en-IN")}{rx.doctorName ? ` · Dr. ${rx.doctorName}` : ""}{rx.clinicName ? ` · ${rx.clinicName}` : ""}</p>
                {rx.type === "MANUAL" ? <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm font-semibold text-slate-700">{describeManualPrescription(rx)}</p> : null}
                {rx.notes ? <p className="mt-2 text-sm text-slate-600">Notes: {rx.notes}</p> : null}
              </div>
              <div className="grid content-start gap-2">
                {rx.filePublicId ? <a className="vv-button-light justify-center" href={`/api/prescriptions/${rx.id}/download`}><FileCheck2 className="h-4 w-4" /> Download file</a> : null}
                <form action={updateStatus} className="flex gap-2"><input type="hidden" name="id" value={rx.id} /><select className="store-input min-w-36 py-2 text-xs" name="status" defaultValue={rx.status}>{statuses.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}</select><button className="vv-button-retail text-xs" type="submit">Save</button></form>
              </div>
            </article>
          )) : <div className="vv-card p-10 text-center text-slate-500">No prescription records yet.</div>}
        </div>
      </div>
    </main>
  );
}
