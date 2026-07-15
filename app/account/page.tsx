import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCustomerUser } from "@/lib/customer-auth";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { ORDER_STATUS_LABELS } from "@/lib/constants";
import { uploadFormFile } from "@/lib/uploads";
import { deletePrescriptionAsset } from "@/lib/prescriptions";
import { revalidatePath } from "next/cache";
import { Package, FileText, LogOut, ArrowRight, ClipboardList } from "lucide-react";

export const metadata = { title: "My Account | Vision Vistara" };

export default async function CustomerDashboardPage() {
  const user = await getCustomerUser();
  if (!user) {
    redirect("/account/login");
  }

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

    try {
      const uploaded = await uploadFormFile(formData.get("prescription"), "vision-vistara/prescriptions", {
        maxBytes: 10 * 1024 * 1024,
        authenticated: true
      });
      if (!uploaded) redirect("/account?prescriptionError=file-required");
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
      await deletePrescriptionAsset(prescription).catch((error) => console.error("Could not remove replaced prescription asset", error));
      revalidatePath("/account");
    } catch (error) {
      console.error("Customer prescription upload failed", error);
      redirect("/account?prescriptionError=upload-failed");
    }
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

      </div>
    </main>
  );
}
