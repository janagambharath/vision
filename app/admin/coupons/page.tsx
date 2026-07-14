import { Plus, Tag } from "lucide-react";
import { redirect } from "next/navigation";
import { getAdminRole, isManagerOrOwner, requireAdmin, requireManager } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";

export const metadata = { title: "Admin Coupons" };

export default async function AdminCouponsPage() {
  const session = await requireAdmin();
  const canManage = isManagerOrOwner(getAdminRole(session));

  const coupons = await prisma.coupon.findMany({
    orderBy: { createdAt: "desc" }
  });

  async function createCoupon(formData: FormData) {
    "use server";
    const admin = await requireManager();

    const code = String(formData.get("code") ?? "").trim().toUpperCase();
    const description = String(formData.get("description") ?? "").trim();
    const discountPaiseRaw = formData.get("discountPaise");
    const discountPctRaw = formData.get("discountPct");
    const minOrderPaiseRaw = formData.get("minOrderPaise");
    const expiresAtRaw = formData.get("expiresAt");

    const discountPaise = discountPaiseRaw ? Math.round(Number(discountPaiseRaw) * 100) : null;
    const discountPct = discountPctRaw ? Number(discountPctRaw) : null;
    const minOrderPaise = minOrderPaiseRaw ? Math.round(Number(minOrderPaiseRaw) * 100) : null;
    const expiresAt = expiresAtRaw ? new Date(String(expiresAtRaw)) : null;

    if (!code) redirect("/admin/coupons?error=missing-code");

    const coupon = await prisma.coupon.create({
      data: {
        code,
        description,
        discountPaise,
        discountPct,
        minOrderPaise,
        expiresAt,
        active: true
      }
    });

    await prisma.activityLog.create({
      data: { adminUserId: admin.user?.id, action: "COUPON_CREATED", entityType: "coupon", entityId: coupon.id, metadata: { code } }
    });

    redirect("/admin/coupons");
  }

  return (
    <main className="vv-section">
      <div className="vv-container grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Coupon list */}
        <div>
          <div className="mb-8">
            <p className="vv-kicker text-retail">Admin</p>
            <h1 className="text-4xl font-extrabold">Discount Coupons</h1>
            <p className="mt-2 text-slate-600">Create and manage coupon campaigns for frame sales.</p>
          </div>

          <div className="grid gap-4">
            {coupons.map((coupon) => (
              <article key={coupon.id} className="vv-card p-5 hover:shadow-strong transition">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <h2 className="text-xl font-extrabold flex items-center gap-2">
                      <Tag className="h-5 w-5 text-retail" />
                      {coupon.code}
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">{coupon.description}</p>
                    <p className="mt-2 text-xs text-slate-500">
                      Discount: <strong className="text-slate-800">
                        {coupon.discountPaise ? formatMoney(coupon.discountPaise) : `${coupon.discountPct}%`}
                      </strong> · Min Order: <strong className="text-slate-800">
                        {coupon.minOrderPaise ? formatMoney(coupon.minOrderPaise) : "None"}
                      </strong>
                    </p>
                    {coupon.expiresAt ? (
                      <p className="mt-1 text-xs text-slate-400">
                        Expires: {new Date(coupon.expiresAt).toLocaleDateString("en-IN")}
                      </p>
                    ) : null}
                  </div>
                  <div className="text-right">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      coupon.active ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-700 border border-slate-200"
                    }`}>
                      {coupon.active ? "Active" : "Inactive"}
                    </span>
                    <p className="mt-2 text-xs text-slate-500">Uses: <strong>{coupon.usedCount}</strong></p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        {/* Add Coupon Sidebar */}
        {canManage ? <aside className="vv-card p-6 self-start sticky top-28 bg-slate-50">
          <h2 className="text-xl font-extrabold mb-4 border-b border-slate-100 pb-2">Create Coupon</h2>
          <form action={createCoupon} className="grid gap-4">
            <label className="grid gap-1 text-sm font-extrabold text-slate-600">
              Coupon Code *
              <input className="store-input uppercase" type="text" name="code" required placeholder="e.g. SUMMER20" />
            </label>
            <label className="grid gap-1 text-sm font-extrabold text-slate-600">
              Description
              <input className="store-input" type="text" name="description" placeholder="e.g. ₹500 off on first purchase" />
            </label>
            <div className="grid gap-3 grid-cols-2">
              <label className="grid gap-1 text-sm font-extrabold text-slate-600">
                Discount (INR)
                <input className="store-input" type="number" step="0.01" name="discountPaise" placeholder="500.00" />
              </label>
              <label className="grid gap-1 text-sm font-extrabold text-slate-600">
                Discount (%)
                <input className="store-input" type="number" name="discountPct" placeholder="10" />
              </label>
            </div>
            <label className="grid gap-1 text-sm font-extrabold text-slate-600">
              Minimum Order Value (INR)
              <input className="store-input" type="number" step="0.01" name="minOrderPaise" placeholder="2000.00" />
            </label>
            <label className="grid gap-1 text-sm font-extrabold text-slate-600">
              Expiry Date
              <input className="store-input" type="date" name="expiresAt" />
            </label>
            <button className="vv-button-retail mt-2 w-full inline-flex items-center justify-center gap-2" type="submit">
              <Plus className="h-4 w-4" />
              Create Coupon
            </button>
          </form>
        </aside> : null}
      </div>
    </main>
  );
}
