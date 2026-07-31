import Link from "next/link";
import { redirect } from "next/navigation";
import { getCustomerUser } from "@/lib/customer-auth";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { ORDER_STATUS_LABELS } from "@/lib/constants";
import { ArrowLeft, CalendarCheck, Home, Package, ArrowRight } from "lucide-react";

export const metadata = { title: "Order History | Vision Vistara" };

export default async function CustomerOrdersPage() {
  const user = await getCustomerUser();
  if (!user) {
    redirect("/account/login");
  }

  // Fetch all orders
  const [orders, homeTrials] = await Promise.all([
    prisma.order.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" }
    }),
    prisma.tryAtHomeRequest.findMany({
      where: { OR: [{ userId: user.id }, ...(user.phone ? [{ phone: user.phone }] : [])] },
      orderBy: { createdAt: "desc" }
    })
  ]);

  return (
    <main className="vv-section bg-paper min-h-screen">
      <div className="vv-container max-w-4xl">
        <Link href="/account" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        <div className="mb-8">
          <p className="vv-kicker text-retail">My Account</p>
          <h1 className="text-4xl font-extrabold text-slate-900 font-sans">Orders & Home Trials</h1>
          <p className="mt-2 text-slate-600">Track purchases and every home-trial request placed from your account.</p>
        </div>

        {orders.length === 0 && homeTrials.length === 0 ? (
          <div className="vv-card p-16 text-center bg-white border border-slate-100 rounded-vv">
            <h2 className="text-xl font-extrabold text-slate-800">No orders or home trials found</h2>
            <p className="text-slate-500 mt-2">Explore our frames and make your first selection!</p>
            <Link href="/frames" className="vv-button-retail mt-4 inline-block">Browse Store</Link>
          </div>
        ) : (
          <div className="grid gap-8">
            {homeTrials.length > 0 ? (
              <section>
                <div className="mb-3 flex items-center gap-2"><Home className="h-5 w-5 text-retail" /><h2 className="text-xl font-extrabold text-slate-900">Home trial requests</h2></div>
                <div className="grid gap-4">
                  {homeTrials.map((trial) => (
                    <article key={trial.id} className="vv-card flex flex-col justify-between gap-4 border border-blue-100 bg-gradient-to-br from-white to-blue-50/70 p-6 transition hover:shadow-sm md:flex-row md:items-center">
                      <div className="flex items-start gap-4">
                        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-vv bg-teal-50 text-retail"><Home className="h-6 w-6" /></div>
                        <div>
                          <h3 className="font-extrabold text-slate-900 text-lg">Home trial request</h3>
                          <p className="mt-0.5 text-xs text-slate-500">Submitted: {new Date(trial.createdAt).toLocaleString("en-IN")}</p>
                          <p className="mt-2 text-sm font-semibold text-slate-700">{trial.frameCount} {trial.frameCount === 1 ? "frame" : "frames"} selected</p>
                          <span className="mt-2 inline-block rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-800">{ORDER_STATUS_LABELS[trial.status] ?? trial.status}</span>
                        </div>
                      </div>
                      <div className="flex flex-row items-center justify-between gap-2 border-t border-blue-100 pt-4 text-right md:flex-col md:items-end md:justify-center md:border-t-0 md:pt-0">
                        <div><span className="text-xs text-slate-500 block">Preferred visit</span><strong className="mt-0.5 block text-sm font-extrabold text-slate-800">{new Date(trial.preferredDate).toLocaleDateString("en-IN")}</strong><span className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-retail"><CalendarCheck className="h-3.5 w-3.5" />{trial.preferredSlot}</span></div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

            {orders.length > 0 ? (
              <section>
                <div className="mb-3 flex items-center gap-2"><Package className="h-5 w-5 text-retail" /><h2 className="text-xl font-extrabold text-slate-900">Purchases</h2></div>
                <div className="grid gap-4">
                  {orders.map((o) => (
              <article key={o.id} className="vv-card p-6 bg-white border border-slate-100 hover:shadow-sm transition flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-vv bg-teal-50 grid place-items-center text-retail shrink-0">
                    <Package className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-lg">Order: {o.publicId}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Date: {new Date(o.createdAt).toLocaleString("en-IN")}</p>
                    <span className="inline-block mt-2 bg-teal-50 border border-teal-100 text-retail font-bold text-[10px] rounded-full px-2 py-0.5">
                      {ORDER_STATUS_LABELS[o.status] ?? o.status}
                    </span>
                  </div>
                </div>

                <div className="flex items-center md:items-end flex-row md:flex-col justify-between md:justify-center border-t border-slate-100 md:border-t-0 pt-4 md:pt-0 gap-2 text-right">
                  <div>
                    <span className="text-xs text-slate-500 block">Total Amount</span>
                    <strong className="block text-xl text-retail font-extrabold mt-0.5">{formatMoney(o.grandTotalPaise)}</strong>
                  </div>
                  <Link href={`/frames/orders/${o.publicId}`} className="vv-button-light text-xs font-bold py-1.5 px-3 flex items-center gap-1 mt-2">
                    Track details
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </article>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        )}
      </div>
    </main>
  );
}
