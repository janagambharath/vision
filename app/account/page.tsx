import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCustomerUser } from "@/lib/customer-auth";
import { signOut } from "@/auth";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { ORDER_STATUS_LABELS } from "@/lib/constants";
import { uploadFormFile } from "@/lib/uploads";
import { deletePrescriptionAsset } from "@/lib/prescriptions";
import { rateLimit } from "@/lib/rate-limit";
import { revalidatePath } from "next/cache";
import { ArrowRight, CalendarCheck, ClipboardList, FileText, Heart, Home, LogOut, Package, ShieldCheck, ShoppingBag } from "lucide-react";
import { SiteHeader } from "@/components/site-header";

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
  const [orders, totalOrders, wishlistCount, homeTrials, totalHomeTrials] = await Promise.all([
    prisma.order.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { _count: { select: { items: true } } }
    }),
    prisma.order.count({ where: { userId: user.id } }),
    prisma.wishlistItem.count({ where: { userId: user.id } }),
    prisma.tryAtHomeRequest.findMany({
      where: { OR: [{ userId: user.id }, ...(user.phone ? [{ phone: user.phone }] : [])] },
      orderBy: { createdAt: "desc" },
      take: 5
    }),
    prisma.tryAtHomeRequest.count({ where: { OR: [{ userId: user.id }, ...(user.phone ? [{ phone: user.phone }] : [])] } })
  ]);

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
    await signOut({ redirectTo: "/account/login" });
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
    <>
      <SiteHeader mode="store" />
      <main className="min-h-[calc(100vh-4rem)] bg-[radial-gradient(circle_at_85%_0%,rgba(186,230,253,0.45),transparent_26rem),linear-gradient(160deg,#f8fbff_0%,#eef6ff_48%,#f8fcff_100%)] py-8 sm:py-12">
      <div className="vv-container max-w-6xl">
        
        {/* Welcome Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-5 overflow-hidden rounded-[2rem] border border-blue-100 bg-gradient-to-br from-white via-blue-50 to-cyan-50 px-5 py-6 shadow-xl shadow-blue-950/5 sm:px-8 sm:py-7">
          <div className="flex min-w-0 items-center gap-4 sm:gap-5">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-500 text-lg font-black text-white shadow-lg shadow-blue-600/25 sm:h-16 sm:w-16 sm:text-xl">
              {(user.name || user.email || "C").trim().slice(0, 1).toUpperCase()}
            </div>
          <div className={!user.phone ? "[&>p:last-child]:hidden" : undefined}>
            <p className="vv-kicker text-retail">Welcome Back</p>
            <h1 className="text-4xl font-extrabold text-slate-900 font-sans">{user.name || "Customer"}</h1>
            {!user.phone ? <p className="text-sm text-slate-500 mt-1">Email: <strong>{user.email}</strong>{" · "}Joined: {new Date(user.createdAt).toLocaleDateString()}</p> : null}
            <p className="text-sm text-slate-500 mt-1">Phone: <strong>{user.phone}</strong> · Joined: {new Date(user.createdAt).toLocaleDateString()}</p>
          </div>
          </div>
          <form action={handleLogout}>
            <button className="vv-button-light text-red-600 hover:bg-red-50 hover:text-red-700 border-red-100 flex items-center gap-1.5 font-bold text-xs py-2 px-4" type="submit">
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </form>
        </div>

        <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Account overview">
          <Link href="/account/orders" className="group rounded-2xl border border-blue-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-950/5 sm:p-5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-blue-700"><Package className="h-4 w-4" /></span>
            <p className="mt-4 text-2xl font-extrabold text-slate-950">{totalOrders + totalHomeTrials}</p>
            <p className="mt-0.5 text-xs font-bold text-slate-500">Orders & home trials</p>
            <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-extrabold text-blue-700">View activity <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" /></span>
          </Link>
          <Link href="/frames/wishlist" className="group rounded-2xl border border-blue-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-950/5 sm:p-5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-rose-50 text-rose-600"><Heart className="h-4 w-4" /></span>
            <p className="mt-4 text-2xl font-extrabold text-slate-950">{wishlistCount}</p>
            <p className="mt-0.5 text-xs font-bold text-slate-500">Saved frames</p>
            <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-extrabold text-blue-700">View wishlist <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" /></span>
          </Link>
          <a href="#prescriptions" className="group rounded-2xl border border-blue-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-950/5 sm:p-5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-teal-50 text-teal-700"><FileText className="h-4 w-4" /></span>
            <p className="mt-4 text-2xl font-extrabold text-slate-950">{prescriptions.length}</p>
            <p className="mt-0.5 text-xs font-bold text-slate-500">Prescriptions</p>
            <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-extrabold text-blue-700">Manage files <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" /></span>
          </a>
          <Link href="/frames" className="group rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-700 to-cyan-600 p-4 text-white shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5 hover:shadow-xl sm:p-5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/15 text-white"><ShoppingBag className="h-4 w-4" /></span>
            <p className="mt-4 text-base font-extrabold">Shop frames</p>
            <p className="mt-0.5 text-xs text-blue-100">Find your next pair</p>
            <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-extrabold text-white">Browse collection <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" /></span>
          </Link>
        </section>

        {/* Panel layouts */}
        <div className="grid gap-6 lg:grid-cols-[1.25fr_.75fr]">
          {/* Order history */}
          <section className="vv-card flex min-h-[340px] flex-col border border-slate-100 bg-white p-5 shadow-xl shadow-blue-950/5 sm:p-7">
            <div className="mb-5 flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <h2 className="flex items-center gap-2 text-xl font-extrabold text-slate-900">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-blue-700"><Package className="h-4 w-4" /></span>
                Recent Orders & Trials
              </h2>
              <Link href="/account/orders" className="inline-flex items-center gap-1 text-xs font-extrabold text-blue-700 hover:text-blue-900">View all <ArrowRight className="h-3.5 w-3.5" /></Link>
            </div>

            {orders.length === 0 && homeTrials.length === 0 ? (
              <div className="grid flex-1 place-items-center content-center gap-3 rounded-2xl bg-slate-50/80 p-6 text-center text-slate-500">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white text-slate-300 shadow-sm"><ClipboardList className="h-7 w-7" /></span>
                <div><p className="text-sm font-extrabold text-slate-800">Your orders and home trials will appear here</p><p className="mt-1 text-xs">Discover clinic-verified optical frames.</p></div>
                <Link href="/frames" className="vv-button-retail mt-1 text-xs">Browse Frames <ArrowRight className="h-3.5 w-3.5" /></Link>
              </div>
            ) : (
              <div className="grid gap-3 flex-grow">
                {orders.map((o) => (
                  <div key={o.id} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 text-xs transition hover:border-blue-200 hover:bg-white">
                    <div>
                      <p className="font-extrabold text-slate-900">Order {o.publicId}</p>
                      <p className="mt-1 text-slate-500">{o._count.items} {o._count.items === 1 ? "item" : "items"} · {new Date(o.createdAt).toLocaleDateString()}</p>
                      <span className="mt-2 inline-block rounded-full bg-teal-50 px-2 py-1 text-[10px] font-extrabold text-retail">
                        {ORDER_STATUS_LABELS[o.status] ?? o.status}
                      </span>
                    </div>
                    <div className="text-right">
                      <strong className="block text-sm font-extrabold text-slate-800">{formatMoney(o.grandTotalPaise)}</strong>
                      <Link href={`/frames/orders/${o.publicId}`} className="mt-2 inline-flex items-center gap-0.5 text-[11px] font-extrabold text-blue-700 hover:text-blue-900">
                        Track
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                ))}
                {homeTrials.map((trial) => (
                  <div key={trial.id} className="flex items-center justify-between gap-4 rounded-2xl border border-blue-100 bg-blue-50/60 p-4 text-xs transition hover:border-blue-200 hover:bg-white">
                    <div>
                      <p className="flex items-center gap-1.5 font-extrabold text-slate-900"><Home className="h-3.5 w-3.5 text-retail" />Home trial request</p>
                      <p className="mt-1 text-slate-500">{trial.frameCount} {trial.frameCount === 1 ? "frame" : "frames"} · {new Date(trial.createdAt).toLocaleDateString()}</p>
                      <span className="mt-2 inline-block rounded-full bg-blue-100 px-2 py-1 text-[10px] font-extrabold text-blue-800">{ORDER_STATUS_LABELS[trial.status] ?? trial.status}</span>
                    </div>
                    <div className="text-right">
                      <strong className="block text-xs font-extrabold text-slate-800">{new Date(trial.preferredDate).toLocaleDateString()}</strong>
                      <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-blue-700"><CalendarCheck className="h-3 w-3" />{trial.preferredSlot}</span>
                    </div>
                  </div>
                ))}
                
                {totalOrders + totalHomeTrials > orders.length + homeTrials.length && (
                  <Link href="/account/orders" className="text-xs text-retail font-bold hover:underline mt-2 text-center block">
                    View all order history
                  </Link>
                )}
              </div>
            )}
          </section>

          {/* Prescriptions lists */}
          <section id="prescriptions" className="vv-card flex min-h-[340px] flex-col border border-slate-100 bg-white p-5 shadow-xl shadow-blue-950/5 sm:p-7">
            <h2 className="mb-5 flex items-center gap-2 border-b border-slate-100 pb-4 text-xl font-extrabold text-slate-900">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-teal-50 text-teal-700"><FileText className="h-4 w-4" /></span>
              Prescriptions
            </h2>

            {prescriptions.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center rounded-2xl bg-slate-50/80 p-6 text-center text-slate-500">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white text-slate-300 shadow-sm"><FileText className="h-7 w-7" /></span>
                <p className="mt-4 text-sm font-extrabold text-slate-800">No prescription files yet</p>
                <p className="mt-1 text-xs">Any prescription linked to your order will appear here.</p>
              </div>
            ) : (
              <div className="grid gap-3 flex-grow">
                {prescriptions.map((rx) => (
                  <div key={rx.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 text-xs">
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
    </>
  );
}
