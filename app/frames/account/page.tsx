import { redirect } from "next/navigation";
import { getCustomerSession, clearCustomerSession } from "@/lib/customer-auth";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { ORDER_STATUS_LABELS } from "@/lib/constants";
import Link from "next/link";
import { LogOut, ClipboardList, MapPin, ExternalLink, FileText, ShoppingBag } from "lucide-react";
import { grantOrderAccess } from "@/lib/order-access";

export const metadata = {
  title: "My Account | Vision Vistara",
  robots: { index: false, follow: false }
};

export default async function AccountPage() {
  const session = await getCustomerSession();

  if (!session) {
    redirect("/frames/account/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      orders: {
        orderBy: { createdAt: "desc" },
        take: 10
      },
      shipping: {
        orderBy: { createdAt: "desc" },
        take: 1
      }
    }
  });

  if (!user) {
    // Session is invalid or user was deleted
    redirect("/frames/account/login");
  }

  async function handleLogout() {
    "use server";
    await clearCustomerSession();
    redirect("/frames");
  }

  const defaultShipping = user.shipping[0];

  return (
    <main className="vv-section bg-paper min-h-screen">
      <div className="vv-container max-w-5xl">
        {/* Dashboard Header */}
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-6 mb-8">
          <div>
            <p className="vv-kicker text-retail">Customer Workspace</p>
            <h1 className="text-4xl font-extrabold text-slate-900 font-sans">My Account</h1>
            <p className="mt-1 text-slate-500">Welcome back. Phone: +{user.phone}</p>
          </div>
          <form action={handleLogout}>
            <button type="submit" className="vv-button-light text-xs font-bold inline-flex items-center gap-1.5 min-h-[40px] px-4 py-2 border-slate-300">
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </form>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          
          {/* Main: Order History */}
          <section className="space-y-6">
            <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-teal-600" />
              Recent Orders ({user.orders.length})
            </h2>

            {user.orders.length === 0 ? (
              <div className="vv-card p-12 text-center bg-white border border-slate-100">
                <ShoppingBag className="mx-auto h-12 w-12 text-slate-300 mb-4" />
                <h3 className="text-lg font-bold text-slate-800">No orders placed yet</h3>
                <p className="mt-2 text-slate-500 text-sm max-w-sm mx-auto">
                  You haven&apos;t placed any orders with this phone number yet. Visit the catalog to get started.
                </p>
                <Link href="/frames" className="vv-button-retail mt-6 inline-flex font-bold py-2.5 px-6">
                  Browse Catalog
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {user.orders.map(async (order) => {
                  // Pre-grant access cookies for order tracking and checkout pages dynamically
                  // so the customer can view them seamlessly from the account dashboard.
                  try {
                    await grantOrderAccess(order.publicId, "tracking", 2 * 60 * 60);
                  } catch {
                    // Ignore cookies set failures in dynamic loop context
                  }

                  return (
                    <article key={order.id} className="vv-card p-6 bg-white border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-teal-100">
                      <div>
                        <div className="flex flex-wrap items-center gap-2.5">
                          <strong className="text-slate-800 font-mono">#{order.publicId}</strong>
                          <span className="text-xs text-slate-400">
                            {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-slate-500 font-semibold uppercase">
                          {order.deliveryMethod} · {order.paymentMethod}
                        </p>
                        <div className="mt-3">
                          <span className="inline-flex items-center rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-bold text-teal-700 border border-teal-100">
                            {ORDER_STATUS_LABELS[order.status] ?? order.status}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-3 w-full md:w-auto border-t border-slate-100 pt-4 md:border-none md:pt-0">
                        <strong className="text-lg text-slate-900 font-extrabold">{formatMoney(order.grandTotalPaise)}</strong>
                        <div className="flex flex-wrap gap-2 w-full md:w-auto">
                          <Link href={`/frames/orders/${order.publicId}`} className="vv-button-light flex-1 md:flex-none text-xs min-h-[36px] py-1.5 px-3 inline-flex items-center gap-1">
                            Track
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                          <Link href={`/frames/orders/${order.publicId}/invoice`} className="vv-button-light flex-1 md:flex-none text-xs min-h-[36px] py-1.5 px-3 inline-flex items-center gap-1">
                            Invoice
                            <FileText className="h-3 w-3" />
                          </Link>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {/* Sidebar: Profile Summary */}
          <aside className="space-y-6">
            <section className="vv-card p-6 bg-white border border-slate-100">
              <h3 className="text-md font-extrabold text-slate-800 flex items-center gap-2 mb-4">
                <MapPin className="h-5 w-5 text-teal-600" />
                Shipping Info
              </h3>
              {defaultShipping ? (
                <div className="text-xs text-slate-600 leading-relaxed">
                  <strong className="block text-slate-800 mb-1">{defaultShipping.name}</strong>
                  <p>{defaultShipping.line1}</p>
                  {defaultShipping.line2 && <p>{defaultShipping.line2}</p>}
                  <p>{defaultShipping.city}, {defaultShipping.state}</p>
                  <p>{defaultShipping.pincode}</p>
                  <p className="mt-2 text-slate-400 font-mono">{defaultShipping.phone}</p>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">
                  No default shipping address recorded. Add one during checkout.
                </p>
              )}
            </section>
          </aside>

        </div>
      </div>
    </main>
  );
}
