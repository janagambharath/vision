import Link from "next/link";
import { redirect } from "next/navigation";
import { getCustomerUser } from "@/lib/customer-auth";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { ORDER_STATUS_LABELS } from "@/lib/constants";
import { ArrowLeft, Package, ArrowRight } from "lucide-react";

export const metadata = { title: "Order History | Vision Vistara" };

export default async function CustomerOrdersPage() {
  const user = await getCustomerUser();
  if (!user) {
    redirect("/account/login");
  }

  // Fetch all orders
  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" }
  });

  return (
    <main className="vv-section bg-paper min-h-screen">
      <div className="vv-container max-w-4xl">
        <Link href="/account" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        <div className="mb-8">
          <p className="vv-kicker text-retail">My Account</p>
          <h1 className="text-4xl font-extrabold text-slate-900 font-sans">Order History</h1>
          <p className="mt-2 text-slate-600">Track and review all purchases placed on your account.</p>
        </div>

        {orders.length === 0 ? (
          <div className="vv-card p-16 text-center bg-white border border-slate-100 rounded-vv">
            <h2 className="text-xl font-extrabold text-slate-800">No orders found</h2>
            <p className="text-slate-500 mt-2">Explore our frames and make your first selection!</p>
            <Link href="/frames" className="vv-button-retail mt-4 inline-block">Browse Store</Link>
          </div>
        ) : (
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
        )}
      </div>
    </main>
  );
}
