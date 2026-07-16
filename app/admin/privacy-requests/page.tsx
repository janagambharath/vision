import { revalidatePath } from "next/cache";
import { ShieldCheck } from "lucide-react";
import { requireManager } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";

const requestStatuses = ["PENDING", "IN_PROGRESS", "COMPLETED", "REJECTED"] as const;

export const metadata = { title: "Privacy Requests | Admin" };

export default async function PrivacyRequestsPage() {
  await requireManager();
  const requests = await prisma.notification.findMany({
    where: { channel: "INTERNAL", recipient: "privacy", entityType: "PrivacyRequest" },
    orderBy: { createdAt: "desc" },
    take: 100
  });

  async function updateRequest(formData: FormData) {
    "use server";
    const actingManager = await requireManager();
    const id = String(formData.get("id") ?? "");
    const status = String(formData.get("status") ?? "");
    if (!id || !requestStatuses.includes(status as typeof requestStatuses[number])) return;

    const request = await prisma.notification.update({
      where: { id },
      data: { status },
      select: { id: true, entityId: true }
    });
    await prisma.activityLog.create({
      data: {
        adminUserId: actingManager.user?.id,
        action: "PRIVACY_REQUEST_STATUS_UPDATED",
        entityType: "PrivacyRequest",
        entityId: request.entityId ?? request.id,
        metadata: { requestId: request.id, status }
      }
    });
    revalidatePath("/admin/privacy-requests");
  }

  return (
    <main className="vv-section">
      <div className="vv-container">
        <p className="vv-kicker text-retail">Privacy operations</p>
        <h1 className="flex items-center gap-3 text-4xl font-extrabold"><ShieldCheck className="h-9 w-9 text-retail" />Data requests</h1>
        <p className="mt-2 max-w-3xl text-slate-600">Identity must be verified before export or deletion. Do not delete transaction, prescription, or payment data until an owner has checked applicable retention obligations.</p>
        <div className="mt-8 grid gap-3">
          {requests.length ? requests.map((request) => {
            const metadata = request.metadata && typeof request.metadata === "object" && !Array.isArray(request.metadata)
              ? request.metadata as { requestType?: string; phone?: string | null; email?: string | null; userId?: string }
              : null;
            return (
              <article key={request.id} className="vv-card grid gap-4 p-5 lg:grid-cols-[1fr_auto]">
                <div>
                  <div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-extrabold">{request.subject ?? "Privacy request"}</h2><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">{request.status.replaceAll("_", " ")}</span></div>
                  <p className="mt-2 text-sm text-slate-700">{request.body}</p>
                  <p className="mt-2 text-xs text-slate-500">Requested {new Date(request.createdAt).toLocaleString("en-IN")} · {metadata?.phone ?? "No phone"}{metadata?.email ? ` · ${metadata.email}` : ""}</p>
                </div>
                <form action={updateRequest} className="flex items-center gap-2"><input type="hidden" name="id" value={request.id} /><select className="store-input min-w-36 py-2 text-xs" name="status" defaultValue={request.status}>{requestStatuses.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}</select><button className="vv-button-retail text-xs" type="submit">Save</button></form>
              </article>
            );
          }) : <div className="vv-card p-10 text-center text-slate-500">No privacy requests yet.</div>}
        </div>
      </div>
    </main>
  );
}
