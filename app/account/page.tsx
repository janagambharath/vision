import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCustomerUser } from "@/lib/customer-auth";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { ORDER_STATUS_LABELS } from "@/lib/constants";
import { uploadFormFile } from "@/lib/uploads";
import { deletePrescriptionAsset } from "@/lib/prescriptions";
import { rateLimit } from "@/lib/rate-limit";
import { revalidatePath } from "next/cache";
import { Package, FileText, LogOut, ArrowRight, ClipboardList, ShieldCheck } from "lucide-react";

export const metadata = { title: "My Account | Vision Vistara" };

export default async function CustomerDashboardPage({
  searchParams
}: {
  searchParams?: Promise<{ privacyRequest?: string }>;
}) {
  const user = await getCustomerUser();
  if (!user) {
    redirect("/account/login");
  }
  const params = (await searchParams) ?? {};

  // Fetch recent orders
  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 5
  });

  // Fetch prescriptions
  const prescriptions = await prisma.prescription.findMany({
    where: {
      OR: [
        { userId: user.id },
        ...(user.phone ? [{ order: { phone: user.phone } }] : [])
      ]
    },
    include: { order: { select: { phone: true, publicId: true } } },
    orderBy: { createdAt: "desc" }
  });

  async function handleLogout() {
    "use server";
    const cookieStore = await cookies();
    cookieStore.delete("vv_customer_session");
    redirect("/account/login");
  }

  async function uploadPrescriptionLater(formData: FormData) {
    "use server";
    const currentUser = await getCustomerUser();
    if (!currentUser) redirect("/account/login");
    const id = String(formData.get("prescriptionId") ?? "");
    const prescription = await prisma.prescription.findFirst({
      where: {
        id,
        OR: [
          { userId: currentUser.id },
          ...(currentUser.phone ? [{ order: { phone: currentUser.phone } }] : [])
        ]
      }
    });
    if (!prescription) redirect("/account?prescriptionError=not-found");

    let uploaded: Awaited<ReturnType<typeof uploadFormFile>> = null;
    try {
      uploaded = await uploadFormFile(formData.get("prescription"), "vision-vistara/prescriptions", {
        maxBytes: 10 * 1024 * 1024,
        authenticated: true
      });
    } catch (error) {
      console.error("Customer prescription upload failed", error);
      redirect("/account?prescriptionError=upload-failed");
    }
    if (!uploaded) redirect("/account?prescriptionError=file-required");

    try {
      await prisma.prescription.update({
        where: { id: prescription.id },
        data: {
          userId: currentUser.id,
          type: "UPLOAD",
          status: "NEEDS_REVIEW",
          verified: false,
          fileUrl: uploaded.secureUrl,
          filePublicId: uploaded.publicId,
          fileResourceType: uploaded.resourceType,
          fileFormat: uploaded.format,
          fileName: uploaded.originalFilename
        }
      });
    } catch (error) {
      await deletePrescriptionAsset({
        filePublicId: uploaded.publicId,
        fileResourceType: uploaded.resourceType
      }).catch((cleanupError) => console.error("Could not remove an unpersisted replacement prescription asset", cleanupError));
      console.error("Customer prescription update failed", error);
      redirect("/account?prescriptionError=upload-failed");
    }

    try {
      await deletePrescriptionAsset(prescription);
    } catch (error) {
      console.error("Could not remove replaced prescription asset", error);
      await prisma.activityLog.create({
        data: {
          action: "PRESCRIPTION_REPLACEMENT_CLEANUP_FAILED",
          entityType: "Prescription",
          entityId: prescription.id,
          metadata: { resourceType: prescription.fileResourceType ?? "image" }
        }
      }).catch(() => undefined);
    }
    try {
      revalidatePath("/account");
    } catch {
      // Revalidation failure must not make a successfully stored prescription
      // look like an upload failure.
    }
  }

  async function requestPrivacyAction(formData: FormData) {
    "use server";
    const currentUser = await getCustomerUser();
    if (!currentUser) redirect("/account/login");

    const requestType = String(formData.get("requestType") ?? "");
    if (!['EXPORT', 'ERASURE'].includes(requestType)) redirect("/account?privacyRequest=invalid");

    const limit = await rateLimit(`privacy-request:${currentUser.id}`, 4, 24 * 60 * 60);
    if (!limit.allowed) redirect("/account?privacyRequest=rate-limited");

    const entityId = `${currentUser.id}:${requestType}`;
    const existing = await prisma.notification.findFirst({
      where: {
        channel: "INTERNAL",
        recipient: "privacy",
        entityType: "PrivacyRequest",
        entityId,
        status: { in: ["PENDING", "IN_PROGRESS"] }
      },
      select: { id: true }
    });
    if (!existing) {
      await prisma.notification.create({
        data: {
          channel: "INTERNAL",
          recipient: "privacy",
          subject: requestType === "EXPORT" ? "Customer data export request" : "Customer data deletion request",
          body: `${currentUser.name || "Customer"} requested a ${requestType === "EXPORT" ? "copy" : "deletion review"} of their account data. Verify identity and legal retention requirements before completing it.`,
          status: "PENDING",
          entityType: "PrivacyRequest",
          entityId,
          metadata: {
            requestType,
            userId: currentUser.id,
            phone: currentUser.phone,
            email: currentUser.email
          }
        }
      });
    }
    redirect(`/account?privacyRequest=${requestType.toLowerCase()}`);
  }

  return (
    <main className="vv-section bg-paper min-h-screen">
      <div className="vv-container max-w-5xl">
        
        {/* Welcome Header */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <p className="vv-kicker text-retail">Welcome Back</p>
            <h1 className="text-4xl font-extrabold text-slate-900 font-sans">{user.name || "Customer"}</h1>
            <p className="text-sm text-slate-500 mt-1">Phone: <strong>{user.phone}</strong> · Joined: {new Date(user.createdAt).toLocaleDateString()}</p>
          </div>
          <form action={handleLogout}>
            <button className="vv-button-light text-red-600 hover:bg-red-50 hover:text-red-700 border-red-100 flex items-center gap-1.5 font-bold text-xs py-2 px-4" type="submit">
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </form>
        </div>

        {/* Panel layouts */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Order history */}
          <section className="vv-card p-6 bg-white border border-slate-100 flex flex-col">
            <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
              <Package className="h-5 w-5 text-retail" />
              Recent Orders
            </h2>

            {orders.length === 0 ? (
              <div className="py-8 text-center text-slate-500 flex-1 grid justify-items-center gap-2">
                <ClipboardList className="h-10 w-10 text-slate-300" />
                <p className="text-xs">No orders placed yet.</p>
                <Link href="/frames" className="vv-button-retail text-xs mt-2 inline-block">Browse Catalog</Link>
              </div>
            ) : (
              <div className="grid gap-3 flex-grow">
                {orders.map((o) => (
                  <div key={o.id} className="p-3 border border-slate-100 rounded-vv flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold text-slate-900">ID: {o.publicId}</p>
                      <p className="text-slate-500 mt-0.5">{new Date(o.createdAt).toLocaleDateString()}</p>
                      <span className="inline-block mt-1 bg-teal-50 text-retail font-bold rounded px-1.5 py-0.5 scale-90 origin-left">
                        {ORDER_STATUS_LABELS[o.status] ?? o.status}
                      </span>
                    </div>
                    <div className="text-right">
                      <strong className="block text-slate-800 font-extrabold">{formatMoney(o.grandTotalPaise)}</strong>
                      <Link href={`/frames/orders/${o.publicId}`} className="text-[10px] text-retail font-bold hover:underline inline-flex items-center gap-0.5 mt-1.5">
                        Track Order
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                ))}
                
                {orders.length >= 5 && (
                  <Link href="/account/orders" className="text-xs text-retail font-bold hover:underline mt-2 text-center block">
                    View all order history
                  </Link>
                )}
              </div>
            )}
          </section>

          {/* Prescriptions lists */}
          <section className="vv-card p-6 bg-white border border-slate-100 flex flex-col">
            <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
              <FileText className="h-5 w-5 text-retail" />
              Prescriptions
            </h2>

            {prescriptions.length === 0 ? (
              <div className="py-8 text-center text-slate-500 flex-1 flex flex-col items-center justify-center">
                <FileText className="h-10 w-10 text-slate-300 mb-2" />
                <p className="text-xs">No prescription records found for this account.</p>
              </div>
            ) : (
              <div className="grid gap-3 flex-grow">
                {prescriptions.map((rx) => (
                  <div key={rx.id} className="p-3 border border-slate-100 rounded-vv flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold text-slate-800">{rx.type === "MANUAL" ? "Manual prescription" : rx.fileName ?? rx.type.replaceAll("_", " ")}</p>
                      <p className="text-slate-500 mt-0.5">{rx.order?.publicId ? `Order ${rx.order.publicId} · ` : ""}{new Date(rx.createdAt).toLocaleDateString()}</p>
                      <span className={`inline-block mt-1 font-bold rounded px-1.5 py-0.5 scale-90 origin-left ${
                        rx.status === "VERIFIED" ? "bg-emerald-50 text-emerald-700" : rx.status === "INVALID" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"
                      }`}>
                        {rx.status.replaceAll("_", " ")}
                      </span>
                    </div>
                    <div className="grid gap-2 justify-items-end">
                      {rx.filePublicId ? <a href={`/api/prescriptions/${rx.id}/download`} className="vv-button-light text-[10px] py-1 px-2.5 font-bold">Download</a> : null}
                      {rx.type !== "MANUAL" || rx.status !== "VERIFIED" ? <form action={uploadPrescriptionLater} className="flex items-center gap-1"><input type="hidden" name="prescriptionId" value={rx.id} /><input className="max-w-32 text-[10px]" type="file" name="prescription" accept="application/pdf,image/png,image/jpeg,image/webp,.pdf,.png,.jpeg,.jpg,.webp" required /><button className="text-[10px] font-bold text-retail hover:underline" type="submit">{rx.filePublicId ? "Replace" : "Upload"}</button></form> : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <section className="vv-card mt-6 border border-slate-100 bg-white p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-retail" /><h2 className="text-xl font-extrabold text-slate-900">Privacy controls</h2></div>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">Request a copy of your account data or ask us to review deletion. We will verify your identity and preserve records that must be retained for legal, payment, or safety reasons.</p>
              {params.privacyRequest === "export" || params.privacyRequest === "erasure" ? <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800">Your request has been received. Our privacy team will contact you using your verified account details.</p> : null}
              {params.privacyRequest === "invalid" ? <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm font-bold text-rose-800">Choose a valid privacy request.</p> : null}
              {params.privacyRequest === "rate-limited" ? <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm font-bold text-amber-800">Too many privacy requests were submitted today. Please contact us if you need urgent help.</p> : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <form action={requestPrivacyAction}><input type="hidden" name="requestType" value="EXPORT" /><button className="vv-button-light text-xs font-bold" type="submit">Request my data</button></form>
              <form action={requestPrivacyAction}><input type="hidden" name="requestType" value="ERASURE" /><button className="vv-button-light border-rose-200 text-xs font-bold text-rose-700 hover:bg-rose-50" type="submit">Request deletion</button></form>
            </div>
          </div>
        </section>

      </div>
    </main>
  );
}
