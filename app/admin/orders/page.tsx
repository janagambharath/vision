import Link from "next/link";
import { Search, Filter, ClipboardList } from "lucide-react";
import { requireAdmin } from "@/lib/admin-auth";
import { ORDER_STATUS_LABELS } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import type { Prisma, OrderStatus } from "@prisma/client";

export const metadata = { title: "Admin Orders" };

export default async function AdminOrdersPage({
  searchParams
}: {
  searchParams?: Promise<{ q?: string; status?: string }>;
}) {
  await requireAdmin();
  const params = (await searchParams) ?? {};

  const where: Prisma.OrderWhereInput = {};

  if (params.status) {
    where.status = params.status as OrderStatus;
  }

  if (params.q) {
    const q = params.q.trim().toUpperCase();
    where.OR = [
      { publicId: { contains: q } },
      { customerName: { contains: q, mode: "insensitive" } },
      { phone: { contains: q } }
    ];
  }

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50
  }).catch(() => []);

  return (
    <main className="vv-section">
      <div className="vv-container">
        {/* Header */}
        <div className="mb-8">
          <p className="vv-kicker text-retail">Admin</p>
          <h1 className="text-4xl font-extrabold">Order Management</h1>
          <p className="mt-2 text-slate-600">Track and update order fulfillment, lens processing, payments, and try-at-home requests.</p>
        </div>

        {/* Filter bar */}
        <div className="vv-card mb-6 p-4">
          <form className="grid gap-3 md:grid-cols-3" method="get" action="/admin/orders">
            <label className="grid gap-1 text-sm font-extrabold text-slate-600">
              Search Orders
              <div className="relative">
                <input className="store-input pl-9" type="search" name="q" defaultValue={params.q ?? ""} placeholder="Order ID, Customer, Phone..." />
                <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
              </div>
            </label>

            <label className="grid gap-1 text-sm font-extrabold text-slate-600">
              Filter Status
              <select className="store-input" name="status" defaultValue={params.status ?? ""}>
                <option value="">All Statuses</option>
                {Object.entries(ORDER_STATUS_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </label>

            <button className="vv-button-retail self-end" type="submit">
              <Filter className="h-4 w-4" />
              Apply Filters
            </button>
          </form>
        </div>

        {/* Orders Table/List */}
        <div className="grid gap-3">
          {orders.length ? (
            orders.map((order) => (
              <article key={order.id} className="vv-card grid gap-4 p-5 md:grid-cols-[1fr_auto] items-center hover:shadow-strong transition">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-extrabold text-slate-900">{order.publicId}</h2>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      order.status === "DELIVERED"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : order.status === "CANCELLED" || order.status === "REFUNDED"
                        ? "bg-red-50 text-red-700 border border-red-200"
                        : "bg-amber-50 text-amber-700 border border-amber-200"
                    }`}>
                      {ORDER_STATUS_LABELS[order.status] ?? order.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    Customer: <strong className="text-slate-800">{order.customerName}</strong> · 
                    Phone: <strong className="text-slate-800">{order.phone}</strong> · 
                    Date: {new Date(order.createdAt).toLocaleDateString("en-IN")}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Fulfillment: {order.deliveryMethod} · Payment: {order.paymentMethod}
                  </p>
                </div>
                <div className="text-right flex flex-col md:items-end gap-2">
                  <strong className="block text-xl text-retail">{formatMoney(order.grandTotalPaise)}</strong>
                  <Link className="vv-button-light text-sm py-2" href={`/admin/orders/${order.publicId}`}>
                    Manage Order
                  </Link>
                </div>
              </article>
            ))
          ) : (
            <div className="vv-card p-12 text-center text-slate-500 flex flex-col items-center justify-center">
              <ClipboardList className="h-12 w-12 text-slate-300 mb-2" />
              <p>No orders matching your search filters.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
