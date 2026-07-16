import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { hasOrderAccess } from "@/lib/order-access";
import { CLINIC_NAME, CLINIC_PHONE } from "@/lib/constants";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Order Invoice | Vision Vistara",
  robots: { index: false, follow: false }
};

interface InvoicePageProps {
  params: Promise<{ publicId: string }>;
}

export default async function InvoicePage({ params }: InvoicePageProps) {
  const { publicId } = await params;
  const orderId = publicId.trim().toUpperCase();

  // Validate authorization via HMAC-signed session cookie
  if (!(await hasOrderAccess(orderId, "tracking"))) {
    redirect(`/frames/orders/${orderId}`);
  }

  const order = await prisma.order.findUnique({
    where: { publicId: orderId },
    include: {
      items: true,
      shippingAddress: true
    }
  });

  if (!order) {
    return notFound();
  }

  return (
    <main className="min-h-screen bg-slate-50 py-12 print:bg-white print:py-0">
      <div className="mx-auto max-w-3xl bg-white p-8 shadow-soft border border-slate-100 rounded-vv print:border-none print:shadow-none print:p-0">
        
        {/* Controls (Hidden in Print) */}
        <div className="mb-6 flex justify-between items-center border-b border-slate-100 pb-4 print:hidden">
          <Link href={`/frames/orders/${orderId}`} className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" />
            Back to Tracking
          </Link>
          <div 
            dangerouslySetInnerHTML={{ 
              __html: `<button type="button" onclick="window.print()" class="vv-button-retail inline-flex min-h-[36px] px-4 py-1 text-xs gap-1.5 font-bold rounded-full"><span class="flex items-center gap-1.5"><svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z"/></svg>Print Invoice</span></button>` 
            }} 
          />
        </div>

        {/* Invoice Header */}
        <div className="flex justify-between items-start border-b border-slate-200 pb-8 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-teal-700 tracking-tight">INVOICE</h1>
            <p className="text-sm text-slate-500 mt-1">Order ID: <span className="font-mono">{order.publicId}</span></p>
            <p className="text-xs text-slate-400 mt-0.5">Date: {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p>
          </div>
          <div className="text-right">
            <strong className="block text-lg text-slate-800 font-sans">{CLINIC_NAME}</strong>
            <p className="text-xs text-slate-500 mt-1">Phone: {CLINIC_PHONE}</p>
          </div>
        </div>
        
        {/* Billing & Shipping split */}
        <div className="grid grid-cols-2 gap-8 mb-8 text-sm">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Billed To</h3>
            <strong className="block text-slate-800">{order.customerName}</strong>
            <p className="text-slate-600 mt-0.5">{order.phone}</p>
            {order.email && <p className="text-slate-500">{order.email}</p>}
          </div>
          {order.shippingAddress && (
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Shipped To</h3>
              <strong className="block text-slate-800">{order.shippingAddress.name}</strong>
              <p className="text-slate-600 mt-0.5">{order.shippingAddress.line1}</p>
              {order.shippingAddress.line2 && <p className="text-slate-600">{order.shippingAddress.line2}</p>}
              <p className="text-slate-600">{order.shippingAddress.city}, {order.shippingAddress.pincode}</p>
            </div>
          )}
        </div>

        {/* Invoice Items Table */}
        <table className="w-full mb-8 text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="py-3 font-bold text-slate-500">Product / Lens Options</th>
              <th className="py-3 font-bold text-slate-500 text-right">Qty</th>
              <th className="py-3 font-bold text-slate-500 text-right">Unit Price</th>
              <th className="py-3 font-bold text-slate-500 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {order.items.map((item) => {
              const productSnap = item.productSnapshot as { brand?: string; name?: string; sku?: string };
              const lensSnap = item.lensSnapshot as { name?: string } | null;
              const unitTotal = item.unitPricePaise + item.lensPricePaise;
              const lineTotal = unitTotal * item.quantity;
              return (
                <tr key={item.id}>
                  <td className="py-4">
                    <strong className="block text-slate-800">{productSnap.brand} {productSnap.name}</strong>
                    <span className="text-xs text-slate-400">SKU: {productSnap.sku}</span>
                    {lensSnap?.name && (
                      <span className="mt-1 block text-xs font-bold text-teal-600">Lens Option: {lensSnap.name}</span>
                    )}
                  </td>
                  <td className="py-4 text-slate-600 text-right">{item.quantity}</td>
                  <td className="py-4 text-slate-600 text-right">{formatMoney(unitTotal)}</td>
                  <td className="py-4 text-slate-800 font-extrabold text-right">{formatMoney(lineTotal)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Summary Block */}
        <div className="flex justify-end border-t border-slate-200 pt-6 text-sm">
          <div className="w-64 space-y-2">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal</span>
              <span>{formatMoney(order.subtotalPaise + order.lensTotalPaise)}</span>
            </div>
            {order.discountPaise > 0 && (
              <div className="flex justify-between text-emerald-600 font-bold">
                <span>Discount</span>
                <span>-{formatMoney(order.discountPaise)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-500">
              <span>Shipping</span>
              <span>{order.shippingPaise === 0 ? "Free" : formatMoney(order.shippingPaise)}</span>
            </div>
            {order.taxPaise > 0 ? (
              <div className="flex justify-between text-slate-500">
                <span>Legacy tax</span>
                <span>{formatMoney(order.taxPaise)}</span>
              </div>
            ) : null}
            <div className="flex justify-between text-base font-extrabold text-slate-900 border-t border-slate-100 pt-3 mt-1">
              <span>Grand Total</span>
              <span className="text-teal-700">{formatMoney(order.grandTotalPaise)}</span>
            </div>
          </div>
        </div>
        
        {/* Footnote */}
        <div className="mt-12 text-center text-xs text-slate-400 border-t border-slate-100 pt-6">
          <p>Thank you for shopping at Vision Vistara. This is a computer-generated invoice.</p>
        </div>
      </div>
    </main>
  );
}
